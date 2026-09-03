export interface DecodedEdgePacket {
  station_numeric_id: number;
  station_id: string;
  timestamp: string;
  battery_volts: number;
  geophone_dominant_freq_hz: number;
  geophone_acoustic_energy_db: number;
  water_stage_m: number;
  water_stage_rate_m_min: number;
  tripwire_status: 'INTACT' | 'TRIPPED';
  is_slurry_surge_flagged: boolean;
  solar_charging: boolean;
  low_battery: boolean;
  lake_id: string;
  gorge_name: string;
}

export class EdgeDecoderService {
  public static readonly FRAME_SIZE = 16; // 16 bytes

  /**
   * Encodes telemetry parameters into a 16-byte binary satellite buffer (Big-Endian).
   */
  public static encodeBinaryPacket(data: {
    station_numeric_id: number;
    timestamp_epoch: number;
    dominant_freq_hz: number;
    acoustic_db: number;
    water_stage_m: number;
    water_stage_rate_m_min: number;
    tripwire_tripped?: boolean;
    battery_volts?: number;
  }): Buffer {
    const buf = Buffer.alloc(this.FRAME_SIZE);

    const freqScaled = Math.round(data.dominant_freq_hz * 100);
    const dbScaled = Math.round(data.acoustic_db * 100);
    const stageScaled = Math.round(data.water_stage_m * 1000);
    const rateScaled = Math.round(data.water_stage_rate_m_min * 1000);

    let flags = 0;
    if (data.tripwire_tripped) flags |= 0x01;
    if (data.acoustic_db >= 70.0 && data.dominant_freq_hz >= 10.0 && data.dominant_freq_hz <= 45.0) {
      flags |= 0x08; // Slurry surge flag
    }

    const battScaled = Math.round((data.battery_volts || 12.6) * 10);

    buf.writeUInt16BE(data.station_numeric_id, 0);
    buf.writeUInt32BE(data.timestamp_epoch, 2);
    buf.writeUInt16BE(freqScaled, 6);
    buf.writeUInt16BE(dbScaled, 8);
    buf.writeUInt16BE(stageScaled, 10);
    buf.writeInt16BE(rateScaled, 12);
    buf.writeUInt8(flags, 14);
    buf.writeUInt8(battScaled, 15);

    return buf;
  }

  /**
   * Decompresses a 16-byte raw binary frame from Iridium SBD or LoRaWAN.
   */
  public static decodeBinaryPacket(
    buf: Buffer,
    gorgeName: string = 'Tama Koshi Gorge Choke Point',
    lakeId: string = 'PDGL_NEP_KOSHI_001'
  ): DecodedEdgePacket {
    if (buf.length < this.FRAME_SIZE) {
      throw new Error(`Packet undersized (${buf.length} bytes < ${this.FRAME_SIZE} bytes required)`);
    }

    const stationId = buf.readUInt16BE(0);
    const epoch = buf.readUInt32BE(2);
    const freqScaled = buf.readUInt16BE(6);
    const dbScaled = buf.readUInt16BE(8);
    const stageScaled = buf.readUInt16BE(10);
    const rateScaled = buf.readInt16BE(12);
    const flags = buf.readUInt8(14);
    const battScaled = buf.readUInt8(15);

    const dominantFreq = Number((freqScaled / 100.0).toFixed(2));
    const acousticDb = Number((dbScaled / 100.0).toFixed(2));
    const stageM = Number((stageScaled / 1000.0).toFixed(3));
    const stageRate = Number((rateScaled / 1000.0).toFixed(3));
    const batteryVolts = Number((battScaled / 10.0).toFixed(1));

    return {
      station_numeric_id: stationId,
      station_id: `gorge-node-${stationId.toString().padStart(4, '0')}`,
      timestamp: new Date(epoch * 1000).toISOString(),
      battery_volts: batteryVolts,
      geophone_dominant_freq_hz: dominantFreq,
      geophone_acoustic_energy_db: acousticDb,
      water_stage_m: stageM,
      water_stage_rate_m_min: stageRate,
      tripwire_status: (flags & 0x01) ? 'TRIPPED' : 'INTACT',
      solar_charging: Boolean(flags & 0x02),
      low_battery: Boolean(flags & 0x04),
      is_slurry_surge_flagged: Boolean(flags & 0x08),
      lake_id: lakeId,
      gorge_name: gorgeName,
    };
  }

  /**
   * Decodes an ASCII hex string payload.
   */
  public static decodeHexString(
    hexStr: string,
    gorgeName?: string,
    lakeId?: string
  ): DecodedEdgePacket {
    const cleanHex = hexStr.trim().replace(/\s+/g, '').replace(/^0x/i, '');
    const buf = Buffer.from(cleanHex, 'hex');
    return this.decodeBinaryPacket(buf, gorgeName, lakeId);
  }

  /**
   * Decodes a Base64-encoded payload (standard in ChirpStack / TTN).
   */
  public static decodeBase64String(
    b64Str: string,
    gorgeName?: string,
    lakeId?: string
  ): DecodedEdgePacket {
    const buf = Buffer.from(b64Str.trim(), 'base64');
    return this.decodeBinaryPacket(buf, gorgeName, lakeId);
  }
}
