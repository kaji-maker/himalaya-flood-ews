import { Router, Request, Response } from 'express';
import { PrecipitationTelemetry } from '../types';
import { EdgeDecoderService } from '../services/edge_decoder.service';
import { RiskEvaluationService } from '../services/evaluation.service';

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

// GET /api/v1/telemetry/insar - Query Sentinel-1 InSAR moraine deformation telemetry
router.get('/insar', (req: Request, res: Response) => {
  const { lake_id } = req.query;
  const { MOCK_INSAR_TELEMETRY } = require('../services/db.service');

  let results = [...MOCK_INSAR_TELEMETRY];
  if (lake_id) {
    results = results.filter((r: any) => r.lake_id === lake_id);
  }

  return res.json({
    success: true,
    count: results.length,
    data: results,
  });
});

// POST /api/v1/telemetry/insar - Ingest InSAR deformation record & evaluate cue-and-slew tasking
router.post('/insar', async (req: Request, res: Response) => {
  const { lake_id, mean_los_velocity_mm_year, max_subsidence_mm_year, mean_coherence } = req.body;
  if (!lake_id || mean_los_velocity_mm_year === undefined || max_subsidence_mm_year === undefined) {
    return res.status(400).json({ success: false, error: 'Missing required InSAR deformation metrics' });
  }

  const { RiskEvaluationService } = require('../services/evaluation.service');
  const result = await RiskEvaluationService.evaluateInSARBaseline(
    lake_id,
    Number(mean_los_velocity_mm_year),
    Number(max_subsidence_mm_year),
    Number(mean_coherence || 0.80)
  );

  return res.status(201).json({
    success: true,
    data: result,
  });
});

// GET /api/v1/telemetry/edge-sensors - Query live riverbed geophone & ultrasonic water stage telemetry
router.get('/edge-sensors', (req: Request, res: Response) => {
  const { lake_id } = req.query;
  const { MOCK_EDGE_SENSOR_READINGS } = require('../services/db.service');

  let results = [...MOCK_EDGE_SENSOR_READINGS];
  if (lake_id) {
    results = results.filter((r: any) => r.lake_id === lake_id);
  }

  return res.json({
    success: true,
    count: results.length,
    data: results,
  });
});

// POST /api/v1/telemetry/edge-sensors - Ingest in-situ edge telemetry; triggers instant SCADA gate actuation if surge detected
router.post('/edge-sensors', async (req: Request, res: Response) => {
  const { station_id, gorge_name, lake_id, geophone_dominant_freq_hz, geophone_acoustic_energy_db, water_stage_m, water_stage_rate_m_min, tripwire_status } = req.body;

  if (!station_id || !lake_id || geophone_acoustic_energy_db === undefined || water_stage_m === undefined) {
    return res.status(400).json({ success: false, error: 'Missing required edge sensor measurements' });
  }

  const { RiskEvaluationService } = require('../services/evaluation.service');
  const result = await RiskEvaluationService.evaluateEdgeSensorReading({
    station_id,
    gorge_name: gorge_name || 'Upper Gorge Choke Point',
    lake_id,
    geophone_dominant_freq_hz: Number(geophone_dominant_freq_hz || 20.0),
    geophone_acoustic_energy_db: Number(geophone_acoustic_energy_db),
    water_stage_m: Number(water_stage_m),
    water_stage_rate_m_min: Number(water_stage_rate_m_min || 0.0),
    tripwire_status: tripwire_status || 'INTACT',
  });

  return res.status(201).json({
    success: true,
    data: result,
  });
});

// GET /api/v1/telemetry/cue-slew - List active Cue-and-Slew high-resolution optical tasking orders
router.get('/cue-slew', (req: Request, res: Response) => {
  const { MOCK_CUE_SLEW_TASKINGS } = require('../services/db.service');
  return res.json({
    success: true,
    count: MOCK_CUE_SLEW_TASKINGS.length,
    data: MOCK_CUE_SLEW_TASKINGS,
  });
});

// POST /api/v1/telemetry/iridium-sbd - Ingest remote satellite packet (hex or raw binary)
router.post('/iridium-sbd', async (req: Request, res: Response) => {
  try {
    let decoded;
    const gorgeName = req.body?.gorge_name || 'Tama Koshi Gorge Choke Point';
    const lakeId = req.body?.lake_id || 'PDGL_NEP_KOSHI_001';

    if (Buffer.isBuffer(req.body)) {
      decoded = EdgeDecoderService.decodeBinaryPacket(req.body, gorgeName, lakeId);
    } else if (req.body?.data_hex) {
      decoded = EdgeDecoderService.decodeHexString(req.body.data_hex, gorgeName, lakeId);
    } else if (typeof req.body === 'string') {
      decoded = EdgeDecoderService.decodeHexString(req.body, gorgeName, lakeId);
    } else {
      return res.status(400).json({ success: false, error: 'Expected raw binary buffer or JSON with data_hex' });
    }

    const evaluation = await RiskEvaluationService.evaluateEdgeSensorReading({
      station_id: decoded.station_id,
      gorge_name: decoded.gorge_name,
      lake_id: decoded.lake_id,
      geophone_dominant_freq_hz: decoded.geophone_dominant_freq_hz,
      geophone_acoustic_energy_db: decoded.geophone_acoustic_energy_db,
      water_stage_m: decoded.water_stage_m,
      water_stage_rate_m_min: decoded.water_stage_rate_m_min,
      tripwire_status: decoded.tripwire_status,
    });

    return res.status(201).json({
      success: true,
      protocol: 'IRIDIUM_SBD',
      decoded_packet: decoded,
      evaluation,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: `Iridium SBD decoding failed: ${err.message}` });
  }
});

// POST /api/v1/telemetry/lorawan - Ingest ChirpStack / TTN LoRaWAN uplink frame
router.post('/lorawan', async (req: Request, res: Response) => {
  try {
    const { data, devEui, fPort, gorge_name, lake_id } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, error: 'Missing base64 data payload in LoRaWAN frame' });
    }

    const gorge = gorge_name || 'Marsyangdi Alpine Choke Point';
    const lake = lake_id || 'PDGL_NEP_GANDAKI_001';
    const decoded = EdgeDecoderService.decodeBase64String(data, gorge, lake);

    const evaluation = await RiskEvaluationService.evaluateEdgeSensorReading({
      station_id: decoded.station_id,
      gorge_name: decoded.gorge_name,
      lake_id: decoded.lake_id,
      geophone_dominant_freq_hz: decoded.geophone_dominant_freq_hz,
      geophone_acoustic_energy_db: decoded.geophone_acoustic_energy_db,
      water_stage_m: decoded.water_stage_m,
      water_stage_rate_m_min: decoded.water_stage_rate_m_min,
      tripwire_status: decoded.tripwire_status,
    });

    return res.status(201).json({
      success: true,
      protocol: 'LORAWAN_UPLINK',
      dev_eui: devEui,
      f_port: fPort,
      decoded_packet: decoded,
      evaluation,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: `LoRaWAN frame decoding failed: ${err.message}` });
  }
});

export default router;

