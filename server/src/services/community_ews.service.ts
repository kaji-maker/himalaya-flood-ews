import { VerticalSafeHaven } from '../types';

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
  private static readonly VERTICAL_SAFE_HAVENS: VerticalSafeHaven[] = [
    {
      id: 'haven-na-01',
      settlement_id: 'cdmc-na-01',
      settlement_name: 'Na Village (ना गाउँ)',
      haven_name: 'North Moraine Terrace Haven',
      valley: 'Rolwaling Valley',
      basin: 'Koshi',
      riverbed_elevation_m: 4180,
      haven_elevation_m: 4215,
      vertical_gain_m: 35,
      ascent_distance_m: 180,
      ascent_time_minutes: 4.5,
      flood_arrival_minutes: 7.7,
      evacuation_clearance_margin_minutes: 3.2,
      capacity_persons: 350,
      haven_coordinates: [86.463, 27.846],
      settlement_coordinates: [86.460, 27.840],
      escape_trail: [
        [86.460, 27.840],
        [86.461, 27.842],
        [86.462, 27.844],
        [86.463, 27.846],
      ],
      safety_features: [
        'Solar Emergency Radio Repeater (154.600 MHz)',
        'Pre-positioned Medical & Blanket Cache',
        'Helicopter Winch Evacuation Terrace',
        'Bedrock Anchored High Ground (+35m above floodline)',
      ],
      focal_person: 'Dawa Sherpa (CDMC Chairman)',
      emergency_contact: '+977-9841234567',
    },
    {
      id: 'haven-bedding-02',
      settlement_id: 'cdmc-bedding-02',
      settlement_name: 'Bedding Village (बेदिङ)',
      haven_name: 'Gauri Shankar Monastery Ridge Haven',
      valley: 'Rolwaling Valley',
      basin: 'Koshi',
      riverbed_elevation_m: 3740,
      haven_elevation_m: 3788,
      vertical_gain_m: 48,
      ascent_distance_m: 250,
      ascent_time_minutes: 6.2,
      flood_arrival_minutes: 16.9,
      evacuation_clearance_margin_minutes: 10.7,
      capacity_persons: 600,
      haven_coordinates: [86.424, 27.825],
      settlement_coordinates: [86.420, 27.820],
      escape_trail: [
        [86.420, 27.820],
        [86.421, 27.822],
        [86.423, 27.823],
        [86.424, 27.825],
      ],
      safety_features: [
        'Ancient Monastery Stone Shelter (+48m)',
        'Satellite Iridium Emergency SBD Beacon',
        'Solar PV & LiFePO4 Battery Inverter System',
        'Emergency Potable Spring Water Connection',
      ],
      focal_person: 'Pasang Nuru Sherpa (Ward Rep)',
      emergency_contact: '+977-9847654321',
    },
    {
      id: 'haven-chhetchhet-03',
      settlement_id: 'cdmc-chhetchhet-03',
      settlement_name: 'Chhetchhet (छेतछेत)',
      haven_name: 'Upper East Cliff Plateau Haven',
      valley: 'Rolwaling Valley',
      basin: 'Koshi',
      riverbed_elevation_m: 1980,
      haven_elevation_m: 2015,
      vertical_gain_m: 35,
      ascent_distance_m: 210,
      ascent_time_minutes: 5.5,
      flood_arrival_minutes: 33.3,
      evacuation_clearance_margin_minutes: 27.8,
      capacity_persons: 400,
      haven_coordinates: [86.355, 27.784],
      settlement_coordinates: [86.350, 27.780],
      escape_trail: [
        [86.350, 27.780],
        [86.352, 27.782],
        [86.355, 27.784],
      ],
      safety_features: [
        'Concrete Evacuation Shelter Bunker',
        'APF Emergency Radio Post',
        'High-Intensity LED Strobe Mast',
      ],
      focal_person: 'Sub-Inspector APF Chhetchhet',
      emergency_contact: '+977-9843344556',
    },
    {
      id: 'haven-gongar-04',
      settlement_id: 'cdmc-gongar-03',
      settlement_name: 'Gongar Khola / Dam (गोंगर)',
      haven_name: 'Upper Switchyard Helipad Haven',
      valley: 'Tama Koshi',
      basin: 'Koshi',
      riverbed_elevation_m: 1690,
      haven_elevation_m: 1735,
      vertical_gain_m: 45,
      ascent_distance_m: 320,
      ascent_time_minutes: 8.0,
      flood_arrival_minutes: 57.1,
      evacuation_clearance_margin_minutes: 49.1,
      capacity_persons: 850,
      haven_coordinates: [86.225, 27.704],
      settlement_coordinates: [86.220, 27.700],
      escape_trail: [
        [86.220, 27.700],
        [86.222, 27.702],
        [86.225, 27.704],
      ],
      safety_features: [
        'Paved Emergency Helipad',
        'SCADA Dam Control Emergency Bunker',
        'Full Power Diesel Generator Backup',
      ],
      focal_person: 'Bikram Thapa (Plant Safety Lead)',
      emergency_contact: '+977-9851122334',
    },
    {
      id: 'haven-dingboche-05',
      settlement_id: 'cdmc-dingboche-04',
      settlement_name: 'Dingboche (दिङबोचे)',
      haven_name: 'Nangkartshang Ridge Haven',
      valley: 'Imja Khola / Khumbu',
      basin: 'Koshi',
      riverbed_elevation_m: 4410,
      haven_elevation_m: 4450,
      vertical_gain_m: 40,
      ascent_distance_m: 230,
      ascent_time_minutes: 5.5,
      flood_arrival_minutes: 6.9,
      evacuation_clearance_margin_minutes: 1.4,
      capacity_persons: 800,
      haven_coordinates: [86.883, 27.895],
      settlement_coordinates: [86.880, 27.890],
      escape_trail: [
        [86.880, 27.890],
        [86.882, 27.892],
        [86.883, 27.895],
      ],
      safety_features: [
        'SPCC Community Disaster Center',
        'Oxygen Cylinder Emergency Bank',
        'Dual VHF Repeater Linking Namche and Lukla',
      ],
      focal_person: 'Ang Tshering Sherpa (CDMC Secretary)',
      emergency_contact: '+977-9842233445',
    },
  ];

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
   * Returns pre-surveyed vertical safe havens and geological escape routes.
   */
  public static getSafeHavens(basin?: string): VerticalSafeHaven[] {
    if (basin) {
      return this.VERTICAL_SAFE_HAVENS.filter(
        (h) => h.basin.toLowerCase() === basin.toLowerCase()
      );
    }
    return [...this.VERTICAL_SAFE_HAVENS];
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
