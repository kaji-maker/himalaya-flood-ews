import request from 'supertest';
import app from '../src/app';
import { SeismicTriggerService } from '../src/services/seismic_trigger.service';
import { GpmPrecipitationService } from '../src/services/gpm_precipitation.service';

describe('Seismic Trigger Hub & NASA GPM IMERG Ingest Tests', () => {
  it('should accurately calculate Haversine distance and Himalayan PGA', () => {
    // Tsho Rolpa is around (27.868, 86.475)
    // Epicenter 20km away
    const dist = SeismicTriggerService.calculateDistanceKm(27.868, 86.475, 27.868, 86.675);
    expect(dist).toBeGreaterThan(15.0);
    expect(dist).toBeLessThan(25.0);

    // Test PGA calculation for Mw 6.5 at 20km
    const pga = SeismicTriggerService.computePga(6.5, 20.0, 10.0);
    expect(pga).toBeGreaterThan(0.20); // Significant shaking

    // Test moraine destabilization classification
    const evalCrit = SeismicTriggerService.evaluateMoraineDestabilization(6.5, 20.0, pga);
    expect(evalCrit.risk).toBe('CRITICAL_MORAINE_FAILURE');
  });

  it('GET /api/v1/telemetry/seismic - should return recent Himalayan arc earthquakes', async () => {
    const res = await request(app).get('/api/v1/telemetry/seismic');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(1);

    const event = res.body.data[0];
    expect(event.magnitude).toBeGreaterThanOrEqual(4.5);
    expect(Array.isArray(event.affected_lakes)).toBe(true);
  });

  it('POST /api/v1/telemetry/seismic/simulate - should process simulated quake and trigger GLOF alerts for nearby lakes', async () => {
    const res = await request(app)
      .post('/api/v1/telemetry/seismic/simulate')
      .send({
        magnitude: 6.2,
        depth_km: 10.0,
        latitude: 27.84,
        longitude: 86.44,
        place: 'Dolakha / Rolwaling Epicenter',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.magnitude).toBe(6.2);
    expect(res.body.alerts_triggered).toBeGreaterThanOrEqual(1);

    // Verify Tsho Rolpa is flagged as critical/high risk
    const tsho = res.body.data.affected_lakes.find((l: any) => l.lake_id === 'l-tsho-rolpa');
    expect(tsho).toBeDefined();
    expect(tsho.destabilization_risk).toBe('CRITICAL_MORAINE_FAILURE');
    expect(tsho.action_triggered).toBe('EMERGENCY_SCADA_AND_NEOC_DISPATCH');
  });

  it('GET /api/v1/telemetry/precipitation/live - should return live GPM IMERG 30-min telemetry for sub-basins', async () => {
    const res = await request(app).get('/api/v1/telemetry/precipitation/live');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(3);

    const koshi = res.body.data.find((b: any) => b.basin_id === 'KOSHI');
    expect(koshi).toBeDefined();
    expect(koshi.sensor).toContain('GPM_IMERG');
    expect(typeof koshi.precip_rate_mm_hr).toBe('number');
  });

  it('POST /api/v1/telemetry/precipitation/simulate-pulse - should simulate extreme cloudburst and trigger pore-pressure alert', async () => {
    const res = await request(app)
      .post('/api/v1/telemetry/precipitation/simulate-pulse')
      .send({
        basin_id: 'KOSHI',
        rate_mm_hr: 32.0,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.precip_rate_mm_hr).toBe(32.0);
    expect(res.body.data.surge_status).toBe('EXTREME_PORE_PRESSURE_SURGE');
    expect(res.body.alert).toBeDefined();
    expect(res.body.alert.severity).toBe('WARNING');
    expect(res.body.alert.trigger_reason).toContain('GPM IMERG EXTREME RAINFALL PULSE');
  });
});
