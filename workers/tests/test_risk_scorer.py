import pytest
from datetime import datetime, timezone, timedelta
from src.analytics.risk_scorer import GLOFRiskScorer, LakeMetricsInput


def test_two_axis_susceptibility_and_triggering():
    """Verify decoupled susceptibility S, trigger T, and combined hazard H = S * T"""
    s_score = GLOFRiskScorer.calculate_susceptibility_score(
        moraine_slope_deg=35.0,
        terrain_ruggedness_m=580.0,
        lake_volume_mcm=85.9,
        freeboard_m=12.5
    )
    assert 0.65 <= s_score <= 0.95

    t_score = GLOFRiskScorer.calculate_trigger_urgency_score(
        growth_14d_pct=18.0,
        growth_30d_pct=22.0,
        precip_48h_mm=65.0,
        is_dam_anomaly=False
    )
    assert 0.70 <= t_score <= 1.0


def test_warning_escalation_on_14d_growth():
    """Requirement 2: Area growth > 15% within 14 days -> WARNING"""
    now = datetime.now(timezone.utc)
    d_14d_ago = now - timedelta(days=14)

    input_data = LakeMetricsInput(
        lake_id="l-tsho-rolpa",
        lake_name="Tsho Rolpa",
        current_area_sqm=1160000.0,
        baseline_30d_area_sqm=1000000.0,
        baseline_1yr_area_sqm=950000.0,
        recent_observations_14d=[
            {"date": d_14d_ago, "area_sqm": 1000000.0}  # +16.0% growth in 14 days
        ],
        precip_48h_mm=12.0,
        moraine_slope_deg=22.0,
        lake_volume_mcm=25.0
    )

    alert = GLOFRiskScorer.evaluate_lake_risk(input_data)
    assert alert is not None
    assert alert.severity == "WARNING"
    assert "Rapid 14-day surface area expansion" in alert.trigger_reason
    assert alert.two_axis_score.risk_matrix_quadrant == "TRIGGERED_TRANSIENT_WARNING"
    assert alert.lake_id == "l-tsho-rolpa"


def test_warning_escalation_on_48h_heavy_precipitation():
    """Requirement 2: Upstream 48-hour precipitation > 50 mm -> WARNING"""
    input_data = LakeMetricsInput(
        lake_id="l-imja",
        lake_name="Imja Tsho",
        current_area_sqm=1020000.0,
        baseline_30d_area_sqm=1000000.0,
        baseline_1yr_area_sqm=980000.0,
        precip_48h_mm=68.5,  # Extreme rainfall (>50 mm)
        moraine_slope_deg=24.0,
        lake_volume_mcm=30.0
    )

    alert = GLOFRiskScorer.evaluate_lake_risk(input_data)
    assert alert is not None
    assert alert.severity in ["WARNING", "EMERGENCY"]
    assert "Heavy antecedent precipitation" in alert.trigger_reason


def test_emergency_escalation_on_30pct_growth_surge():
    """Requirement 3: Area growth > 30% -> EMERGENCY"""
    input_data = LakeMetricsInput(
        lake_id="l-thulagi",
        lake_name="Thulagi Lake",
        current_area_sqm=1350000.0,
        baseline_30d_area_sqm=1000000.0,  # +35% surge in 30 days
        baseline_1yr_area_sqm=950000.0,
        precip_48h_mm=20.0,
        moraine_slope_deg=32.0,
        lake_volume_mcm=75.0
    )

    alert = GLOFRiskScorer.evaluate_lake_risk(input_data)
    assert alert is not None
    assert alert.severity == "EMERGENCY"
    assert "Catastrophic lake expansion" in alert.trigger_reason
    assert alert.two_axis_score.risk_matrix_quadrant == "CRITICAL_DUAL_TRIGGER"


def test_emergency_escalation_on_sudden_dam_collapse_anomaly():
    """Requirement 3: Sudden dam contraction/expansion detected -> EMERGENCY"""
    input_data = LakeMetricsInput(
        lake_id="l-barun",
        lake_name="Lower Barun Lake",
        current_area_sqm=1020000.0,
        baseline_30d_area_sqm=1000000.0,
        baseline_1yr_area_sqm=990000.0,
        precip_48h_mm=10.0,
        dam_distortion_ratio=0.55,
        sudden_dam_anomaly_detected=True
    )

    alert = GLOFRiskScorer.evaluate_lake_risk(input_data)
    assert alert is not None
    assert alert.severity == "EMERGENCY"
    assert "moraine dam geometry instability" in alert.trigger_reason


def test_normal_baseline_no_alert():
    """Normal conditions with low susceptibility should not trigger any alert (returns None)"""
    input_data = LakeMetricsInput(
        lake_id="l-stable",
        lake_name="Stable Glacial Lake",
        current_area_sqm=502000.0,
        baseline_30d_area_sqm=500000.0,
        baseline_1yr_area_sqm=498000.0,
        precip_48h_mm=5.0,
        moraine_slope_deg=14.0,
        terrain_ruggedness_m=180.0,
        lake_volume_mcm=8.0,
        freeboard_m=28.0
    )

    alert = GLOFRiskScorer.evaluate_lake_risk(input_data)
    assert alert is None
