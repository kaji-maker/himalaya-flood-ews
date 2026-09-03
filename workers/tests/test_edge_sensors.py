import pytest
from src.processing.edge_sensor_processor import EdgeSensorProcessor, EdgeSensorReading


def test_edge_sensors_normal_flow():
    """Verify standard streamflow telemetry flags NORMAL status with no SCADA actuation"""
    reading = EdgeSensorReading(
        station_id="gorge-01",
        gorge_name="Rolwaling Upper Gorge",
        lake_id="l-tsho-rolpa",
        geophone_dominant_freq_hz=8.0,
        geophone_acoustic_energy_db=38.5,
        water_stage_m=1.2,
        water_stage_rate_m_min=0.02,
        tripwire_status="INTACT"
    )
    result = EdgeSensorProcessor.evaluate_telemetry(reading)
    assert not result.is_slurry_surge_detected
    assert result.alarm_level == "NORMAL"
    assert not result.scada_actuation_required
    assert result.scada_command is None


def test_edge_sensors_hyperconcentrated_slurry_surge():
    """Verify geophone high-frequency acoustic surge triggers CRITICAL_SURGE and SCADA spillway gate opening"""
    reading = EdgeSensorReading(
        station_id="gorge-01",
        gorge_name="Rolwaling Upper Gorge",
        lake_id="l-tsho-rolpa",
        geophone_dominant_freq_hz=28.0,      # Boulder collision / bedload transport band
        geophone_acoustic_energy_db=78.0,    # High acoustic energy > 70 dB
        water_stage_m=4.8,
        water_stage_rate_m_min=0.65,         # Rapid stage surge > 0.5 m/min
        tripwire_status="INTACT"
    )
    result = EdgeSensorProcessor.evaluate_telemetry(reading)
    assert result.is_slurry_surge_detected
    assert result.alarm_level == "CRITICAL_SURGE"
    assert result.scada_actuation_required
    assert result.scada_command is not None
    assert result.scada_command.action == "EMERGENCY_FULL_OPEN"
    assert "Upper Tamakoshi" in result.scada_command.facility_name
    assert result.scada_command.estimated_arrival_minutes > 0
    assert len(result.scada_command.target_spillway_gates) > 0


def test_edge_sensors_tripwire_rupture():
    """Verify physical tripwire rupture triggers instant emergency SCADA command"""
    reading = EdgeSensorReading(
        station_id="gorge-02",
        gorge_name="Marsyangdi Choke Gorge",
        lake_id="l-thulagi",
        geophone_dominant_freq_hz=18.0,
        geophone_acoustic_energy_db=62.0,
        water_stage_m=2.5,
        water_stage_rate_m_min=0.1,
        tripwire_status="TRIPPED"
    )
    result = EdgeSensorProcessor.evaluate_telemetry(reading)
    assert result.is_slurry_surge_detected
    assert result.alarm_level == "CRITICAL_SURGE"
    assert result.scada_actuation_required
    assert result.scada_command.facility_id == "scada-marsyangdi-hydro"
