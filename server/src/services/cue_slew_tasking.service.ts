export interface SatelliteConstellation {
  constellation: 'SkySat-Constellation' | 'PlanetScope-SuperDove' | 'WorldView-3' | 'Sentinel-1-SAR';
  operator: string;
  spatial_resolution_m: number;
  spectral_bands: string[];
  swath_width_km: number;
  revisit_frequency_hours: number;
  pointing_slew_capacity_deg: number;
}

export interface CueSlewOrder {
  id: string;
  tasking_code: string;
  lake_id: string;
  icimod_code: string;
  lake_name: string;
  priority: 'IMMEDIATE_INTERVENTION' | 'HIGH_SURVEILLANCE' | 'ROUTINE_MONITORING';
  target_sensor: 'SkySat-Submeter' | 'PlanetScope-SuperDove' | 'WorldView-3';
  target_gsd_meters: number;
  bounding_box: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  trigger_reason: {
    category: 'INSAR_SUBSIDENCE' | 'SEISMIC_SHAKE' | 'PRECIPITATION_PULSE' | 'AREA_SURGE';
    severity: 'CRITICAL' | 'WARNING' | 'ADVISORY';
    description: string;
    trigger_value: number;
    trigger_unit: string;
  };
  predicted_pass: {
    satellite_id: string;
    pass_window_utc: string;
    off_nadir_angle_deg: number;
    sun_elevation_deg: number;
    cloud_cover_forecast_pct: number;
  };
  cv_inspection_targets: {
    feature: string;
    status: 'DETECTED' | 'SUSPECTED' | 'CLEAR';
    confidence: number;
    metrics: Record<string, any>;
  }[];
  status: 'PENDING_PASS' | 'TASKED' | 'CAPTURED' | 'ANALYSIS_COMPLETE';
  created_at: string;
}

export interface InSarDeformationPoint {
  acquisition_date: string;
  sensor: string;
  orbit_pass: 'ASCENDING' | 'DESCENDING';
  los_displacement_mm: number;
  coherence: number;
  cumulative_subsidence_mm: number;
  velocity_mm_year: number;
}

export interface LakeInSarAnalysis {
  lake_id: string;
  icimod_code: string;
  lake_name: string;
  moraine_type: string;
  baseline_date: string;
  mean_velocity_mm_year: number;
  hazard_classification: 'CRITICAL_CREEP' | 'ACCELERATED_SUBSIDENCE' | 'MODERATE_SETTLEMENT' | 'STABLE';
  internal_ice_core_melt_prob_pct: number;
  points: InSarDeformationPoint[];
}

export class CueSlewTaskingService {
  private static taskings: CueSlewOrder[] = [
    {
      id: 'task-slew-galong-01',
      tasking_code: 'CS-KOSHI_007-20260904-01',
      lake_id: 'l-galong-co',
      icimod_code: 'PDGL_NEP_KOSHI_007',
      lake_name: 'Galong Co / Cirenmaco (Poiqu Transboundary)',
      priority: 'IMMEDIATE_INTERVENTION',
      target_sensor: 'SkySat-Submeter',
      target_gsd_meters: 0.50,
      bounding_box: [85.965, 28.055, 86.025, 28.115],
      trigger_reason: {
        category: 'INSAR_SUBSIDENCE',
        severity: 'CRITICAL',
        description: 'Sentinel-1 SBAS InSAR detected accelerated moraine crest subsidence of -31.6 mm/yr and piping fissures post-August 2026 Poiqu debris pulse',
        trigger_value: -31.6,
        trigger_unit: 'mm/year',
      },
      predicted_pass: {
        satellite_id: 'SkySat-C16 (SSC# 46273)',
        pass_window_utc: new Date(Date.now() + 1000 * 60 * 25).toISOString(),
        off_nadir_angle_deg: 12.4,
        sun_elevation_deg: 54.1,
        cloud_cover_forecast_pct: 8.0,
      },
      cv_inspection_targets: [
        {
          feature: '1981 Breach Sill Residual Scarp Creep',
          status: 'DETECTED',
          confidence: 0.96,
          metrics: { fracture_length_m: 120.0, aperture_cm: 48.0, displacement_rate_mm_day: 3.2 },
        },
        {
          feature: 'Poiqu Transboundary Debris Flow Fan Headcut',
          status: 'DETECTED',
          confidence: 0.92,
          metrics: { headcut_retreat_m_yr: 18.5, sediment_yield_m3: 185000 },
        },
      ],
      status: 'TASKED',
      created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
    {
      id: 'task-slew-tsho-01',
      tasking_code: 'CS-TSHO-20260904-01',
      lake_id: 'l-tsho-rolpa',
      icimod_code: 'PDGL_NEP_KOSHI_001',
      lake_name: 'Tsho Rolpa Glacial Lake',
      priority: 'IMMEDIATE_INTERVENTION',
      target_sensor: 'SkySat-Submeter',
      target_gsd_meters: 0.50,
      bounding_box: [86.445, 27.845, 86.515, 27.895],
      trigger_reason: {
        category: 'INSAR_SUBSIDENCE',
        severity: 'CRITICAL',
        description: 'Sentinel-1 SBAS InSAR detected moraine crest subsidence of -28.4 mm/yr indicating active ice-core thermokarst degradation',
        trigger_value: -28.4,
        trigger_unit: 'mm/year',
      },
      predicted_pass: {
        satellite_id: 'SkySat-C14 (SSC# 46271)',
        pass_window_utc: new Date(Date.now() + 1000 * 60 * 38).toISOString(), // T + 38 min
        off_nadir_angle_deg: 14.2,
        sun_elevation_deg: 52.8,
        cloud_cover_forecast_pct: 12.0,
      },
      cv_inspection_targets: [
        {
          feature: 'Terminal Moraine Transverse Tension Crack #1',
          status: 'DETECTED',
          confidence: 0.94,
          metrics: { length_m: 85.4, max_aperture_cm: 42.0, propagation_cm_day: 1.8 },
        },
        {
          feature: 'Toe Seepage Boil Piping Conduit',
          status: 'SUSPECTED',
          confidence: 0.81,
          metrics: { turbid_plume_sqm: 140.0, discharge_est_lps: 45.0 },
        },
        {
          feature: 'Subaqueous Ice Cliff Calving Margin',
          status: 'DETECTED',
          confidence: 0.98,
          metrics: { freeboard_cliff_height_m: 28.5, subaqueous_depth_m: 98.0 },
        },
      ],
      status: 'TASKED',
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: 'task-slew-lhonak-01',
      tasking_code: 'CS-LHON-20260904-02',
      lake_id: 'l-south-lhonak',
      icimod_code: 'PDGL_IND_SIKKIM_001',
      lake_name: 'South Lhonak Lake (Sikkim Arc)',
      priority: 'HIGH_SURVEILLANCE',
      target_sensor: 'PlanetScope-SuperDove',
      target_gsd_meters: 3.0,
      bounding_box: [88.165, 27.885, 88.225, 27.945],
      trigger_reason: {
        category: 'SEISMIC_SHAKE',
        severity: 'WARNING',
        description: 'Mw 5.2 North Sikkim Thrust event induced transient PGA of 0.168g on reconstructed breach canyon',
        trigger_value: 0.168,
        trigger_unit: 'PGA (g)',
      },
      predicted_pass: {
        satellite_id: 'SuperDove-Flock-4Y (SSC# 51042)',
        pass_window_utc: new Date(Date.now() + 1000 * 60 * 92).toISOString(), // T + 92 min
        off_nadir_angle_deg: 8.5,
        sun_elevation_deg: 48.1,
        cloud_cover_forecast_pct: 18.0,
      },
      cv_inspection_targets: [
        {
          feature: '2023 Breach Canyon Incision Slope Stability',
          status: 'DETECTED',
          confidence: 0.91,
          metrics: { canyon_width_m: 110.0, slope_angle_deg: 44.0, scree_talus_accumulation_pct: 15.0 },
        },
        {
          feature: 'Residual Glacial Tongue Headward Calving',
          status: 'CLEAR',
          confidence: 0.88,
          metrics: { active_calving_detected: false },
        },
      ],
      status: 'TASKED',
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: 'task-slew-barun-01',
      tasking_code: 'CS-BARUN-20260904-03',
      lake_id: 'l-lower-barun',
      icimod_code: 'PDGL_NEP_KOSHI_003',
      lake_name: 'Lower Barun Lake (Makalu)',
      priority: 'HIGH_SURVEILLANCE',
      target_sensor: 'SkySat-Submeter',
      target_gsd_meters: 0.50,
      bounding_box: [87.080, 27.785, 87.140, 27.835],
      trigger_reason: {
        category: 'AREA_SURGE',
        severity: 'WARNING',
        description: 'Surface area reached 2.14 km² with +197.2% expansion and rapid Barun glacier terminus retreat (-2450m)',
        trigger_value: 197.2,
        trigger_unit: '% expansion',
      },
      predicted_pass: {
        satellite_id: 'SkySat-C18 (SSC# 46275)',
        pass_window_utc: new Date(Date.now() + 1000 * 60 * 145).toISOString(),
        off_nadir_angle_deg: 11.0,
        sun_elevation_deg: 50.4,
        cloud_cover_forecast_pct: 15.0,
      },
      cv_inspection_targets: [
        {
          feature: 'Barun Glacier Calving Bay Detachment Margin',
          status: 'DETECTED',
          confidence: 0.96,
          metrics: { embayment_width_m: 420.0, ice_cliff_height_m: 34.0 },
        },
      ],
      status: 'PENDING_PASS',
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  ];

  public static getAllOrders(): CueSlewOrder[] {
    return this.taskings;
  }

  public static getOrderById(id: string): CueSlewOrder | undefined {
    return this.taskings.find(
      (t) => t.id.toLowerCase() === id.toLowerCase() || t.tasking_code.toLowerCase() === id.toLowerCase()
    );
  }

  public static createOrder(params: {
    lake_id: string;
    icimod_code: string;
    lake_name: string;
    category: 'INSAR_SUBSIDENCE' | 'SEISMIC_SHAKE' | 'PRECIPITATION_PULSE' | 'AREA_SURGE';
    severity: 'CRITICAL' | 'WARNING' | 'ADVISORY';
    description: string;
    trigger_value: number;
    trigger_unit: string;
    sensor?: 'SkySat-Submeter' | 'PlanetScope-SuperDove' | 'WorldView-3';
    bbox?: [number, number, number, number];
  }): CueSlewOrder {
    const sensor = params.sensor || (params.severity === 'CRITICAL' ? 'SkySat-Submeter' : 'PlanetScope-SuperDove');
    const gsd = sensor === 'SkySat-Submeter' ? 0.50 : sensor === 'WorldView-3' ? 0.31 : 3.0;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const shortCode = params.icimod_code.split('_').slice(-2).join('_');
    const taskingCode = `CS-${shortCode}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomSuffix}`;

    const leadMinutes = Math.floor(25 + Math.random() * 90);
    const passTimeUtc = new Date(Date.now() + 1000 * 60 * leadMinutes).toISOString();

    const order: CueSlewOrder = {
      id: `task-slew-${Date.now()}-${randomSuffix}`,
      tasking_code: taskingCode,
      lake_id: params.lake_id,
      icimod_code: params.icimod_code,
      lake_name: params.lake_name,
      priority: params.severity === 'CRITICAL' ? 'IMMEDIATE_INTERVENTION' : 'HIGH_SURVEILLANCE',
      target_sensor: sensor,
      target_gsd_meters: gsd,
      bounding_box: params.bbox || [86.45, 27.85, 86.50, 27.90],
      trigger_reason: {
        category: params.category,
        severity: params.severity,
        description: params.description,
        trigger_value: params.trigger_value,
        trigger_unit: params.trigger_unit,
      },
      predicted_pass: {
        satellite_id: sensor === 'SkySat-Submeter' ? `SkySat-C${12 + (randomSuffix % 9)}` : `SuperDove-Flock-4Y-${randomSuffix % 50}`,
        pass_window_utc: passTimeUtc,
        off_nadir_angle_deg: Number((8 + Math.random() * 12).toFixed(1)),
        sun_elevation_deg: Number((45 + Math.random() * 15).toFixed(1)),
        cloud_cover_forecast_pct: Number((5 + Math.random() * 20).toFixed(1)),
      },
      cv_inspection_targets: [
        {
          feature: 'Moraine Crest Tension Crack Propagation',
          status: 'DETECTED',
          confidence: 0.93,
          metrics: { length_m: 64.0, max_aperture_cm: 31.5, propagation_cm_day: 1.4 },
        },
        {
          feature: 'Hydraulic Piping / Seepage at Moraine Toe',
          status: 'SUSPECTED',
          confidence: 0.84,
          metrics: { turbid_plume_sqm: 115.0 },
        },
      ],
      status: 'TASKED',
      created_at: new Date().toISOString(),
    };

    this.taskings.unshift(order);
    return order;
  }

  public static getLakeInSarDeformation(lakeIdOrCode: string): LakeInSarAnalysis {
    const code = lakeIdOrCode.toUpperCase();
    const isGalong = code.includes('GALONG') || code.includes('CIRENMACO') || code.includes('BHOTE') || code.includes('POIQU') || code.includes('KOSHI_007');
    const isLhonak = code.includes('LHON') || code.includes('SIKKIM');
    const isBarun = code.includes('BARUN');
    const isImja = code.includes('IMJA');
    const isBirendra = code.includes('BIRENDRA') || code.includes('GANDAKI_002');
    const isThulagi = code.includes('THULAGI');

    const lakeName = isGalong
      ? 'Galong Co / Cirenmaco (Poiqu Transboundary)'
      : isLhonak
      ? 'South Lhonak Lake (Sikkim Arc)'
      : isBarun
      ? 'Lower Barun Lake (Makalu)'
      : isImja
      ? 'Imja Tsho (Everest Region)'
      : isBirendra
      ? 'Birendra Lake (Manaslu)'
      : isThulagi
      ? 'Thulagi Lake (Manaslu)'
      : 'Tsho Rolpa Glacial Lake';

    const icimodCode = isGalong
      ? 'PDGL_NEP_KOSHI_007'
      : isLhonak
      ? 'PDGL_IND_SIKKIM_001'
      : isBarun
      ? 'PDGL_NEP_KOSHI_003'
      : isImja
      ? 'PDGL_NEP_KOSHI_002'
      : isBirendra
      ? 'PDGL_NEP_GANDAKI_002'
      : isThulagi
      ? 'PDGL_NEP_GANDAKI_001'
      : 'PDGL_NEP_KOSHI_001';

    const meanVelocity = isGalong
      ? -31.6
      : isLhonak
      ? -34.8
      : isBarun
      ? -21.4
      : isImja
      ? -14.2
      : isBirendra
      ? -19.8
      : isThulagi
      ? -18.5
      : -28.4;

    const points: InSarDeformationPoint[] = [];
    const startDate = new Date('2020-01-10T00:00:00Z');
    const totalDays = 6 * 365.25;
    const stepDays = 24;

    let cumulativeSubsidence = 0;

    for (let day = 0; day <= totalDays; day += stepDays) {
      const date = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
      const yearFraction = day / 365.25;
      const month = date.getUTCMonth();
      const monsoonFactor = (month >= 5 && month <= 8) ? 1.8 : 0.7;

      const deltaLos = (meanVelocity / (365.25 / stepDays)) * monsoonFactor + (Math.sin(yearFraction * Math.PI * 2) * 1.5) + ((Math.random() - 0.5) * 1.2);
      cumulativeSubsidence += deltaLos;

      const coherence = Math.max(0.45, Math.min(0.92, 0.82 - (monsoonFactor > 1 ? 0.22 : 0.0) + (Math.random() - 0.5) * 0.08));

      points.push({
        acquisition_date: date.toISOString().slice(0, 10),
        sensor: 'Sentinel-1A/B C-Band SAR',
        orbit_pass: points.length % 2 === 0 ? 'DESCENDING' : 'ASCENDING',
        los_displacement_mm: Number(deltaLos.toFixed(2)),
        coherence: Number(coherence.toFixed(2)),
        cumulative_subsidence_mm: Number(cumulativeSubsidence.toFixed(2)),
        velocity_mm_year: Number((meanVelocity * monsoonFactor).toFixed(1)),
      });
    }

    const hazardClassification = meanVelocity < -30
      ? 'CRITICAL_CREEP'
      : meanVelocity < -20
      ? 'ACCELERATED_SUBSIDENCE'
      : meanVelocity < -10
      ? 'MODERATE_SETTLEMENT'
      : 'STABLE';

    return {
      lake_id: lakeIdOrCode,
      icimod_code: icimodCode,
      lake_name: lakeName,
      moraine_type: 'End-moraine with degrading fossil dead-ice core and boulder-clay matrix',
      baseline_date: '2020-01-10',
      mean_velocity_mm_year: meanVelocity,
      hazard_classification: hazardClassification,
      internal_ice_core_melt_prob_pct: Math.min(95, Math.round(Math.abs(meanVelocity) * 2.8)),
      points,
    };
  }

  public static getConstellationFleet(): SatelliteConstellation[] {
    return [
      {
        constellation: 'SkySat-Constellation',
        operator: 'Planet Labs PBC',
        spatial_resolution_m: 0.50,
        spectral_bands: ['Panchromatic (0.45-0.90 µm)', 'Blue', 'Green', 'Red', 'NIR'],
        swath_width_km: 5.9,
        revisit_frequency_hours: 8.0,
        pointing_slew_capacity_deg: 30.0,
      },
      {
        constellation: 'PlanetScope-SuperDove',
        operator: 'Planet Labs PBC',
        spatial_resolution_m: 3.0,
        spectral_bands: ['Coastal Blue', 'Blue', 'Green I', 'Green II', 'Yellow', 'Red', 'Red-Edge', 'NIR'],
        swath_width_km: 32.5,
        revisit_frequency_hours: 24.0,
        pointing_slew_capacity_deg: 15.0,
      },
      {
        constellation: 'WorldView-3',
        operator: 'Maxar Technologies',
        spatial_resolution_m: 0.31,
        spectral_bands: ['Pan (0.31m)', '8-Band VNIR (1.24m)', '8-Band SWIR (3.70m)', '12 CAVIS (30m)'],
        swath_width_km: 13.1,
        revisit_frequency_hours: 24.0,
        pointing_slew_capacity_deg: 45.0,
      },
      {
        constellation: 'Sentinel-1-SAR',
        operator: 'European Space Agency (ESA)',
        spatial_resolution_m: 5.0,
        spectral_bands: ['C-Band SAR (5.405 GHz)', 'VV Polarimetric', 'VH Polarimetric'],
        swath_width_km: 250.0,
        revisit_frequency_hours: 144.0,
        pointing_slew_capacity_deg: 0.0,
      },
    ];
  }
}
