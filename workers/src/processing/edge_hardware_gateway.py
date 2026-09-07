import struct
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from .edge_sensor_processor import EdgeSensorReading, EdgeSensorProcessor

logger = logging.getLogger(__name__)


def crc16_ccitt(data: bytes, initial: int = 0xFFFF, poly: int = 0x1021) -> int:
    """
    Computes CRC-16-CCITT checksum for data integrity verification over satellite/LoRaWAN links.
    """
    crc = initial
    for byte in data:
        crc ^= (byte << 8)
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ poly) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return crc


class EdgeHardwareGateway:
    """
    Decodes low-bandwidth binary & hex telemetry packets transmitted over
    Iridium SBD satellite links and LoRaWAN gateways in remote Himalayan river gorges.
    
    Supports:
    - Campbell Scientific CR1000X & Industrial ESP32-S3 Telemetry Frames
    - 16-bit fixed-point decompression for geophone FFT spectra
    - Tripwire tamper/severance bitmask decoding
    - CRC-16-CCITT corruption rejection for noisy alpine satellite relays
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
    FRAME_SIZE = 16
    FRAME_SIZE_CRC = 18
    FRAME_SIZE_WITH_CRC = 18

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
        include_crc: bool = False,
    ) -> bytes:
        """
        Encodes telemetry into a compact binary satellite packet.
        - include_crc=False: 16-byte legacy frame
        - include_crc=True:  18-byte frame with appended CRC-16-CCITT checksum
        """
        # Clamp sensor readings to valid physical telemetry envelopes
        freq_clamped = max(0.0, min(200.0, dominant_freq_hz))
        db_clamped = max(0.0, min(150.0, acoustic_db))
        stage_clamped = max(0.0, min(30.0, water_stage_m))
        rate_clamped = max(-10.0, min(10.0, water_stage_rate_m_min))
        batt_clamped = max(0.0, min(25.0, battery_volts))

        freq_scaled = int(round(freq_clamped * 100))
        db_scaled = int(round(db_clamped * 100))
        stage_scaled = int(round(stage_clamped * 1000))
        rate_scaled = int(round(rate_clamped * 1000))

        flags = 0
        if tripwire_tripped:
            flags |= 0x01
        if db_clamped > 70.0 and 10.0 <= freq_clamped <= 45.0:
            flags |= 0x08  # Slurry surge flag

        batt_scaled = int(round(batt_clamped * 10))

        payload = struct.pack(
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

        if include_crc:
            crc_val = crc16_ccitt(payload)
            return payload + struct.pack(">H", crc_val)

        return payload

    @classmethod
    def decode_binary_packet(
        cls,
        raw_bytes: bytes,
        gorge_name: str = "Tama Koshi Gorge",
        lake_id: str = "PDGL_NEP_KOSHI_001",
    ) -> Dict[str, Any]:
        """
        Decompresses binary satellite telemetry payload into a structured EdgeSensorReading.
        Validates CRC-16 if present (18-byte packet).
        """
        if len(raw_bytes) < cls.FRAME_SIZE:
            raise ValueError(f"Packet undersized ({len(raw_bytes)} bytes < {cls.FRAME_SIZE} bytes required)")

        crc_verified: Optional[bool] = None
        if len(raw_bytes) >= cls.FRAME_SIZE_CRC:
            expected_crc = struct.unpack(">H", raw_bytes[cls.FRAME_SIZE:cls.FRAME_SIZE_CRC])[0]
            computed_crc = crc16_ccitt(raw_bytes[:cls.FRAME_SIZE])
            if expected_crc != computed_crc:
                raise ValueError(
                    f"CRC-16 verification failed: expected 0x{expected_crc:04X}, computed 0x{computed_crc:04X}. Corrupted satellite packet rejected."
                )
            crc_verified = True
        elif len(raw_bytes) == cls.FRAME_SIZE:
            crc_verified = False  # Legacy unchecksummed frame

        station_id, epoch, freq_scaled, db_scaled, stage_scaled, rate_scaled, flags, batt_scaled = struct.unpack(
            cls.FRAME_FORMAT, raw_bytes[:cls.FRAME_SIZE]
        )

        # Sanity Bounds & Outlier Filtering
        dominant_freq_hz = max(0.1, min(250.0, round(freq_scaled / 100.0, 2)))
        acoustic_db = max(0.0, min(140.0, round(db_scaled / 100.0, 2)))
        water_stage_m = max(0.0, min(60.0, round(stage_scaled / 1000.0, 3)))
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
            "crc_verified": crc_verified,
            "reading": reading.model_dump() if hasattr(reading, "model_dump") else reading.dict(),
            "evaluation": evaluation.model_dump() if hasattr(evaluation, "model_dump") else evaluation.dict(),
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
