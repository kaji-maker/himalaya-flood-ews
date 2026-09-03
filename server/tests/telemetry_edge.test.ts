import request from 'supertest';
import app from '../src/app';
import { EdgeDecoderService } from '../src/services/edge_decoder.service';

describe('Edge Satellite & LoRaWAN Webhooks with SCADA Integration', () => {
  it('should encode and decode 16-byte binary packet accurately', () => {
    const original = {
      station_numeric_id: 104,
      timestamp_epoch: 1788452000,
      dominant_freq_hz: 22.45,
      acoustic_db: 84.50,
      water_stage_m: 6.250,
      water_stage_rate_m_min: 0.850,
      tripwire_tripped: true,
      battery_volts: 12.8,
    };

    const buf = EdgeDecoderService.encodeBinaryPacket(original);
    expect(buf.length).toBe(16);

    const decoded = EdgeDecoderService.decodeBinaryPacket(buf, 'Rolwaling Choke 1', 'PDGL_NEP_KOSHI_001');
    expect(decoded.station_numeric_id).toBe(104);
    expect(decoded.station_id).toBe('gorge-node-0104');
    expect(decoded.geophone_dominant_freq_hz).toBe(22.45);
    expect(decoded.geophone_acoustic_energy_db).toBe(84.50);
    expect(decoded.water_stage_m).toBe(6.25);
    expect(decoded.water_stage_rate_m_min).toBe(0.85);
    expect(decoded.tripwire_status).toBe('TRIPPED');
    expect(decoded.battery_volts).toBe(12.8);
    expect(decoded.is_slurry_surge_flagged).toBe(true);
  });

  it('POST /api/v1/telemetry/iridium-sbd - should ingest hex packet and trigger SCADA radial spillway opening', async () => {
    // Generate a 16-byte slurry surge packet: 20 Hz, 82 dB, +0.9 m/min rise, tripwire severed
    const surgePacket = EdgeDecoderService.encodeBinaryPacket({
      station_numeric_id: 14,
      timestamp_epoch: Math.floor(Date.now() / 1000),
      dominant_freq_hz: 20.0,
      acoustic_db: 82.0,
      water_stage_m: 4.80,
      water_stage_rate_m_min: 0.90,
      tripwire_tripped: true,
      battery_volts: 12.5,
    });

    const res = await request(app)
      .post('/api/v1/telemetry/iridium-sbd')
      .send({
        data_hex: surgePacket.toString('hex'),
        gorge_name: 'Tama Koshi Deep Gorge',
        lake_id: 'PDGL_NEP_KOSHI_001',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.protocol).toBe('IRIDIUM_SBD');
    expect(res.body.decoded_packet.station_numeric_id).toBe(14);
    expect(res.body.decoded_packet.tripwire_status).toBe('TRIPPED');

    // SCADA Actuation & Industrial Dispatch checks
    const evaluation = res.body.evaluation;
    expect(evaluation.reading.is_slurry_surge_detected).toBe(true);
    expect(evaluation.reading.alarm_level).toBe('CRITICAL_SURGE');
    expect(evaluation.scada_command).not.toBeNull();
    expect(evaluation.scada_command.action).toBe('EMERGENCY_FULL_OPEN');
    expect(evaluation.scada_command.facility_name).toContain('Upper Tama Koshi');

    // IEC 60870-5-104 & Modbus payload checks
    expect(evaluation.industrial_scada_payload).not.toBeNull();
    expect(evaluation.industrial_scada_payload.iec104_frames.length).toBe(3);
    expect(evaluation.industrial_scada_payload.iec104_frames[0].type_id).toBe(45);
    expect(evaluation.industrial_scada_payload.digital_signature).toBeDefined();
    expect(evaluation.industrial_scada_payload.digital_signature.length).toBe(64);
  });

  it('POST /api/v1/telemetry/lorawan - should ingest base64 uplink from Marsyangdi gorge and evaluate normally', async () => {
    // Normal water flow packet: 60 Hz, 42 dB, 0.0 m/min rate, tripwire intact
    const normalPacket = EdgeDecoderService.encodeBinaryPacket({
      station_numeric_id: 22,
      timestamp_epoch: Math.floor(Date.now() / 1000),
      dominant_freq_hz: 60.0,
      acoustic_db: 42.0,
      water_stage_m: 1.25,
      water_stage_rate_m_min: 0.0,
      tripwire_tripped: false,
      battery_volts: 13.1,
    });

    const res = await request(app)
      .post('/api/v1/telemetry/lorawan')
      .send({
        data: normalPacket.toString('base64'),
        devEui: 'A840410000000102',
        fPort: 1,
        gorge_name: 'Marsyangdi Alpine Choke',
        lake_id: 'PDGL_NEP_GANDAKI_001',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.protocol).toBe('LORAWAN_UPLINK');
    expect(res.body.decoded_packet.station_numeric_id).toBe(22);
    expect(res.body.decoded_packet.tripwire_status).toBe('INTACT');
    expect(res.body.evaluation.reading.is_slurry_surge_detected).toBe(false);
    expect(res.body.evaluation.scada_command).toBeNull();
  });
});
