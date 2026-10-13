import { Router, Request, Response } from 'express';
import { MultiChannelDispatchService } from '../services/dispatch.service';
import { CommunityEWSService } from '../services/community_ews.service';
import { IndustrialSCADAGatewayService } from '../services/scada_gateway.service';
import { FloodAlert } from '../types';
import { db, MOCK_HYDROPOWER_CASCADES, MOCK_DHM_STATIONS, MOCK_HISTORICAL_GLOFS } from '../services/db.service';
import { assessHydrometricStatus, HydrologyValidationError, queryHydrometricStations, storeHydrometricObservation } from '../services/hydrology.service';

const router = Router();

// In-memory mutable states for testing and live simulations
let liveHydropowerCascades = [...MOCK_HYDROPOWER_CASCADES];
let liveDhmStations = [...MOCK_DHM_STATIONS];
const canonicalDataEnabled = process.env.EWS_CANONICAL_DATA === 'true' || Boolean(process.env.DATABASE_URL);

function simulatedStation(station: any) {
  return {
    ...station,
    source_key: 'legacy-demo',
    observation_state: 'SIMULATED',
    quality_status: 'SUSPECT',
    quality_flags: ['IN_MEMORY_FIXTURE'],
  };
}

/**
 * POST /api/v1/dispatch/test
 * Triggers an emergency broadcast across SMS, Telegram, and Hydropower SCADA channels.
 */
router.post('/test', async (req: Request, res: Response) => {
  const { lake_id, lake_name, severity, trigger_reason } = req.body;

  const mockAlert: FloodAlert = {
    id: `alt-test-${Date.now()}`,
    lake_id: lake_id || 'l-tsho-rolpa',
    lake_name: lake_name || 'Tsho Rolpa Glacial Lake',
    severity: severity || 'EMERGENCY',
    trigger_reason:
      trigger_reason ||
      'EMERGENCY GLOF Broadcast Test: Hydrodynamic wave propagation simulation and automated dam spillway gate opening trigger.',
    created_at: new Date().toISOString(),
    resolved_at: null,
  };

  const dispatchResults = await MultiChannelDispatchService.dispatchEmergencyAlert(mockAlert);

  return res.status(200).json({
    success: true,
    message: `Emergency broadcast transmitted to ${dispatchResults.length} channels`,
    alert: mockAlert,
    dispatch_results: dispatchResults,
  });
});

/**
 * GET /api/v1/dispatch/communities
 * List monitored downstream valley settlements, CDMC focal points, and siren towers.
 */
router.get('/communities', (req: Request, res: Response) => {
  const { basin } = req.query;
  const villages = CommunityEWSService.getVillages(basin as string);
  return res.json({
    success: true,
    count: villages.length,
    data: villages,
  });
});

/**
 * GET /api/v1/dispatch/safe-havens
 * List pre-surveyed vertical safe havens (+25m to +45m) and geological foot-scramble escape routes.
 */
router.get('/safe-havens', (req: Request, res: Response) => {
  const { basin } = req.query;
  const havens = CommunityEWSService.getSafeHavens(basin as string);
  return res.json({
    success: true,
    count: havens.length,
    data: havens,
  });
});

/**
 * POST /api/v1/dispatch/community-sms
 * Broadcast localized multi-lingual emergency bulletins (Nepali, Sherpa, English) via NTC / Ncell.
 */
router.post('/community-sms', (req: Request, res: Response) => {
  const { lake_name, valley, severity, target_basin } = req.body;
  if (!lake_name) {
    return res.status(400).json({ success: false, error: 'Missing required lake_name parameter' });
  }

  const dispatches = CommunityEWSService.broadcastSMS({
    lake_name,
    valley,
    severity,
    target_basin,
  });

  return res.status(200).json({
    success: true,
    message: `Multi-lingual emergency bulletins dispatched to ${dispatches.length} community contacts`,
    count: dispatches.length,
    data: dispatches,
  });
});

/**
 * POST /api/v1/dispatch/sirens/trigger
 * Actuate remote solar siren towers with 120 dB acoustic pattern and xenon strobe beacon.
 */
router.post('/sirens/trigger', (req: Request, res: Response) => {
  const { siren_tower_id, pattern, duration_seconds } = req.body;
  if (!siren_tower_id) {
    return res.status(400).json({ success: false, error: 'Missing required siren_tower_id' });
  }

  const result = CommunityEWSService.triggerSiren({
    siren_tower_id,
    pattern,
    duration_seconds,
  });

  return res.status(200).json({
    success: true,
    message: `RF siren trigger packet dispatched to ${result.siren_tower_id} (${result.village_name})`,
    data: result,
  });
});

/**
 * GET /api/v1/dispatch/hydropower-cascades
 * List all downstream hydropower cascades, radial gates, and SCADA interlock statuses.
 */
router.get('/hydropower-cascades', (req: Request, res: Response) => {
  const { basin } = req.query;
  let cascades = [...liveHydropowerCascades];
  if (basin) {
    cascades = cascades.filter(
      (c) => c.basin.toLowerCase() === (basin as string).toLowerCase()
    );
  }

  const totalCapacityMw = cascades.reduce((acc, c) => acc + c.capacity_mw, 0);

  return res.status(200).json({
    success: true,
    count: cascades.length,
    total_capacity_mw: totalCapacityMw,
    data: cascades,
  });
});

/**
 * POST /api/v1/dispatch/hydropower-cascades/:id/interlock
 * Trigger emergency spillway radial gate drawdown via IEC 60870-5-104 ASDU type 45.
 */
router.post('/hydropower-cascades/:id/interlock', (req: Request, res: Response) => {
  const { id } = req.params;
  const { action = 'EMERGENCY_FULL_OPEN', reason } = req.body;

  const plantIndex = liveHydropowerCascades.findIndex(
    (p) => p.id.toLowerCase() === id.toLowerCase() || p.name.toLowerCase().includes(id.toLowerCase())
  );

  if (plantIndex === -1) {
    return res.status(404).json({ success: false, error: `Hydropower plant ${id} not found` });
  }

  const plant = liveHydropowerCascades[plantIndex];

  // Generate standard IEC 60870-5-104 Type 45 single command APDU payload:
  // START: 0x68 (Start byte), Length: 0x0e, Control field: 00 00 00 00
  // ASDU: Type 45 (0x2d - C_SC_NA_1 single command), COT: 6 (0x06 - activation), Common Addr: 1 (0x01 0x00)
  // IOA (Information Object Address): 0x000100, SCO (Single Command): 0x81 (Execute ON / Full Spillway Trip)
  const isTrip = action === 'EMERGENCY_FULL_OPEN' || action === 'PRE_DRAWDOWN';
  const commandHex = isTrip
    ? '68 0e 00 00 00 00 2d 01 06 00 01 00 00 01 00 81'
    : '68 0e 00 00 00 00 2d 01 06 00 01 00 00 01 00 00';

  const newStatus = isTrip
    ? (action === 'EMERGENCY_FULL_OPEN' ? 'FULL_SPILLWAY_DISCHARGE' : 'PRE_DRAWDOWN')
    : 'MONITORING';

  const updatedPlant = {
    ...plant,
    interlock_status: newStatus as any,
    last_tripped_at: isTrip ? new Date().toISOString() : null,
    last_command_hex: commandHex,
  };

  liveHydropowerCascades[plantIndex] = updatedPlant;

  return res.status(200).json({
    success: true,
    message: `IEC 60870-5-104 Command Dispatched to ${plant.name} [IP: ${plant.scada_ip}]`,
    data: {
      plant_id: plant.id,
      plant_name: plant.name,
      capacity_mw: plant.capacity_mw,
      radial_gates_opened: plant.radial_gates_count,
      drawdown_buffer_meters: plant.drawdown_buffer_m,
      action,
      reason: reason || 'GLOF Surge Pre-drawdown Warning Actuation',
      protocol: plant.scada_protocol,
      scada_ip: plant.scada_ip,
      iec104_frame: {
        apdu_hex: commandHex,
        asdu_type: '45 (C_SC_NA_1 Single Command)',
        cause_of_transmission: '0x06 (Activation)',
        information_object_address: '0x000100 (Spillway Radial Gate Master Actuator)',
        command_qualifier: isTrip ? 'EXECUTE_TRIP_OPEN' : 'NORMAL_HOLD',
      },
      updated_status: newStatus,
      dispatched_at: new Date().toISOString(),
    },
  });
});

/**
 * POST /api/v1/dispatch/hydropower-cascades/:id/requisition
 * Create a Level-1 Pre-Drawdown Requisition requiring Two-Person Rule authorization.
 */
router.post('/hydropower-cascades/:id/requisition', (req: Request, res: Response) => {
  const { id } = req.params;
  const { requested_by_engineer_id, justification, drawdown_buffer_m, action } = req.body;

  if (!requested_by_engineer_id || !justification) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: requested_by_engineer_id and justification are mandatory',
    });
  }

  const plant = liveHydropowerCascades.find(
    (p) => p.id.toLowerCase() === id.toLowerCase() || p.name.toLowerCase().includes(id.toLowerCase())
  );

  if (!plant) {
    return res.status(404).json({ success: false, error: `Hydropower plant ${id} not found` });
  }

  const requisition = IndustrialSCADAGatewayService.requestPreDrawdownRequisition({
    facility_id: plant.id,
    facility_name: plant.name,
    requested_by_engineer_id,
    justification,
    drawdown_buffer_m: Number(drawdown_buffer_m || plant.drawdown_buffer_m),
    action: action || 'PRE_DRAWDOWN',
  });

  return res.status(201).json({
    success: true,
    message: `Pre-Drawdown Requisition created for ${plant.name}. Pending secondary engineer digital sign-off.`,
    data: requisition,
  });
});

/**
 * POST /api/v1/dispatch/hydropower-cascades/requisitions/:reqId/authorize
 * Authorize a pending requisition with a secondary engineer's credentials (Two-Person Rule).
 */
router.post('/hydropower-cascades/requisitions/:reqId/authorize', (req: Request, res: Response) => {
  const { reqId } = req.params;
  const { second_engineer_id, digital_key } = req.body;

  if (!second_engineer_id || !digital_key) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: second_engineer_id and digital_key are mandatory',
    });
  }

  try {
    const authorizedReq = IndustrialSCADAGatewayService.authorizePreDrawdownRequisition({
      requisition_id: reqId,
      second_engineer_id,
      digital_key,
    });

    // Update the live cascade state
    const plantIndex = liveHydropowerCascades.findIndex((p) => p.id === authorizedReq.facility_id);
    if (plantIndex !== -1) {
      liveHydropowerCascades[plantIndex] = {
        ...liveHydropowerCascades[plantIndex],
        interlock_status: 'PRE_DRAWDOWN',
        last_tripped_at: authorizedReq.second_key_approved_at,
        last_command_hex: authorizedReq.dispatch_payload?.iec104_frames[0]?.hex_payload || null,
      };
    }

    return res.status(200).json({
      success: true,
      message: `Two-Person Rule satisfied: Pre-Drawdown Authorized for ${authorizedReq.facility_name}`,
      data: authorizedReq,
    });
  } catch (err: any) {
    return res.status(403).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/v1/dispatch/hydropower-cascades/requisitions
 * List all SCADA authorization requisitions.
 */
router.get('/hydropower-cascades/requisitions', (req: Request, res: Response) => {
  const requisitions = IndustrialSCADAGatewayService.getRequisitions();
  return res.status(200).json({
    success: true,
    count: requisitions.length,
    data: requisitions,
  });
});

/**
 * GET /api/v1/dispatch/dhm-stations
 * List all real-time DHM hydrometric gauging stations and current river stage readings.
 */
router.get('/dhm-stations', async (req: Request, res: Response) => {
  const { basin, status } = req.query;
  let stations: any[] = [];

  if (canonicalDataEnabled) {
    try {
      const registered = await queryHydrometricStations();
      const ids = registered.map((s: any) => s.id);
      const observations = ids.length
        ? await db('hydrometric_observations').distinctOn('station_id').whereIn('station_id', ids).orderBy('station_id').orderBy('observed_at', 'desc')
        : [];
      const latest = new Map<string, any>();
      for (const observation of observations) {
        if (!latest.has(observation.station_id)) latest.set(observation.station_id, observation);
      }
      stations = registered.map((station: any) => {
        const observation = latest.get(station.id);
        const assessment = assessHydrometricStatus(station, observation);
        const stage = observation?.stage_m == null ? null : Number(observation.stage_m);
        const warning = station.active_warning_stage_m == null ? null : Number(station.active_warning_stage_m);
        const danger = station.active_danger_stage_m == null ? null : Number(station.active_danger_stage_m);
        return {
          id: station.id,
          station_number: Number(station.station_number),
          name: station.name,
          river: station.river,
          basin: station.basin,
          elevation_m: station.elevation_m == null ? null : Number(station.elevation_m),
          current_stage_m: stage,
          warning_stage_m: warning,
          danger_stage_m: danger,
          current_discharge_cms: observation?.discharge_cms == null ? null : Number(observation.discharge_cms),
          ...assessment,
          telemetry_source: station.source_key === 'dhm-hydrology' ? 'DHM_TELEMETRIC_NETWORK' : 'PARTNER_NETWORK',
          source_key: station.source_key,
          last_updated: observation?.observed_at ?? null,
          provider: station.provider,
          product: station.product,
          is_authoritative: station.is_authoritative,
          threshold_source_url: station.threshold_source_url ?? null,
          threshold_retrieved_at: station.threshold_retrieved_at ?? null,
        };
      });
    } catch (err) {
      return res.status(503).json({ success: false, error: 'Canonical hydrology store unavailable' });
    }
  } else {
    stations = liveDhmStations.map(simulatedStation);
  }

  if (basin) {
    stations = stations.filter(
      (s) => s.basin.toLowerCase() === (basin as string).toLowerCase()
    );
  }
  if (status) {
    stations = stations.filter(
      (s) => s.status.toLowerCase() === (status as string).toLowerCase()
    );
  }

  return res.status(200).json({
    success: true,
    count: stations.length,
    data: stations,
  });
});

/**
 * POST /api/v1/dispatch/dhm-stations/:id/reading
 * Ingest new stage / discharge readings from telemetry and evaluate threshold breaches.
 */
router.post('/dhm-stations/:id/reading', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { stage_m, discharge_cms } = req.body;

  const stnIndex = liveDhmStations.findIndex(
    (s) => s.id.toLowerCase() === id.toLowerCase() || String(s.station_number) === id
  );

  if (canonicalDataEnabled) {
    try {
      const stationQuery = db('hydrometric_stations').where({ active: true });
      if (stnIndex !== -1) {
        stationQuery.andWhere('station_number', Number(liveDhmStations[stnIndex].station_number));
      } else if (/^\d+(\.\d{1,2})?$/.test(id)) {
        stationQuery.andWhere('station_number', Number(id));
      } else if (/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) {
        stationQuery.andWhere('id', id);
      } else {
        return res.status(404).json({ success: false, error: 'DHM station not found' });
      }
      const station = await stationQuery.first();
      if (!station) return res.status(404).json({ success: false, error: 'DHM station not registered' });
      const result = await storeHydrometricObservation({
        ...req.body, station_number: Number(station.station_number),
        observed_at: req.body.observed_at ?? new Date().toISOString(), raw_payload: req.body,
      });
      return res.status(201).json({ success: true, message: 'Canonical hydrometric observation persisted', data: result });
    } catch (error) {
      if (error instanceof HydrologyValidationError) return res.status(error.status).json({ success: false, error: error.message });
      return res.status(503).json({ success: false, error: 'Canonical hydrology store unavailable; observation not persisted' });
    }
  }

  if (stnIndex === -1) return res.status(404).json({ success: false, error: 'DHM station not found' });
  const stn = liveDhmStations[stnIndex];
  const newStage = typeof stage_m === 'number' ? stage_m : stn.current_stage_m;
  const newDischarge = typeof discharge_cms === 'number' ? discharge_cms : stn.current_discharge_cms;

  let newStatus: 'NORMAL' | 'WATCH' | 'CRITICAL_SURGE' = 'NORMAL';
  if (newStage >= stn.danger_stage_m) {
    newStatus = 'CRITICAL_SURGE';
  } else if (newStage >= stn.warning_stage_m) {
    newStatus = 'WATCH';
  }

  const updatedStn = {
    ...stn,
    current_stage_m: newStage,
    current_discharge_cms: newDischarge,
    status: newStatus,
    last_updated: new Date().toISOString(),
  };

  liveDhmStations[stnIndex] = updatedStn;

  return res.status(200).json({
    success: true,
    message: `Station #${stn.station_number} reading updated. Current Status: ${newStatus}`,
    data: simulatedStation(updatedStn),
  });
});

/**
 * GET /api/v1/dispatch/historical-glofs
 * Hindcast catalog of landmark historical Himalayan GLOF and debris flow breach events.
 */
router.get('/historical-glofs', (req: Request, res: Response) => {
  const { basin, trigger_mechanism, min_discharge } = req.query;
  let records = [...MOCK_HISTORICAL_GLOFS];

  if (basin) {
    records = records.filter((r) =>
      r.basin.toLowerCase().includes((basin as string).toLowerCase())
    );
  }

  if (trigger_mechanism) {
    records = records.filter(
      (r) => r.trigger_mechanism.toLowerCase() === (trigger_mechanism as string).toLowerCase()
    );
  }

  if (min_discharge) {
    const minD = Number(min_discharge);
    if (!isNaN(minD)) {
      records = records.filter((r) => r.peak_discharge_cms >= minD);
    }
  }

  return res.status(200).json({
    success: true,
    count: records.length,
    data: records,
  });
});

export default router;


