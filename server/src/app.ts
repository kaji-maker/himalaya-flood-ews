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

// OpenAPI 3.0 Specification
const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Himalaya Flood & GLOF Early Warning System API',
    version: '1.0.0',
    description: 'Near-real-time geospatial monitoring, telemetry, and early warning for Himalayan Glacial Lake Outburst Floods (GLOFs).',
    contact: {
      name: 'Himalaya EWS Engineering Team',
    },
  },
  servers: [
    {
      url: `http://localhost:${PORT}/api/v1`,
      description: 'Local Development Server',
    },
  ],
  paths: {
    '/basins': {
      get: {
        summary: 'List major river basins with boundary geometries (EPSG:4326)',
        responses: {
          '200': { description: 'Successful response' },
        },
      },
    },
    '/lakes': {
      get: {
        summary: 'Query monitored glacial lakes inventory with spatial and risk filters',
        parameters: [
          { name: 'basin_code', in: 'query', schema: { type: 'string' } },
          { name: 'pdgl_status', in: 'query', schema: { type: 'string' } },
          { name: 'min_risk', in: 'query', schema: { type: 'number' } },
        ],
        responses: {
          '200': { description: 'List of glacial lakes' },
        },
      },
    },
    '/lakes/{id}/observations': {
      get: {
        summary: 'Retrieve multi-temporal surface area observation history for a glacial lake',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Time series observations' },
        },
      },
    },
    '/alerts': {
      get: {
        summary: 'List active and historical GLOF alerts',
        responses: {
          '200': { description: 'List of alerts' },
        },
      },
    },
    '/alerts/evaluate': {
      post: {
        summary: 'Ingest Python worker risk evaluation and trigger warning dispatch',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  lake_id: { type: 'string' },
                  risk_score: { type: 'number' },
                  alert_level: { type: 'string' },
                  triggers: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Alert evaluation recorded' },
        },
      },
    },
    '/telemetry/precipitation': {
      get: {
        summary: 'Query NASA GPM IMERG 72h precipitation records',
        responses: {
          '200': { description: 'Precipitation telemetry data' },
        },
      },
      post: {
        summary: 'Ingest GPM or ground station precipitation measurement',
        responses: {
          '201': { description: 'Telemetry point ingested' },
        },
      },
    },
  },
};

// OpenAPI Spec Endpoint
app.get('/api/v1/openapi.json', (req: Request, res: Response) => {
  res.json(openApiSpec);
});

// Healthcheck
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    system: 'Himalaya Flood & GLOF Early Warning System',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    openapi: '/api/v1/openapi.json',
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
    console.log(`[Himalaya EWS Server] Healthcheck: http://localhost:${PORT}/health`);
    console.log(`[Himalaya EWS Server] OpenAPI Spec: http://localhost:${PORT}/api/v1/openapi.json`);
  });
}

export default app;
