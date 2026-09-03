import struct
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from .edge_sensor_processor import EdgeSensorReading, EdgeSensorProcessor

logger = logging.getLogger(__name__)


class EdgeHardwareGateway:
    """
    Decodes low-bandwidth binary & hex telemetry packets transmitted over
    Iridium SBD satellite links and LoRaWAN gateways in remote Himalayan river gorges.
    
    Supports:
    - Campbell Scientific CR1000X & Industrial ESP32-S3 Telemetry Frames
    - 16-bit fixed-point decompression for geophone FFT spectra
    - Tripwire tamper/severance bitmask decoding
    """

    # Binary Frame Struct:
    # 2 bytes: Station ID (uint16)
    # 4 bytes: Unix Epoch (uint32)
    # 2 bytes: Geophone Frequency (uint16, scale 0.01 Hz)
    # 2 bytes: Geophone Acoustic dB (uint16, scale 0.01 dB)
    # 2 bytes: Water Stage (uint16, scale 0.001 m)
    # 2 bytes: Water Stage Rate (int16, scale 0.001 m/min)
    # 1 byte:  Status Flags (Bit 0: Tripwire severed, Bit 1: Solar charging, Bit 2: Low battery, Bit 3: Flash surge alarm)
    # 1 byte:  Battery Voltage (uint8, scale 0.1 V)
    FRAME_FORMAT = ">HIHHHHBB"
    FRAME_SIZE = struct.calcsize(FRAME_FORMAT)  # 16 bytes

    @classmethod
    def encode_binary_packet(
        cls,
        station_numeric_id: int,
        timestamp_epoch: int,
        dominant_freq_hz: float,
        acoustic_db: float,
        water_stage_m: float,
        water_stage_rate_m_min: float,
        tripwire_tripped: bool = False,
        battery_volts: float = 12.6,
    ) -> bytes:
        """
        Encodes telemetry into a compact 16-byte satellite packet for transmission over Iridium SBD.
        """
        freq_scaled = int(round(dominant_freq_hz * 100))
        db_scaled = int(round(acoustic_db * 100))
        stage_scaled = int(round(water_stage_m * 1000))
        rate_scaled = int(round(water_stage_rate_m_min * 1000))

        flags = 0
        if tripwire_tripped:
            flags |= 0x01
        if acoustic_db > 70.0 and 10.0 <= dominant_freq_hz <= 45.0:
            flags |= 0x08  # Slurry surge flag

        batt_scaled = int(round(battery_volts * 10))

        return struct.pack(
            cls.FRAME_FORMAT,
            station_numeric_id,
            timestamp_epoch,
            freq_scaled,
            db_scaled,
            stage_scaled,
            rate_scaled,
            flags,
            batt_scaled,
        )

    @classmethod
    def decode_binary_packet(
        cls,
        raw_bytes: bytes,
        gorge_name: str = "Tama Koshi Gorge",
        lake_id: str = "PDGL_NEP_KOSHI_001",
    ) -> Dict[str, Any]:
        """
        Decompresses binary satellite telemetry payload into a structured EdgeSensorReading.
        """
        if len(raw_bytes) < cls.FRAME_SIZE:
            raise ValueError(f"Packet undersized ({len(raw_bytes)} bytes < {cls.FRAME_SIZE} bytes required)")

        station_id, epoch, freq_scaled, db_scaled, stage_scaled, rate_scaled, flags, batt_scaled = struct.unpack(
            cls.FRAME_FORMAT, raw_bytes[:cls.FRAME_SIZE]
        )

        dominant_freq_hz = round(freq_scaled / 100.0, 2)
        acoustic_db = round(db_scaled / 100.0, 2)
        water_stage_m = round(stage_scaled / 1000.0, 3)
        water_stage_rate_m_min = round(rate_scaled / 1000.0, 3)
        tripwire_status = "TRIPPED" if (flags & 0x01) else "INTACT"
        battery_volts = round(batt_scaled / 10.0, 1)

        reading = EdgeSensorReading(
            station_id=f"gorge-node-{station_id:04d}",
            gorge_name=gorge_name,
            lake_id=lake_id,
            geophone_dominant_freq_hz=dominant_freq_hz,
            geophone_acoustic_energy_db=acoustic_db,
            water_stage_m=water_stage_m,
            water_stage_rate_m_min=water_stage_rate_m_min,
            tripwire_status=tripwire_status,
        )

        # Run automated evaluation
        evaluation = EdgeSensorProcessor.evaluate_telemetry(reading)

        return {
            "station_numeric_id": station_id,
            "timestamp": datetime.fromtimestamp(epoch, tz=timezone.utc).isoformat(),
            "battery_volts": battery_volts,
            "reading": reading.dict(),
            "evaluation": evaluation.dict(),
        }

    @classmethod
    def decode_hex_string(
        cls,
        hex_str: str,
        gorge_name: str = "Tama Koshi Gorge",
        lake_id: str = "PDGL_NEP_KOSHI_001",
    ) -> Dict[str, Any]:
        """
        Decodes ASCII hex representation (common in LoRaWAN and Iridium SBD email/webhook relays).
        """
        clean_hex = hex_str.strip().replace(" ", "").replace("0x", "")
        raw_bytes = bytes.fromhex(clean_hex)
        return cls.decode_binary_packet(raw_bytes, gorge_name=gorge_name, lake_id=lake_id)
