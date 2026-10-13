import { IndustrialSCADAGatewayService } from '../src/services/scada_gateway.service';
import { SCADAGateCommand } from '../src/types';

describe('Industrial SCADA Protocol Gateway Service (IEC 60870-5-104 & Modbus TCP)', () => {
  it('should build valid IEC 60870-5-104 ASDU telecontrol frame', () => {
    const coa = 14; // Upper Tamakoshi RTU
    const ioa = 6001; // Radial Gate 1
    const frame = IndustrialSCADAGatewayService.buildIEC104Command(coa, ioa, 1);

    expect(frame.apci_type).toBe('I_FORMAT');
    expect(frame.type_id).toBe(45); // C_SC_NA_1 (Single Command)
    expect(frame.cause_of_transmission).toBe(6); // Activation
    expect(frame.common_address_asdu).toBe(14);
    expect(frame.information_object_address).toBe(6001);
    expect(frame.command_value).toBe(1);
    expect(frame.hex_payload.startsWith('680C')).toBe(true); // Standard IEC 104 start byte & length
  });

  it('should build valid Modbus TCP FC05 frame', () => {
    const unitId = 1;
    const coilAddress = 1;
    const frame = IndustrialSCADAGatewayService.buildModbusTCPCommand(unitId, coilAddress, true);

    expect(frame.protocol_id).toBe(0); // Modbus protocol
    expect(frame.function_code).toBe(5); // FC05 Write Single Coil
    expect(frame.unit_id).toBe(1);
    expect(frame.reference_address).toBe(1);
    expect(frame.data_hex.length).toBe(24); // 12 bytes = 24 hex chars
  });

  it('should prepare industrial dispatch for Upper Tamakoshi with HMAC signature', () => {
    const cmd: SCADAGateCommand = {
      facility_id: 'scada-upper-tamakoshi',
      facility_name: 'Upper Tama Koshi Hydroelectric Project (456 MW) SCADA Control',
      action: 'EMERGENCY_FULL_OPEN',
      target_spillway_gates: [
        'Spillway_Radial_Gate_1',
        'Spillway_Radial_Gate_2',
        'Spillway_Radial_Gate_3',
      ],
      estimated_arrival_minutes: 56.1,
      command_payload: { command: 'OPEN_ALL_SPILLWAY_GATES' },
    };

    const result = IndustrialSCADAGatewayService.prepareIndustrialDispatch(cmd);

    expect(result.facility_id).toBe('scada-upper-tamakoshi');
    expect(result.iec104_frames.length).toBe(3);
    expect(result.iec104_frames[0].information_object_address).toBe(6001);
    expect(result.iec104_frames[1].information_object_address).toBe(6002);
    expect(result.iec104_frames[2].information_object_address).toBe(6003);
    expect(result.digital_signature).toBeDefined();
    expect(result.digital_signature.length).toBe(64); // SHA256 hex string
    expect(result.transit_protocol).toBe('IEC_60870_5_104_OVER_IPSEC_VPN');
  });

  it('should enforce Two-Person Rule (Double-Key) for pre-drawdown authorization', () => {
    IndustrialSCADAGatewayService.clearRequisitionsForTesting();

    // Engineer 1 initiates requisition
    const req = IndustrialSCADAGatewayService.requestPreDrawdownRequisition({
      facility_id: 'scada-upper-tamakoshi',
      facility_name: 'Upper Tama Koshi Hydroelectric Project',
      requested_by_engineer_id: 'ENG-PRADIP-01',
      justification: 'High antecedent monsoon rain (120mm/48h) in Rolwaling catchment',
      drawdown_buffer_m: 4.5,
    });

    expect(req.status).toBe('PENDING_SECOND_KEY');
    expect(req.auth_token).toBeDefined();
    expect(req.requested_by_engineer_id).toBe('ENG-PRADIP-01');

    // Attempting self-approval should throw Two-Person Rule violation
    expect(() => {
      IndustrialSCADAGatewayService.authorizePreDrawdownRequisition({
        requisition_id: req.requisition_id,
        second_engineer_id: 'ENG-PRADIP-01', // Same engineer!
        digital_key: 'SIG_TEST_KEY',
      });
    }).toThrow(/Two-Person Rule violation/);

    // Second distinct engineer approves
    const authorized = IndustrialSCADAGatewayService.authorizePreDrawdownRequisition({
      requisition_id: req.requisition_id,
      second_engineer_id: 'ENG-SUNITA-LEAD-02',
      digital_key: 'SIG_VALID_ENGINEER_KEY_2026',
    });

    expect(authorized.status).toBe('AUTHORIZED');
    expect(authorized.second_key_approved_by).toBe('ENG-SUNITA-LEAD-02');
    expect(authorized.dispatch_payload).toBeDefined();
    expect(authorized.dispatch_payload?.dispatched).toBe(true);
  });

  it('should execute automated failsafe override when zero-hour ground quorum confirms breach', () => {
    const override = IndustrialSCADAGatewayService.executeZeroHourQuorumOverride({
      facility_id: 'scada-upper-tamakoshi',
      facility_name: 'Upper Tamakoshi Hydroelectric Project (456 MW)',
      target_spillway_gates: ['Gate_1', 'Gate_2', 'Gate_3'],
      quorum_count: 3,
      confidence_score: 0.98,
      estimated_arrival_minutes: 24.5,
      reason: 'CRITICAL_ZERO_HOUR_GLOF: Geophone slurry + stage surge + tripwire severed',
    });

    expect(override.status).toBe('AUTO_OVERRIDDEN_BY_GROUND_QUORUM');
    expect(override.second_key_approved_by).toBe('ZERO_HOUR_GROUND_QUORUM_FAILSAFE');
    expect(override.dispatch_payload).toBeDefined();
    expect(override.dispatch_payload?.transit_protocol).toBe('IEC_60870_5_104_OVER_IPSEC_VPN_FALLBACK_IRIDIUM');
  });
});
