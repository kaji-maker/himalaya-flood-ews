import { GlacialLake, ObservationPoint, PrecipitationPoint } from '@/types';

export interface DownstreamReach {
  name: string;
  dist: string;
  time: string;
  stage: string;
  q: string;
  alert: 'IMMEDIATE' | 'HIGH' | 'MODERATE';
}

export interface LakeHydroProfile {
  coupled_hydropower: string;
  insar_velocity_mm_yr: number;
  insar_coherence: number;
  insar_rating: 'CRITICAL_DESTABILIZATION' | 'ACTIVE_CREEP' | 'STABLE';
  target_sensor: string;
  target_gsd: string;
  geophone_db: number;
  stage_rate: string;
  scene_identifier: string;
  solar_zenith_deg: number;
  susceptibility_score: number;
  trigger_urgency_score: number;
  combined_hazard_index: number;
  risk_quadrant: 'CRITICAL_DUAL_TRIGGER' | 'HIGH_SUSCEPTIBILITY_WATCH' | 'TRIGGERED_TRANSIENT_WARNING' | 'DORMANT_STABLE';
  estimated_volume_mcm: number;
  downstream_schedule: DownstreamReach[];
}

export const LAKE_HYDRO_PROFILES: Record<string, LakeHydroProfile> = {
  // 1. Galong Co / Cirenmaco (Poiqu / Bhote Koshi Transboundary)
  PDGL_NEP_KOSHI_007: {
    coupled_hydropower: 'Upper Bhotekoshi (102 MW) / Bhotekoshi Hydro (45 MW)',
    insar_velocity_mm_yr: -31.6,
    insar_coherence: 0.84,
    insar_rating: 'CRITICAL_DESTABILIZATION',
    target_sensor: 'SkySat-Submeter',
    target_gsd: '0.50m GSD',
    geophone_db: 84.6,
    stage_rate: '+0.85 m/min',
    scene_identifier: 'S2B_MSIL2A_20260902_T45RVH_POIKU',
    solar_zenith_deg: 51.8,
    susceptibility_score: 0.94,
    trigger_urgency_score: 0.89,
    combined_hazard_index: 0.84,
    risk_quadrant: 'CRITICAL_DUAL_TRIGGER',
    estimated_volume_mcm: 18.5,
    downstream_schedule: [
      { name: 'Zhangmu / Kodari Border', dist: '4.2 km', time: '5.1 min', stage: '+48.2 m', q: '68,400 m³/s', alert: 'IMMEDIATE' },
      { name: 'Liping Border Post', dist: '9.5 km', time: '11.4 min', stage: '+41.5 m', q: '59,200 m³/s', alert: 'IMMEDIATE' },
      { name: 'Tatopani Hot Springs', dist: '18.0 km', time: '21.6 min', stage: '+33.0 m', q: '48,700 m³/s', alert: 'HIGH' },
      { name: 'Barhabise Bazaar', dist: '34.5 km', time: '41.2 min', stage: '+24.6 m', q: '36,900 m³/s', alert: 'HIGH' },
      { name: 'Bhotekoshi Barrage', dist: '46.0 km', time: '55.0 min', stage: '+18.4 m', q: '28,500 m³/s', alert: 'MODERATE' },
    ],
  },

  // 2. Tsho Rolpa (Rolwaling / Tama Koshi)
  PDGL_NEP_KOSHI_001: {
    coupled_hydropower: 'Upper Tamakoshi (456 MW) / Gongar Khola Intake',
    insar_velocity_mm_yr: -26.4,
    insar_coherence: 0.88,
    insar_rating: 'CRITICAL_DESTABILIZATION',
    target_sensor: 'WorldView-3',
    target_gsd: '0.31m GSD',
    geophone_db: 74.8,
    stage_rate: '+0.54 m/min',
    scene_identifier: 'S2A_MSIL2A_20260901_T45RVG_ROLW',
    solar_zenith_deg: 54.2,
    susceptibility_score: 0.88,
    trigger_urgency_score: 0.82,
    combined_hazard_index: 0.72,
    risk_quadrant: 'CRITICAL_DUAL_TRIGGER',
    estimated_volume_mcm: 85.9,
    downstream_schedule: [
      { name: 'Na Village', dist: '6.5 km', time: '7.7 min', stage: '+54.4 m', q: '72,860 m³/s', alert: 'IMMEDIATE' },
      { name: 'Bedding', dist: '14.2 km', time: '16.9 min', stage: '+45.2 m', q: '64,410 m³/s', alert: 'IMMEDIATE' },
      { name: 'Chhetchhet', dist: '28.0 km', time: '33.3 min', stage: '+33.8 m', q: '51,650 m³/s', alert: 'HIGH' },
      { name: 'Simigaon', dist: '36.5 km', time: '43.5 min', stage: '+28.7 m', q: '45,080 m³/s', alert: 'HIGH' },
      { name: 'Gongar Hydro Dam', dist: '48.0 km', time: '57.1 min', stage: '+23.4 m', q: '37,500 m³/s', alert: 'MODERATE' },
    ],
  },

  // 3. Imja Tsho (Everest / Dudh Koshi)
  PDGL_NEP_KOSHI_002: {
    coupled_hydropower: 'Dudh Koshi Hydro (635 MW Proposed) / Thame Micro-Hydro',
    insar_velocity_mm_yr: -14.8,
    insar_coherence: 0.86,
    insar_rating: 'ACTIVE_CREEP',
    target_sensor: 'Pléiades Neo',
    target_gsd: '0.30m GSD',
    geophone_db: 59.2,
    stage_rate: '+0.22 m/min',
    scene_identifier: 'S2B_MSIL2A_20260831_T45RWH_KHUMB',
    solar_zenith_deg: 53.1,
    susceptibility_score: 0.84,
    trigger_urgency_score: 0.68,
    combined_hazard_index: 0.57,
    risk_quadrant: 'HIGH_SUSCEPTIBILITY_WATCH',
    estimated_volume_mcm: 75.8,
    downstream_schedule: [
      { name: 'Chhukung', dist: '3.8 km', time: '4.5 min', stage: '+38.5 m', q: '54,200 m³/s', alert: 'IMMEDIATE' },
      { name: 'Dingboche', dist: '8.4 km', time: '10.1 min', stage: '+32.4 m', q: '46,800 m³/s', alert: 'IMMEDIATE' },
      { name: 'Pangboche', dist: '15.6 km', time: '18.7 min', stage: '+26.1 m', q: '38,100 m³/s', alert: 'HIGH' },
      { name: 'Tengboche Monastery', dist: '22.5 km', time: '27.0 min', stage: '+21.8 m', q: '31,400 m³/s', alert: 'HIGH' },
      { name: 'Namche Bazaar / Larja Bridge', dist: '35.0 km', time: '42.0 min', stage: '+16.5 m', q: '24,000 m³/s', alert: 'MODERATE' },
    ],
  },

  // 4. Birendra Lake (Manaslu / Budhi Gandaki)
  PDGL_NEP_GANDAKI_002: {
    coupled_hydropower: 'Budhi Gandaki Hydro (1200 MW Proposed) / Nyak Weir',
    insar_velocity_mm_yr: -38.5,
    insar_coherence: 0.79,
    insar_rating: 'CRITICAL_DESTABILIZATION',
    target_sensor: 'SkySat-Submeter',
    target_gsd: '0.50m GSD',
    geophone_db: 89.1,
    stage_rate: '+1.12 m/min',
    scene_identifier: 'S2A_MSIL2A_20260902_T45RTH_MANAS',
    solar_zenith_deg: 49.6,
    susceptibility_score: 0.91,
    trigger_urgency_score: 0.85,
    combined_hazard_index: 0.77,
    risk_quadrant: 'CRITICAL_DUAL_TRIGGER',
    estimated_volume_mcm: 14.2,
    downstream_schedule: [
      { name: 'Samagaun', dist: '2.8 km', time: '3.2 min', stage: '+46.8 m', q: '62,500 m³/s', alert: 'IMMEDIATE' },
      { name: 'Lho Village', dist: '11.5 km', time: '13.5 min', stage: '+37.4 m', q: '49,800 m³/s', alert: 'IMMEDIATE' },
      { name: 'Namrung', dist: '21.0 km', time: '24.8 min', stage: '+29.5 m', q: '39,200 m³/s', alert: 'HIGH' },
      { name: 'Prok / Bihi', dist: '32.5 km', time: '38.4 min', stage: '+22.8 m', q: '30,100 m³/s', alert: 'HIGH' },
      { name: 'Jagat / Budhi Gandaki', dist: '47.0 km', time: '55.5 min', stage: '+16.9 m', q: '22,400 m³/s', alert: 'MODERATE' },
    ],
  },

  // 5. Thulagi Lake (Marsyangdi / Manaslu)
  PDGL_NEP_GANDAKI_001: {
    coupled_hydropower: 'Marsyangdi Hydro (69 MW) / Middle Marsyangdi (70 MW)',
    insar_velocity_mm_yr: -8.2,
    insar_coherence: 0.90,
    insar_rating: 'ACTIVE_CREEP',
    target_sensor: 'WorldView-3',
    target_gsd: '0.31m GSD',
    geophone_db: 51.3,
    stage_rate: '+0.08 m/min',
    scene_identifier: 'S2B_MSIL2A_20260829_T45RTG_MARSY',
    solar_zenith_deg: 52.4,
    susceptibility_score: 0.68,
    trigger_urgency_score: 0.44,
    combined_hazard_index: 0.30,
    risk_quadrant: 'HIGH_SUSCEPTIBILITY_WATCH',
    estimated_volume_mcm: 35.3,
    downstream_schedule: [
      { name: 'Dharapani', dist: '7.5 km', time: '9.0 min', stage: '+44.2 m', q: '58,000 m³/s', alert: 'IMMEDIATE' },
      { name: 'Tal Village', dist: '16.0 km', time: '19.2 min', stage: '+36.5 m', q: '47,200 m³/s', alert: 'IMMEDIATE' },
      { name: 'Chamje', dist: '24.5 km', time: '29.4 min', stage: '+29.0 m', q: '38,000 m³/s', alert: 'HIGH' },
      { name: 'Jagat Bazaar', dist: '33.0 km', time: '39.6 min', stage: '+23.1 m', q: '30,500 m³/s', alert: 'HIGH' },
      { name: 'Syange / Marsyangdi Weir', dist: '44.0 km', time: '52.8 min', stage: '+17.8 m', q: '23,200 m³/s', alert: 'MODERATE' },
    ],
  },

  // 6. Lower Barun Lake (Barun / Arun)
  PDGL_NEP_KOSHI_003: {
    coupled_hydropower: 'Arun-III Hydropower (900 MW) / Num Intake',
    insar_velocity_mm_yr: -16.5,
    insar_coherence: 0.85,
    insar_rating: 'ACTIVE_CREEP',
    target_sensor: 'Pléiades Neo',
    target_gsd: '0.30m GSD',
    geophone_db: 64.2,
    stage_rate: '+0.28 m/min',
    scene_identifier: 'S2B_MSIL2A_20260901_T45RXG_ARUN',
    solar_zenith_deg: 55.0,
    susceptibility_score: 0.79,
    trigger_urgency_score: 0.62,
    combined_hazard_index: 0.49,
    risk_quadrant: 'HIGH_SUSCEPTIBILITY_WATCH',
    estimated_volume_mcm: 92.0,
    downstream_schedule: [
      { name: 'Yangkharca', dist: '5.2 km', time: '6.2 min', stage: '+42.0 m', q: '61,000 m³/s', alert: 'IMMEDIATE' },
      { name: 'Mumbuk', dist: '12.8 km', time: '15.4 min', stage: '+35.2 m', q: '52,400 m³/s', alert: 'IMMEDIATE' },
      { name: 'Tashigaon', dist: '24.0 km', time: '28.8 min', stage: '+27.6 m', q: '41,200 m³/s', alert: 'HIGH' },
      { name: 'Num Intake', dist: '38.5 km', time: '46.2 min', stage: '+20.1 m', q: '31,800 m³/s', alert: 'MODERATE' },
      { name: 'Arun-III Dam Site', dist: '52.0 km', time: '62.4 min', stage: '+15.3 m', q: '23,500 m³/s', alert: 'MODERATE' },
    ],
  },

  // 7. South Lhonak Lake (Teesta Corridor Benchmark)
  PDGL_IND_SIKKIM_001: {
    coupled_hydropower: 'Teesta-III Dam (1200 MW, Chungthang - Breached 2023)',
    insar_velocity_mm_yr: -42.1,
    insar_coherence: 0.76,
    insar_rating: 'CRITICAL_DESTABILIZATION',
    target_sensor: 'SkySat-Submeter',
    target_gsd: '0.50m GSD',
    geophone_db: 92.4,
    stage_rate: '+1.35 m/min',
    scene_identifier: 'S2A_MSIL2A_20260901_T45RYH_TEESTA',
    solar_zenith_deg: 50.5,
    susceptibility_score: 0.96,
    trigger_urgency_score: 0.93,
    combined_hazard_index: 0.89,
    risk_quadrant: 'CRITICAL_DUAL_TRIGGER',
    estimated_volume_mcm: 65.0,
    downstream_schedule: [
      { name: 'Chungthang Dam', dist: '14.0 km', time: '16.5 min', stage: '+58.0 m', q: '78,500 m³/s', alert: 'IMMEDIATE' },
      { name: 'Mangan', dist: '32.0 km', time: '37.8 min', stage: '+42.0 m', q: '61,000 m³/s', alert: 'IMMEDIATE' },
      { name: 'Singtam Bridge', dist: '58.0 km', time: '68.4 min', stage: '+31.5 m', q: '44,500 m³/s', alert: 'HIGH' },
      { name: 'Rangpo Town', dist: '74.0 km', time: '87.2 min', stage: '+23.8 m', q: '33,200 m³/s', alert: 'HIGH' },
      { name: 'Teesta Low Dam', dist: '95.0 km', time: '112.0 min', stage: '+16.5 m', q: '23,000 m³/s', alert: 'MODERATE' },
    ],
  },

  // 8. Kaldang Lake (Langtang / Trishuli)
  PDGL_NEP_GANDAKI_003: {
    coupled_hydropower: 'Upper Trishuli-1 (216 MW) / Trishuli Dam',
    insar_velocity_mm_yr: -6.4,
    insar_coherence: 0.88,
    insar_rating: 'ACTIVE_CREEP',
    target_sensor: 'WorldView-3',
    target_gsd: '0.31m GSD',
    geophone_db: 44.5,
    stage_rate: '+0.06 m/min',
    scene_identifier: 'S2B_MSIL2A_20260830_T45RUG_LANG',
    solar_zenith_deg: 53.6,
    susceptibility_score: 0.58,
    trigger_urgency_score: 0.38,
    combined_hazard_index: 0.22,
    risk_quadrant: 'TRIGGERED_TRANSIENT_WARNING',
    estimated_volume_mcm: 22.0,
    downstream_schedule: [
      { name: 'Langtang Village', dist: '5.5 km', time: '6.6 min', stage: '+39.0 m', q: '51,200 m³/s', alert: 'IMMEDIATE' },
      { name: 'Kyanjin Gompa', dist: '12.0 km', time: '14.4 min', stage: '+31.5 m', q: '41,000 m³/s', alert: 'IMMEDIATE' },
      { name: 'Bamboo', dist: '22.5 km', time: '27.0 min', stage: '+24.2 m', q: '32,500 m³/s', alert: 'HIGH' },
      { name: 'Syabrubesi', dist: '34.0 km', time: '40.8 min', stage: '+18.6 m', q: '25,000 m³/s', alert: 'MODERATE' },
      { name: 'Dhunche / Trishuli Intake', dist: '45.0 km', time: '54.0 min', stage: '+14.0 m', q: '19,200 m³/s', alert: 'MODERATE' },
    ],
  },

  // 9. Lumding Tsho
  PDGL_NEP_KOSHI_004: {
    coupled_hydropower: 'Solu Dudh Koshi Hydro (86 MW)',
    insar_velocity_mm_yr: -12.4,
    insar_coherence: 0.87,
    insar_rating: 'ACTIVE_CREEP',
    target_sensor: 'Pléiades Neo',
    target_gsd: '0.30m GSD',
    geophone_db: 58.0,
    stage_rate: '+0.15 m/min',
    scene_identifier: 'S2A_MSIL2A_20260901_T45RVG_LUMD',
    solar_zenith_deg: 54.0,
    susceptibility_score: 0.74,
    trigger_urgency_score: 0.52,
    combined_hazard_index: 0.38,
    risk_quadrant: 'HIGH_SUSCEPTIBILITY_WATCH',
    estimated_volume_mcm: 42.0,
    downstream_schedule: [
      { name: 'Lumding Kharka', dist: '4.5 km', time: '5.4 min', stage: '+36.0 m', q: '49,000 m³/s', alert: 'IMMEDIATE' },
      { name: 'Ghat Settlement', dist: '11.2 km', time: '13.4 min', stage: '+29.5 m', q: '39,500 m³/s', alert: 'IMMEDIATE' },
      { name: 'Phakding Bridge', dist: '18.5 km', time: '22.2 min', stage: '+23.2 m', q: '31,000 m³/s', alert: 'HIGH' },
      { name: 'Lukla River Confluence', dist: '26.0 km', time: '31.2 min', stage: '+18.0 m', q: '24,500 m³/s', alert: 'MODERATE' },
    ],
  },

  // 10. Chamlang Tsho (Hongu-2)
  PDGL_NEP_KOSHI_005: {
    coupled_hydropower: 'Dudh Koshi Cascade / Inkhu Khola',
    insar_velocity_mm_yr: -11.2,
    insar_coherence: 0.89,
    insar_rating: 'ACTIVE_CREEP',
    target_sensor: 'WorldView-3',
    target_gsd: '0.31m GSD',
    geophone_db: 56.4,
    stage_rate: '+0.14 m/min',
    scene_identifier: 'S2B_MSIL2A_20260830_T45RWH_CHAM',
    solar_zenith_deg: 53.8,
    susceptibility_score: 0.76,
    trigger_urgency_score: 0.54,
    combined_hazard_index: 0.41,
    risk_quadrant: 'HIGH_SUSCEPTIBILITY_WATCH',
    estimated_volume_mcm: 36.5,
    downstream_schedule: [
      { name: 'Khare Basecamp', dist: '5.0 km', time: '6.0 min', stage: '+40.5 m', q: '56,000 m³/s', alert: 'IMMEDIATE' },
      { name: 'Kote Village', dist: '14.5 km', time: '17.4 min', stage: '+31.2 m', q: '43,800 m³/s', alert: 'IMMEDIATE' },
      { name: 'Chetarwa', dist: '27.0 km', time: '32.4 min', stage: '+24.0 m', q: '33,500 m³/s', alert: 'HIGH' },
      { name: 'Bung / Cheskam', dist: '41.0 km', time: '49.2 min', stage: '+17.5 m', q: '25,100 m³/s', alert: 'MODERATE' },
    ],
  },

  // 11. Dig Tsho (1985 Breach Benchmark)
  PDGL_NEP_KOSHI_006: {
    coupled_hydropower: 'Namche Micro-Hydro (Rebuilt Post-1985)',
    insar_velocity_mm_yr: -5.5,
    insar_coherence: 0.91,
    insar_rating: 'ACTIVE_CREEP',
    target_sensor: 'Pléiades Neo',
    target_gsd: '0.30m GSD',
    geophone_db: 42.1,
    stage_rate: '+0.04 m/min',
    scene_identifier: 'S2A_MSIL2A_20260828_T45RVG_DIG',
    solar_zenith_deg: 54.5,
    susceptibility_score: 0.52,
    trigger_urgency_score: 0.32,
    combined_hazard_index: 0.17,
    risk_quadrant: 'DORMANT_STABLE',
    estimated_volume_mcm: 12.0,
    downstream_schedule: [
      { name: 'Langmoche Kharka', dist: '3.2 km', time: '3.8 min', stage: '+32.0 m', q: '44,000 m³/s', alert: 'IMMEDIATE' },
      { name: 'Thame Village', dist: '8.5 km', time: '10.2 min', stage: '+25.4 m', q: '35,200 m³/s', alert: 'IMMEDIATE' },
      { name: 'Mende', dist: '16.0 km', time: '19.2 min', stage: '+19.8 m', q: '27,000 m³/s', alert: 'HIGH' },
      { name: 'Namche Gorge', dist: '23.5 km', time: '28.2 min', stage: '+14.5 m', q: '20,500 m³/s', alert: 'MODERATE' },
    ],
  },

  // 12. Karnali High-Alpine Glacial Lake
  PDGL_NEP_KARNALI_001: {
    coupled_hydropower: 'Upper Karnali Hydro (900 MW Proposed)',
    insar_velocity_mm_yr: -3.1,
    insar_coherence: 0.92,
    insar_rating: 'STABLE',
    target_sensor: 'WorldView-3',
    target_gsd: '0.31m GSD',
    geophone_db: 32.0,
    stage_rate: '+0.01 m/min',
    scene_identifier: 'S2A_MSIL2A_20260825_T44RQU_KARN',
    solar_zenith_deg: 56.2,
    susceptibility_score: 0.42,
    trigger_urgency_score: 0.18,
    combined_hazard_index: 0.08,
    risk_quadrant: 'DORMANT_STABLE',
    estimated_volume_mcm: 18.5,
    downstream_schedule: [
      { name: 'Simikot Gorge', dist: '6.0 km', time: '7.2 min', stage: '+34.5 m', q: '45,000 m³/s', alert: 'IMMEDIATE' },
      { name: 'Hilsa Border', dist: '15.5 km', time: '18.6 min', stage: '+27.2 m', q: '35,400 m³/s', alert: 'IMMEDIATE' },
      { name: 'Yari Settlement', dist: '26.0 km', time: '31.2 min', stage: '+21.0 m', q: '27,500 m³/s', alert: 'HIGH' },
      { name: 'Dharapuri', dist: '38.0 km', time: '45.6 min', stage: '+15.8 m', q: '20,800 m³/s', alert: 'MODERATE' },
    ],
  },

  // 13. Rara Headwater Glacial Lake
  PDGL_NEP_KARNALI_002: {
    coupled_hydropower: 'Mugu Karnali Hydro (671 MW Proposed)',
    insar_velocity_mm_yr: -2.4,
    insar_coherence: 0.93,
    insar_rating: 'STABLE',
    target_sensor: 'WorldView-3',
    target_gsd: '0.31m GSD',
    geophone_db: 28.5,
    stage_rate: '+0.01 m/min',
    scene_identifier: 'S2B_MSIL2A_20260826_T44RQU_RARA',
    solar_zenith_deg: 55.8,
    susceptibility_score: 0.38,
    trigger_urgency_score: 0.15,
    combined_hazard_index: 0.06,
    risk_quadrant: 'DORMANT_STABLE',
    estimated_volume_mcm: 15.0,
    downstream_schedule: [
      { name: 'Gamgadhi', dist: '8.0 km', time: '9.6 min', stage: '+32.0 m', q: '41,500 m³/s', alert: 'IMMEDIATE' },
      { name: 'Rara Valley Outlet', dist: '16.5 km', time: '19.8 min', stage: '+25.5 m', q: '32,800 m³/s', alert: 'IMMEDIATE' },
      { name: 'Pina Village', dist: '28.0 km', time: '33.6 min', stage: '+19.2 m', q: '25,000 m³/s', alert: 'HIGH' },
      { name: 'Soru River Confluence', dist: '42.0 km', time: '50.4 min', stage: '+14.1 m', q: '18,500 m³/s', alert: 'MODERATE' },
    ],
  },

  // 14. Api Nampa Proglacial Lake
  PDGL_NEP_MAHAKALI_001: {
    coupled_hydropower: 'Chameliya Hydropower (30 MW)',
    insar_velocity_mm_yr: -4.0,
    insar_coherence: 0.91,
    insar_rating: 'STABLE',
    target_sensor: 'WorldView-3',
    target_gsd: '0.31m GSD',
    geophone_db: 34.2,
    stage_rate: '+0.02 m/min',
    scene_identifier: 'S2A_MSIL2A_20260827_T44RPT_API',
    solar_zenith_deg: 57.0,
    susceptibility_score: 0.40,
    trigger_urgency_score: 0.16,
    combined_hazard_index: 0.06,
    risk_quadrant: 'DORMANT_STABLE',
    estimated_volume_mcm: 14.5,
    downstream_schedule: [
      { name: 'Khandeswari', dist: '7.0 km', time: '8.4 min', stage: '+30.5 m', q: '39,000 m³/s', alert: 'IMMEDIATE' },
      { name: 'Gokuleshwor', dist: '18.5 km', time: '22.2 min', stage: '+23.8 m', q: '30,500 m³/s', alert: 'IMMEDIATE' },
      { name: 'Darchula Town', dist: '35.0 km', time: '42.0 min', stage: '+17.5 m', q: '22,800 m³/s', alert: 'HIGH' },
      { name: 'Chameliya Dam Site', dist: '48.0 km', time: '57.6 min', stage: '+13.2 m', q: '17,000 m³/s', alert: 'MODERATE' },
    ],
  },
};

// Aliases mapping for common IDs / names
const CODE_ALIASES: Record<string, string> = {
  'l-galong-co': 'PDGL_NEP_KOSHI_007',
  'l-tsho-rolpa': 'PDGL_NEP_KOSHI_001',
  'l1111111-1111-1111-1111-111111111111': 'PDGL_NEP_KOSHI_001',
  'l-imja-tsho': 'PDGL_NEP_KOSHI_002',
  'l2222222-2222-2222-2222-222222222222': 'PDGL_NEP_KOSHI_002',
  'l-birendra': 'PDGL_NEP_GANDAKI_002',
  'l-thulagi': 'PDGL_NEP_GANDAKI_001',
  'l-lower-barun': 'PDGL_NEP_KOSHI_003',
  'l4444444-4444-4444-4444-444444444444': 'PDGL_NEP_KOSHI_003',
  'l-south-lhonak': 'PDGL_IND_SIKKIM_001',
  'l-kaldang': 'PDGL_NEP_GANDAKI_003',
  'l-lumding': 'PDGL_NEP_KOSHI_004',
  'l-chamlang': 'PDGL_NEP_KOSHI_005',
  'l-dig-tsho': 'PDGL_NEP_KOSHI_006',
  'l-karnali-alpine': 'PDGL_NEP_KARNALI_001',
  'l-rara-headwater': 'PDGL_NEP_KARNALI_002',
  'l-api-nampa': 'PDGL_NEP_MAHAKALI_001',
};

/**
 * Resolve the rich hydrodynamic, InSAR, and sensor telemetry profile for a given lake
 */
export function getLakeHydroProfile(lake: GlacialLake | null): LakeHydroProfile {
  if (!lake) {
    return LAKE_HYDRO_PROFILES['PDGL_NEP_KOSHI_001'];
  }

  // 1. Check direct ICIMOD code
  if (lake.icimod_code && LAKE_HYDRO_PROFILES[lake.icimod_code]) {
    return LAKE_HYDRO_PROFILES[lake.icimod_code];
  }

  // 2. Check alias map
  const aliasKey = CODE_ALIASES[lake.id] || (lake as any).alias_id;
  if (aliasKey && LAKE_HYDRO_PROFILES[aliasKey]) {
    return LAKE_HYDRO_PROFILES[aliasKey];
  }

  // 3. Check name matching
  const nameLower = (lake.name || '').toLowerCase();
  if (nameLower.includes('galong') || nameLower.includes('cirenmaco') || nameLower.includes('bhotekoshi')) {
    return LAKE_HYDRO_PROFILES['PDGL_NEP_KOSHI_007'];
  }
  if (nameLower.includes('tsho rolpa') || nameLower.includes('rolwaling')) {
    return LAKE_HYDRO_PROFILES['PDGL_NEP_KOSHI_001'];
  }
  if (nameLower.includes('imja')) {
    return LAKE_HYDRO_PROFILES['PDGL_NEP_KOSHI_002'];
  }
  if (nameLower.includes('birendra')) {
    return LAKE_HYDRO_PROFILES['PDGL_NEP_GANDAKI_002'];
  }
  if (nameLower.includes('thulagi')) {
    return LAKE_HYDRO_PROFILES['PDGL_NEP_GANDAKI_001'];
  }
  if (nameLower.includes('barun')) {
    return LAKE_HYDRO_PROFILES['PDGL_NEP_KOSHI_003'];
  }
  if (nameLower.includes('lhonak')) {
    return LAKE_HYDRO_PROFILES['PDGL_IND_SIKKIM_001'];
  }
  if (nameLower.includes('kaldang') || nameLower.includes('langtang')) {
    return LAKE_HYDRO_PROFILES['PDGL_NEP_GANDAKI_003'];
  }
  if (nameLower.includes('lumding')) {
    return LAKE_HYDRO_PROFILES['PDGL_NEP_KOSHI_004'];
  }
  if (nameLower.includes('chamlang')) {
    return LAKE_HYDRO_PROFILES['PDGL_NEP_KOSHI_005'];
  }
  if (nameLower.includes('dig tsho')) {
    return LAKE_HYDRO_PROFILES['PDGL_NEP_KOSHI_006'];
  }
  if (nameLower.includes('simikot') || (lake.basin_name === 'Karnali' && nameLower.includes('alpine'))) {
    return LAKE_HYDRO_PROFILES['PDGL_NEP_KARNALI_001'];
  }
  if (nameLower.includes('rara')) {
    return LAKE_HYDRO_PROFILES['PDGL_NEP_KARNALI_002'];
  }
  if (nameLower.includes('api') || lake.basin_name === 'Mahakali') {
    return LAKE_HYDRO_PROFILES['PDGL_NEP_MAHAKALI_001'];
  }

  // 4. Dynamic derivation from physical lake attributes (Froehlich / Costa empirical model)
  const isCritical = ['CRITICAL', 'EMERGENCY'].includes(lake.danger_level.toUpperCase());
  const isWatch = ['HIGH', 'MEDIUM', 'WATCH'].includes(lake.danger_level.toUpperCase());
  const s = isCritical ? 0.85 : isWatch ? 0.65 : 0.40;
  const t = isCritical ? 0.78 : isWatch ? 0.48 : 0.18;
  const h = Number((s * t).toFixed(3));

  const villages = (lake.downstream_villages && lake.downstream_villages.length > 0)
    ? lake.downstream_villages
    : ['Upper Gorge', 'Midway Settlement', 'Confluence Bridge', 'Downstream Hydro Intake'];

  const schedule: DownstreamReach[] = villages.map((v, i) => {
    const d = 5.0 + i * 9.5;
    const timeMinutes = d / 0.82; // ~13.6 m/s wave front
    const stage = Math.max(8.0, 52.0 * Math.exp(-0.024 * d)).toFixed(1);
    const q = Math.max(12000, Math.round(75000 * Math.exp(-0.020 * d))).toLocaleString();
    return {
      name: v,
      dist: `${d.toFixed(1)} km`,
      time: `${timeMinutes.toFixed(1)} min`,
      stage: `+${stage} m`,
      q: `${q} m³/s`,
      alert: timeMinutes < 18 ? 'IMMEDIATE' : timeMinutes < 45 ? 'HIGH' : 'MODERATE',
    };
  });

  return {
    coupled_hydropower: lake.basin_name === 'Gandaki'
      ? 'Marsyangdi Hydro (69 MW)'
      : lake.basin_name === 'Karnali'
      ? 'Upper Karnali Hydro (900 MW)'
      : lake.basin_name === 'Mahakali'
      ? 'Chameliya Hydropower (30 MW)'
      : 'Upper Tamakoshi (456 MW)',
    insar_velocity_mm_yr: isCritical ? -25.0 : isWatch ? -12.0 : -3.5,
    insar_coherence: 0.86,
    insar_rating: isCritical ? 'CRITICAL_DESTABILIZATION' : isWatch ? 'ACTIVE_CREEP' : 'STABLE',
    target_sensor: isCritical ? 'SkySat-Submeter' : 'WorldView-3',
    target_gsd: isCritical ? '0.50m GSD' : '0.31m GSD',
    geophone_db: isCritical ? 78.0 : isWatch ? 54.0 : 34.0,
    stage_rate: isCritical ? '+0.60 m/min' : isWatch ? '+0.15 m/min' : '+0.02 m/min',
    scene_identifier: `S2A_MSIL2A_20260901_${(lake.icimod_code || 'PDGL').replace(/[^a-zA-Z0-9]/g, '_')}`,
    solar_zenith_deg: 53.5,
    susceptibility_score: s,
    trigger_urgency_score: t,
    combined_hazard_index: h,
    risk_quadrant: isCritical ? 'CRITICAL_DUAL_TRIGGER' : isWatch ? 'HIGH_SUSCEPTIBILITY_WATCH' : 'DORMANT_STABLE',
    estimated_volume_mcm: Number(((lake.initial_area_sqm || 1000000) * 0.000045).toFixed(1)),
    downstream_schedule: schedule,
  };
}

/**
 * Generate lake-specific surface area time-series history
 */
export function generateLakeObservations(lake: GlacialLake): ObservationPoint[] {
  const init = lake.initial_area_sqm || 1500000;
  const curr = lake.current_area_sqm || (init * 1.15);
  const diff = curr - init;

  return [
    {
      date: '2024-05-10',
      area_sqm: Math.round(init),
      area_sqkm: Number((init / 1e6).toFixed(3)),
      sensor_name: 'Sentinel-2A MSI L2A',
      mean_mndwi: 0.64,
      cloud_cover_pct: 1.8,
    },
    {
      date: '2024-11-04',
      area_sqm: Math.round(init + diff * 0.24),
      area_sqkm: Number(((init + diff * 0.24) / 1e6).toFixed(3)),
      sensor_name: 'Sentinel-2B MSI L2A',
      mean_mndwi: 0.67,
      cloud_cover_pct: 3.2,
    },
    {
      date: '2025-05-18',
      area_sqm: Math.round(init + diff * 0.49),
      area_sqkm: Number(((init + diff * 0.49) / 1e6).toFixed(3)),
      sensor_name: 'Sentinel-2A MSI L2A',
      mean_mndwi: 0.70,
      cloud_cover_pct: 0.8,
    },
    {
      date: '2025-10-25',
      area_sqm: Math.round(init + diff * 0.76),
      area_sqkm: Number(((init + diff * 0.76) / 1e6).toFixed(3)),
      sensor_name: 'Sentinel-2B MSI L2A',
      mean_mndwi: 0.73,
      cloud_cover_pct: 2.1,
    },
    {
      date: '2026-08-30',
      area_sqm: Math.round(curr),
      area_sqkm: Number((curr / 1e6).toFixed(3)),
      sensor_name: 'Sentinel-2A MSI L2A',
      mean_mndwi: 0.76,
      cloud_cover_pct: 1.4,
    },
  ];
}

/**
 * Generate lake-specific 48-hour precipitation data
 */
export function generateLakePrecipitation(lake: GlacialLake): PrecipitationPoint[] {
  const isCritical = ['CRITICAL', 'EMERGENCY'].includes(lake.danger_level.toUpperCase());
  const isWatch = ['HIGH', 'MEDIUM', 'WATCH'].includes(lake.danger_level.toUpperCase());

  if (isCritical) {
    // Intense monsoon orographic burst (e.g. Galong Co / Tsho Rolpa surge event)
    const isPoiqu = (lake.name || '').toLowerCase().includes('galong') || (lake.name || '').toLowerCase().includes('bhotekoshi');
    const factor = isPoiqu ? 1.25 : 1.0;

    return [
      { timestamp: '2026-09-01T00:00:00Z', precip_mm: +(6.5 * factor).toFixed(1), accumulated_48h_mm: +(18.0 * factor).toFixed(1), sensor: 'GPM_IMERG_V07B' },
      { timestamp: '2026-09-01T06:00:00Z', precip_mm: +(14.2 * factor).toFixed(1), accumulated_48h_mm: +(35.5 * factor).toFixed(1), sensor: 'GPM_IMERG_V07B' },
      { timestamp: '2026-09-01T12:00:00Z', precip_mm: +(28.6 * factor).toFixed(1), accumulated_48h_mm: +(69.2 * factor).toFixed(1), sensor: 'GPM_IMERG_V07B' },
      { timestamp: '2026-09-01T18:00:00Z', precip_mm: +(41.8 * factor).toFixed(1), accumulated_48h_mm: +(124.5 * factor).toFixed(1), sensor: 'GPM_IMERG_V07B' },
    ];
  }

  if (isWatch) {
    return [
      { timestamp: '2026-09-01T00:00:00Z', precip_mm: 3.2, accumulated_48h_mm: 9.5, sensor: 'GPM_IMERG_V07B' },
      { timestamp: '2026-09-01T06:00:00Z', precip_mm: 6.8, accumulated_48h_mm: 17.2, sensor: 'GPM_IMERG_V07B' },
      { timestamp: '2026-09-01T12:00:00Z', precip_mm: 12.4, accumulated_48h_mm: 31.8, sensor: 'GPM_IMERG_V07B' },
      { timestamp: '2026-09-01T18:00:00Z', precip_mm: 18.1, accumulated_48h_mm: 52.4, sensor: 'GPM_IMERG_V07B' },
    ];
  }

  // Low/calm alpine baseline
  return [
    { timestamp: '2026-09-01T00:00:00Z', precip_mm: 0.8, accumulated_48h_mm: 2.2, sensor: 'GPM_IMERG_V07B' },
    { timestamp: '2026-09-01T06:00:00Z', precip_mm: 1.5, accumulated_48h_mm: 4.1, sensor: 'GPM_IMERG_V07B' },
    { timestamp: '2026-09-01T12:00:00Z', precip_mm: 2.4, accumulated_48h_mm: 7.0, sensor: 'GPM_IMERG_V07B' },
    { timestamp: '2026-09-01T18:00:00Z', precip_mm: 3.1, accumulated_48h_mm: 10.5, sensor: 'GPM_IMERG_V07B' },
  ];
}
