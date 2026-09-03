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
});
