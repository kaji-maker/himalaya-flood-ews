import pytest
from src.analytics.risk_scorer import GLOFRiskScorer
from src.analytics.expansion_rate import LakeExpansionAnalytics
from datetime import datetime, timedelta


def test_glof_risk_scorer_critical():
    result = GLOFRiskScorer.evaluate_risk(
        lake_name="Tsho Rolpa",
        annualized_expansion_pct=18.5,  # Critical surge
        accumulated_72h_rain_mm=165.0,  # Extreme rainfall
        freeboard_m=8.0,                # Low freeboard
        moraine_slope_deg=34.0,         # Steep moraine
        downstream_villages_count=14
    )

    assert result["alert_level"] in ["CRITICAL", "WARNING"]
    assert result["risk_score"] >= 0.75
    assert result["requires_dispatch"] == True
    assert len(result["triggers"]) >= 2


def test_glof_risk_scorer_low_normal():
    result = GLOFRiskScorer.evaluate_risk(
        lake_name="Stable High Lake",
        annualized_expansion_pct=0.5,
        accumulated_72h_rain_mm=10.0,
        freeboard_m=28.0,
        moraine_slope_deg=12.0,
        downstream_villages_count=2
    )

    assert result["alert_level"] in ["NORMAL", "ADVISORY"]
    assert result["risk_score"] < 0.40
    assert result["requires_dispatch"] == False


def test_expansion_rate_analytics():
    d1 = datetime(2025, 1, 1)
    d2 = datetime(2026, 1, 1)

    res = LakeExpansionAnalytics.calculate_expansion_rate(
        baseline_area_sqkm=1.00,
        current_area_sqkm=1.15,
        start_date=d1,
        end_date=d2
    )

    assert res["delta_area_sqkm"] == 0.15
    assert 14.5 <= res["growth_pct_annualized"] <= 15.5
    assert res["is_surging"] == True
