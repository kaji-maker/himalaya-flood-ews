import request from 'supertest';
import app from '../src/app';
import { CommunityEWSService } from '../src/services/community_ews.service';

describe('Community Early Warning & Last-Mile Dissemination (SMS & Solar Sirens)', () => {
  it('GET /api/v1/dispatch/communities - should list all monitored high-risk villages', async () => {
    const res = await request(app).get('/api/v1/dispatch/communities');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(5);

    const na = res.body.data.find((v: any) => v.name.includes('Na Village'));
    expect(na).toBeDefined();
    expect(na.valley).toBe('Rolwaling Valley');
    expect(na.wave_transit_time_min).toBe(16.5);
    expect(na.primary_language).toBe('sherpa');
    expect(na.siren_tower_id).toBe('SIREN-ROL-01');
  });

  it('GET /api/v1/dispatch/communities?basin=Gandaki - should filter settlements by river basin', async () => {
    const res = await request(app).get('/api/v1/dispatch/communities?basin=Gandaki');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.some((v: any) => v.name.includes('Syange'))).toBe(true);
  });

  it('GET /api/v1/dispatch/hydropower-cascades - should return all 8 monitored hydropower plants', async () => {
    const res = await request(app).get('/api/v1/dispatch/hydropower-cascades');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(8);
    expect(res.body.total_capacity_mw).toBeGreaterThanOrEqual(3000);
    const tamakoshi = res.body.data.find((p: any) => p.id === 'hp-upper-tamakoshi');
    expect(tamakoshi).toBeDefined();
    expect(tamakoshi.capacity_mw).toBe(456);
  });

  it('POST /api/v1/dispatch/hydropower-cascades/:id/interlock - should trip radial gates with IEC 60870-5-104 ASDU', async () => {
    const res = await request(app)
      .post('/api/v1/dispatch/hydropower-cascades/hp-upper-tamakoshi/interlock')
      .send({ action: 'EMERGENCY_FULL_OPEN', reason: 'GLOF Surge Test' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.iec104_frame.apdu_hex).toContain('68 0e');
    expect(res.body.data.radial_gates_opened).toBe(4);
    expect(res.body.data.updated_status).toBe('FULL_SPILLWAY_DISCHARGE');
  });

  it('GET /api/v1/dispatch/dhm-stations - should list real-time DHM hydrometric stations', async () => {
    const res = await request(app).get('/api/v1/dispatch/dhm-stations');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(8);
    const gongar = res.body.data.find((s: any) => s.station_number === 680);
    expect(gongar).toBeDefined();
    expect(gongar.river).toBe('Tama Koshi');
  });

  it('POST /api/v1/dispatch/community-sms - should broadcast localized multi-lingual bulletins', async () => {
    const res = await request(app)
      .post('/api/v1/dispatch/community-sms')
      .send({
        lake_name: 'Tsho Rolpa',
        valley: 'Rolwaling Valley',
        severity: 'EMERGENCY',
        target_basin: 'Koshi',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);

    // Verify multi-lingual coverage
    const texts = res.body.data.map((d: any) => d.message_text);
    const hasNepali = texts.some((t: string) => t.includes('आपतकालीन बाढी सूचना'));
    const hasSherpa = texts.some((t: string) => t.includes('ཉེན་བརྡ'));

    expect(hasNepali).toBe(true);
    expect(hasSherpa).toBe(true);

    // Verify carrier tagging
    const carriers = res.body.data.map((d: any) => d.carrier);
    expect(carriers).toContain('NTC');
  });

  it('POST /api/v1/dispatch/sirens/trigger - should actuate remote 120 dB siren tower with RF packet', async () => {
    const res = await request(app)
      .post('/api/v1/dispatch/sirens/trigger')
      .send({
        siren_tower_id: 'SIREN-ROL-01',
        pattern: 'EMERGENCY_CONTINUOUS',
        duration_seconds: 120,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.siren_tower_id).toBe('SIREN-ROL-01');
    expect(res.body.data.village_name).toContain('Na Village');
    expect(res.body.data.acoustic_spl_db).toBe(120.0);
    expect(res.body.data.xenon_strobe_active).toBe(true);
    expect(res.body.data.duration_seconds).toBe(120);
    expect(res.body.data.rf_packet_hex.startsWith('A55A')).toBe(true); // RF preamble sync bytes
    expect(res.body.data.acknowledged).toBe(true);
  });

  it('POST /api/v1/dispatch/sirens/trigger - should reject missing siren_tower_id', async () => {
    const res = await request(app)
      .post('/api/v1/dispatch/sirens/trigger')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/dispatch/historical-glofs - should return landmark Himalayan GLOF catalog', async () => {
    const res = await request(app).get('/api/v1/dispatch/historical-glofs');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(11);
    const bhotekoshi = res.body.data.find((e: any) => e.id === 'glof-bhotekoshi-2026');
    expect(bhotekoshi).toBeDefined();
    expect(bhotekoshi.year).toBe(2026);
    expect(bhotekoshi.peak_discharge_cms).toBe(8800);
    const digTsho = res.body.data.find((e: any) => e.id === 'glof-dig-tsho-1985');
    expect(digTsho).toBeDefined();
    expect(digTsho.peak_discharge_cms).toBe(1600);
    expect(digTsho.trigger_mechanism).toBe('ICE_AVALANCHE');
  });

  it('GET /api/v1/dispatch/historical-glofs?basin=Koshi - should filter historical events by basin', async () => {
    const res = await request(app).get('/api/v1/dispatch/historical-glofs?basin=Koshi');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);
    expect(res.body.data.every((e: any) => e.basin.toLowerCase().includes('koshi'))).toBe(true);
  });

  it('GET /api/v1/telemetry/insar - should return multi-temporal InSAR deformation records for all 14 lakes', async () => {
    const res = await request(app).get('/api/v1/telemetry/insar');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(14);
    const barun = res.body.data.find((i: any) => i.lake_name.includes('Lower Barun'));
    expect(barun).toBeDefined();
    expect(barun.deformation_rating).toBe('CRITICAL_DESTABILIZATION');
  });
});


