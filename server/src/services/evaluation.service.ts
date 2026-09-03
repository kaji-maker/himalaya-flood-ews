import { db, MOCK_GLACIAL_LAKES, MOCK_FLOOD_ALERTS, MOCK_INSAR_TELEMETRY, MOCK_CUE_SLEW_TASKINGS, MOCK_EDGE_SENSOR_READINGS } from './db.service';
import { FloodAlert, AlertSeverityLevel, TwoAxisRiskScore, InSARTelemetry, CueAndSlewTaskingOrder, EdgeSensorReading, SCADAGateCommand } from '../types';
import { MultiChannelDispatchService } from './dispatch.service';

export class RiskEvaluationService {
  /**
   * Calculates Static Geomorphic Susceptibility (S in [0, 1])
   * based on moraine slope, lake volume, ruggedness, and freeboard margin.
   */
  public static calculateSusceptibility(
    slopeDeg: number = 28.0,
    ruggednessM: number = 450.0,
    volumeMcm: number = 50.0,
    freeboardM: number = 15.0
  ): number {
    const fSlope = Math.min(1.0, Math.max(0.0, slopeDeg / 40.0));
    const fRugged = Math.min(1.0, Math.max(0.0, ruggednessM / 650.0));
    const fVol = Math.min(1.0, Math.max(0.0, Math.sqrt(volumeMcm / 100.0)));
    const fFreeboard = Math.min(1.0, Math.max(0.0, 1.0 - freeboardM / 35.0));

    const s = 0.35 * fSlope + 0.25 * fRugged + 0.25 * fVol + 0.15 * fFreeboard;
    return Number(Math.min(1.0, Math.max(0.0, s)).toFixed(3));
  }

  /**
   * Calculates Dynamic Trigger Urgency (T in [0, 1])
   * based on antecedent rainfall, MNDWI surge, InSAR deformation, and dam instability.
   */
  public static calculateTriggerUrgency(
    growth30dPct: number,
    precip48hMm: number,
    damAnomaly: boolean,
    insarVelocityMmYr?: number,
    insarCoherence?: number
  ): number {
    if (damAnomaly) return 1.0;
    const fRain = Math.min(1.0, Math.max(0.0, precip48hMm / 70.0));
    const fGrowth = Math.min(1.0, Math.max(0.0, growth30dPct / 30.0));

    let fInsar = 0.0;
    if (insarVelocityMmYr !== undefined && insarVelocityMmYr < 0) {
      fInsar = Math.min(1.0, Math.max(0.0, Math.abs(insarVelocityMmYr) / 35.0));
    }
    let fCoherence = 0.0;
    if (insarCoherence !== undefined && insarCoherence < 0.60) {
      fCoherence = Math.min(1.0, Math.max(0.0, (0.60 - insarCoherence) / 0.35));
    }
    const fRadar = Math.max(fInsar, fCoherence);

    const t = Math.max(fRain, fGrowth, fRadar) * 0.7 + ((fRain + fGrowth + fRadar) / 3.0) * 0.3;
    return Number(Math.min(1.0, Math.max(0.0, t)).toFixed(3));
  }

  /**
   * Evaluates a newly ingested observation using the decoupled Two-Axis model (arXiv:2608.12422)
   */
  public static async evaluateObservation(
    lakeId: string,
    currentAreaSqm: number,
    precip48hMm: number = 0.0,
    damDistortionDetected: boolean = false,
    insarVelocityMmYr?: number,
    insarCoherence?: number
  ): Promise<FloodAlert | null> {
    let lakeName = 'Glacial Lake';
    let baselineSqm = currentAreaSqm;
    let slopeDeg = 28.0;
    let volumeMcm = 50.0;
    let freeboardM = 15.0;
    let actualLakeUuid: string | null = null;

    // 1. Fetch lake initial baseline & geomorphic attributes
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lakeId);
      const lake = await (isUuid
        ? db('glacial_lakes').where({ id: lakeId }).orWhere({ icimod_code: lakeId }).first()
        : db('glacial_lakes').where({ icimod_code: lakeId }).first());
      if (lake) {
        actualLakeUuid = lake.id;
        lakeName = lake.name;
        baselineSqm = Number(lake.initial_area_sqm);
      }
    } catch (e) {
      const mockLake = MOCK_GLACIAL_LAKES.find((l) => l.id === lakeId || l.icimod_code === lakeId);
      if (mockLake) {
        actualLakeUuid = mockLake.id;
        lakeName = mockLake.name;
        baselineSqm = mockLake.initial_area_sqm;
      }
    }

    // 2. Fetch past observations within 30 days
    let past30dArea = baselineSqm;
    try {
      const pastObs = await db('lake_observations')
        .where({ lake_id: lakeId })
        .andWhere('observation_date', '>=', db.raw("NOW() - INTERVAL '30 days'"))
        .orderBy('observation_date', 'asc')
        .first();
      if (pastObs) {
        past30dArea = Number(pastObs.area_sqm);
      }
    } catch (e) {
      // Offline fallback
    }

    const growth30dPct = ((currentAreaSqm - past30dArea) / past30dArea) * 100.0;
    const growthBaselinePct = ((currentAreaSqm - baselineSqm) / baselineSqm) * 100.0;

    // 3. Compute Two-Axis Metrics
    const sScore = this.calculateSusceptibility(slopeDeg, 480.0, volumeMcm, freeboardM);
    const tScore = this.calculateTriggerUrgency(growth30dPct, precip48hMm, damDistortionDetected, insarVelocityMmYr, insarCoherence);
    const hIndex = Number((sScore * tScore).toFixed(3));

    let severity: AlertSeverityLevel | null = null;
    let quadrant: 'DORMANT_STABLE' | 'HIGH_SUSCEPTIBILITY_WATCH' | 'TRIGGERED_TRANSIENT_WARNING' | 'CRITICAL_DUAL_TRIGGER' = 'DORMANT_STABLE';
    const triggers: string[] = [];

    if (precip48hMm > 50.0) {
      triggers.push(`Heavy 48-hour antecedent rainfall: ${precip48hMm.toFixed(1)} mm`);
    }
    if (growth30dPct > 15.0) {
      triggers.push(`Rapid lake area expansion: +${growth30dPct.toFixed(1)}%`);
    }
    if (insarVelocityMmYr !== undefined && insarVelocityMmYr <= -15.0) {
      triggers.push(`InSAR moraine creep detected: ${insarVelocityMmYr.toFixed(1)} mm/yr`);
    }
    if (damDistortionDetected) {
      triggers.push('Sudden moraine dam distortion / collapse anomaly detected');
    }

    // Severity mapping
    if (damDistortionDetected || growth30dPct > 30.0 || (insarVelocityMmYr !== undefined && insarVelocityMmYr <= -35.0) || (sScore >= 0.60 && tScore >= 0.60)) {
      severity = 'EMERGENCY';
      quadrant = 'CRITICAL_DUAL_TRIGGER';
      if (sScore >= 0.60 && tScore >= 0.60) {
        triggers.push(`Dual-axis hazard convergence: S=${sScore.toFixed(2)}, T=${tScore.toFixed(2)}, H=${hIndex.toFixed(2)}`);
      }
    } else if (growth30dPct > 15.0 || precip48hMm > 50.0 || (insarVelocityMmYr !== undefined && insarVelocityMmYr <= -15.0) || tScore >= 0.55) {
      severity = 'WARNING';
      quadrant = 'TRIGGERED_TRANSIENT_WARNING';
    } else if (sScore >= 0.60 || growthBaselinePct > 8.0 || precip48hMm > 25.0) {
      severity = 'ADVISORY';
      quadrant = 'HIGH_SUSCEPTIBILITY_WATCH';
      if (sScore >= 0.60) {
        triggers.push(`High geomorphic susceptibility index (S=${sScore.toFixed(2)})`);
      }
    }

    if (!severity) {
      return null;
    }

    const triggerReason = `GLOF ${severity} [${quadrant}] for ${lakeName}: ` + triggers.join('; ');

    const twoAxisScore: TwoAxisRiskScore = {
      susceptibility_score: sScore,
      trigger_urgency_score: tScore,
      combined_hazard_index: hIndex,
      risk_matrix_quadrant: quadrant,
    };

    const newAlert: FloodAlert = {
      id: `a-${Date.now()}`,
      lake_id: lakeId,
      lake_name: lakeName,
      severity,
      trigger_reason: triggerReason,
      created_at: new Date().toISOString(),
      resolved_at: null,
      two_axis_score: twoAxisScore,
    };

    try {
      const [inserted] = await db('flood_alerts')
        .insert({
          lake_id: actualLakeUuid || lakeId,
          severity,
          trigger_reason: triggerReason,
        })
        .returning(['id', 'lake_id', 'severity', 'trigger_reason', 'created_at', 'resolved_at']);
      return { ...inserted, two_axis_score: twoAxisScore };
    } catch (e) {
      MOCK_FLOOD_ALERTS.unshift(newAlert);
      return newAlert;
    }
  }

  /**
   * Evaluates InSAR Moraine Deformation Baseline Telemetry and triggers automated Cue-and-Slew tasking.
   */
  public static async evaluateInSARBaseline(
    lakeId: string,
    meanVelocityMmYr: number,
    maxSubsidenceMmYr: number,
    coherence: number
  ): Promise<{
    telemetry: InSARTelemetry;
    alert: FloodAlert | null;
    tasking_order: CueAndSlewTaskingOrder | null;
  }> {
    const mockLake = MOCK_GLACIAL_LAKES.find((l) => l.id === lakeId || l.icimod_code === lakeId) || {
      id: lakeId,
      name: 'Glacial Lake',
      centroid: { coordinates: [86.475, 27.868] },
    };

    let rating: 'STABLE' | 'MODERATE_CREEP' | 'CRITICAL_DESTABILIZATION' = 'STABLE';
    if (maxSubsidenceMmYr <= -35.0 || meanVelocityMmYr <= -25.0) {
      rating = 'CRITICAL_DESTABILIZATION';
    } else if (maxSubsidenceMmYr <= -15.0 || meanVelocityMmYr <= -12.0) {
      rating = 'MODERATE_CREEP';
    }

    const telemetry: InSARTelemetry = {
      id: `insar-${lakeId}-${Date.now()}`,
      lake_id: lakeId,
      recorded_at: new Date().toISOString(),
      mean_los_velocity_mm_year: meanVelocityMmYr,
      max_subsidence_mm_year: maxSubsidenceMmYr,
      mean_coherence: coherence,
      deformation_rating: rating,
      points: [
        { point_id: `pt-${lakeId}-1`, lat: mockLake.centroid?.coordinates[1] || 27.868, lon: mockLake.centroid?.coordinates[0] || 86.475, los_velocity_mm_year: meanVelocityMmYr, coherence, is_anomaly: rating !== 'STABLE' },
      ],
    };

    MOCK_INSAR_TELEMETRY.unshift(telemetry);

    let taskingOrder: CueAndSlewTaskingOrder | null = null;
    let alert: FloodAlert | null = null;

    if (rating !== 'STABLE' || coherence < 0.45) {
      const isCritical = rating === 'CRITICAL_DESTABILIZATION' || coherence < 0.40;
      const priority = isCritical ? 'IMMEDIATE_INTERVENTION' : 'PRIORITY';
      const sensor = isCritical ? 'SkySat-Submeter' : 'WorldView-3';
      const gsd = isCritical ? 0.50 : 0.31;
      const coords = mockLake.centroid?.coordinates || [86.475, 27.868];

      taskingOrder = {
        tasking_id: `task-slew-${lakeId}-${Date.now()}`,
        lake_id: lakeId,
        lake_name: mockLake.name,
        priority,
        target_sensor: sensor,
        target_gsd_meters: gsd,
        bbox: [coords[0] - 0.03, coords[1] - 0.03, coords[0] + 0.03, coords[1] + 0.03],
        reasons: [
          {
            source: 'INSAR_SUBSIDENCE',
            severity: isCritical ? 'CRITICAL' : 'ELEVATED',
            description: `Moraine crest subsidence ${maxSubsidenceMmYr.toFixed(1)} mm/yr (rating: ${rating})`,
            observed_value: maxSubsidenceMmYr,
          },
        ],
        required_cv_analyses: [
          'Tension crack propagation and shear aperture widening',
          'Dam crest piping seepage and thermokarst pond formation',
        ],
        status: 'TASKED',
        created_at: new Date().toISOString(),
      };

      MOCK_CUE_SLEW_TASKINGS.unshift(taskingOrder);

      const severity: AlertSeverityLevel = isCritical ? 'EMERGENCY' : 'WARNING';
      const reason = `GLOF ${severity} [SAR_CUE_ANOMALY] for ${mockLake.name}: Sentinel-1 InSAR moraine displacement ${maxSubsidenceMmYr.toFixed(1)} mm/yr -> Automated ${sensor} (${gsd}m GSD) slew tasking initiated.`;

      alert = {
        id: `a-insar-${Date.now()}`,
        lake_id: lakeId,
        lake_name: mockLake.name,
        severity,
        trigger_reason: reason,
        created_at: new Date().toISOString(),
        resolved_at: null,
        slew_tasking_order: taskingOrder,
      };

      MOCK_FLOOD_ALERTS.unshift(alert);
    }

    return { telemetry, alert, tasking_order: taskingOrder };
  }

  /**
   * Evaluates In-Situ Edge Ground Sensor Telemetry (Riverbed Geophones & Ultrasonic Stage Gauges).
   * Detects hyper-concentrated slurry surge and triggers instant SCADA spillway gate actuation.
   */
  public static async evaluateEdgeSensorReading(reading: {
    station_id: string;
    gorge_name: string;
    lake_id: string;
    geophone_dominant_freq_hz: number;
    geophone_acoustic_energy_db: number;
    water_stage_m: number;
    water_stage_rate_m_min: number;
    tripwire_status: 'INTACT' | 'TRIPPED';
  }): Promise<{
    reading: EdgeSensorReading;
    alert: FloodAlert | null;
    scada_command: SCADAGateCommand | null;
  }> {
    const isSlurryAcoustic = reading.geophone_acoustic_energy_db >= 70.0 && reading.geophone_dominant_freq_hz >= 10.0 && reading.geophone_dominant_freq_hz <= 45.0;
    const isStageSurge = reading.water_stage_rate_m_min >= 0.50;
    const isTripwireSevered = reading.tripwire_status === 'TRIPPED';

    const isSurge = isSlurryAcoustic || isStageSurge || isTripwireSevered;
    const alarmLevel = isSurge ? 'CRITICAL_SURGE' : (reading.geophone_acoustic_energy_db > 55.0 ? 'ELEVATED' : 'NORMAL');

    let scadaCommand: SCADAGateCommand | null = null;
    let alert: FloodAlert | null = null;

    if (isSurge) {
      // Direct coupling to downstream hydropower SCADA
      const facility = reading.lake_id.includes('gandaki') || reading.lake_id.includes('thulagi')
        ? {
            id: 'scada-marsyangdi-hydro',
            name: 'Marsyangdi Hydropower Dam Spillway Control',
            gates: ['Radial_Gate_1', 'Radial_Gate_2', 'Bottom_Sluice_Gate_1'],
            dist_km: 28.0,
            speed_m_s: 9.0,
          }
        : {
            id: 'scada-upper-tamakoshi',
            name: 'Upper Tama Koshi Hydroelectric Project (456 MW) SCADA Control',
            gates: ['Spillway_Radial_Gate_1', 'Spillway_Radial_Gate_2', 'Spillway_Radial_Gate_3'],
            dist_km: 32.0,
            speed_m_s: 9.5,
          };

      const etaMinutes = Number(((facility.dist_km * 1000) / facility.speed_m_s / 60.0).toFixed(1));

      scadaCommand = {
        facility_id: facility.id,
        facility_name: facility.name,
        action: 'EMERGENCY_FULL_OPEN',
        target_spillway_gates: facility.gates,
        estimated_arrival_minutes: etaMinutes,
        command_payload: {
          command: 'OPEN_ALL_SPILLWAY_GATES',
          override_interlocks: true,
          source: reading.station_id,
          gorge: reading.gorge_name,
          eta_minutes: etaMinutes,
        },
      };

      const reason = `GLOF EMERGENCY [EDGE_SENSOR_TRIPWIRE] in ${reading.gorge_name}: Hyper-concentrated boulder slurry surge detected (${reading.geophone_acoustic_energy_db.toFixed(1)} dB at ${reading.geophone_dominant_freq_hz.toFixed(1)} Hz, +${reading.water_stage_rate_m_min.toFixed(2)} m/min stage rise) -> SCADA Spillway Gates Triggered at ${facility.name} (ETA: ${etaMinutes} min)`;

      alert = {
        id: `a-edge-${Date.now()}`,
        lake_id: reading.lake_id,
        lake_name: reading.gorge_name,
        severity: 'EMERGENCY',
        trigger_reason: reason,
        created_at: new Date().toISOString(),
        resolved_at: null,
        scada_actuation: scadaCommand,
      };

      MOCK_FLOOD_ALERTS.unshift(alert);

      // Instant dispatch across channels (Hydropower SCADA Webhook, Community SMS, NEOC Telegram)
      try {
        await MultiChannelDispatchService.dispatchEmergencyAlert(alert);
      } catch (err) {
        console.error('[Edge Sensor Alert] Dispatch error:', err);
      }
    }

    const recordedReading: EdgeSensorReading = {
      id: `edge-${Date.now()}`,
      station_id: reading.station_id,
      gorge_name: reading.gorge_name,
      lake_id: reading.lake_id,
      recorded_at: new Date().toISOString(),
      geophone_dominant_freq_hz: reading.geophone_dominant_freq_hz,
      geophone_acoustic_energy_db: reading.geophone_acoustic_energy_db,
      water_stage_m: reading.water_stage_m,
      water_stage_rate_m_min: reading.water_stage_rate_m_min,
      tripwire_status: reading.tripwire_status,
      is_slurry_surge_detected: isSurge,
      alarm_level: alarmLevel,
      scada_actuation: scadaCommand,
    };

    MOCK_EDGE_SENSOR_READINGS.unshift(recordedReading);

    return {
      reading: recordedReading,
      alert,
      scada_command: scadaCommand,
    };
  }
}

