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

  it('should encode and decode 18-byte CRC-16-CCITT packet successfully', () => {
    const packet = {
      station_numeric_id: 88,
      timestamp_epoch: 1788452500,
      dominant_freq_hz: 18.2,
      acoustic_db: 74.0,
      water_stage_m: 4.25,
      water_stage_rate_m_min: 0.45,
      tripwire_tripped: false,
      battery_volts: 13.0,
      include_crc: true,
    };

    const buf = EdgeDecoderService.encodeBinaryPacket(packet);
    expect(buf.length).toBe(18);

    const decoded = EdgeDecoderService.decodeBinaryPacket(buf, 'Dudh Koshi Gorge', 'PDGL_NEP_KOSHI_002');
    expect(decoded.station_numeric_id).toBe(88);
    expect(decoded.crc_verified).toBe(true);
    expect(decoded.water_stage_m).toBe(4.25);
  });

  it('should reject corrupted 18-byte CRC frame with CRC-16 verification failed error', () => {
    const packet = {
      station_numeric_id: 88,
      timestamp_epoch: 1788452500,
      dominant_freq_hz: 18.2,
      acoustic_db: 74.0,
      water_stage_m: 4.25,
      water_stage_rate_m_min: 0.45,
      tripwire_tripped: false,
      battery_volts: 13.0,
      include_crc: true,
    };

    const buf = EdgeDecoderService.encodeBinaryPacket(packet);
    expect(buf.length).toBe(18);

    // Corrupt one byte in payload
    buf[4] ^= 0x01;

    expect(() => {
      EdgeDecoderService.decodeBinaryPacket(buf, 'Dudh Koshi Gorge', 'PDGL_NEP_KOSHI_002');
    }).toThrow(/CRC-16 verification failed/);
  });

  it('POST /api/v1/telemetry/iridium-sbd - should reject corrupted CRC frame with 400 Bad Request', async () => {
    const validPacket = EdgeDecoderService.encodeBinaryPacket({
      station_numeric_id: 77,
      timestamp_epoch: Math.floor(Date.now() / 1000),
      dominant_freq_hz: 22.0,
      acoustic_db: 78.0,
      water_stage_m: 3.5,
      water_stage_rate_m_min: 0.3,
      tripwire_tripped: false,
      battery_volts: 12.6,
      include_crc: true,
    });

    // Flip a bit in the hex payload
    const corruptedBuf = Buffer.from(validPacket);
    corruptedBuf[6] ^= 0x02;

    const res = await request(app)
      .post('/api/v1/telemetry/iridium-sbd')
      .send({
        data_hex: corruptedBuf.toString('hex'),
        gorge_name: 'Bhote Koshi Upper Choke',
        lake_id: 'PDGL_NEP_KOSHI_001',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('CRC-16 verification failed');
  });

  it('should clamp out-of-bounds telemetry to safe physical ranges upon decoding', () => {
    // Manually create a 16-byte buffer with extreme values
    const buf = Buffer.alloc(16);
    buf.writeUInt16BE(12, 0);                 // station_id
    buf.writeUInt32BE(1788453000, 2);         // timestamp
    buf.writeUInt16BE(45000, 6);              // freq = 450 Hz (exceeds max 200 Hz)
    buf.writeUInt16BE(18000, 8);              // db = 180 dB (exceeds max 150 dB)
    buf.writeUInt16BE(55000, 10);             // stage = 55 m (exceeds max 30 m)
    buf.writeInt16BE(15000, 12);              // rate = 15 m/min (exceeds max 10 m/min)
    buf.writeUInt8(0, 14);                    // flags
    buf.writeUInt8(280 % 256, 15);            // battery

    const decoded = EdgeDecoderService.decodeBinaryPacket(buf, 'Test Gorge', 'PDGL_TEST');
    expect(decoded.geophone_dominant_freq_hz).toBeLessThanOrEqual(200.0);
    expect(decoded.geophone_acoustic_energy_db).toBeLessThanOrEqual(150.0);
    expect(decoded.water_stage_m).toBeLessThanOrEqual(30.0);
    expect(decoded.water_stage_rate_m_min).toBeLessThanOrEqual(10.0);
  });
});
