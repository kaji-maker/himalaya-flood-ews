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


def test_sediment_bulking_factor_and_debris_flow_outflow():
    # 1. Direct bulking factor formula check
    bf_25 = GLOFBreachModel.calculate_sediment_bulking_factor(0.25)
    assert bf_25 == pytest.approx(1.333, abs=0.005)

    bf_40 = GLOFBreachModel.calculate_sediment_bulking_factor(0.40)
    assert bf_40 == pytest.approx(1.667, abs=0.005)

    # 2. Dam breach calculation with 25% sediment concentration
    params = DamBreachParameters(
        lake_name="Imja Tsho",
        icimod_code="PDGL_NEP_KOSHI_002",
        lake_volume_mcm=60.0,
        dam_height_m=100.0,
        breach_depth_m=25.0,
        volumetric_sediment_concentration=0.25
    )
    outflow = GLOFBreachModel.calculate_peak_outflow(params)

    assert outflow["volumetric_sediment_concentration"] == 0.25
    assert outflow["sediment_bulking_factor"] == pytest.approx(1.333, abs=0.01)
    assert outflow["q_recommended_bulked_cms"] == outflow["q_recommended_cms"]
    assert outflow["q_recommended_bulked_cms"] == pytest.approx(
        outflow["q_clean_recommended_cms"] * outflow["sediment_bulking_factor"], rel=0.01
    )
    assert outflow["q_recommended_bulked_cms"] > outflow["q_clean_recommended_cms"]


def test_synthesize_breach_hydrograph():
    peak_q = 5500.0
    vol_mcm = 70.0
    tf_hrs = 2.5

    hydrograph = GLOFBreachModel.synthesize_breach_hydrograph(
        peak_discharge_cms=peak_q,
        total_volume_mcm=vol_mcm,
        failure_duration_hrs=tf_hrs,
        num_points=150
    )

    assert isinstance(hydrograph, list)
    assert len(hydrograph) == 150

    times = [pt["time_minutes"] for pt in hydrograph]
    flows = [pt["discharge_cms"] for pt in hydrograph]

    assert len(times) == 150
    assert len(flows) == 150
    assert max(flows) == pytest.approx(peak_q, rel=0.05)

    # Discharge should start low and reach peak
    assert flows[0] < 50.0
    peak_idx = flows.index(max(flows))
    assert 0 < peak_idx < len(flows) - 1


def test_reach_variable_downstream_routing():
    q_peak = 3000.0
    # Compare steep high-gradient gorge vs low-gradient wide valley reach
    steep_settlements = [
        {"name": "Upper Gorge Settlement", "distance_km": 10.0, "reach_slope": 0.08, "reach_manning_n": 0.040}
    ]
    gentle_settlements = [
        {"name": "Lower Valley Settlement", "distance_km": 10.0, "reach_slope": 0.005, "reach_manning_n": 0.040}
    ]

    impact_steep = GLOFBreachModel.route_flood_wave(q_peak_cms=q_peak, settlements=steep_settlements)[0]
    impact_gentle = GLOFBreachModel.route_flood_wave(q_peak_cms=q_peak, settlements=gentle_settlements)[0]

    # Steep reach accelerates flood wave: travel time should be shorter and peak higher
    assert impact_steep.travel_time_minutes < impact_gentle.travel_time_minutes
