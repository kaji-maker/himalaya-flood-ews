import knex, { Knex } from 'knex';
import dotenv from 'dotenv';
import { Basin, GlacialLake, FloodAlert } from '../types';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://ews_admin:ews_secure_password@localhost:5432/himalaya_ews';

export const db: Knex = knex({
  client: 'pg',
  connection: connectionString,
  pool: {
    min: 2,
    max: 20,
    acquireTimeoutMillis: 5000,
  },
});

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
