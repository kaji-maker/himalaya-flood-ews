import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class LakeExpansionAnalytics:
    """
    Computes glacial lake surface expansion rates, growth velocity, and anomalous surges.
    """

    @staticmethod
    def calculate_expansion_rate(
        baseline_area_sqkm: float,
        current_area_sqkm: float,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        Calculates area difference and annualized growth rate percentage.
        """
        delta_area_sqkm = current_area_sqkm - baseline_area_sqkm
        days_diff = max(1, (end_date - start_date).days)
        years_diff = days_diff / 365.25

        if baseline_area_sqkm <= 0:
            growth_pct_total = 0.0
            growth_pct_annualized = 0.0
        else:
            growth_pct_total = (delta_area_sqkm / baseline_area_sqkm) * 100.0
            growth_pct_annualized = growth_pct_total / years_diff if years_diff > 0 else 0.0

        # Surge flag: expansion rate > 12% annualized or > 5% within 30 days
        is_surging = (growth_pct_annualized > 12.0) or (days_diff <= 35 and growth_pct_total > 5.0)

        return {
            "baseline_area_sqkm": round(baseline_area_sqkm, 4),
            "current_area_sqkm": round(current_area_sqkm, 4),
            "delta_area_sqkm": round(delta_area_sqkm, 4),
            "growth_pct_total": round(growth_pct_total, 2),
            "growth_pct_annualized": round(growth_pct_annualized, 2),
            "days_elapsed": days_diff,
            "is_surging": is_surging
        }

    @classmethod
    def analyze_time_series(
        cls,
        observations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Takes a sorted list of historical observations [{"date": datetime, "area_sqkm": float}]
        and extracts trend acceleration and moving statistics.
        """
        if not observations or len(observations) < 2:
            return {"trend": "INSUFFICIENT_DATA", "mean_annual_growth_pct": 0.0}

        sorted_obs = sorted(observations, key=lambda x: x["date"])
        first = sorted_obs[0]
        last = sorted_obs[-1]

        overall = cls.calculate_expansion_rate(
            first["area_sqkm"],
            last["area_sqkm"],
            first["date"],
            last["date"]
        )

        return {
            "observation_count": len(observations),
            "timespan_days": overall["days_elapsed"],
            "total_expansion_sqkm": overall["delta_area_sqkm"],
            "annualized_rate_pct": overall["growth_pct_annualized"],
            "is_surging": overall["is_surging"],
            "trend": "RAPID_EXPANSION" if overall["growth_pct_annualized"] > 10.0 else "STEADY_EXPANSION" if overall["growth_pct_annualized"] > 2.0 else "STABLE"
        }
