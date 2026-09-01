import { Router, Request, Response } from 'express';
import { MOCK_FLOOD_ALERTS, MOCK_GLACIAL_LAKES, pool } from '../services/db.service';
import { FloodAlert, AlertSeverityLevel } from '../types';

const router = Router();
let alertsMemoryStore: FloodAlert[] = [...MOCK_FLOOD_ALERTS];

// GET /api/v1/alerts - Query flood alerts
router.get('/', async (req: Request, res: Response) => {
  const { severity, active_only } = req.query;

  try {
    let query = `
      SELECT f.id, f.lake_id, g.name AS lake_name, f.severity,
             f.trigger_reason, f.created_at, f.resolved_at
      FROM flood_alerts f
      JOIN glacial_lakes g ON f.lake_id = g.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (severity) {
      params.push(severity);
      query += ` AND f.severity = $${params.length}`;
    }
    if (active_only === 'true') {
      query += ` AND f.resolved_at IS NULL`;
    }

    query += ` ORDER BY f.created_at DESC;`;
    const result = await pool.query(query, params);
    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (e) {
    let filtered = [...alertsMemoryStore];
    if (severity) {
      filtered = filtered.filter((a) => a.severity === severity);
    }
    if (active_only === 'true') {
      filtered = filtered.filter((a) => !a.resolved_at);
    }
    return res.json({ success: true, count: filtered.length, data: filtered });
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
    const result = await pool.query(
      `INSERT INTO flood_alerts (lake_id, severity, trigger_reason)
       VALUES ($1, $2, $3)
       RETURNING id, lake_id, severity, trigger_reason, created_at, resolved_at;`,
      [lake_id, severity, trigger_reason]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    alertsMemoryStore.unshift(newAlert);
    return res.status(201).json({ success: true, data: newAlert });
  }
});

// PATCH /api/v1/alerts/:id/resolve - Mark flood alert as resolved
router.patch('/:id/resolve', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE flood_alerts SET resolved_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *;`,
      [id]
    );
    if (result.rows.length > 0) {
      return res.json({ success: true, data: result.rows[0] });
    }
  } catch (e) {
    const alert = alertsMemoryStore.find((a) => a.id === id);
    if (alert) {
      alert.resolved_at = new Date().toISOString();
      return res.json({ success: true, data: alert });
    }
  }

  return res.status(404).json({ success: false, error: 'Alert not found' });
});

export default router;
