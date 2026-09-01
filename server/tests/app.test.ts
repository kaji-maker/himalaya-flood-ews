import request from 'supertest';
import app from '../src/app';

describe('Himalaya Flood EWS - Server Integration Tests', () => {
  it('GET /health - should return healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.system).toContain('Himalaya');
  });

  it('GET /api/v1/basins - should return major Himalayan river basins', async () => {
    const res = await request(app).get('/api/v1/basins');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/lakes - should list glacial lakes with risk metadata', async () => {
    const res = await request(app).get('/api/v1/lakes');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    
    const lake = res.body.data[0];
    expect(lake).toHaveProperty('name');
    expect(lake).toHaveProperty('current_risk_score');
  });

  it('GET /api/v1/alerts - should list active GLOF warnings', async () => {
    const res = await request(app).get('/api/v1/alerts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/v1/alerts/evaluate - should ingest risk evaluation and return triggered alert', async () => {
    const payload = {
      lake_id: 'Tsho Rolpa',
      risk_score: 0.89,
      alert_level: 'CRITICAL',
      triggers: {
        expansion_rate_pct_yr: 19.5,
        accumulated_72h_rain_mm: 155.0,
      },
    };

    const res = await request(app).post('/api/v1/alerts/evaluate').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.alert_level).toBe('CRITICAL');
  });

  it('PATCH /api/v1/alerts/:id/acknowledge - should acknowledge an existing alert', async () => {
    const alertsRes = await request(app).get('/api/v1/alerts');
    const alertId = alertsRes.body.data[0]?.id;

    if (alertId) {
      const res = await request(app).patch(`/api/v1/alerts/${alertId}/acknowledge`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ACKNOWLEDGED');
    }
  });

  it('POST /api/v1/telemetry/precipitation - should record rainfall telemetry', async () => {
    const res = await request(app).post('/api/v1/telemetry/precipitation').send({
      basin_id: 'KOSHI',
      precip_rate_mm_hr: 8.5,
      accumulated_24h_mm: 64.0,
      accumulated_72h_mm: 130.0,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.precip_rate_mm_hr).toBe(8.5);
  });
});
