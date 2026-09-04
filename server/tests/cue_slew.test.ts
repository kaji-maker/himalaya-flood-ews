import request from 'supertest';
import app from '../src/app';
import { CueSlewTaskingService } from '../src/services/cue_slew_tasking.service';

describe('Cue-and-Slew Satellite Tasking & InSAR SBAS Deformation Suite', () => {
  it('GET /api/v1/telemetry/cue-slew - should return active orders and constellation fleet', async () => {
    const res = await request(app).get('/api/v1/telemetry/cue-slew');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(Array.isArray(res.body.fleet)).toBe(true);
    expect(res.body.fleet.some((f: any) => f.constellation === 'SkySat-Constellation')).toBe(true);
  });

  it('GET /api/v1/telemetry/cue-slew/constellations - should return technical specs of all 4 constellations', async () => {
    const res = await request(app).get('/api/v1/telemetry/cue-slew/constellations');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(4);
    const names = res.body.data.map((c: any) => c.constellation);
    expect(names).toContain('SkySat-Constellation');
    expect(names).toContain('PlanetScope-SuperDove');
    expect(names).toContain('WorldView-3');
    expect(names).toContain('Sentinel-1-SAR');
  });

  it('POST /api/v1/telemetry/cue-slew/order - should create and enqueue rapid optical tasking order', async () => {
    const payload = {
      lake_id: 'l-thulagi',
      icimod_code: 'PDGL_NEP_GANDAKI_001',
      lake_name: 'Thulagi Lake (Manaslu)',
      category: 'INSAR_SUBSIDENCE',
      severity: 'CRITICAL',
      description: 'Moraine crest accelerating subsidence past -22 mm/yr under monsoon saturation',
      trigger_value: -22.4,
      trigger_unit: 'mm/yr',
      sensor: 'SkySat-Submeter',
    };

    const res = await request(app).post('/api/v1/telemetry/cue-slew/order').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.tasking_code).toContain('CS-');
    expect(res.body.data.target_sensor).toBe('SkySat-Submeter');
    expect(res.body.data.target_gsd_meters).toBe(0.50);
    expect(res.body.data.priority).toBe('IMMEDIATE_INTERVENTION');
    expect(res.body.data.status).toBe('TASKED');
    expect(res.body.data.predicted_pass).toHaveProperty('pass_window_utc');
    expect(res.body.data.cv_inspection_targets.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/telemetry/insar-deformation/:lakeId - should return 6-year Sentinel-1 InSAR SBAS time series', async () => {
    // Tsho Rolpa
    const tshoRes = await request(app).get('/api/v1/telemetry/insar-deformation/PDGL_NEP_KOSHI_001');
    expect(tshoRes.status).toBe(200);
    expect(tshoRes.body.success).toBe(true);
    expect(tshoRes.body.data.lake_name).toContain('Tsho Rolpa');
    expect(tshoRes.body.data.mean_velocity_mm_year).toBeLessThan(-20);
    expect(tshoRes.body.data.hazard_classification).toBe('ACCELERATED_SUBSIDENCE');
    expect(Array.isArray(tshoRes.body.data.points)).toBe(true);
    expect(tshoRes.body.data.points.length).toBeGreaterThan(50);
    expect(tshoRes.body.data.points[0]).toHaveProperty('los_displacement_mm');
    expect(tshoRes.body.data.points[0]).toHaveProperty('coherence');

    // South Lhonak (Critical Creep pre-breach)
    const lhonakRes = await request(app).get('/api/v1/telemetry/insar-deformation/PDGL_IND_SIKKIM_001');
    expect(lhonakRes.status).toBe(200);
    expect(lhonakRes.body.data.lake_name).toContain('South Lhonak');
    expect(lhonakRes.body.data.hazard_classification).toBe('CRITICAL_CREEP');
    expect(lhonakRes.body.data.mean_velocity_mm_year).toBeLessThan(-30);
  });
});
