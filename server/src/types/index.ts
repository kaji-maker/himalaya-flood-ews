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

export interface InSARPoint {
  point_id: string;
  lat: number;
  lon: number;
  los_velocity_mm_year: number;
  coherence: number;
  is_anomaly: boolean;
}

export interface InSARTelemetry {
  id: string;
  lake_id: string;
  recorded_at: string;
  mean_los_velocity_mm_year: number;
  max_subsidence_mm_year: number;
  mean_coherence: number;
  deformation_rating: 'STABLE' | 'MODERATE_CREEP' | 'CRITICAL_DESTABILIZATION';
  points: InSARPoint[];
}

export interface CueAndSlewTaskingOrder {
  tasking_id: string;
  lake_id: string;
  lake_name: string;
  priority: 'STANDARD' | 'PRIORITY' | 'IMMEDIATE_INTERVENTION';
  target_sensor: 'SkySat-Submeter' | 'WorldView-3' | 'Sentinel-2-Targeted' | 'PlanetScope';
  target_gsd_meters: number;
  bbox: [number, number, number, number];
  reasons: Array<{
    source: string;
    severity: string;
    description: string;
    observed_value: number;
  }>;
  required_cv_analyses: string[];
  status: 'TASKED' | 'ACQUIRED' | 'PROCESSED' | 'FAILED';
  created_at: string;
}

export interface SCADAGateCommand {
  facility_id: string;
  facility_name: string;
  action: 'EMERGENCY_FULL_OPEN' | 'HOLD' | 'STAGE_MONITORING';
  target_spillway_gates: string[];
  estimated_arrival_minutes: number;
  command_payload: Record<string, any>;
}

export interface EdgeSensorReading {
  id?: string;
  station_id: string;
  gorge_name: string;
  lake_id: string;
  recorded_at: string;
  geophone_dominant_freq_hz: number;
  geophone_acoustic_energy_db: number;
  water_stage_m: number;
  water_stage_rate_m_min: number;
  tripwire_status: 'INTACT' | 'TRIPPED';
  is_slurry_surge_detected?: boolean;
  alarm_level?: 'NORMAL' | 'ELEVATED' | 'CRITICAL_SURGE';
  scada_actuation?: SCADAGateCommand | null;
}

export interface FloodAlert {
  id: string;
  lake_id: string;
  lake_name?: string;
  basin_name?: string;
  severity: AlertSeverityLevel;
  trigger_reason: string;
  created_at: string;
  resolved_at?: string | null;
  two_axis_score?: TwoAxisRiskScore;
  slew_tasking_order?: CueAndSlewTaskingOrder | null;
  scada_actuation?: SCADAGateCommand | null;
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

export interface HydropowerPlantCascade {
  id: string;
  name: string;
  operator: string;
  capacity_mw: number;
  river: string;
  basin: string;
  coordinates: [number, number]; // [lon, lat]
  headpond_volume_m3: number;
  upstream_threat_lake_id: string;
  upstream_threat_lake_name: string;
  lead_time_minutes: number;
  scada_ip: string;
  scada_protocol: 'IEC 60870-5-104' | 'Modbus-TCP' | 'DNP3';
  radial_gates_count: number;
  drawdown_buffer_m: number;
  interlock_status: 'MONITORING' | 'PRE_DRAWDOWN' | 'FULL_SPILLWAY_DISCHARGE' | 'TRIPPED';
  last_tripped_at?: string | null;
  last_command_hex?: string | null;
}

export interface DHMHydrometricStation {
  id: string;
  station_number: number;
  name: string;
  river: string;
  basin: string;
  elevation_m: number;
  coordinates: [number, number]; // [lon, lat]
  sensor_type: 'RADAR_STAGE' | 'ULTRASONIC_SURGE' | 'PRESSURE_TRANSDUCER';
  current_stage_m: number;
  warning_stage_m: number;
  danger_stage_m: number;
  current_discharge_cms: number;
  status: 'NORMAL' | 'WATCH' | 'CRITICAL_SURGE';
  telemetry_source: 'DHM_TELEMETRIC_NETWORK' | 'GOES_SATELLITE';
  last_updated: string;
}

export interface HistoricalGLOFRecord {
  id: string;
  event_name: string;
  lake_or_glacier: string;
  basin: string;
  river: string;
  country_region: string;
  event_date: string;
  year: number;
  coordinates: [number, number]; // [lon, lat]
  trigger_mechanism: 'ICE_AVALANCHE' | 'MORAINE_COLLAPSE' | 'PIPING_FAILURE' | 'EXTREME_CLOUDBURST' | 'ROCK_ICE_DETACHMENT' | 'EARTHQUAKE';
  estimated_volume_m3: number;
  peak_discharge_cms: number;
  downstream_impact_km: number;
  fatalities: number;
  infrastructure_impact: string;
  key_findings: string;
}
