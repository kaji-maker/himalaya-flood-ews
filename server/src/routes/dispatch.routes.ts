import { Router, Request, Response } from 'express';
import { MultiChannelDispatchService } from '../services/dispatch.service';
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

export default router;
