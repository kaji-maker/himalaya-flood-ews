export type LakeDangerLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertSeverity = 'ADVISORY' | 'WARNING' | 'EMERGENCY';

export interface GlacialLake {
  id: string;
  icimod_code: string;
  name: string;
  basin_name: string;
  sub_basin?: string;
  elevation_m: number;
  initial_area_sqm: number;
  current_area_sqm: number;
  danger_level: LakeDangerLevel;
  centroid: { type: 'Point'; coordinates: [number, number] }; // [lon, lat]
  polygon_coordinates?: number[][][];
  freeboard_m?: number;
  moraine_slope_deg?: number;
  downstream_villages?: string[];
}

export interface ObservationPoint {
  date: string;
  area_sqm: number;
  area_sqkm: number;
  sensor_name: string;
  mean_mndwi?: number;
  cloud_cover_pct: number;
}

export interface PrecipitationPoint {
  timestamp: string;
  precip_mm: number;
  accumulated_48h_mm: number;
  sensor: string;
}

export interface FloodAlert {
  id: string;
  lake_id: string;
  lake_name: string;
  basin_name: string;
  severity: AlertSeverity;
  trigger_reason: string;
  created_at: string;
  resolved_at?: string | null;
  affected_villages?: string[];
}

export interface MapLayerState {
  mndwiWater: boolean;
  terrain3d: boolean;
  gpmPrecipitation: boolean;
  pdglHighRisk: boolean;
  satelliteBase: boolean;
}
