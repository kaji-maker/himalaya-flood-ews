export type PDGLHazardLevel = 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'POTENTIAL' | 'LOW';
export type DamType = 'MORAINE_DAMMED' | 'ICE_DAMMED' | 'BEDROCK_DAMMED' | 'COMPLEX';
export type AlertLevel = 'CRITICAL' | 'WARNING' | 'WATCH' | 'ADVISORY' | 'NORMAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

export interface Basin {
  id: string;
  code: string;
  name: string;
  country: string;
  area_sqkm: number;
  upstream_glaciers_count: number;
  geometry?: any;
  created_at?: string;
}

export interface Lake {
  id: string;
  glims_id: string;
  name: string;
  basin_id: string;
  basin_code?: string;
  sub_basin?: string;
  elevation_m: number;
  dam_type: DamType;
  pdgl_status: PDGLHazardLevel;
  baseline_area_sqkm: number;
  baseline_volume_mcm?: number;
  freeboard_m?: number;
  moraine_slope_deg?: number;
  downstream_settlements_count?: number;
  current_risk_score: number;
  geometry?: any;
  centroid?: { type: 'Point'; coordinates: [number, number] };
  latest_observation?: LakeObservation;
}

export interface LakeObservation {
  id: string;
  lake_id: string;
  observed_at: string;
  sensor: string;
  raw_scene_id?: string;
  area_sqkm: number;
  area_change_sqkm?: number;
  expansion_rate_pct_yr?: number;
  cloud_cover_pct: number;
  mndwi_mean?: number;
  freeboard_est_m?: number;
  geometry?: any;
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

export interface GLOFAlert {
  id: string;
  alert_code: string;
  lake_id: string;
  lake_name?: string;
  basin_id?: string;
  basin_code?: string;
  alert_level: AlertLevel;
  risk_score: number;
  headline: string;
  description: string;
  triggers: Record<string, any>;
  affected_villages: string[];
  status: AlertStatus;
  dispatched_channels: string[];
  issued_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

export interface GeoJSONFeature<G = any, P = any> {
  type: 'Feature';
  geometry: G;
  properties: P;
}

export interface GeoJSONFeatureCollection<G = any, P = any> {
  type: 'FeatureCollection';
  features: GeoJSONFeature<G, P>[];
}
