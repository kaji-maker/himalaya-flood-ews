import { Router, Request, Response } from 'express';
import { backtestCanonicalHydrology, replayHydrology } from '../services/hydrology_backtest.service';
import { HydrologyValidationError } from '../services/hydrology.service';
import {
  getNebiusConfigurationStatus, NebiusConfigurationError, NebiusRequestError,
  summarizeHydrologyData, verifyNebiusModel,
} from '../services/nebius.service';

const router = Router();

function sendReplayError(error: unknown, res: Response) {
  if (error instanceof HydrologyValidationError) return res.status(error.status).json({ success: false, error: error.message });
  return res.status(503).json({ success: false, error: 'Canonical replay archive unavailable' });
}

router.post('/hydrology/replay', (req: Request, res: Response) => {
  try { return res.json({ success: true, data: replayHydrology(req.body) }); }
  catch (error) { return sendReplayError(error, res); }
});
router.get('/hydrology/backtest', async (req: Request, res: Response) => {
  try { return res.json({ success: true, data: await backtestCanonicalHydrology(req.query) }); }
  catch (error) { return sendReplayError(error, res); }
});

function sendResearchError(error: unknown, res: Response) {
  if (error instanceof NebiusConfigurationError) {
    return res.status(503).json({ success: false, error: error.message, code: 'NEBIUS_CONFIGURATION_ERROR' });
  }
  if (error instanceof NebiusRequestError) {
    const status = error.code === 'INVALID_RESEARCH_INPUT' ? 400
      : error.code === 'NEBIUS_TIMEOUT' ? 504
      : error.status === 429 ? 429
      : error.status === 401 || error.status === 403 ? 502 : 503;
    return res.status(status).json({ success: false, error: error.message, code: error.code, metadata: error.metadata });
  }
  return res.status(503).json({ success: false, error: 'Experimental summary unavailable', code: 'NEBIUS_UNAVAILABLE' });
}

router.post('/nebius/hydrology-summary', async (req: Request, res: Response) => {
  try {
    return res.json({ success: true, data: await summarizeHydrologyData(req.body) });
  } catch (error) { return sendResearchError(error, res); }
});

router.get('/nebius/status', (_req: Request, res: Response) => {
  try { return res.json({ success: true, data: getNebiusConfigurationStatus() }); }
  catch (error) { return sendResearchError(error, res); }
});

router.post('/nebius/probe', async (_req: Request, res: Response) => {
  try { return res.json({ success: true, data: await verifyNebiusModel() }); }
  catch (error) { return sendResearchError(error, res); }
});

export default router;
