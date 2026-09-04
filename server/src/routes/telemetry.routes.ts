import { Router, Request, Response } from 'express';
import { PrecipitationTelemetry } from '../types';
import { EdgeDecoderService } from '../services/edge_decoder.service';
import { RiskEvaluationService } from '../services/evaluation.service';
import { SeismicTriggerService } from '../services/seismic_trigger.service';
import { GpmPrecipitationService } from '../services/gpm_precipitation.service';

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

// =========================================================================
// SEISMIC TRIGGER HUB (USGS HIMALAYAN ARC M4.5+ & MORAINE DESTABILIZATION)
// =========================================================================

// GET /api/v1/telemetry/seismic - Get recent earthquakes and moraine impact analysis
router.get('/seismic', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const events = SeismicTriggerService.getRecentEvents(limit);
  return res.json({
    success: true,
    count: events.length,
    data: events,
  });
});

// POST /api/v1/telemetry/seismic/sync - Sync live USGS GeoJSON feed for Himalayan arc
router.post('/seismic/sync', async (req: Request, res: Response) => {
  const events = await SeismicTriggerService.fetchUsgsHimalayanFeed();
  return res.json({
    success: true,
    message: 'USGS Himalayan feed synchronized',
    count: events.length,
    data: events,
  });
});

// POST /api/v1/telemetry/seismic/simulate - Simulate an earthquake event along Himalayan thrust
router.post('/seismic/simulate', async (req: Request, res: Response) => {
  const { magnitude, depth_km, latitude, longitude, place } = req.body;

  const mag = Number(magnitude) || 6.1;
  const depth = Number(depth_km) || 10.0;
  const lat = Number(latitude) || 27.82;
  const lon = Number(longitude) || 86.40;
  const locationName = place || '15 km W of Tsho Rolpa (Dolakha, Rolwaling Arc)';

  const result = await SeismicTriggerService.processSeismicEvent({
    magnitude: mag,
    depth_km: depth,
    latitude: lat,
    longitude: lon,
    place: locationName,
    source: 'SIMULATED',
  });

  return res.status(201).json({
    success: true,
    message: `Simulated Mw ${mag.toFixed(1)} earthquake processed across Himalayan glacial lakes`,
    data: result.event,
    alerts_triggered: result.alertsCreated.length,
    alerts: result.alertsCreated,
  });
});

// POST /api/v1/telemetry/seismic/ingest - Ingest raw earthquake observation
router.post('/seismic/ingest', async (req: Request, res: Response) => {
  const { id, magnitude, depth_km, latitude, longitude, place, occurred_at, source } = req.body;

  if (magnitude === undefined || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, error: 'Missing required seismic parameters (magnitude, latitude, longitude)' });
  }

  const result = await SeismicTriggerService.processSeismicEvent({
    id,
    magnitude: Number(magnitude),
    depth_km: Number(depth_km || 10.0),
    latitude: Number(latitude),
    longitude: Number(longitude),
    place: place || 'Himalayan Arc Epicenter',
    occurred_at,
    source: source || 'USGS',
  });

  return res.status(201).json({
    success: true,
    data: result.event,
    alerts_triggered: result.alertsCreated.length,
  });
});

// =========================================================================
// NASA GPM IMERG 30-MINUTE PRECIPITATION TELEMETRY
// =========================================================================

// GET /api/v1/telemetry/precipitation/live - Get live 30-min NASA GPM IMERG sub-basin telemetry
router.get('/precipitation/live', (req: Request, res: Response) => {
  const telemetry = GpmPrecipitationService.getLiveTelemetry();
  return res.json({
    success: true,
    count: telemetry.length,
    data: telemetry,
  });
});

// POST /api/v1/telemetry/precipitation/sync - Step/update live GPM telemetry
router.post('/precipitation/sync', (req: Request, res: Response) => {
  const { basin_id } = req.body;
  const updated = GpmPrecipitationService.updateTelemetry(basin_id);
  return res.json({
    success: true,
    message: 'NASA GPM IMERG precipitation telemetry updated',
    data: updated,
  });
});

// POST /api/v1/telemetry/precipitation/simulate-pulse - Simulate extreme cloudburst pulse
router.post('/precipitation/simulate-pulse', async (req: Request, res: Response) => {
  const { basin_id, rate_mm_hr } = req.body;
  try {
    const result = await GpmPrecipitationService.triggerExtremeRainPulse(
      basin_id || 'KOSHI',
      Number(rate_mm_hr) || 28.5
    );
    return res.status(201).json({
      success: true,
      message: `Simulated extreme cloudburst pulse of ${rate_mm_hr || 28.5} mm/hr in ${basin_id || 'KOSHI'}`,
      data: result.updated,
      alert: result.alert,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

