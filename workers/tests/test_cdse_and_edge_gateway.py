import pytest
import numpy as np
from datetime import datetime, timezone
from src.ingestion.cdse_client import CDSEClient
from src.processing.topographic_correction import HimalayanTopographicCorrector
from src.processing.edge_hardware_gateway import EdgeHardwareGateway


def test_cdse_client_initialization_and_queries():
    client = CDSEClient()
    bbox = [86.45, 27.85, 86.50, 27.89]
    start_date = datetime(2026, 9, 1, tzinfo=timezone.utc)
    end_date = datetime(2026, 9, 3, tzinfo=timezone.utc)

    s1_results = client.query_sentinel1_slc(bbox, start_date, end_date)
    assert len(s1_results) >= 1
    assert "S1" in s1_results[0]["Name"]

    s2_results = client.query_sentinel2_l2a(bbox, start_date, end_date)
    assert len(s2_results) >= 1
    assert "S2" in s2_results[0]["Name"]


def test_topographic_illumination_and_shadow_correction():
    shape = (64, 64)
    dem = np.linspace(4000, 6500, 64 * 64).reshape(shape).astype(np.float32)
    green = np.full(shape, 0.25, dtype=np.float32)
    swir1 = np.full(shape, 0.05, dtype=np.float32)

    corrected_mndwi, shadow_mask = HimalayanTopographicCorrector.process_shadow_corrected_mndwi(
        green_band=green,
        swir1_band=swir1,
        dem_m=dem,
        solar_zenith_deg=42.0,
        solar_azimuth_deg=140.0
    )

    assert corrected_mndwi.shape == shape
    assert shadow_mask.shape == shape
    # Water signal should remain positive and normalized in [-1, 1]
    assert np.all(corrected_mndwi >= -1.0)
    assert np.all(corrected_mndwi <= 1.0)
    assert np.mean(corrected_mndwi) > 0.3


def test_edge_hardware_binary_encoding_and_decoding():
    station_id = 42
    epoch = 1788449000
    freq_hz = 24.50
    db = 82.30
    stage_m = 5.625
    stage_rate_m_min = 0.750

    # 1. Encode binary packet (16 bytes)
    packet_bytes = EdgeHardwareGateway.encode_binary_packet(
        station_numeric_id=station_id,
        timestamp_epoch=epoch,
        dominant_freq_hz=freq_hz,
        acoustic_db=db,
        water_stage_m=stage_m,
        water_stage_rate_m_min=stage_rate_m_min,
        tripwire_tripped=True,
        battery_volts=12.4
    )
    assert len(packet_bytes) == EdgeHardwareGateway.FRAME_SIZE

    # 2. Decode back from raw bytes
    decoded = EdgeHardwareGateway.decode_binary_packet(packet_bytes)
    assert decoded["station_numeric_id"] == station_id
    assert decoded["battery_volts"] == 12.4
    assert decoded["reading"]["geophone_dominant_freq_hz"] == freq_hz
    assert decoded["reading"]["geophone_acoustic_energy_db"] == db
    assert decoded["reading"]["water_stage_m"] == stage_m
    assert decoded["reading"]["tripwire_status"] == "TRIPPED"
    assert decoded["evaluation"]["alarm_level"] == "CRITICAL_SURGE"
    assert decoded["evaluation"]["is_slurry_surge_detected"] is True

    # 3. Test Hex decoding
    hex_str = packet_bytes.hex()
    decoded_hex = EdgeHardwareGateway.decode_hex_string(hex_str)
    assert decoded_hex["station_numeric_id"] == station_id
    assert decoded_hex["reading"]["geophone_acoustic_energy_db"] == db


def test_edge_hardware_crc16_integrity_and_corruption_rejection():
    station_id = 99
    epoch = 1788450000

    # 1. Encode 18-byte packet with CRC-16
    crc_frame = EdgeHardwareGateway.encode_binary_packet(
        station_numeric_id=station_id,
        timestamp_epoch=epoch,
        dominant_freq_hz=18.5,
        acoustic_db=65.0,
        water_stage_m=3.5,
        water_stage_rate_m_min=0.25,
        tripwire_tripped=False,
        battery_volts=13.1,
        include_crc=True
    )
    assert len(crc_frame) == EdgeHardwareGateway.FRAME_SIZE_WITH_CRC

    # 2. Decode valid CRC frame
    decoded = EdgeHardwareGateway.decode_binary_packet(crc_frame)
    assert decoded["station_numeric_id"] == station_id
    assert decoded.get("crc_verified") is True
    assert decoded["reading"]["water_stage_m"] == 3.5

    # 3. Corrupt a single bit in the payload (simulate radio bit-flip)
    corrupted_byte_list = bytearray(crc_frame)
    corrupted_byte_list[5] ^= 0x01  # Flip one bit in payload
    corrupted_frame = bytes(corrupted_byte_list)

    with pytest.raises(ValueError, match="CRC-16 verification failed"):
        EdgeHardwareGateway.decode_binary_packet(corrupted_frame)


def test_edge_hardware_sensor_sanity_clamping():
    # Test that out-of-bounds sensor values are clamped to physical limits
    clamped_frame = EdgeHardwareGateway.encode_binary_packet(
        station_numeric_id=10,
        timestamp_epoch=1788450000,
        dominant_freq_hz=500.0,     # Exceeds max 200 Hz
        acoustic_db=-50.0,          # Below min 0 dB
        water_stage_m=45.0,         # Exceeds max 30.0 m
        water_stage_rate_m_min=18.0,# Exceeds max 10.0 m/min
        tripwire_tripped=False,
        battery_volts=12.0,
        include_crc=True
    )
    decoded = EdgeHardwareGateway.decode_binary_packet(clamped_frame)
    assert decoded["reading"]["geophone_dominant_freq_hz"] <= 200.0
    assert decoded["reading"]["geophone_acoustic_energy_db"] >= 0.0
    assert decoded["reading"]["water_stage_m"] <= 30.0
    assert decoded["reading"]["water_stage_rate_m_min"] <= 10.0
