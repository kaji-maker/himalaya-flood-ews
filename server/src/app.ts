import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import lakesRouter from './routes/lakes.routes';
import alertsRouter from './routes/alerts.routes';
import telemetryRouter from './routes/telemetry.routes';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 4000;

// Security & Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Healthcheck
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    system: 'Himalaya Flood & GLOF Early Warning System',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/v1', lakesRouter);
app.use('/api/v1/alerts', alertsRouter);
app.use('/api/v1/telemetry', telemetryRouter);

// Root Mock Webhook Receiver for testing dispatchers
app.post('/api/v1/alerts/webhook-mock', (req: Request, res: Response) => {
  console.log('[MOCK-WEBHOOK] Received Alert Webhook Payload:', JSON.stringify(req.body, null, 2));
  res.json({ received: true });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error Handler]', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// Start Server if run directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Himalaya EWS Server] Running on http://localhost:${PORT}`);
    console.log(`[Himalaya EWS Server] Healthcheck available at http://localhost:${PORT}/health`);
  });
}

export default app;
