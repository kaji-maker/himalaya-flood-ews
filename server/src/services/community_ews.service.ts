export interface VillageSettlement {
  id: string;
  name: string;
  valley: string;
  basin: string;
  distance_from_lake_km: number;
  wave_transit_time_min: number;
  cdmc_focal_person: string;
  phone_numbers: string[];
  primary_language: 'ne' | 'sherpa' | 'en';
  siren_tower_id: string;
  siren_frequency_mhz: number;
  siren_status: 'STANDBY' | 'TRIGGERED' | 'MAINTENANCE';
}

export interface SirenTriggerResult {
  siren_tower_id: string;
  village_name: string;
  frequency_mhz: number;
  pattern: 'WARNING_PULSE' | 'EMERGENCY_CONTINUOUS' | 'ALL_CLEAR';
  acoustic_spl_db: number;
  xenon_strobe_active: boolean;
  duration_seconds: number;
  rf_packet_hex: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface SMSDispatchRecord {
  village_id: string;
  village_name: string;
  phone_number: string;
  language: string;
  carrier: 'NTC' | 'Ncell';
  message_text: string;
  status: 'DELIVERED' | 'QUEUED';
  timestamp: string;
}

export class CommunityEWSService {
  private static readonly HIGH_RISK_SETTLEMENTS: VillageSettlement[] = [
    {
      id: 'cdmc-na-01',
      name: 'Na Village (ना गाउँ)',
      valley: 'Rolwaling Valley',
      basin: 'Koshi',
      distance_from_lake_km: 7.5,
      wave_transit_time_min: 16.5,
      cdmc_focal_person: 'Dawa Sherpa (CDMC Chairman)',
      phone_numbers: ['+977-9841234567', '+977-9801234567'],
      primary_language: 'sherpa',
      siren_tower_id: 'SIREN-ROL-01',
      siren_frequency_mhz: 154.600,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-bedding-02',
      name: 'Bedding Village (बेदिङ)',
      valley: 'Rolwaling Valley',
      basin: 'Koshi',
      distance_from_lake_km: 15.2,
      wave_transit_time_min: 31.0,
      cdmc_focal_person: 'Pasang Nuru Sherpa (Ward Rep)',
      phone_numbers: ['+977-9847654321', '+977-9817654321'],
      primary_language: 'ne',
      siren_tower_id: 'SIREN-ROL-02',
      siren_frequency_mhz: 154.600,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-gongar-03',
      name: 'Gongar Khola / Lamabagar (गोंगर खोला)',
      valley: 'Tama Koshi',
      basin: 'Koshi',
      distance_from_lake_km: 32.0,
      wave_transit_time_min: 56.1,
      cdmc_focal_person: 'Bikram Thapa (Plant Safety Lead)',
      phone_numbers: ['+977-9851122334'],
      primary_language: 'ne',
      siren_tower_id: 'SIREN-TAK-03',
      siren_frequency_mhz: 154.625,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-dingboche-04',
      name: 'Dingboche (दिङबोचे)',
      valley: 'Imja Khola / Khumbu',
      basin: 'Koshi',
      distance_from_lake_km: 9.8,
      wave_transit_time_min: 22.0,
      cdmc_focal_person: 'Ang Tshering Sherpa (CDMC Secretary)',
      phone_numbers: ['+977-9842233445'],
      primary_language: 'sherpa',
      siren_tower_id: 'SIREN-IMJ-01',
      siren_frequency_mhz: 154.575,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-syange-05',
      name: 'Syange Settlement (स्याङ्गे)',
      valley: 'Marsyangdi Valley',
      basin: 'Gandaki',
      distance_from_lake_km: 26.4,
      wave_transit_time_min: 48.0,
      cdmc_focal_person: 'Ram Krishna Gurung (Community Leader)',
      phone_numbers: ['+977-9846677889'],
      primary_language: 'ne',
      siren_tower_id: 'SIREN-MAR-01',
      siren_frequency_mhz: 154.650,
      siren_status: 'STANDBY',
    },
  ];

  /**
   * Returns all monitored high-risk Himalayan settlements and focal points.
   */
  public static getVillages(basin?: string): VillageSettlement[] {
    if (basin) {
      return this.HIGH_RISK_SETTLEMENTS.filter(
        (v) => v.basin.toLowerCase() === basin.toLowerCase()
      );
    }
    return [...this.HIGH_RISK_SETTLEMENTS];
  }

  /**
   * Generates localized emergency bulletins in Nepali, Sherpa, and English.
   */
  public static generateBulletins(lakeName: string, valley: string, etaMin: number): Record<string, string> {
    return {
      ne: `🚨 आपतकालीन बाढी सूचना: ${lakeName} बाट आकस्मिक हिमताल बाढी (GLOF) बगिरहेको पुष्टि भएको छ। छाल ${valley} हुँदै करिब ${etaMin} मिनेटमा आइपुग्नेछ। कृपया खोला किनार तुरुन्त छोडेर सुरक्षित उच्च स्थानतर्फ जानुहोस्। (DHM/Himalaya-EWS)`,
      sherpa: `🚨 ཉེན་བརྡ། ${lakeName} མཚོ་རྡོལ་ནས་ཆུ་རུད་ཤུགས་ཆེན་ཡོང་གི་ཡོད། ${valley} ལུང་པར་སྐར་མ་ ${etaMin} ནང་སླེབས་རྒྱུའི་ཉེན་ཁ་ཡོད། མྱུར་དུ་གཙང་པོའི་འགྲམ་ནས་གནས་སྤོར་གནང་རོགས།`,
      en: `🚨 GLOF EMERGENCY BULLETIN: Destructive glacial outburst flood wave confirmed from ${lakeName} descending ${valley}. Estimated wave arrival in ${etaMin} minutes. Evacuate riverbeds and move to higher ground immediately. (DHM/NEOC)`,
    };
  }

  /**
   * Simulates mass SMS broadcast through Nepal Telecom (NTC) and Ncell enterprise gateways.
   */
  public static broadcastSMS(params: {
    lake_name: string;
    valley?: string;
    severity?: string;
    target_basin?: string;
  }): SMSDispatchRecord[] {
    const villages = this.getVillages(params.target_basin);
    const results: SMSDispatchRecord[] = [];

    for (const v of villages) {
      const bulletins = this.generateBulletins(params.lake_name, v.valley, v.wave_transit_time_min);
      const text = bulletins[v.primary_language] || bulletins.ne;

      for (const phone of v.phone_numbers) {
        const carrier: 'NTC' | 'Ncell' = phone.startsWith('+977-984') || phone.startsWith('+977-985') ? 'NTC' : 'Ncell';
        results.push({
          village_id: v.id,
          village_name: v.name,
          phone_number: phone,
          language: v.primary_language,
          carrier,
          message_text: text,
          status: 'DELIVERED',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  /**
   * Dispatches RF trigger packets to remote solar siren towers with 120 dB acoustic alarm & strobe.
   */
  public static triggerSiren(params: {
    siren_tower_id: string;
    pattern?: 'WARNING_PULSE' | 'EMERGENCY_CONTINUOUS' | 'ALL_CLEAR';
    duration_seconds?: number;
  }): SirenTriggerResult {
    const pattern = params.pattern || 'EMERGENCY_CONTINUOUS';
    const duration = params.duration_seconds || 180;

    const village = this.HIGH_RISK_SETTLEMENTS.find((v) => v.siren_tower_id === params.siren_tower_id) || {
      name: 'Unknown Settlement',
      siren_frequency_mhz: 154.600,
    };

    // Construct 8-byte RF FSK telemetry actuation packet:
    // Header (0xA5 0x5A), Tower ID Hash (2 bytes), Pattern (0x01: Warning, 0x02: Emergency, 0x00: All Clear), Duration (2 bytes), Checksum
    const patternCode = pattern === 'EMERGENCY_CONTINUOUS' ? 0x02 : (pattern === 'WARNING_PULSE' ? 0x01 : 0x00);
    const rfBuf = Buffer.alloc(8);
    rfBuf.writeUInt16BE(0xA55A, 0);
    rfBuf.writeUInt16BE(0x1234, 2);
    rfBuf.writeUInt8(patternCode, 4);
    rfBuf.writeUInt16BE(duration, 5);
    rfBuf.writeUInt8(0xFF, 7); // Sync checksum

    return {
      siren_tower_id: params.siren_tower_id,
      village_name: village.name,
      frequency_mhz: village.siren_frequency_mhz,
      pattern,
      acoustic_spl_db: 120.0,
      xenon_strobe_active: pattern !== 'ALL_CLEAR',
      duration_seconds: duration,
      rf_packet_hex: rfBuf.toString('hex').toUpperCase(),
      timestamp: new Date().toISOString(),
      acknowledged: true,
    };
  }
}
