export type LakeDangerLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertSeverityLevel = 'ADVISORY' | 'WARNING' | 'EMERGENCY';

export interface TwoAxisRiskScore {
  susceptibility_score: number; // S in [0, 1]
  trigger_urgency_score: number; // T in [0, 1]
  combined_hazard_index: number; // H = S * T
  risk_matrix_quadrant: 'DORMANT_STABLE' | 'HIGH_SUSCEPTIBILITY_WATCH' | 'TRIGGERED_TRANSIENT_WARNING' | 'CRITICAL_DUAL_TRIGGER';
}

export interface Basin {
  id: string;
  name: 'Koshi' | 'Gandaki' | 'Karnali' | 'Mahakali' | string;
  boundary?: any;
  created_at?: string;
  updated_at?: string;
}

export interface GlacialLake {
  id: string;
  icimod_code: string;
  name: string;
  centroid?: { type: 'Point'; coordinates: [number, number] };
  initial_area_sqm: number;
  danger_level: LakeDangerLevel;
  basin_id: string;
  basin_name?: string;
  two_axis_score?: TwoAxisRiskScore;
  created_at?: string;
  updated_at?: string;
}

export interface LakeObservation {
  id: string;
  lake_id: string;
  observation_date: string;
  sensor_name: string;
  geom?: any;
  area_sqm: number;
  mean_mndwi?: number;
  cloud_cover_pct: number;
  created_at?: string;
}

export interface FloodAlert {
  id: string;
  lake_id: string;
  lake_name?: string;
  severity: AlertSeverityLevel;
  trigger_reason: string;
  created_at: string;
  resolved_at?: string | null;
  two_axis_score?: TwoAxisRiskScore;
}

export interface PrecipitationTelemetry {
  id: string;
  basin_id?: string;
  lake_id?: string;
  recorded_at: string;
  sensor: string;
  precip_rate_mm_hr: number;
  accumulated_24h_mm: number;
  accumulated_72h_mm: number;
  anomaly_pct?: number;
  location?: { type: 'Point'; coordinates: [number, number] };
}
