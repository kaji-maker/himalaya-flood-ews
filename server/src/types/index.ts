export type LakeDangerLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertSeverityLevel = 'ADVISORY' | 'WARNING' | 'EMERGENCY';

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
}
