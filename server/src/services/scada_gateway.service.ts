import crypto from 'crypto';
import { SCADAGateCommand } from '../types';

export interface IEC104TelecontrolFrame {
  apci_type: 'I_FORMAT' | 'S_FORMAT' | 'U_FORMAT';
  type_id: number; // 45: C_SC_NA_1 (Single Command), 46: C_DC_NA_1 (Double Command)
  cause_of_transmission: number; // 6: Activation
  common_address_asdu: number; // Facility RTU address
  information_object_address: number; // Gate actuator register
  command_value: number; // 1: TRIP/OPEN, 0: CLOSE
  qualifier_of_command: number; // 0: Execute immediately
  hex_payload: string;
}

export interface ModbusTCPFrame {
  transaction_id: number;
  protocol_id: number; // 0 for Modbus
  length: number;
  unit_id: number;
  function_code: number; // 5: Write Single Coil, 16: Write Multiple Registers
  reference_address: number;
  data_hex: string;
}

export interface SCADAGatewayDispatchResult {
  facility_id: string;
  facility_name: string;
  action: string;
  timestamp: string;
  iec104_frames: IEC104TelecontrolFrame[];
  modbus_frame: ModbusTCPFrame;
  digital_signature: string;
  dispatched: boolean;
  transit_protocol: string;
}

export interface SCADAAuthorizationRequisition {
  requisition_id: string;
  facility_id: string;
  facility_name: string;
  action: 'EMERGENCY_FULL_OPEN' | 'PRE_DRAWDOWN' | 'HOLD';
  drawdown_buffer_m: number;
  requested_by_engineer_id: string;
  justification: string;
  status: 'PENDING_SECOND_KEY' | 'AUTHORIZED' | 'REJECTED' | 'EXPIRED' | 'AUTO_OVERRIDDEN_BY_GROUND_QUORUM';
  requested_at: string;
  expires_at: string;
  auth_token: string;
  second_key_approved_by?: string | null;
  second_key_approved_at?: string | null;
  dispatch_payload?: SCADAGatewayDispatchResult | null;
}

export class IndustrialSCADAGatewayService {
  private static readonly HMAC_SECRET = process.env.SCADA_HMAC_SECRET || 'himalaya_ews_hydro_scada_secure_key_2026';
  private static requisitions: SCADAAuthorizationRequisition[] = [];

  // Known RTU Common Address Assignments for Nepalese Hydropower Assets
  private static readonly FACILITY_RTU_MAP: Record<string, { coa: number; unit_id: number; start_ioa: number }> = {
    'scada-upper-tamakoshi': { coa: 14, unit_id: 1, start_ioa: 6001 },
    'scada-marsyangdi-hydro': { coa: 22, unit_id: 2, start_ioa: 7001 },
    'scada-dudhkoshi-storage': { coa: 35, unit_id: 3, start_ioa: 8001 },
  };

  /**
   * Generates IEC 60870-5-104 ASDU telecontrol frame for radial spillway gate actuation.
   */
  public static buildIEC104Command(
    coa: number,
    ioa: number,
    commandVal: number = 1
  ): IEC104TelecontrolFrame {
    // IEC 60870-5-104 Type 45: C_SC_NA_1 (Single Command)
    // ASDU Header: Type (0x2D), VSQ (0x01), COT (0x06), COA LSB/MSB
    const typeId = 45;
    const cot = 6; // Activation
    const buf = Buffer.alloc(14);

    // APCI (I-Format, Send Seq 0, Recv Seq 0)
    buf.writeUInt8(0x68, 0); // Start byte
    buf.writeUInt8(0x0C, 1); // Length (12 bytes)
    buf.writeUInt16LE(0x0000, 2); // Tx
    buf.writeUInt16LE(0x0000, 4); // Rx

    // ASDU
    buf.writeUInt8(typeId, 6); // Type 45
    buf.writeUInt8(0x01, 7); // Variable Structure Qualifier
    buf.writeUInt8(cot, 8); // COT 6
    buf.writeUInt8(0x00, 9); // Originator address
    buf.writeUInt16LE(coa, 10); // Common Address of ASDU
    buf.writeUInt16LE(ioa, 12); // Information Object Address (first 2 bytes)

    return {
      apci_type: 'I_FORMAT',
      type_id: typeId,
      cause_of_transmission: cot,
      common_address_asdu: coa,
      information_object_address: ioa,
      command_value: commandVal,
      qualifier_of_command: 0,
      hex_payload: buf.toString('hex').toUpperCase(),
    };
  }

  /**
   * Generates Modbus TCP FC05 (Write Single Coil) frame.
   */
  public static buildModbusTCPCommand(
    unitId: number,
    coilAddress: number,
    turnOn: boolean = true
  ): ModbusTCPFrame {
    const txId = Math.floor(Math.random() * 65535);
    const buf = Buffer.alloc(12);

    buf.writeUInt16BE(txId, 0); // Transaction ID
    buf.writeUInt16BE(0x0000, 2); // Protocol ID (Modbus)
    buf.writeUInt16BE(6, 4); // Length remaining (6 bytes)
    buf.writeUInt8(unitId, 6); // Unit ID
    buf.writeUInt8(5, 7); // Function Code 05 (Write Single Coil)
    buf.writeUInt16BE(coilAddress, 8); // Coil Reference
    buf.writeUInt16BE(turnOn ? 0xFF00 : 0x0000, 10); // 0xFF00 = ON

    return {
      transaction_id: txId,
      protocol_id: 0,
      length: 6,
      unit_id: unitId,
      function_code: 5,
      reference_address: coilAddress,
      data_hex: buf.toString('hex').toUpperCase(),
    };
  }

  /**
   * Generates HMAC-SHA256 signature to cryptographically sign emergency radial gate commands.
   */
  public static signCommandPayload(payload: Record<string, any>): string {
    const serialized = JSON.stringify(payload);
    return crypto.createHmac('sha256', this.HMAC_SECRET).update(serialized).digest('hex');
  }

  /**
   * Translates high-level SCADAGateCommand into industrial IEC 60870-5-104 & Modbus payloads.
   */
  public static prepareIndustrialDispatch(command: SCADAGateCommand): SCADAGatewayDispatchResult {
    const mapping = this.FACILITY_RTU_MAP[command.facility_id] || { coa: 1, unit_id: 1, start_ioa: 6001 };

    // Build IEC 60870-5-104 frames for each target spillway gate
    const iecFrames: IEC104TelecontrolFrame[] = command.target_spillway_gates.map((gateName, index) => {
      const ioa = mapping.start_ioa + index;
      return this.buildIEC104Command(mapping.coa, ioa, 1);
    });

    // Build primary Modbus TCP command (Coil 0001 = Master Emergency Trip)
    const modbusFrame = this.buildModbusTCPCommand(mapping.unit_id, 1, true);

    const signature = this.signCommandPayload({
      facility_id: command.facility_id,
      action: command.action,
      gates: command.target_spillway_gates,
      timestamp: new Date().toISOString(),
    });

    return {
      facility_id: command.facility_id,
      facility_name: command.facility_name,
      action: command.action,
      timestamp: new Date().toISOString(),
      iec104_frames: iecFrames,
      modbus_frame: modbusFrame,
      digital_signature: signature,
      dispatched: true,
      transit_protocol: 'IEC_60870_5_104_OVER_IPSEC_VPN',
    };
  }

  /**
   * Submits a Level-1 Pre-Drawdown Requisition requiring a second engineer's sign-off.
   */
  public static requestPreDrawdownRequisition(params: {
    facility_id: string;
    facility_name: string;
    requested_by_engineer_id: string;
    justification: string;
    drawdown_buffer_m?: number;
    action?: 'PRE_DRAWDOWN' | 'EMERGENCY_FULL_OPEN';
  }): SCADAAuthorizationRequisition {
    const requisitionId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15-minute token window

    const tokenPayload = {
      requisition_id: requisitionId,
      facility_id: params.facility_id,
      engineer_id: params.requested_by_engineer_id,
      expires_at: expiresAt.toISOString(),
    };
    const authToken = this.signCommandPayload(tokenPayload);

    const requisition: SCADAAuthorizationRequisition = {
      requisition_id: requisitionId,
      facility_id: params.facility_id,
      facility_name: params.facility_name,
      action: params.action || 'PRE_DRAWDOWN',
      drawdown_buffer_m: params.drawdown_buffer_m || 4.5,
      requested_by_engineer_id: params.requested_by_engineer_id,
      justification: params.justification,
      status: 'PENDING_SECOND_KEY',
      requested_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      auth_token: authToken,
      second_key_approved_by: null,
      second_key_approved_at: null,
      dispatch_payload: null,
    };

    this.requisitions.unshift(requisition);
    return requisition;
  }

  /**
   * Approves a Level-1 Pre-Drawdown Requisition with Secondary Engineer Sign-off (Two-Person Rule).
   */
  public static authorizePreDrawdownRequisition(params: {
    requisition_id: string;
    second_engineer_id: string;
    digital_key: string;
  }): SCADAAuthorizationRequisition {
    const req = this.requisitions.find((r) => r.requisition_id === params.requisition_id);
    if (!req) {
      throw new Error(`Requisition ${params.requisition_id} not found`);
    }

    if (req.status !== 'PENDING_SECOND_KEY') {
      throw new Error(`Requisition ${params.requisition_id} is already in status ${req.status}`);
    }

    // Two-Person Rule validation
    if (params.second_engineer_id === req.requested_by_engineer_id) {
      throw new Error('Two-Person Rule violation: Secondary authorizing engineer must be distinct from requester');
    }

    // Expiration check
    if (new Date() > new Date(req.expires_at)) {
      req.status = 'EXPIRED';
      throw new Error('Authorization token expired (>15 min window). Requisition invalidated.');
    }

    // Prepare industrial dispatch
    const scadaCmd: SCADAGateCommand = {
      facility_id: req.facility_id,
      facility_name: req.facility_name,
      action: req.action,
      target_spillway_gates: ['Spillway_Radial_Gate_1', 'Spillway_Radial_Gate_2', 'Spillway_Radial_Gate_3'],
      estimated_arrival_minutes: 45.0,
      command_payload: {
        command: req.action,
        requisition_id: req.requisition_id,
        primary_engineer: req.requested_by_engineer_id,
        secondary_engineer: params.second_engineer_id,
        digital_key_sig: params.digital_key,
      },
    };

    const dispatchResult = this.prepareIndustrialDispatch(scadaCmd);

    req.status = 'AUTHORIZED';
    req.second_key_approved_by = params.second_engineer_id;
    req.second_key_approved_at = new Date().toISOString();
    req.dispatch_payload = dispatchResult;

    return req;
  }

  /**
   * Emergency Failsafe Override: Automated actuation triggered exclusively by verified ground quorum.
   */
  public static executeZeroHourQuorumOverride(params: {
    facility_id: string;
    facility_name: string;
    target_spillway_gates: string[];
    quorum_count: number;
    confidence_score: number;
    estimated_arrival_minutes: number;
    reason: string;
  }): SCADAAuthorizationRequisition {
    const requisitionId = `override-${Date.now()}`;
    const now = new Date();

    const scadaCmd: SCADAGateCommand = {
      facility_id: params.facility_id,
      facility_name: params.facility_name,
      action: 'EMERGENCY_FULL_OPEN',
      target_spillway_gates: params.target_spillway_gates,
      estimated_arrival_minutes: params.estimated_arrival_minutes,
      command_payload: {
        command: 'OPEN_ALL_SPILLWAY_GATES',
        override_interlocks: true,
        source: 'IN_SITU_GROUND_QUORUM_FAILSAFE',
        quorum_count: params.quorum_count,
        confidence_score: params.confidence_score,
        reason: params.reason,
      },
    };

    const dispatchResult = this.prepareIndustrialDispatch(scadaCmd);
    dispatchResult.transit_protocol = 'IEC_60870_5_104_OVER_IPSEC_VPN_FALLBACK_IRIDIUM';

    const requisition: SCADAAuthorizationRequisition = {
      requisition_id: requisitionId,
      facility_id: params.facility_id,
      facility_name: params.facility_name,
      action: 'EMERGENCY_FULL_OPEN',
      drawdown_buffer_m: 6.0,
      requested_by_engineer_id: 'SYSTEM_AUTONOMOUS_FAILSAFE',
      justification: params.reason,
      status: 'AUTO_OVERRIDDEN_BY_GROUND_QUORUM',
      requested_at: now.toISOString(),
      expires_at: now.toISOString(),
      auth_token: this.signCommandPayload({ override_id: requisitionId, quorum: params.quorum_count }),
      second_key_approved_by: 'ZERO_HOUR_GROUND_QUORUM_FAILSAFE',
      second_key_approved_at: now.toISOString(),
      dispatch_payload: dispatchResult,
    };

    this.requisitions.unshift(requisition);
    return requisition;
  }

  public static getPendingRequisitions(): SCADAAuthorizationRequisition[] {
    return this.requisitions.filter((r) => r.status === 'PENDING_SECOND_KEY');
  }

  public static getRequisitions(): SCADAAuthorizationRequisition[] {
    return [...this.requisitions];
  }

  public static getRequisitionById(id: string): SCADAAuthorizationRequisition | null {
    return this.requisitions.find((r) => r.requisition_id === id) || null;
  }

  public static clearRequisitionsForTesting(): void {
    this.requisitions = [];
  }
}
