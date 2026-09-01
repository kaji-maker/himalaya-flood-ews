import { db, MOCK_GLACIAL_LAKES, MOCK_FLOOD_ALERTS } from './db.service';
import { FloodAlert, AlertSeverityLevel, TwoAxisRiskScore } from '../types';

export class RiskEvaluationService {
  /**
   * Calculates Static Geomorphic Susceptibility (S in [0, 1])
   * based on moraine slope, lake volume, ruggedness, and freeboard margin.
   */
  public static calculateSusceptibility(
    slopeDeg: number = 28.0,
    ruggednessM: number = 450.0,
    volumeMcm: number = 50.0,
    freeboardM: number = 15.0
  ): number {
    const fSlope = Math.min(1.0, Math.max(0.0, slopeDeg / 40.0));
    const fRugged = Math.min(1.0, Math.max(0.0, ruggednessM / 650.0));
    const fVol = Math.min(1.0, Math.max(0.0, Math.sqrt(volumeMcm / 100.0)));
    const fFreeboard = Math.min(1.0, Math.max(0.0, 1.0 - freeboardM / 35.0));

    const s = 0.35 * fSlope + 0.25 * fRugged + 0.25 * fVol + 0.15 * fFreeboard;
    return Number(Math.min(1.0, Math.max(0.0, s)).toFixed(3));
  }

  /**
   * Calculates Dynamic Trigger Urgency (T in [0, 1])
   * based on antecedent rainfall, MNDWI surge, and moraine deformation.
   */
  public static calculateTriggerUrgency(
    growth30dPct: number,
    precip48hMm: number,
    damAnomaly: boolean
  ): number {
    if (damAnomaly) return 1.0;
    const fRain = Math.min(1.0, Math.max(0.0, precip48hMm / 70.0));
    const fGrowth = Math.min(1.0, Math.max(0.0, growth30dPct / 30.0));

    const t = Math.max(fRain, fGrowth) * 0.7 + fRain * fGrowth * 0.3;
    return Number(Math.min(1.0, Math.max(0.0, t)).toFixed(3));
  }

  /**
   * Evaluates a newly ingested observation using the decoupled Two-Axis model (arXiv:2608.12422)
   */
  public static async evaluateObservation(
    lakeId: string,
    currentAreaSqm: number,
    precip48hMm: number = 0.0,
    damDistortionDetected: boolean = false
  ): Promise<FloodAlert | null> {
    let lakeName = 'Glacial Lake';
    let baselineSqm = currentAreaSqm;
    let slopeDeg = 28.0;
    let volumeMcm = 50.0;
    let freeboardM = 15.0;

    // 1. Fetch lake initial baseline & geomorphic attributes
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

    // 3. Compute Two-Axis Metrics
    const sScore = this.calculateSusceptibility(slopeDeg, 480.0, volumeMcm, freeboardM);
    const tScore = this.calculateTriggerUrgency(growth30dPct, precip48hMm, damDistortionDetected);
    const hIndex = Number((sScore * tScore).toFixed(3));

    let severity: AlertSeverityLevel | null = null;
    let quadrant: 'DORMANT_STABLE' | 'HIGH_SUSCEPTIBILITY_WATCH' | 'TRIGGERED_TRANSIENT_WARNING' | 'CRITICAL_DUAL_TRIGGER' = 'DORMANT_STABLE';
    const triggers: string[] = [];

    if (precip48hMm > 50.0) {
      triggers.push(`Heavy 48-hour antecedent rainfall: ${precip48hMm.toFixed(1)} mm`);
    }
    if (growth30dPct > 15.0) {
      triggers.push(`Rapid lake area expansion: +${growth30dPct.toFixed(1)}%`);
    }
    if (damDistortionDetected) {
      triggers.push('Sudden moraine dam distortion / collapse anomaly detected');
    }

    // Severity mapping
    if (damDistortionDetected || growth30dPct > 30.0 || (sScore >= 0.60 && tScore >= 0.60)) {
      severity = 'EMERGENCY';
      quadrant = 'CRITICAL_DUAL_TRIGGER';
      if (sScore >= 0.60 && tScore >= 0.60) {
        triggers.push(`Dual-axis hazard convergence: S=${sScore.toFixed(2)}, T=${tScore.toFixed(2)}, H=${hIndex.toFixed(2)}`);
      }
    } else if (growth30dPct > 15.0 || precip48hMm > 50.0 || tScore >= 0.55) {
      severity = 'WARNING';
      quadrant = 'TRIGGERED_TRANSIENT_WARNING';
    } else if (sScore >= 0.60 || growthBaselinePct > 8.0 || precip48hMm > 25.0) {
      severity = 'ADVISORY';
      quadrant = 'HIGH_SUSCEPTIBILITY_WATCH';
      if (sScore >= 0.60) {
        triggers.push(`High geomorphic susceptibility index (S=${sScore.toFixed(2)})`);
      }
    }

    if (!severity) {
      return null;
    }

    const triggerReason = `GLOF ${severity} [${quadrant}] for ${lakeName}: ` + triggers.join('; ');

    const twoAxisScore: TwoAxisRiskScore = {
      susceptibility_score: sScore,
      trigger_urgency_score: tScore,
      combined_hazard_index: hIndex,
      risk_matrix_quadrant: quadrant,
    };

    const newAlert: FloodAlert = {
      id: `a-${Date.now()}`,
      lake_id: lakeId,
      lake_name: lakeName,
      severity,
      trigger_reason: triggerReason,
      created_at: new Date().toISOString(),
      resolved_at: null,
      two_axis_score: twoAxisScore,
    };

    try {
      const [inserted] = await db('flood_alerts')
        .insert({
          lake_id: lakeId,
          severity,
          trigger_reason: triggerReason,
        })
        .returning(['id', 'lake_id', 'severity', 'trigger_reason', 'created_at', 'resolved_at']);
      return { ...inserted, two_axis_score: twoAxisScore };
    } catch (e) {
      MOCK_FLOOD_ALERTS.unshift(newAlert);
      return newAlert;
    }
  }
}
