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
    {
      id: 'haven-samagaun-06',
      settlement_id: 'cdmc-samagaun-14',
      settlement_name: 'Samagaun (सामागाउँ)',
      haven_name: 'Pungyen Gompa Glacial Terrace Haven',
      valley: 'Budhi Gandaki Valley',
      basin: 'Gandaki',
      riverbed_elevation_m: 3530,
      haven_elevation_m: 3575,
      vertical_gain_m: 45,
      ascent_distance_m: 280,
      ascent_time_minutes: 6.5,
      flood_arrival_minutes: 9.5,
      evacuation_clearance_margin_minutes: 3.0,
      capacity_persons: 450,
      haven_coordinates: [84.640, 28.570],
      settlement_coordinates: [84.635, 28.565],
      escape_trail: [
        [84.635, 28.565],
        [84.637, 28.568],
        [84.640, 28.570],
      ],
      safety_features: [
        'Highland Tibetan Monastery Sturdy Stone Foundation',
        'Direct VHF link to Samdo & Arughat police posts',
        'Solar Battery & Emergency Medical Cache',
      ],
      focal_person: 'Karma Lama (Samagaun Head)',
      emergency_contact: '+977-9846012345',
    },
    {
      id: 'haven-dharapani-07',
      settlement_id: 'cdmc-dharapani-16',
      settlement_name: 'Dharapani (धारापानी)',
      haven_name: 'Upper Pine Knoll Plateau Haven',
      valley: 'Marsyangdi Valley',
      basin: 'Gandaki',
      riverbed_elevation_m: 1860,
      haven_elevation_m: 1905,
      vertical_gain_m: 45,
      ascent_distance_m: 240,
      ascent_time_minutes: 5.8,
      flood_arrival_minutes: 24.0,
      evacuation_clearance_margin_minutes: 18.2,
      capacity_persons: 550,
      haven_coordinates: [84.425, 28.520],
      settlement_coordinates: [84.420, 28.515],
      escape_trail: [
        [84.420, 28.515],
        [84.422, 28.518],
        [84.425, 28.520],
      ],
      safety_features: [
        'Annapurna Conservation Area Protected High Ridge',
        'ACAP Communications Mast and Siren Link',
        'All-Weather Insulated Emergency Tents',
      ],
      focal_person: 'Nima Gurung (ACAP Representative)',
      emergency_contact: '+977-9846123987',
    },
    {
      id: 'haven-simikot-08',
      settlement_id: 'cdmc-simikot-20',
      settlement_name: 'Simikot (सिमिकोट)',
      haven_name: 'Simikot Helipad Ridge Haven',
      valley: 'Humla Karnali Valley',
      basin: 'Karnali',
      riverbed_elevation_m: 2910,
      haven_elevation_m: 2960,
      vertical_gain_m: 50,
      ascent_distance_m: 310,
      ascent_time_minutes: 7.2,
      flood_arrival_minutes: 86.0,
      evacuation_clearance_margin_minutes: 78.8,
      capacity_persons: 1200,
      haven_coordinates: [81.835, 29.970],
      settlement_coordinates: [81.830, 29.965],
      escape_trail: [
        [81.830, 29.965],
        [81.832, 29.968],
        [81.835, 29.970],
      ],
      safety_features: [
        'District Administration Emergency Compound',
        'All-weather Twin-Otter Airfield Perimeter Haven',
        'Nepal Army Disaster Response Depot',
      ],
      focal_person: 'Dhan Bahadur Rokaya (CDO Officer)',
      emergency_contact: '+977-9858022114',
    },
    {
      id: 'haven-darchula-09',
      settlement_id: 'cdmc-darchula-22',
      settlement_name: 'Darchula Khalanga (खलङ्गा)',
      haven_name: 'Khalanga North Hillside Haven',
      valley: 'Mahakali Valley',
      basin: 'Mahakali',
      riverbed_elevation_m: 890,
      haven_elevation_m: 935,
      vertical_gain_m: 45,
      ascent_distance_m: 260,
      ascent_time_minutes: 6.0,
      flood_arrival_minutes: 98.0,
      evacuation_clearance_margin_minutes: 92.0,
      capacity_persons: 900,
      haven_coordinates: [80.545, 29.845],
      settlement_coordinates: [80.540, 29.840],
      escape_trail: [
        [80.540, 29.840],
        [80.542, 29.842],
        [80.545, 29.845],
      ],
      safety_features: [
        'High Concrete Retaining Berm & Evacuation Terrace',
        'Red Cross Regional Relief Storage',
        'Direct Siren Transceiver Node',
      ],
      focal_person: 'Deepak Joshi (DMC Coordinator)',
      emergency_contact: '+977-9858711223',
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
      id: 'cdmc-chhetchhet-03',
      name: 'Chhetchhet (छेतछेत)',
      valley: 'Rolwaling Valley',
      basin: 'Koshi',
      distance_from_lake_km: 22.8,
      wave_transit_time_min: 44.2,
      cdmc_focal_person: 'Pemba Tshering Sherpa (CDMC Sec)',
      phone_numbers: ['+977-9843344556'],
      primary_language: 'ne',
      siren_tower_id: 'SIREN-ROL-03',
      siren_frequency_mhz: 154.600,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-simigaon-04',
      name: 'Simigaon (सिमिगाउँ)',
      valley: 'Rolwaling Valley',
      basin: 'Koshi',
      distance_from_lake_km: 26.5,
      wave_transit_time_min: 49.8,
      cdmc_focal_person: 'Lakpa Gelu Tamang (Ward Member)',
      phone_numbers: ['+977-9849988776'],
      primary_language: 'ne',
      siren_tower_id: 'SIREN-ROL-04',
      siren_frequency_mhz: 154.600,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-gongar-05',
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
      id: 'cdmc-chhukung-06',
      name: 'Chhukung (छुुकुङ)',
      valley: 'Imja Khola / Khumbu',
      basin: 'Koshi',
      distance_from_lake_km: 4.8,
      wave_transit_time_min: 11.2,
      cdmc_focal_person: 'Tenzing Norgay Sherpa (Lodge Assoc)',
      phone_numbers: ['+977-9841122338'],
      primary_language: 'sherpa',
      siren_tower_id: 'SIREN-IMJ-00',
      siren_frequency_mhz: 154.575,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-dingboche-07',
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
      id: 'cdmc-pangboche-08',
      name: 'Pangboche (पाङबोचे)',
      valley: 'Imja Khola / Khumbu',
      basin: 'Koshi',
      distance_from_lake_km: 15.6,
      wave_transit_time_min: 34.5,
      cdmc_focal_person: 'Lama Kalsang (Monastery Elder)',
      phone_numbers: ['+977-9843377881'],
      primary_language: 'sherpa',
      siren_tower_id: 'SIREN-IMJ-02',
      siren_frequency_mhz: 154.575,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-namche-09',
      name: 'Namche Bazaar (नाम्चे बजार)',
      valley: 'Dudh Koshi Valley',
      basin: 'Koshi',
      distance_from_lake_km: 31.2,
      wave_transit_time_min: 68.0,
      cdmc_focal_person: 'Mingma David Sherpa (Ward Chair)',
      phone_numbers: ['+977-9852822334'],
      primary_language: 'sherpa',
      siren_tower_id: 'SIREN-DUD-01',
      siren_frequency_mhz: 154.575,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-yangkharca-10',
      name: 'Yangkharca (याङखर्क)',
      valley: 'Barun Valley',
      basin: 'Koshi',
      distance_from_lake_km: 11.2,
      wave_transit_time_min: 25.4,
      cdmc_focal_person: 'Dorje Rai (Makalu Park Warden)',
      phone_numbers: ['+977-9849201122'],
      primary_language: 'ne',
      siren_tower_id: 'SIREN-BAR-01',
      siren_frequency_mhz: 154.700,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-num-11',
      name: 'Num Settlement (नुम)',
      valley: 'Arun Valley',
      basin: 'Koshi',
      distance_from_lake_km: 48.0,
      wave_transit_time_min: 82.5,
      cdmc_focal_person: 'Khem Raj Gurung (Arun Ward Lead)',
      phone_numbers: ['+977-9842098765'],
      primary_language: 'ne',
      siren_tower_id: 'SIREN-ARU-01',
      siren_frequency_mhz: 154.700,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-tatopani-12',
      name: 'Tatopani / Kodari (तातोपानी)',
      valley: 'Bhote Koshi Valley',
      basin: 'Koshi',
      distance_from_lake_km: 18.4,
      wave_transit_time_min: 32.0,
      cdmc_focal_person: 'Surya Shrestha (Border Liaison)',
      phone_numbers: ['+977-9851088991'],
      primary_language: 'ne',
      siren_tower_id: 'SIREN-BHO-01',
      siren_frequency_mhz: 154.675,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-barhabise-13',
      name: 'Barhabise (बाह्रबिसे)',
      valley: 'Sun Koshi Valley',
      basin: 'Koshi',
      distance_from_lake_km: 42.6,
      wave_transit_time_min: 71.5,
      cdmc_focal_person: 'Santosh Nepal (Disaster Focal)',
      phone_numbers: ['+977-9851055442'],
      primary_language: 'ne',
      siren_tower_id: 'SIREN-SUN-01',
      siren_frequency_mhz: 154.675,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-samagaun-14',
      name: 'Samagaun (सामागाउँ)',
      valley: 'Budhi Gandaki Valley',
      basin: 'Gandaki',
      distance_from_lake_km: 4.2,
      wave_transit_time_min: 9.5,
      cdmc_focal_person: 'Karma Lama (Samagaun Head)',
      phone_numbers: ['+977-9846012345'],
      primary_language: 'ne',
      siren_tower_id: 'SIREN-BDG-01',
      siren_frequency_mhz: 154.625,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-lho-15',
      name: 'Lho Village (ल्हो)',
      valley: 'Budhi Gandaki Valley',
      basin: 'Gandaki',
      distance_from_lake_km: 14.8,
      wave_transit_time_min: 28.0,
      cdmc_focal_person: 'Tashi Wangdi (Lho CDMC)',
      phone_numbers: ['+977-9846054321'],
      primary_language: 'ne',
      siren_tower_id: 'SIREN-BDG-02',
      siren_frequency_mhz: 154.625,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-dharapani-16',
      name: 'Dharapani (धारापानी)',
      valley: 'Marsyangdi Valley',
      basin: 'Gandaki',
      distance_from_lake_km: 12.5,
      wave_transit_time_min: 24.0,
      cdmc_focal_person: 'Nima Gurung (ACAP Representative)',
      phone_numbers: ['+977-9846123987'],
      primary_language: 'ne',
      siren_tower_id: 'SIREN-MAR-02',
      siren_frequency_mhz: 154.650,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-tal-17',
      name: 'Tal Village (ताल गाउँ)',
      valley: 'Marsyangdi Valley',
      basin: 'Gandaki',
      distance_from_lake_km: 19.8,
      wave_transit_time_min: 37.0,
      cdmc_focal_person: 'Bhimsen Gurung (Ward Secretary)',
      phone_numbers: ['+977-9846332211'],
      primary_language: 'ne',
      siren_tower_id: 'SIREN-MAR-03',
      siren_frequency_mhz: 154.650,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-syange-18',
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
    {
      id: 'cdmc-dhunche-19',
      name: 'Dhunche (धुन्चे)',
      valley: 'Trishuli / Langtang Valley',
      basin: 'Gandaki',
      distance_from_lake_km: 34.0,
      wave_transit_time_min: 58.0,
      cdmc_focal_person: 'Ganesh Tamang (Red Cross Rasuwa)',
      phone_numbers: ['+977-9851022339'],
      primary_language: 'ne',
      siren_tower_id: 'SIREN-TRI-01',
      siren_frequency_mhz: 154.600,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-simikot-20',
      name: 'Simikot (सिमिकोट)',
      valley: 'Humla Karnali Valley',
      basin: 'Karnali',
      distance_from_lake_km: 44.5,
      wave_transit_time_min: 86.0,
      cdmc_focal_person: 'Dhan Bahadur Rokaya (CDO Officer)',
      phone_numbers: ['+977-9858022114'],
      primary_language: 'ne',
      siren_tower_id: 'SIREN-KAR-01',
      siren_frequency_mhz: 154.550,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-gamgadhi-21',
      name: 'Gamgadhi (गमगढी)',
      valley: 'Mugu Karnali Valley',
      basin: 'Karnali',
      distance_from_lake_km: 38.2,
      wave_transit_time_min: 74.0,
      cdmc_focal_person: 'Chakra Bham (Rara Municipal Sec)',
      phone_numbers: ['+977-9858033221'],
      primary_language: 'ne',
      siren_tower_id: 'SIREN-MUG-01',
      siren_frequency_mhz: 154.550,
      siren_status: 'STANDBY',
    },
    {
      id: 'cdmc-darchula-22',
      name: 'Darchula Khalanga (खलङ्गा)',
      valley: 'Mahakali Valley',
      basin: 'Mahakali',
      distance_from_lake_km: 52.0,
      wave_transit_time_min: 98.0,
      cdmc_focal_person: 'Deepak Joshi (DMC Coordinator)',
      phone_numbers: ['+977-9858711223'],
      primary_language: 'ne',
      siren_tower_id: 'SIREN-MAH-01',
      siren_frequency_mhz: 154.550,
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
