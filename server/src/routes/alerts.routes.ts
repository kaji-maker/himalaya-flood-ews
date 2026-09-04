import { Router, Request, Response } from 'express';
import { MOCK_FLOOD_ALERTS, MOCK_GLACIAL_LAKES, db } from '../services/db.service';
import { FloodAlert, AlertSeverityLevel } from '../types';

const router = Router();
let alertsMemoryStore: FloodAlert[] = [...MOCK_FLOOD_ALERTS];

// GET /api/v1/alerts - Query flood alerts
router.get('/', async (req: Request, res: Response) => {
  const { severity, active_only } = req.query;

  try {
    let query = db('flood_alerts as f')
      .join('glacial_lakes as g', 'f.lake_id', 'g.id')
      .leftJoin('river_basins as b', 'g.basin_id', 'b.id')
      .select(
        'f.id',
        'f.lake_id',
        'g.name as lake_name',
        db.raw("COALESCE(b.name, 'Koshi') as basin_name"),
        'f.severity',
        'f.trigger_reason',
        'f.created_at',
        'f.resolved_at'
      );

    if (severity) {
      query = query.where('f.severity', severity as string);
    }
    if (active_only === 'true') {
      query = query.whereNull('f.resolved_at');
    }

    const alerts = await query.orderBy('f.created_at', 'desc');
    return res.json({ success: true, count: alerts.length, data: alerts });
  } catch (e) {
    let filtered = alertsMemoryStore.map((a) => {
      const lake = MOCK_GLACIAL_LAKES.find((l) => l.id === a.lake_id || l.icimod_code === a.lake_id || l.name === a.lake_id);
      return {
        ...a,
        basin_name: a.basin_name || (lake ? (lake as any).basin_name : 'Koshi') || 'Koshi',
      };
    });
    if (severity) {
      filtered = filtered.filter((a) => a.severity === severity);
    }
    if (active_only === 'true') {
      filtered = filtered.filter((a) => !a.resolved_at);
    }
    return res.json({ success: true, count: filtered.length, data: filtered });
  }
});

// GET /api/v1/alerts/active - Query active unresolved flood alerts
router.get('/active', async (req: Request, res: Response) => {
  try {
    const alerts = await db('flood_alerts as f')
      .join('glacial_lakes as g', 'f.lake_id', 'g.id')
      .leftJoin('river_basins as b', 'g.basin_id', 'b.id')
      .select(
        'f.id',
        'f.lake_id',
        'g.name as lake_name',
        db.raw("COALESCE(b.name, 'Koshi') as basin_name"),
        'f.severity',
        'f.trigger_reason',
        'f.created_at',
        'f.resolved_at'
      )
      .whereNull('f.resolved_at')
      .orderBy('f.created_at', 'desc');

    return res.json({ success: true, count: alerts.length, data: alerts });
  } catch (e) {
    const active = alertsMemoryStore
      .filter((a) => !a.resolved_at)
      .map((a) => {
        const lake = MOCK_GLACIAL_LAKES.find((l) => l.id === a.lake_id || l.icimod_code === a.lake_id || l.name === a.lake_id);
        return {
          ...a,
          basin_name: a.basin_name || (lake ? (lake as any).basin_name : 'Koshi') || 'Koshi',
        };
      });
    return res.json({ success: true, count: active.length, data: active });
  }
});

// POST /api/v1/alerts - Trigger/insert new flood alert
router.post('/', async (req: Request, res: Response) => {
  const { lake_id, severity, trigger_reason } = req.body;

  if (!lake_id || !severity || !trigger_reason) {
    return res.status(400).json({ success: false, error: 'Missing lake_id, severity, or trigger_reason' });
  }

  const lake = MOCK_GLACIAL_LAKES.find((l) => l.id === lake_id || l.icimod_code === lake_id || l.name === lake_id);
  const lakeName = lake ? lake.name : lake_id;

  const newAlert: FloodAlert = {
    id: `a-${Date.now()}`,
    lake_id,
    lake_name: lakeName,
    severity: severity as AlertSeverityLevel,
    trigger_reason,
    created_at: new Date().toISOString(),
    resolved_at: null,
  };

  try {
    const [inserted] = await db('flood_alerts')
      .insert({
        lake_id,
        severity,
        trigger_reason,
      })
      .returning(['id', 'lake_id', 'severity', 'trigger_reason', 'created_at', 'resolved_at']);
    return res.status(201).json({ success: true, data: inserted });
  } catch (e) {
    alertsMemoryStore.unshift(newAlert);
    return res.status(201).json({ success: true, data: newAlert });
  }
});

// Resolve alert handler function
const resolveAlertHandler = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const [updated] = await db('flood_alerts')
      .where({ id })
      .update({ resolved_at: new Date().toISOString() })
      .returning('*');

    if (updated) {
      return res.json({ success: true, data: updated });
    }
  } catch (e) {
    const alert = alertsMemoryStore.find((a) => a.id === id);
    if (alert) {
      alert.resolved_at = new Date().toISOString();
      return res.json({ success: true, data: alert });
    }
  }

  return res.status(404).json({ success: false, error: 'Alert not found' });
};

// PATCH & POST /api/v1/alerts/:id/resolve - Mark flood alert as resolved
router.patch('/:id/resolve', resolveAlertHandler);
router.post('/:id/resolve', resolveAlertHandler);

// POST & PATCH /api/v1/alerts/resolve-all - Resolve all active alerts
const resolveAllHandler = async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  try {
    const updated = await db('flood_alerts')
      .whereNull('resolved_at')
      .update({ resolved_at: now })
      .returning('*');
    return res.json({ success: true, count: updated.length, data: updated });
  } catch (e) {
    alertsMemoryStore.forEach((a) => {
      if (!a.resolved_at) a.resolved_at = now;
    });
    return res.json({ success: true, message: 'All alerts resolved' });
  }
};

router.post('/resolve-all', resolveAllHandler);
router.patch('/resolve-all', resolveAllHandler);

export default router;
