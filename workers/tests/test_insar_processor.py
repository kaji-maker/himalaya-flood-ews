import pytest
from src.processing.insar_processor import InSARProcessor


def test_insar_stable_moraine():
    summary = InSARProcessor.analyze_moraine_deformation(
        lake_id="PDGL_NEP_KARNALI_001",
        lake_name="Karnali Alpine Lake",
        dam_centroid=[82.342, 29.893],
        simulated_creep_rate_mm_yr=-4.2
    )

    assert summary.lake_name == "Karnali Alpine Lake"
    assert summary.sampled_points_count == 12
    assert summary.deformation_risk_rating == "STABLE"
    assert not summary.active_deformation_detected


def test_insar_critical_destabilization():
    summary = InSARProcessor.analyze_moraine_deformation(
        lake_id="PDGL_NEP_KOSHI_001",
        lake_name="Tsho Rolpa",
        dam_centroid=[86.475, 27.868],
        simulated_creep_rate_mm_yr=-38.5
    )

    assert summary.active_deformation_detected
    assert summary.deformation_risk_rating == "CRITICAL_DESTABILIZATION"
    assert summary.max_subsidence_mm_year <= -35.0
    assert any(pt.is_anomaly for pt in summary.insar_points)
