import { db, MOCK_GLACIAL_LAKES, MOCK_FLOOD_ALERTS } from './db.service';
import { FloodAlert, AlertSeverityLevel } from '../types';

export class RiskEvaluationService {
  /**
   * Evaluates a newly ingested observation against historical 30-day/1-year baselines
   * and triggers 'EMERGENCY', 'WARNING', or 'ADVISORY' alert if thresholds are breached.
   */
  public static async evaluateObservation(
    lakeId: string,
    currentAreaSqm: number,
    precip48hMm: number = 0.0,
    damDistortionDetected: boolean = false
  ): Promise<FloodAlert | null> {
    let lakeName = 'Glacial Lake';
    let baselineSqm = currentAreaSqm;

    // 1. Fetch lake initial baseline & recent observations
    try {
      const lake = await db('glacial_lakes').where({ id: lakeId }).orWhere({ icimod_code: lakeId }).first();
      if (lake) {
        lakeName = lake.name;
        baselineSqm = Number(lake.initial_area_sqm);
      }
    } catch (e) {
      const mockLake = MOCK_GLACIAL_LAKES.find((l) => l.id === lakeId || l.icimod_code === lakeId);
      if (mockLake) {
        lakeName = mockLake.name;
        baselineSqm = mockLake.initial_area_sqm;
      }
    }

    // 2. Fetch past observations within 30 days
    let past30dArea = baselineSqm;
    try {
      const pastObs = await db('lake_observations')
        .where({ lake_id: lakeId })
        .andWhere('observation_date', '>=', db.raw("NOW() - INTERVAL '30 days'"))
        .orderBy('observation_date', 'asc')
        .first();
      if (pastObs) {
        past30dArea = Number(pastObs.area_sqm);
      }
    } catch (e) {
      // Offline fallback
    }

    const growth30dPct = ((currentAreaSqm - past30dArea) / past30dArea) * 100.0;
    const growthBaselinePct = ((currentAreaSqm - baselineSqm) / baselineSqm) * 100.0;

    let severity: AlertSeverityLevel | null = null;
    const triggers: string[] = [];

    // Rule 1: EMERGENCY if area growth > 30% OR sudden dam anomaly
    if (growth30dPct > 30.0 || growthBaselinePct > 30.0 || damDistortionDetected) {
      severity = 'EMERGENCY';
      if (damDistortionDetected) {
        triggers.push('Sudden moraine dam distortion / collapse anomaly detected');
      }
      if (growth30dPct > 30.0) {
        triggers.push(`Catastrophic surface area expansion: +${growth30dPct.toFixed(1)}% in 30 days`);
      } else if (growthBaselinePct > 30.0) {
        triggers.push(`Critical baseline area expansion: +${growthBaselinePct.toFixed(1)}%`);
      }
    }
    // Rule 2: WARNING if area growth > 15% in 14 days OR 48h rain > 50 mm
    else if (growth30dPct > 15.0 || precip48hMm > 50.0) {
      severity = 'WARNING';
      if (growth30dPct > 15.0) {
        triggers.push(`Rapid lake area expansion: +${growth30dPct.toFixed(1)}% (threshold: >15%)`);
      }
      if (precip48hMm > 50.0) {
        triggers.push(`Heavy 48-hour antecedent rainfall: ${precip48hMm.toFixed(1)} mm (threshold: >50 mm)`);
      }
    }
    // Rule 3: ADVISORY if growth > 8% or rain > 25 mm
    else if (growthBaselinePct > 8.0 || precip48hMm > 25.0) {
      severity = 'ADVISORY';
      if (growthBaselinePct > 8.0) {
        triggers.push(`Elevated annual expansion: +${growthBaselinePct.toFixed(1)}%`);
      }
      if (precip48hMm > 25.0) {
        triggers.push(`Moderate precipitation: ${precip48hMm.toFixed(1)} mm in 48 hours`);
      }
    }

    if (!severity) {
      return null;
    }

    const triggerReason = `GLOF ${severity} Alert for ${lakeName}: ` + triggers.join('; ');

    const newAlert: FloodAlert = {
      id: `a-${Date.now()}`,
      lake_id: lakeId,
      lake_name: lakeName,
      severity,
      trigger_reason: triggerReason,
      created_at: new Date().toISOString(),
      resolved_at: null,
    };

    try {
      const [inserted] = await db('flood_alerts')
        .insert({
          lake_id: lakeId,
          severity,
          trigger_reason: triggerReason,
        })
        .returning(['id', 'lake_id', 'severity', 'trigger_reason', 'created_at', 'resolved_at']);
      return inserted;
    } catch (e) {
      MOCK_FLOOD_ALERTS.unshift(newAlert);
      return newAlert;
    }
  }
}
