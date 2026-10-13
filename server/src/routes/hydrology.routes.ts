import { Router, Request, Response } from 'express';
import { db } from '../services/db.service';
import { syncDhmRiverWatchThresholds } from '../services/dhm_thresholds.service';
import { getLatestHydrometricStations, HydrologyValidationError, queryHydrometricStations, storeHydrometricObservation } from '../services/hydrology.service';
import { getDhmIngestionHealth } from '../services/dhm_ingestion.service';
import { getRainfallStations, RAINFALL_HOURS } from '../services/dhm_rainfall.service';

const router = Router();

router.get('/ingestion/status', async (_req: Request, res: Response) => {
  try { return res.json({ success: true, data: await getDhmIngestionHealth() }); }
  catch (error) { return errorResponse(error, res); }
});

router.get('/rainfall/stations', async (req: Request, res: Response) => {
  const hours = Number(req.query.hours ?? 24);
  if (!(RAINFALL_HOURS as readonly number[]).includes(hours)) {
    return res.status(400).json({ success: false, error: 'Rainfall hours must be 1, 3, 6, 12, or 24' });
  }
  try {
    const data = await getRainfallStations(hours);
    return res.json({ success: true, count: data.length, data });
  } catch (error) { return errorResponse(error, res); }
});

router.get('/rainfall/stations/:dhmId/observations', async (req: Request, res: Response) => {
  const id = Number(req.params.dhmId), limit = Number(req.query.limit ?? 120);
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(limit) || limit < 1 || limit > 500) {
    return res.status(400).json({ success: false, error: 'Invalid rainfall station ID or limit' });
  }
  try {
    const station = await db('rainfall_stations').where({ dhm_station_id: id, active: true }).first();
    if (!station) return res.status(404).json({ success: false, error: 'Rainfall station not registered' });
    const data = await db('rainfall_observations').where({ station_id: station.id })
      .orderBy('observed_at', 'desc').orderBy('duration_hours').limit(limit);
    return res.json({ success: true, station, count: data.length, data });
  } catch (error) { return errorResponse(error, res); }
});

/** Catch database errors locally so Express 4 never loses an async rejection. */
function errorResponse(error: unknown, res: Response) {
  if (error instanceof HydrologyValidationError) {
    return res.status(error.status).json({ success: false, error: error.message });
  }
  return res.status(503).json({ success: false, error: 'Canonical hydrology store or DHM feed unavailable' });
}

router.get('/stations', async (_req: Request, res: Response) => {
  try {
    const rows = await queryHydrometricStations();
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (error) { return errorResponse(error, res); }
});

router.get('/stations/latest', async (_req: Request, res: Response) => {
  try {
    const data = await getLatestHydrometricStations();
    return res.json({ success: true, count: data.length, data });
  } catch (error) { return errorResponse(error, res); }
});

router.post('/thresholds/sync', async (req: Request, res: Response) => {
  const configuredToken = process.env.HYDROLOGY_SYNC_TOKEN;
  if (configuredToken && req.header('x-sync-token') !== configuredToken) {
    return res.status(401).json({ success: false, error: 'Invalid hydrology sync token' });
  }
  try {
    return res.json({ success: true, data: await syncDhmRiverWatchThresholds() });
  } catch (error) { return errorResponse(error, res); }
});

router.post('/observations', async (req: Request, res: Response) => {
  try {
    const result = await storeHydrometricObservation(req.body);
    return res.status(201).json({ success: true, data: result.observation, quality: result.quality });
  } catch (error) { return errorResponse(error, res); }
});

router.get('/stations/:stationNumber/observations', async (req: Request, res: Response) => {
  const stationNumber = Number(req.params.stationNumber);
  const limit = Number(req.query.limit ?? 48);
  if (!Number.isFinite(stationNumber) || stationNumber <= 0 || !Number.isInteger(limit) || limit < 1 || limit > 500) {
    return res.status(400).json({ success: false, error: 'Invalid station number or limit (1–500)' });
  }
  try {
    const station = await db('hydrometric_stations').where({ station_number: stationNumber, active: true }).first();
    if (!station) return res.status(404).json({ success: false, error: 'Station not found' });
    const rows = await db('hydrometric_observations').where({ station_id: station.id }).orderBy('observed_at', 'desc').limit(limit);
    return res.json({ success: true, station, count: rows.length, data: rows });
  } catch (error) { return errorResponse(error, res); }
});

export default router;
