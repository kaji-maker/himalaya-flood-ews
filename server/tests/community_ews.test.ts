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
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toContain('Syange');
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
});
