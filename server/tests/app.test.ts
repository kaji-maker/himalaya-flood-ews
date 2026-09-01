import request from 'supertest';
import app from '../src/app';

describe('Himalaya Flood EWS - REST API Test Suite', () => {
  it('GET /health - should return healthy system status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /api/v1/lakes - should return lakes filtered by basin and risk status (danger_level)', async () => {
    // 1. All lakes
    const allRes = await request(app).get('/api/v1/lakes');
    expect(allRes.status).toBe(200);
    expect(allRes.body.success).toBe(true);
    expect(allRes.body.data.length).toBeGreaterThan(0);

    // 2. Filtered by basin
    const koshiRes = await request(app).get('/api/v1/lakes?basin=Koshi');
    expect(koshiRes.status).toBe(200);
    expect(koshiRes.body.success).toBe(true);
    koshiRes.body.data.forEach((lake: any) => {
      expect(lake.basin_name).toContain('Koshi');
    });

    // 3. Filtered by risk status
    const criticalRes = await request(app).get('/api/v1/lakes?danger_level=CRITICAL');
    expect(criticalRes.status).toBe(200);
    expect(criticalRes.body.success).toBe(true);
    criticalRes.body.data.forEach((lake: any) => {
      expect(lake.danger_level).toBe('CRITICAL');
    });
  });

  it('GET /api/v1/lakes/:id/history - should return time-series area trends and GeoJSON polygons', async () => {
    const res = await request(app).get('/api/v1/lakes/PDGL_NEP_KOSHI_001/history');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('time_series');
    expect(res.body).toHaveProperty('geojson');
    expect(res.body.geojson.type).toBe('FeatureCollection');
    expect(Array.isArray(res.body.geojson.features)).toBe(true);
    expect(res.body.geojson.features.length).toBeGreaterThan(0);
    expect(res.body.geojson.features[0]).toHaveProperty('geometry');
    expect(res.body.geojson.features[0].properties).toHaveProperty('area_sqm');
  });

  it('POST /api/v1/ingest/observation - should ingest worker observation and trigger risk evaluation', async () => {
    const payload = {
      lake_id: 'l1111111-1111-1111-1111-111111111111',
      observation_date: new Date().toISOString(),
      sensor_name: 'Sentinel-2A MSI L2A',
      area_sqm: 1950000.0, // Significant growth (+26.6% over initial baseline)
      mean_mndwi: 0.76,
      cloud_cover_pct: 1.2,
      precip_48h_mm: 58.4,  // Heavy rainfall (>50mm triggers WARNING)
      geojson_geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [86.468, 27.855],
            [86.485, 27.862],
            [86.495, 27.873],
            [86.488, 27.881],
            [86.468, 27.855],
          ],
        ],
      },
    };

    const res = await request(app).post('/api/v1/ingest/observation').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('observation');
    expect(res.body.data).toHaveProperty('alert_triggered');
    expect(res.body.data.alert_triggered).toBe(true);
    expect(res.body.data.alert).not.toBeNull();
    expect(['WARNING', 'EMERGENCY']).toContain(res.body.data.alert.severity);
  });
});
