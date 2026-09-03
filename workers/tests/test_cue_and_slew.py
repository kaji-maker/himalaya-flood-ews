import pytest
from src.analytics.cue_and_slew import CueAndSlewCoordinator, SlewTaskingOrder


def test_cue_and_slew_no_triggers_on_stable():
    """Verify that stable baseline generates no slew tasking order"""
    order = CueAndSlewCoordinator.evaluate_cues(
        lake_id="l-stable",
        lake_name="Stable Lake",
        centroid=[86.45, 27.85],
        bbox=[86.40, 27.80, 86.50, 27.90],
        insar_velocity_mm_yr=-3.2,
        insar_coherence=0.88,
        precip_48h_mm=10.0
    )
    assert order is None


def test_cue_and_slew_triggers_on_insar_creep():
    """Verify InSAR creep <= -15 mm/yr triggers Priority Slew Tasking"""
    order = CueAndSlewCoordinator.evaluate_cues(
        lake_id="l-imja",
        lake_name="Imja Tsho",
        centroid=[86.924, 27.910],
        bbox=[86.90, 27.89, 86.95, 27.93],
        insar_velocity_mm_yr=-18.5,
        insar_coherence=0.82,
        precip_48h_mm=15.0
    )
    assert order is not None
    assert order.priority == "PRIORITY"
    assert order.target_sensor == "WorldView-3"
    assert order.target_gsd_meters <= 0.5
    assert any(r.source == "INSAR_SUBSIDENCE" for r in order.reasons)


def test_cue_and_slew_triggers_immediate_on_critical_subsidence_and_coherence_loss():
    """Verify severe subsidence <= -35 mm/yr or coherence drop triggers IMMEDIATE_INTERVENTION Slew Tasking"""
    order = CueAndSlewCoordinator.evaluate_cues(
        lake_id="l-tsho-rolpa",
        lake_name="Tsho Rolpa",
        centroid=[86.475, 27.868],
        bbox=[86.45, 27.85, 86.50, 27.89],
        insar_velocity_mm_yr=-38.0,  # Critical collapse subsidence
        insar_coherence=0.32,         # Severe decorrelation / rapid surface displacement
        precip_48h_mm=55.0            # Extreme rain
    )
    assert order is not None
    assert order.priority == "IMMEDIATE_INTERVENTION"
    assert order.target_sensor == "SkySat-Submeter"
    assert len(order.reasons) >= 2
    assert "Tension crack propagation and shear aperture widening" in order.required_cv_analyses
