import { Router, Request, Response } from 'express';
import { PrecipitationTelemetry } from '../types';

const router = Router();

// In-memory telemetry buffer
const telemetryBuffer: PrecipitationTelemetry[] = [
  {
    id: 't-01',
    basin_id: 'KOSHI',
    lake_id: 'l1111111-1111-1111-1111-111111111111',
    recorded_at: new Date().toISOString(),
    sensor: 'GPM_IMERG_V07B',
    precip_rate_mm_hr: 6.4,
    accumulated_24h_mm: 52.8,
    accumulated_72h_mm: 142.0,
    anomaly_pct: 64.5,
    location: { type: 'Point', coordinates: [86.475, 27.868] },
  },
  {
    id: 't-02',
    basin_id: 'GANDAKI',
    lake_id: 'l3333333-3333-3333-3333-333333333333',
    recorded_at: new Date().toISOString(),
    sensor: 'GPM_IMERG_V07B',
    precip_rate_mm_hr: 3.2,
    accumulated_24h_mm: 28.5,
    accumulated_72h_mm: 68.0,
    anomaly_pct: 12.0,
    location: { type: 'Point', coordinates: [84.532, 28.517] },
  },
];

// GET /api/v1/telemetry/precipitation - Query precipitation telemetry
router.get('/precipitation', (req: Request, res: Response) => {
  const { basin_code, lake_id } = req.query;

  let filtered = [...telemetryBuffer];
  if (basin_code) {
    filtered = filtered.filter((t) => t.basin_id === basin_code);
  }
  if (lake_id) {
    filtered = filtered.filter((t) => t.lake_id === lake_id);
  }

  return res.json({
    success: true,
    count: filtered.length,
    data: filtered,
  });
});

// POST /api/v1/telemetry/precipitation - Ingest GPM/AWS precipitation record
router.post('/precipitation', (req: Request, res: Response) => {
  const { basin_id, lake_id, sensor, precip_rate_mm_hr, accumulated_24h_mm, accumulated_72h_mm, anomaly_pct, location } = req.body;

  if (precip_rate_mm_hr === undefined || accumulated_24h_mm === undefined) {
    return res.status(400).json({ success: false, error: 'Missing required precipitation measurements' });
  }

  const newRecord: PrecipitationTelemetry = {
    id: `t-${Date.now()}`,
    basin_id,
    lake_id,
    recorded_at: new Date().toISOString(),
    sensor: sensor || 'GPM_IMERG_V07B',
    precip_rate_mm_hr: Number(precip_rate_mm_hr),
    accumulated_24h_mm: Number(accumulated_24h_mm),
    accumulated_72h_mm: Number(accumulated_72h_mm || accumulated_24h_mm * 2.2),
    anomaly_pct: Number(anomaly_pct || 0),
    location,
  };

  telemetryBuffer.unshift(newRecord);
  if (telemetryBuffer.length > 500) {
    telemetryBuffer.pop();
  }

  return res.status(201).json({ success: true, data: newRecord });
});

export default router;
