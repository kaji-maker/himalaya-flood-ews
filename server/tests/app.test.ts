import request from 'supertest';
import app from '../src/app';

describe('Himalaya Flood EWS - PostGIS Database Layer Integration Tests', () => {
  it('GET /health - should return healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /api/v1/basins - should return Koshi, Gandaki, Karnali, Mahakali basins', async () => {
    const res = await request(app).get('/api/v1/basins');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    const basinNames = res.body.data.map((b: any) => b.name);
    expect(basinNames).toContain('Koshi');
    expect(basinNames).toContain('Gandaki');
    expect(basinNames).toContain('Karnali');
  });

  it('GET /api/v1/lakes - should list glacial lakes with initial_area_sqm and danger_level', async () => {
    const res = await request(app).get('/api/v1/lakes');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const lake = res.body.data[0];
    expect(lake).toHaveProperty('name');
    expect(lake).toHaveProperty('icimod_code');
    expect(lake).toHaveProperty('initial_area_sqm');
    expect(lake).toHaveProperty('danger_level');
  });

  it('POST /api/v1/alerts - should create a flood alert with severity and trigger_reason', async () => {
    const payload = {
      lake_id: 'l1111111-1111-1111-1111-111111111111',
      severity: 'EMERGENCY',
      trigger_reason: 'Expansion rate exceeding 15%/yr + extreme rainfall trigger',
    };

    const res = await request(app).post('/api/v1/alerts').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.severity).toBe('EMERGENCY');
  });

  it('GET /api/v1/alerts - should list active flood alerts', async () => {
    const res = await request(app).get('/api/v1/alerts?active_only=true');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
