import { Router, Request, Response } from 'express';
import { alertService } from '../services/alert.service';
import { AlertLevel, AlertStatus } from '../types';

const router = Router();

// GET /api/v1/alerts - Query active & past alerts
router.get('/', (req: Request, res: Response) => {
  const { status, alert_level, basin_code } = req.query;

  const alerts = alertService.getAllAlerts({
    status: status as AlertStatus,
    alert_level: alert_level as AlertLevel,
    basin_code: basin_code as string,
  });

  return res.json({
    success: true,
    count: alerts.length,
    data: alerts,
  });
});

// GET /api/v1/alerts/:id - Get alert details
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const alert = alertService.getAlertById(id);

  if (!alert) {
    return res.status(404).json({ success: false, error: 'Alert not found' });
  }

  return res.json({ success: true, data: alert });
});

// POST /api/v1/alerts/evaluate - Ingest GLOF risk evaluation from Python Workers
router.post('/evaluate', (req: Request, res: Response) => {
  const { lake_id, risk_score, alert_level, triggers, triggers_list } = req.body;

  if (!lake_id || risk_score === undefined || !alert_level) {
    return res.status(400).json({ success: false, error: 'Missing required evaluation fields' });
  }

  const alert = alertService.createOrUpdateFromRiskAssessment({
    lake_id,
    risk_score: Number(risk_score),
    alert_level,
    triggers: triggers || {},
    triggers_list,
  });

  return res.status(201).json({
    success: true,
    message: alert ? `Alert triggered with level ${alert.alert_level}` : 'Normal conditions. No alert required.',
    data: alert,
  });
});

// PATCH /api/v1/alerts/:id/acknowledge - Acknowledge alert
router.patch('/:id/acknowledge', (req: Request, res: Response) => {
  const { id } = req.params;
  const alert = alertService.acknowledgeAlert(id);

  if (!alert) {
    return res.status(404).json({ success: false, error: 'Alert not found' });
  }

  return res.json({ success: true, message: 'Alert acknowledged', data: alert });
});

// PATCH /api/v1/alerts/:id/resolve - Resolve alert
router.patch('/:id/resolve', (req: Request, res: Response) => {
  const { id } = req.params;
  const alert = alertService.resolveAlert(id);

  if (!alert) {
    return res.status(404).json({ success: false, error: 'Alert not found' });
  }

  return res.json({ success: true, message: 'Alert resolved', data: alert });
});

export default router;
