import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import lakesRouter from './routes/lakes.routes';
import alertsRouter from './routes/alerts.routes';
import telemetryRouter from './routes/telemetry.routes';
import ingestRouter from './routes/ingest.routes';
import capRouter from './routes/cap.routes';
import dispatchRouter from './routes/dispatch.routes';
import reportsRouter from './routes/reports.routes';
import { checkDatabaseHealth } from './services/db.service';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 4000;

// Security & Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '15mb' }));

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
        summary: 'Return all glacial lakes filtered by basin and current danger level / risk status',
        parameters: [
          { name: 'basin', in: 'query', schema: { type: 'string' } },
          { name: 'danger_level', in: 'query', schema: { type: 'string' } },
          { name: 'risk_status', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'List of glacial lakes' },
        },
      },
    },
    '/lakes/{id}/history': {
      get: {
        summary: 'Return time-series surface area trends and historical observation polygons as GeoJSON',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Time series observations and GeoJSON FeatureCollection' },
        },
      },
    },
    '/lakes/{id}/report': {
      get: {
        summary: 'Generate official ICIMOD/DHM-compliant GLOF Hazard Assessment Dossier',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'ICIMOD/DHM GLOF Hazard Assessment Dossier' },
        },
      },
    },
    '/ingest/observation': {
      post: {
        summary: 'Ingest newly computed observation from Python worker and trigger automated risk evaluation',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['lake_id', 'sensor_name', 'area_sqm'],
                properties: {
                  lake_id: { type: 'string' },
                  observation_date: { type: 'string' },
                  sensor_name: { type: 'string' },
                  area_sqm: { type: 'number' },
                  mean_mndwi: { type: 'number' },
                  cloud_cover_pct: { type: 'number' },
                  geojson_geometry: { type: 'object' },
                  precip_48h_mm: { type: 'number' },
                  dam_distortion_detected: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Observation ingested and risk evaluation triggered' },
        },
      },
    },
    '/alerts': {
      get: {
        summary: 'List active and historical flood alerts',
        responses: {
          '200': { description: 'List of alerts' },
        },
      },
    },
    '/alerts/cap.xml': {
      get: {
        summary: 'Generate OASIS Common Alerting Protocol (CAP-XML v1.2) XML feed',
        responses: {
          '200': { description: 'CAP-XML 1.2 Feed' },
        },
      },
    },
    '/dispatch/test': {
      post: {
        summary: 'Broadcast simulated emergency alert to SMS, Telegram, and Hydropower SCADA channels',
        responses: {
          '200': { description: 'Emergency broadcast transmitted' },
        },
      },
    },
  },
};

// OpenAPI Spec Endpoint
app.get('/api/v1/openapi.json', (req: Request, res: Response) => {
  res.json(openApiSpec);
});

// Basic Healthcheck
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    system: 'Himalaya Flood & GLOF Early Warning System',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    openapi: '/api/v1/openapi.json',
  });
});

// Deep Healthcheck (PostGIS connectivity, memory, uptime)
app.get('/health/deep', async (req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();
  const memory = process.memoryUsage();

  const isHealthy = dbHealth.status !== 'offline';
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    system: 'Himalaya Flood & GLOF Early Warning System',
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    components: {
      api: { status: 'healthy' },
      database: dbHealth,
    },
    system_metrics: {
      heap_used_mb: Math.round(memory.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(memory.heapTotal / 1024 / 1024),
      rss_mb: Math.round(memory.rss / 1024 / 1024),
    },
  });
});

// API Routes
app.use('/api/v1', lakesRouter);
app.use('/api/v1', reportsRouter);
app.use('/api/v1/alerts', alertsRouter);
app.use('/api/v1/alerts', capRouter);
app.use('/api/v1/dispatch', dispatchRouter);
app.use('/api/v1/telemetry', telemetryRouter);
app.use('/api/v1/ingest', ingestRouter);

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
    console.log(`[Himalaya EWS Server] Deep Health: http://localhost:${PORT}/health/deep`);
    console.log(`[Himalaya EWS Server] OpenAPI Spec: http://localhost:${PORT}/api/v1/openapi.json`);
    console.log(`[Himalaya EWS Server] CAP-XML Feed: http://localhost:${PORT}/api/v1/alerts/cap.xml`);
  });
}

export default app;
