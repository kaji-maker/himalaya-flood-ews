import knex, { Knex } from 'knex';
import dotenv from 'dotenv';
import { Basin, GlacialLake, FloodAlert } from '../types';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://ews_admin:ews_secure_password@localhost:5435/himalaya_ews';

export const db: Knex = knex({
  client: 'pg',
  connection: connectionString,
  pool: {
    min: 2,
    max: 20,
    acquireTimeoutMillis: 10000,
    createTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  },
  acquireConnectionTimeout: 10000,
});

/**
 * Validates database connectivity and PostGIS extension health.
 */
export async function checkDatabaseHealth(): Promise<{ status: 'healthy' | 'degraded' | 'offline'; postgis_version?: string; latency_ms: number; error?: string }> {
  const start = Date.now();
  try {
    const result = await db.raw('SELECT PostGIS_Version() as postgis, NOW() as server_time');
    const latency = Date.now() - start;
    return {
      status: 'healthy',
      postgis_version: result.rows?.[0]?.postgis || '3.4',
      latency_ms: latency,
    };
  } catch (err: any) {
    return {
      status: 'degraded',
      latency_ms: Date.now() - start,
      error: err.message || 'Database unavailable',
    };
  }
}

// Fallback In-Memory Datastores (for offline dev and mock testing)
export const MOCK_BASINS: Basin[] = [
  { id: 'b1111111-1111-1111-1111-111111111111', name: 'Koshi' },
  { id: 'b2222222-2222-2222-2222-222222222222', name: 'Gandaki' },
  { id: 'b3333333-3333-3333-3333-333333333333', name: 'Karnali' },
  { id: 'b4444444-4444-4444-4444-444444444444', name: 'Mahakali' },
];

export const MOCK_GLACIAL_LAKES: GlacialLake[] = [
  {
    id: 'l1111111-1111-1111-1111-111111111111',
    icimod_code: 'PDGL_NEP_KOSHI_001',
    name: 'Tsho Rolpa',
    basin_id: 'b1111111-1111-1111-1111-111111111111',
    basin_name: 'Koshi',
    initial_area_sqm: 1540000,
    danger_level: 'CRITICAL',
    centroid: { type: 'Point', coordinates: [86.475, 27.868] },
  },
  {
    id: 'l2222222-2222-2222-2222-222222222222',
    icimod_code: 'PDGL_NEP_KOSHI_002',
    name: 'Imja Tsho',
    basin_id: 'b1111111-1111-1111-1111-111111111111',
    basin_name: 'Koshi',
    initial_area_sqm: 1280000,
    danger_level: 'HIGH',
    centroid: { type: 'Point', coordinates: [86.924, 27.910] },
  },
  {
    id: 'l3333333-3333-3333-3333-333333333333',
    icimod_code: 'PDGL_NEP_GANDAKI_001',
    name: 'Thulagi Lake',
    basin_id: 'b2222222-2222-2222-2222-222222222222',
    basin_name: 'Gandaki',
    initial_area_sqm: 940000,
    danger_level: 'HIGH',
    centroid: { type: 'Point', coordinates: [84.532, 28.517] },
  },
  {
    id: 'l4444444-4444-4444-4444-444444444444',
    icimod_code: 'PDGL_NEP_KOSHI_003',
    name: 'Lower Barun Lake',
    basin_id: 'b1111111-1111-1111-1111-111111111111',
    basin_name: 'Koshi',
    initial_area_sqm: 1720000,
    danger_level: 'HIGH',
    centroid: { type: 'Point', coordinates: [87.102, 27.808] },
  },
  {
    id: 'l5555555-5555-5555-5555-555555555555',
    icimod_code: 'PDGL_NEP_KARNALI_001',
    name: 'Karnali High-Alpine Glacial Lake',
    basin_id: 'b3333333-3333-3333-3333-333333333333',
    basin_name: 'Karnali',
    initial_area_sqm: 680000,
    danger_level: 'MEDIUM',
    centroid: { type: 'Point', coordinates: [82.342, 29.893] },
  },
];

export const MOCK_FLOOD_ALERTS: FloodAlert[] = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    lake_id: 'l1111111-1111-1111-1111-111111111111',
    lake_name: 'Tsho Rolpa',
    severity: 'EMERGENCY',
    trigger_reason: 'Moraine displacement surge +18.2% expansion and 72h GPM IMERG rainfall exceeding 140mm',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    resolved_at: null,
  },
];

export const MOCK_INSAR_TELEMETRY: any[] = [
  {
    id: 'insar-tsho-rolpa-01',
    lake_id: 'l1111111-1111-1111-1111-111111111111',
    lake_name: 'Tsho Rolpa',
    recorded_at: new Date().toISOString(),
    mean_los_velocity_mm_year: -24.8,
    max_subsidence_mm_year: -36.2,
    mean_coherence: 0.78,
    deformation_rating: 'CRITICAL_DESTABILIZATION',
    points: [
      { point_id: 'pt-1', lat: 27.868, lon: 86.475, los_velocity_mm_year: -26.1, coherence: 0.81, is_anomaly: true },
      { point_id: 'pt-2', lat: 27.869, lon: 86.476, los_velocity_mm_year: -36.2, coherence: 0.72, is_anomaly: true }
    ]
  },
  {
    id: 'insar-imja-01',
    lake_id: 'l2222222-2222-2222-2222-222222222222',
    lake_name: 'Imja Tsho',
    recorded_at: new Date().toISOString(),
    mean_los_velocity_mm_year: -14.2,
    max_subsidence_mm_year: -18.5,
    mean_coherence: 0.84,
    deformation_rating: 'MODERATE_CREEP',
    points: [
      { point_id: 'pt-imja-1', lat: 27.910, lon: 86.924, los_velocity_mm_year: -14.2, coherence: 0.84, is_anomaly: false }
    ]
  }
];

export const MOCK_CUE_SLEW_TASKINGS: any[] = [
  {
    tasking_id: 'task-slew-tsho-rolpa-01',
    lake_id: 'l1111111-1111-1111-1111-111111111111',
    lake_name: 'Tsho Rolpa',
    priority: 'IMMEDIATE_INTERVENTION',
    target_sensor: 'SkySat-Submeter',
    target_gsd_meters: 0.50,
    bbox: [86.45, 27.85, 86.50, 27.89],
    reasons: [
      {
        source: 'INSAR_SUBSIDENCE',
        severity: 'CRITICAL',
        description: 'Severe moraine crest subsidence -36.2 mm/yr indicates internal ice core degradation',
        observed_value: -36.2
      }
    ],
    required_cv_analyses: [
      'Tension crack propagation and shear aperture widening',
      'Dam crest piping seepage and thermokarst pond formation'
    ],
    status: 'TASKED',
    created_at: new Date().toISOString()
  }
];

export const MOCK_EDGE_SENSOR_READINGS: any[] = [
  {
    id: 'edge-gorge-tsho-01',
    station_id: 'st-rolwaling-upper',
    gorge_name: 'Rolwaling Upper Choke Gorge',
    lake_id: 'l1111111-1111-1111-1111-111111111111',
    recorded_at: new Date().toISOString(),
    geophone_dominant_freq_hz: 12.5,
    geophone_acoustic_energy_db: 36.2,
    water_stage_m: 1.45,
    water_stage_rate_m_min: 0.01,
    tripwire_status: 'INTACT',
    is_slurry_surge_detected: false,
    alarm_level: 'NORMAL',
    scada_actuation: null
  }
];

