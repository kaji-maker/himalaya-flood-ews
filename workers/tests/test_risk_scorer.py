import pytest
from datetime import datetime, timezone, timedelta
from src.analytics.risk_scorer import GLOFRiskScorer, LakeMetricsInput


def test_warning_escalation_on_14d_growth():
    """Requirement 2: Area growth > 15% within 14 days -> WARNING"""
    now = datetime.now(timezone.utc)
    d_14d_ago = now - timedelta(days=14)

    input_data = LakeMetricsInput(
        lake_id="l-tsho-rolpa",
        lake_name="Tsho Rolpa",
        current_area_sqm=1160000.0,  # 1.16M m²
        baseline_30d_area_sqm=1000000.0,
        baseline_1yr_area_sqm=950000.0,
        recent_observations_14d=[
            {"date": d_14d_ago, "area_sqm": 1000000.0}  # +16.0% growth in 14 days
        ],
        precip_48h_mm=12.0
    )

    alert = GLOFRiskScorer.evaluate_lake_risk(input_data)
    assert alert is not None
    assert alert.severity == "WARNING"
    assert "Rapid 14-day surface area expansion" in alert.trigger_reason
    assert alert.lake_id == "l-tsho-rolpa"
    assert alert.resolved_at is None


def test_warning_escalation_on_48h_heavy_precipitation():
    """Requirement 2: Upstream 48-hour precipitation > 50 mm -> WARNING"""
    input_data = LakeMetricsInput(
        lake_id="l-imja",
        lake_name="Imja Tsho",
        current_area_sqm=1020000.0,
        baseline_30d_area_sqm=1000000.0, # +2% growth
        baseline_1yr_area_sqm=980000.0,
        precip_48h_mm=68.5  # Extreme rainfall (>50 mm)
    )

    alert = GLOFRiskScorer.evaluate_lake_risk(input_data)
    assert alert is not None
    assert alert.severity == "WARNING"
    assert "Heavy antecedent precipitation: 68.5 mm" in alert.trigger_reason


def test_emergency_escalation_on_30pct_growth_surge():
    """Requirement 3: Area growth > 30% -> EMERGENCY"""
    input_data = LakeMetricsInput(
        lake_id="l-thulagi",
        lake_name="Thulagi Lake",
        current_area_sqm=1350000.0,  # 1.35M m²
        baseline_30d_area_sqm=1000000.0,  # +35% surge in 30 days
        baseline_1yr_area_sqm=950000.0,
        precip_48h_mm=20.0
    )

    alert = GLOFRiskScorer.evaluate_lake_risk(input_data)
    assert alert is not None
    assert alert.severity == "EMERGENCY"
    assert "Catastrophic lake expansion" in alert.trigger_reason
    assert alert.metadata["growth_30d_pct"] == 35.0


def test_emergency_escalation_on_sudden_dam_collapse_anomaly():
    """Requirement 3: Sudden dam contraction/expansion detected -> EMERGENCY"""
    input_data = LakeMetricsInput(
        lake_id="l-barun",
        lake_name="Lower Barun Lake",
        current_area_sqm=1020000.0,
        baseline_30d_area_sqm=1000000.0,
        baseline_1yr_area_sqm=990000.0,
        precip_48h_mm=10.0,
        dam_distortion_ratio=0.55,  # Severe contraction/distortion indicative of moraine piping
        sudden_dam_anomaly_detected=True
    )

    alert = GLOFRiskScorer.evaluate_lake_risk(input_data)
    assert alert is not None
    assert alert.severity == "EMERGENCY"
    assert "moraine dam geometry instability" in alert.trigger_reason


def test_normal_baseline_no_alert():
    """Normal conditions should not trigger any alert (returns None)"""
    input_data = LakeMetricsInput(
        lake_id="l-stable",
        lake_name="Stable Glacial Lake",
        current_area_sqm=502000.0,
        baseline_30d_area_sqm=500000.0,  # +0.4%
        baseline_1yr_area_sqm=498000.0,  # +0.8%
        precip_48h_mm=5.0
    )

    alert = GLOFRiskScorer.evaluate_lake_risk(input_data)
    assert alert is None
