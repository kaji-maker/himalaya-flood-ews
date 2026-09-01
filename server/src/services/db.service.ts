import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';
import { Basin, Lake, GLOFAlert, GeoJSONFeatureCollection } from '../types';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://ews_admin:ews_secure_password@localhost:5432/himalaya_ews';

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Fallback Mock Data Store (ensures API functions seamlessly in offline/testing mode)
export const MOCK_BASINS: Basin[] = [
  {
    id: 'b1111111-1111-1111-1111-111111111111',
    code: 'KOSHI',
    name: 'Koshi River Basin',
    country: 'Nepal',
    area_sqkm: 74500,
    upstream_glaciers_count: 2168,
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    code: 'GANDAKI',
    name: 'Gandaki Basin',
    country: 'Nepal',
    area_sqkm: 46300,
    upstream_glaciers_count: 1719,
  },
  {
    id: 'b3333333-3333-3333-3333-333333333333',
    code: 'KARNALI',
    name: 'Karnali Basin',
    country: 'Nepal',
    area_sqkm: 44000,
    upstream_glaciers_count: 1361,
  },
];

export const MOCK_LAKES: Lake[] = [
  {
    id: 'l1111111-1111-1111-1111-111111111111',
    glims_id: 'G086475E27885N',
    name: 'Tsho Rolpa',
    basin_id: 'b1111111-1111-1111-1111-111111111111',
    basin_code: 'KOSHI',
    sub_basin: 'Tama Koshi',
    elevation_m: 4580,
    dam_type: 'MORAINE_DAMMED',
    pdgl_status: 'VERY_HIGH',
    baseline_area_sqkm: 1.54,
    baseline_volume_mcm: 85.9,
    freeboard_m: 12.5,
    moraine_slope_deg: 28.5,
    downstream_settlements_count: 14,
    current_risk_score: 0.88,
    centroid: { type: 'Point', coordinates: [86.475, 27.868] },
  },
  {
    id: 'l2222222-2222-2222-2222-222222222222',
    glims_id: 'G086915E27902N',
    name: 'Imja Tsho',
    basin_id: 'b1111111-1111-1111-1111-111111111111',
    basin_code: 'KOSHI',
    sub_basin: 'Dudh Koshi',
    elevation_m: 5010,
    dam_type: 'MORAINE_DAMMED',
    pdgl_status: 'VERY_HIGH',
    baseline_area_sqkm: 1.28,
    baseline_volume_mcm: 75.8,
    freeboard_m: 14.2,
    moraine_slope_deg: 32.0,
    downstream_settlements_count: 19,
    current_risk_score: 0.82,
    centroid: { type: 'Point', coordinates: [86.924, 27.910] },
  },
  {
    id: 'l3333333-3333-3333-3333-333333333333',
    glims_id: 'G084534E28512N',
    name: 'Thulagi Lake',
    basin_id: 'b2222222-2222-2222-2222-222222222222',
    basin_code: 'GANDAKI',
    sub_basin: 'Marsyangdi',
    elevation_m: 4040,
    dam_type: 'MORAINE_DAMMED',
    pdgl_status: 'HIGH',
    baseline_area_sqkm: 0.94,
    baseline_volume_mcm: 35.3,
    freeboard_m: 22.0,
    moraine_slope_deg: 24.5,
    downstream_settlements_count: 11,
    current_risk_score: 0.68,
    centroid: { type: 'Point', coordinates: [84.532, 28.517] },
  },
  {
    id: 'l4444444-4444-4444-4444-444444444444',
    glims_id: 'G087095E27798N',
    name: 'Lower Barun Lake',
    basin_id: 'b1111111-1111-1111-1111-111111111111',
    basin_code: 'KOSHI',
    sub_basin: 'Barun / Arun',
    elevation_m: 4570,
    dam_type: 'MORAINE_DAMMED',
    pdgl_status: 'HIGH',
    baseline_area_sqkm: 1.72,
    baseline_volume_mcm: 92.0,
    freeboard_m: 18.5,
    moraine_slope_deg: 35.0,
    downstream_settlements_count: 8,
    current_risk_score: 0.74,
    centroid: { type: 'Point', coordinates: [87.102, 27.808] },
  },
  {
    id: 'l5555555-5555-5555-5555-555555555555',
    glims_id: 'G082342E29891N',
    name: 'Karnali High-Alpine Glacial Lake',
    basin_id: 'b3333333-3333-3333-3333-333333333333',
    basin_code: 'KARNALI',
    sub_basin: 'Humla Karnali',
    elevation_m: 4920,
    dam_type: 'MORAINE_DAMMED',
    pdgl_status: 'MEDIUM',
    baseline_area_sqkm: 0.68,
    baseline_volume_mcm: 18.5,
    freeboard_m: 25.0,
    moraine_slope_deg: 19.5,
    downstream_settlements_count: 6,
    current_risk_score: 0.45,
    centroid: { type: 'Point', coordinates: [82.342, 29.893] },
  },
];

export const MOCK_ALERTS: GLOFAlert[] = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    alert_code: 'GLOF-2026-TSHOROLPA-01',
    lake_id: 'l1111111-1111-1111-1111-111111111111',
    lake_name: 'Tsho Rolpa',
    basin_code: 'KOSHI',
    alert_level: 'CRITICAL',
    risk_score: 0.88,
    headline: 'High Risk GLOF Alert: Tsho Rolpa Moraine Pressure Surge',
    description: 'Rapid lake expansion (+18.2% annualized) coupled with heavy antecedent 72h monsoon rainfall (142mm) indicates critical moraine crest breach risk.',
    triggers: {
      expansion_rate_pct_yr: 18.2,
      accumulated_72h_rain_mm: 142.0,
      freeboard_m: 12.5,
    },
    affected_villages: ['Na', 'Bedding', 'Chhetchhet', 'Simigaon', 'Gongar Khola'],
    status: 'ACTIVE',
    dispatched_channels: ['WEBHOOK', 'SMS', 'CAP-XML'],
    issued_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    alert_code: 'GLOF-2026-IMJA-02',
    lake_id: 'l2222222-2222-2222-2222-222222222222',
    lake_name: 'Imja Tsho',
    basin_code: 'KOSHI',
    alert_level: 'WARNING',
    risk_score: 0.82,
    headline: 'GLOF Warning: Accelerated Supraglacial Calving at Imja Lake',
    description: 'Calving event detected at glacier snout expanding water perimeter toward terminal moraine.',
    triggers: {
      expansion_rate_pct_yr: 14.5,
      accumulated_72h_rain_mm: 98.4,
      freeboard_m: 14.2,
    },
    affected_villages: ['Dingboche', 'Pangboche', 'Tengboche', 'Namche Bazaar'],
    status: 'ACTIVE',
    dispatched_channels: ['WEBHOOK', 'SMS'],
    issued_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

export async function querySpatial(text: string, params: any[] = []): Promise<QueryResult<any>> {
  try {
    return await pool.query(text, params);
  } catch (err: any) {
    // PostGIS unavailable -> fall back to mock handlers
    console.warn(`[DB Service] Spatial query fallback (Postgres offline): ${err.message}`);
    throw err;
  }
}
