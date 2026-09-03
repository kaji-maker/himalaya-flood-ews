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
