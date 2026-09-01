import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class GLOFRiskScorer:
    """
    Composite Glacial Lake Outburst Flood (GLOF) & Flash Flood Risk Assessment Engine.
    Combines satellite-derived lake expansion, GPM precipitation anomalies,
    moraine dam geometry, and downstream vulnerability indices.
    """

    # Model Weights
    WEIGHT_EXPANSION = 0.35
    WEIGHT_RAINFALL = 0.30
    WEIGHT_FREEBOARD_MORAINE = 0.20
    WEIGHT_VULNERABILITY = 0.15

    @classmethod
    def evaluate_risk(
        cls,
        lake_name: str,
        annualized_expansion_pct: float,
        accumulated_72h_rain_mm: float,
        freeboard_m: float,
        moraine_slope_deg: float,
        downstream_villages_count: int,
        dam_type: str = "MORAINE_DAMMED"
    ) -> Dict[str, Any]:
        """
        Calculates normalized component scores and composite risk index [0.0 - 1.0].
        """
        triggers: List[str] = []

        # 1. Expansion Score (0.0 to 1.0)
        # 0% growth -> 0.1, 10% growth -> 0.6, >= 20% growth -> 1.0
        if annualized_expansion_pct <= 0:
            s_exp = 0.05
        elif annualized_expansion_pct < 5.0:
            s_exp = 0.25
        elif annualized_expansion_pct < 12.0:
            s_exp = 0.60
            triggers.append(f"Elevated lake expansion: +{annualized_expansion_pct:.1f}%/yr")
        else:
            s_exp = min(1.0, 0.60 + (annualized_expansion_pct - 12.0) * 0.05)
            triggers.append(f"CRITICAL surge in lake surface area: +{annualized_expansion_pct:.1f}%/yr")

        # 2. Rainfall Anomaly Score (0.0 to 1.0)
        # < 30mm -> 0.1, 30-75mm -> 0.4, 75-150mm -> 0.75, > 150mm -> 1.0
        if accumulated_72h_rain_mm < 30.0:
            s_rain = 0.10
        elif accumulated_72h_rain_mm < 75.0:
            s_rain = 0.40
        elif accumulated_72h_rain_mm < 140.0:
            s_rain = 0.75
            triggers.append(f"Heavy 72h rainfall: {accumulated_72h_rain_mm:.1f} mm")
        else:
            s_rain = 1.0
            triggers.append(f"Extreme precipitation trigger: {accumulated_72h_rain_mm:.1f} mm (72h)")

        # 3. Moraine & Freeboard Vulnerability Score (0.0 to 1.0)
        # Low freeboard (< 10m) + steep moraine slope (> 30 deg) = high risk
        freeboard_factor = max(0.0, (30.0 - freeboard_m) / 30.0)  # freeboard < 5m gives > 0.83
        slope_factor = min(1.0, moraine_slope_deg / 45.0)
        s_moraine = 0.6 * freeboard_factor + 0.4 * slope_factor

        if freeboard_m < 12.0:
            triggers.append(f"Critically low moraine dam freeboard: {freeboard_m:.1f} m")
        if moraine_slope_deg > 30.0:
            triggers.append(f"Unstable steep moraine face: {moraine_slope_deg:.1f}°")

        # 4. Downstream Vulnerability Score
        s_vuln = min(1.0, downstream_villages_count / 15.0)

        # Composite Weighted Score
        composite_score = (
            cls.WEIGHT_EXPANSION * s_exp +
            cls.WEIGHT_RAINFALL * s_rain +
            cls.WEIGHT_FREEBOARD_MORAINE * s_moraine +
            cls.WEIGHT_VULNERABILITY * s_vuln
        )
        composite_score = round(float(np_clip := max(0.0, min(1.0, composite_score))), 3)

        # Classify Alert Level
        if composite_score >= 0.85:
            level = "CRITICAL"
        elif composite_score >= 0.70:
            level = "WARNING"
        elif composite_score >= 0.50:
            level = "WATCH"
        elif composite_score >= 0.30:
            level = "ADVISORY"
        else:
            level = "NORMAL"

        return {
            "lake_name": lake_name,
            "risk_score": composite_score,
            "alert_level": level,
            "sub_scores": {
                "expansion_score": round(s_exp, 3),
                "rainfall_score": round(s_rain, 3),
                "moraine_freeboard_score": round(s_moraine, 3),
                "vulnerability_score": round(s_vuln, 3)
            },
            "triggers": triggers,
            "requires_dispatch": level in ["CRITICAL", "WARNING", "WATCH"]
        }
