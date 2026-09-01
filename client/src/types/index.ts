export type PDGLHazardLevel = 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'POTENTIAL' | 'LOW';
export type AlertLevel = 'CRITICAL' | 'WARNING' | 'WATCH' | 'ADVISORY' | 'NORMAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

export interface Basin {
  id: string;
  code: string;
  name: string;
  country: string;
  area_sqkm: number;
  upstream_glaciers_count: number;
}

export interface Lake {
  id: string;
  glims_id: string;
  name: string;
  basin_id: string;
  basin_code?: string;
  sub_basin?: string;
  elevation_m: number;
  dam_type: string;
  pdgl_status: PDGLHazardLevel;
  baseline_area_sqkm: number;
  baseline_volume_mcm?: number;
  freeboard_m?: number;
  moraine_slope_deg?: number;
  downstream_settlements_count?: number;
  current_risk_score: number;
  centroid?: { type: 'Point'; coordinates: [number, number] };
  geometry?: any;
}

export interface GLOFAlert {
  id: string;
  alert_code: string;
  lake_id: string;
  lake_name?: string;
  basin_code?: string;
  alert_level: AlertLevel;
  risk_score: number;
  headline: string;
  description: string;
  triggers: Record<string, any>;
  affected_villages: string[];
  status: AlertStatus;
  issued_at: string;
}

export interface MapLayerState {
  mndwiWater: boolean;
  terrain3d: boolean;
  gpmPrecipitation: boolean;
  pdglHighRisk: boolean;
  satelliteBase: boolean;
}
