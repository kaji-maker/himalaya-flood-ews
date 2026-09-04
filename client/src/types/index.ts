export type LakeDangerLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertSeverity = 'ADVISORY' | 'WARNING' | 'EMERGENCY';

export interface TwoAxisRiskScore {
  susceptibility_score: number; // Static Fuse Length S in [0, 1]
  trigger_urgency_score: number; // Dynamic Weather Trigger T in [0, 1]
  combined_hazard_index: number; // H = S * T
  risk_matrix_quadrant: 'DORMANT_STABLE' | 'HIGH_SUSCEPTIBILITY_WATCH' | 'TRIGGERED_TRANSIENT_WARNING' | 'CRITICAL_DUAL_TRIGGER';
}

export interface DownstreamImpact {
  settlement_name: string;
  distance_km: number;
  travel_time_minutes: number;
  peak_discharge_cms: number;
  peak_stage_rise_m: number;
  hazard_level: 'EXTREME_IMMEDIATE_EVACUATION' | 'HIGH_PRIORITY_EVACUATION' | 'MODERATE_WARNING';
  coordinates: [number, number]; // [lon, lat]
}

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
  downstream_impacts?: DownstreamImpact[];
  inundation_swath_coords?: [number, number][];
  two_axis_score?: TwoAxisRiskScore;
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
  two_axis_score?: TwoAxisRiskScore;
}

export interface MapLayerState {
  mndwiWater: boolean;
  terrain3d: boolean;
  gpmPrecipitation: boolean;
  pdglHighRisk: boolean;
  satelliteBase: boolean;
  inundationSwath: boolean;
  insarDeformation?: boolean;
  edgeSensors?: boolean;
  cueSlewFootprint?: boolean;
  communitySirens?: boolean;
  verticalSafeHavens?: boolean;
  seismicShakemap?: boolean;
}

export interface VerticalSafeHaven {
  id: string;
  settlement_id: string;
  settlement_name: string;
  haven_name: string;
  valley: string;
  basin: string;
  riverbed_elevation_m: number;
  haven_elevation_m: number;
  vertical_gain_m: number;
  ascent_distance_m: number;
  ascent_time_minutes: number;
  flood_arrival_minutes: number;
  evacuation_clearance_margin_minutes: number;
  capacity_persons: number;
  haven_coordinates: [number, number]; // [lon, lat]
  settlement_coordinates: [number, number]; // [lon, lat]
  escape_trail: [number, number][]; // series of coordinates
  safety_features: string[];
  focal_person: string;
  emergency_contact: string;
}

export interface AffectedLakeSeismicImpact {
  lake_id: string;
  lake_name: string;
  distance_km: number;
  computed_pga_g: number;
  destabilization_risk: 'CRITICAL_MORAINE_FAILURE' | 'HIGH_SLUMP_RISK' | 'MODERATE_LIQUEFACTION' | 'NEGLIGIBLE';
  action_triggered: string;
}

export interface SeismicEvent {
  id: string;
  magnitude: number; // Mw
  depth_km: number;
  latitude: number;
  longitude: number;
  place: string;
  occurred_at: string;
  source: 'USGS' | 'NSC_NEPAL' | 'SIMULATED';
  max_pga_g: number;
  affected_lakes: AffectedLakeSeismicImpact[];
  alert_dispatched: boolean;
}

export interface LiveGpmPrecipitationTelemetry {
  basin_id: string;
  basin_name: string;
  lake_id: string;
  recorded_at: string;
  sensor: string;
  precip_rate_mm_hr: number;
  accumulated_3h_mm: number;
  accumulated_24h_mm: number;
  accumulated_72h_mm: number;
  climatology_norm_72h_mm: number;
  anomaly_pct: number;
  surge_status: 'NORMAL' | 'ELEVATED' | 'EXTREME_PORE_PRESSURE_SURGE';
}


