import pytest
from src.analytics.breach_model import (
    GLOFBreachModel,
    DamBreachParameters,
)


def test_peak_outflow_calculation():
    params = DamBreachParameters(
        lake_name="Tsho Rolpa",
        icimod_code="PDGL_NEP_KOSHI_001",
        lake_volume_mcm=85.9,
        dam_height_m=150.0,
        breach_width_m=55.0,
        breach_depth_m=35.0
    )

    outflow = GLOFBreachModel.calculate_peak_outflow(params)

    assert outflow["q_froehlich_cms"] > 5000.0
    assert outflow["q_costa_cms"] > 3000.0
    assert outflow["q_nws_breach_cms"] > 10000.0
    assert outflow["q_recommended_cms"] > 4000.0
    assert 0.25 <= outflow["formation_time_hrs"] <= 4.0


def test_ephemeral_landslide_dam_surge():
    """Test 2026 Bhotekoshi-type rapid 3-minute ephemeral landslide dam breach"""
    params = DamBreachParameters(
        lake_name="Lhende Khola Landslide Choke",
        icimod_code="LANDSLIDE_DAM_BHOTEKOSHI",
        lake_volume_mcm=12.0,
        dam_height_m=45.0,
        breach_depth_m=30.0,
        is_ephemeral_landslide_dam=True
    )

    outflow = GLOFBreachModel.calculate_peak_outflow(params)
    assert outflow["formation_time_hrs"] == 0.05  # Fast 3-minute runaway failure
    assert outflow["q_recommended_cms"] > 4000.0


def test_flood_wave_routing_downstream():
    q_peak = 7200.0
    settlements = [
        {"name": "Na Village", "distance_km": 6.5, "lon": 86.46, "lat": 27.84},
        {"name": "Bedding", "distance_km": 14.2, "lon": 86.42, "lat": 27.82},
        {"name": "Chhetchhet", "distance_km": 28.0, "lon": 86.35, "lat": 27.78},
        {"name": "Simigaon", "distance_km": 36.5, "lon": 86.29, "lat": 27.75},
    ]

    impacts = GLOFBreachModel.route_flood_wave(q_peak_cms=q_peak, settlements=settlements)

    assert len(impacts) == 4
    # Arrival time must increase monotonically with distance
    assert impacts[0].travel_time_minutes < impacts[1].travel_time_minutes < impacts[2].travel_time_minutes
    # Peak discharge attenuates downstream
    assert impacts[0].peak_discharge_cms > impacts[1].peak_discharge_cms > impacts[2].peak_discharge_cms
    # Nearest village Na has extreme hazard
    assert "EVACUATION" in impacts[0].hazard_level


def test_full_breach_simulation():
    params = DamBreachParameters(
        lake_name="Tsho Rolpa",
        icimod_code="PDGL_NEP_KOSHI_001",
        lake_volume_mcm=85.9,
        dam_height_m=150.0,
        breach_depth_m=35.0
    )
    settlements = [
        {"name": "Na", "distance_km": 6.5, "lon": 86.46, "lat": 27.84},
        {"name": "Bedding", "distance_km": 14.2, "lon": 86.42, "lat": 27.82},
    ]

    result = GLOFBreachModel.simulate_lake_breach(
        params=params,
        lake_coords=[86.475, 27.868],
        downstream_settlements=settlements
    )

    assert result.lake_name == "Tsho Rolpa"
    assert result.recommended_peak_q_cms > 1000.0
    assert result.peak_outflow_q_nws_breach_cms > 10000.0
    assert len(result.downstream_impacts) == 2
    assert result.inundation_geojson["type"] == "FeatureCollection"
    assert len(result.inundation_geojson["features"]) == 3
