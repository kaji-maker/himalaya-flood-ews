import { Router, Request, Response } from 'express';
import { MultiChannelDispatchService } from '../services/dispatch.service';
import { CommunityEWSService } from '../services/community_ews.service';
import { FloodAlert } from '../types';

const router = Router();

/**
 * POST /api/v1/dispatch/test
 * Triggers an emergency broadcast across SMS, Telegram, and Hydropower SCADA channels.
 */
router.post('/test', async (req: Request, res: Response) => {
  const { lake_id, lake_name, severity, trigger_reason } = req.body;

  const mockAlert: FloodAlert = {
    id: `alt-test-${Date.now()}`,
    lake_id: lake_id || 'l-tsho-rolpa',
    lake_name: lake_name || 'Tsho Rolpa Glacial Lake',
    severity: severity || 'EMERGENCY',
    trigger_reason:
      trigger_reason ||
      'EMERGENCY GLOF Broadcast Test: Hydrodynamic wave propagation simulation and automated dam spillway gate opening trigger.',
    created_at: new Date().toISOString(),
    resolved_at: null,
  };

  const dispatchResults = await MultiChannelDispatchService.dispatchEmergencyAlert(mockAlert);

  return res.status(200).json({
    success: true,
    message: `Emergency broadcast transmitted to ${dispatchResults.length} channels`,
    alert: mockAlert,
    dispatch_results: dispatchResults,
  });
});

/**
 * GET /api/v1/dispatch/communities
 * List monitored downstream valley settlements, CDMC focal points, and siren towers.
 */
router.get('/communities', (req: Request, res: Response) => {
  const { basin } = req.query;
  const villages = CommunityEWSService.getVillages(basin as string);
  return res.json({
    success: true,
    count: villages.length,
    data: villages,
  });
});

/**
 * GET /api/v1/dispatch/safe-havens
 * List pre-surveyed vertical safe havens (+25m to +45m) and geological foot-scramble escape routes.
 */
router.get('/safe-havens', (req: Request, res: Response) => {
  const { basin } = req.query;
  const havens = CommunityEWSService.getSafeHavens(basin as string);
  return res.json({
    success: true,
    count: havens.length,
    data: havens,
  });
});

/**
 * POST /api/v1/dispatch/community-sms
 * Broadcast localized multi-lingual emergency bulletins (Nepali, Sherpa, English) via NTC / Ncell.
 */
router.post('/community-sms', (req: Request, res: Response) => {
  const { lake_name, valley, severity, target_basin } = req.body;
  if (!lake_name) {
    return res.status(400).json({ success: false, error: 'Missing required lake_name parameter' });
  }

  const dispatches = CommunityEWSService.broadcastSMS({
    lake_name,
    valley,
    severity,
    target_basin,
  });

  return res.status(200).json({
    success: true,
    message: `Multi-lingual emergency bulletins dispatched to ${dispatches.length} community contacts`,
    count: dispatches.length,
    data: dispatches,
  });
});

/**
 * POST /api/v1/dispatch/sirens/trigger
 * Actuate remote solar siren towers with 120 dB acoustic pattern and xenon strobe beacon.
 */
router.post('/sirens/trigger', (req: Request, res: Response) => {
  const { siren_tower_id, pattern, duration_seconds } = req.body;
  if (!siren_tower_id) {
    return res.status(400).json({ success: false, error: 'Missing required siren_tower_id' });
  }

  const result = CommunityEWSService.triggerSiren({
    siren_tower_id,
    pattern,
    duration_seconds,
  });

  return res.status(200).json({
    success: true,
    message: `RF siren trigger packet dispatched to ${result.siren_tower_id} (${result.village_name})`,
    data: result,
  });
});

export default router;
