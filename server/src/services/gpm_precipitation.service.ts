import { LiveGpmPrecipitationTelemetry, FloodAlert } from '../types';
import { MOCK_FLOOD_ALERTS } from './db.service';
import { MultiChannelDispatchService } from './dispatch.service';

export class GpmPrecipitationService {
  private static telemetryStore: LiveGpmPrecipitationTelemetry[] = [
    {
      basin_id: 'KOSHI',
      basin_name: 'Koshi Basin (Rolwaling & Everest Headwaters)',
      lake_id: 'l-tsho-rolpa',
      recorded_at: new Date().toISOString(),
      sensor: 'NASA_GPM_IMERG_V07B_30MIN',
      precip_rate_mm_hr: 6.8,
      accumulated_3h_mm: 19.4,
      accumulated_24h_mm: 58.2,
      accumulated_72h_mm: 138.5,
      climatology_norm_72h_mm: 75.0,
      anomaly_pct: 84.7,
      surge_status: 'ELEVATED',
    },
    {
      basin_id: 'GANDAKI',
      basin_name: 'Gandaki Basin (Marsyangdi & Manaslu)',
      lake_id: 'l-thulagi',
      recorded_at: new Date().toISOString(),
      sensor: 'NASA_GPM_IMERG_V07B_30MIN',
      precip_rate_mm_hr: 3.4,
      accumulated_3h_mm: 9.8,
      accumulated_24h_mm: 28.5,
      accumulated_72h_mm: 64.0,
      climatology_norm_72h_mm: 60.0,
      anomaly_pct: 6.7,
      surge_status: 'NORMAL',
    },
    {
      basin_id: 'KARNALI',
      basin_name: 'Karnali Basin (Western Himalayas)',
      lake_id: 'l-karnali-headwaters',
      recorded_at: new Date().toISOString(),
      sensor: 'NASA_GPM_IMERG_V07B_30MIN',
      precip_rate_mm_hr: 1.6,
      accumulated_3h_mm: 4.5,
      accumulated_24h_mm: 14.2,
      accumulated_72h_mm: 36.0,
      climatology_norm_72h_mm: 45.0,
      anomaly_pct: -20.0,
      surge_status: 'NORMAL',
    },
  ];

  /**
   * Returns current 30-min NASA GPM IMERG precipitation telemetry.
   */
  public static getLiveTelemetry(): LiveGpmPrecipitationTelemetry[] {
    return [...this.telemetryStore];
  }

  /**
   * Syncs or updates GPM telemetry (simulating live 30-minute early-run ingest).
   */
  public static updateTelemetry(basinId?: string): LiveGpmPrecipitationTelemetry[] {
    const now = new Date().toISOString();
    this.telemetryStore = this.telemetryStore.map((item) => {
      if (basinId && item.basin_id !== basinId) return item;

      // Small realistic perturbation
      const delta = (Math.random() - 0.48) * 0.8;
      const newRate = Number(Math.max(0.0, item.precip_rate_mm_hr + delta).toFixed(1));
      const accum3h = Number((newRate * 3.0 + Math.random() * 2.0).toFixed(1));
      const accum24h = Number((accum3h * 2.8 + Math.random() * 5.0).toFixed(1));
      const accum72h = Number((accum24h * 2.4 + Math.random() * 10.0).toFixed(1));

      const anomaly = Number((((accum72h - item.climatology_norm_72h_mm) / item.climatology_norm_72h_mm) * 100.0).toFixed(1));

      let surge: LiveGpmPrecipitationTelemetry['surge_status'] = 'NORMAL';
      if (accum3h > 45.0 || accum24h > 90.0) {
        surge = 'EXTREME_PORE_PRESSURE_SURGE';
      } else if (accum24h > 45.0 || newRate > 10.0) {
        surge = 'ELEVATED';
      }

      return {
        ...item,
        recorded_at: now,
        precip_rate_mm_hr: newRate,
        accumulated_3h_mm: accum3h,
        accumulated_24h_mm: accum24h,
        accumulated_72h_mm: accum72h,
        anomaly_pct: anomaly,
        surge_status: surge,
      };
    });

    return [...this.telemetryStore];
  }

  /**
   * Triggers an extreme monsoon cloudburst pulse over a targeted basin.
   */
  public static async triggerExtremeRainPulse(
    basinId: string = 'KOSHI',
    rateMmHr: number = 24.5
  ): Promise<{ updated: LiveGpmPrecipitationTelemetry; alert: FloodAlert | null }> {
    const target = this.telemetryStore.find((t) => t.basin_id === basinId);
    if (!target) {
      throw new Error(`Basin ${basinId} not found`);
    }

    const accum3h = Number((rateMmHr * 2.8).toFixed(1));
    const accum24h = Number((accum3h + 45.0).toFixed(1));
    const accum72h = Number((accum24h + 75.0).toFixed(1));
    const anomaly = Number((((accum72h - target.climatology_norm_72h_mm) / target.climatology_norm_72h_mm) * 100.0).toFixed(1));

    const updatedRecord: LiveGpmPrecipitationTelemetry = {
      ...target,
      recorded_at: new Date().toISOString(),
      precip_rate_mm_hr: rateMmHr,
      accumulated_3h_mm: accum3h,
      accumulated_24h_mm: accum24h,
      accumulated_72h_mm: accum72h,
      anomaly_pct: anomaly,
      surge_status: 'EXTREME_PORE_PRESSURE_SURGE',
    };

    // Update in store
    const idx = this.telemetryStore.findIndex((t) => t.basin_id === basinId);
    this.telemetryStore[idx] = updatedRecord;

    // Trigger Heavy Precipitation GLOF Flood Alert
    const reason = `NASA GPM IMERG EXTREME RAINFALL PULSE in ${target.basin_name}: Cloudburst intensity of ${rateMmHr} mm/hr (Accumulated 3h: ${accum3h} mm, 24h: ${accum24h} mm). Moraine internal hydrostatic pore-pressure critical surge warning!`;

    const alert: FloodAlert = {
      id: `a-gpm-${Date.now()}-${basinId.toLowerCase()}`,
      lake_id: target.lake_id,
      lake_name: target.basin_name,
      severity: 'WARNING',
      trigger_reason: reason,
      created_at: new Date().toISOString(),
      resolved_at: null,
    };

    MOCK_FLOOD_ALERTS.unshift(alert);

    try {
      await MultiChannelDispatchService.dispatchEmergencyAlert(alert);
    } catch (err) {
      console.error('[GPM Ingest] Alert dispatch error:', err);
    }

    return { updated: updatedRecord, alert };
  }
}
