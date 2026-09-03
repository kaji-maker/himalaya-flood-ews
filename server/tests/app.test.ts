import request from 'supertest';
import app from '../src/app';

describe('Himalaya Flood EWS - REST API Test Suite', () => {
  it('GET /health - should return healthy system status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /health/deep - should return system components and memory metrics', async () => {
    const res = await request(app).get('/health/deep');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('components');
    expect(res.body).toHaveProperty('system_metrics');
    expect(res.body.system_metrics).toHaveProperty('heap_used_mb');
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

  it('GET /api/v1/lakes/:id/report - should generate official ICIMOD/DHM Hazard Dossier', async () => {
    const res = await request(app).get('/api/v1/lakes/PDGL_NEP_KOSHI_001/report');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('document_title');
    expect(res.body.data).toHaveProperty('two_axis_hazard_evaluation');
    expect(res.body.data).toHaveProperty('hydrodynamic_breach_scenarios');
    expect(res.body.data.downstream_impact_matrix.length).toBeGreaterThan(0);
  });

  it('POST /api/v1/dispatch/test - should broadcast alert to SMS, Telegram, and Hydropower SCADA channels', async () => {
    const res = await request(app).post('/api/v1/dispatch/test').send({
      lake_id: 'l-tsho-rolpa',
      lake_name: 'Tsho Rolpa',
      severity: 'EMERGENCY',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dispatch_results.length).toBeGreaterThan(0);
    expect(res.body.dispatch_results[0]).toHaveProperty('status');
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

  it('POST /api/v1/ingest/observation - should reject malformed payload with 400 Bad Request', async () => {
    const invalidPayload = {
      lake_id: '', // Empty lake_id
      sensor_name: 'Sentinel-2A MSI L2A',
      area_sqm: -500, // Negative area
    };

    const res = await request(app).post('/api/v1/ingest/observation').send(invalidPayload);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body).toHaveProperty('details');
  });

  it('GET /api/v1/alerts/cap.xml - should generate valid OASIS CAP-XML 1.2 feed', async () => {
    const res = await request(app).get('/api/v1/alerts/cap.xml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('xml');
    expect(res.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(res.text).toContain('<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">');
    expect(res.text).toContain('<event>Glacial Lake Outburst Flood (GLOF)</event>');
  });

  it('POST /api/v1/telemetry/insar - should ingest InSAR moraine displacement and trigger Cue-and-Slew tasking', async () => {
    const payload = {
      lake_id: 'l1111111-1111-1111-1111-111111111111',
      mean_los_velocity_mm_year: -28.5,
      max_subsidence_mm_year: -38.2, // Critical collapse subsidence
      mean_coherence: 0.38,          // Coherence loss
    };

    const res = await request(app).post('/api/v1/telemetry/insar').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.telemetry.deformation_rating).toBe('CRITICAL_DESTABILIZATION');
    expect(res.body.data.tasking_order).not.toBeNull();
    expect(res.body.data.tasking_order.priority).toBe('IMMEDIATE_INTERVENTION');
    expect(res.body.data.tasking_order.target_sensor).toBe('SkySat-Submeter');
  });

  it('POST /api/v1/telemetry/edge-sensors - should detect slurry surge and actuate SCADA spillway gates', async () => {
    const payload = {
      station_id: 'st-gorge-tamakoshi-01',
      gorge_name: 'Upper Rolwaling Gorge',
      lake_id: 'l1111111-1111-1111-1111-111111111111',
      geophone_dominant_freq_hz: 24.0,     // Debris flow boulder roll band
      geophone_acoustic_energy_db: 82.5,   // Extreme acoustic energy > 70 dB
      water_stage_m: 5.6,
      water_stage_rate_m_min: 0.75,        // Flash wave rise rate > 0.5 m/min
      tripwire_status: 'INTACT',
    };

    const res = await request(app).post('/api/v1/telemetry/edge-sensors').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reading.is_slurry_surge_detected).toBe(true);
    expect(res.body.data.reading.alarm_level).toBe('CRITICAL_SURGE');
    expect(res.body.data.scada_command).not.toBeNull();
    expect(res.body.data.scada_command.action).toBe('EMERGENCY_FULL_OPEN');
    expect(res.body.data.scada_command.facility_name).toContain('Upper Tama Koshi');
    expect(res.body.data.alert).not.toBeNull();
    expect(res.body.data.alert.severity).toBe('EMERGENCY');
  });

  it('GET /api/v1/telemetry/cue-slew - should return active Cue-and-Slew high-resolution optical tasking orders', async () => {
    const res = await request(app).get('/api/v1/telemetry/cue-slew');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBeGreaterThan(0);
  });
});

