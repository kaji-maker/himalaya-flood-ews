import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class LakeMetricsInput(BaseModel):
    lake_id: str
    lake_name: str = "Unknown Glacial Lake"
    current_area_sqm: float
    current_observation_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    baseline_30d_area_sqm: Optional[float] = None
    baseline_1yr_area_sqm: Optional[float] = None
    recent_observations_14d: Optional[List[Dict[str, Any]]] = None
    precip_48h_mm: float = 0.0
    precip_14d_mm: float = 0.0
    dam_distortion_ratio: float = 1.0
    sudden_dam_anomaly_detected: bool = False
    moraine_slope_deg: float = 28.0
    terrain_ruggedness_m: float = 450.0
    lake_volume_mcm: float = 50.0
    freeboard_m: float = 15.0


class TwoAxisRiskScore(BaseModel):
    susceptibility_score: float = Field(..., ge=0.0, le=1.0, description="Static geomorphic fragility index S in [0, 1]")
    trigger_urgency_score: float = Field(..., ge=0.0, le=1.0, description="Dynamic hydrometeorological trigger index T in [0, 1]")
    combined_hazard_index: float = Field(..., ge=0.0, le=1.0, description="Combined GLOF Hazard H = S * T")
    risk_matrix_quadrant: str = Field(..., description="DORMANT_STABLE | HIGH_SUSCEPTIBILITY_WATCH | TRIGGERED_TRANSIENT_WARNING | CRITICAL_DUAL_TRIGGER")


class FloodAlertPayload(BaseModel):
    lake_id: str
    severity: str  # 'ADVISORY', 'WARNING', 'EMERGENCY'
    trigger_reason: str
    created_at: str
    resolved_at: Optional[str] = None
    two_axis_score: TwoAxisRiskScore
    metadata: Dict[str, Any] = Field(default_factory=dict)


class GLOFRiskScorer:
    """
    Two-Axis GLOF Risk & Susceptibility Evaluation Engine for HimalayaFlood-EWS.
    Implements the scientific paradigm from Kahn et al. (2026, arXiv:2608.12422):
    1. Static Susceptibility (S): How short is the fuse? (moraine slope, volume, ruggedness, freeboard).
    2. Dynamic Triggering (T): Is the fuse lit? (antecedent weather, MNDWI expansion, dam deformation).
    3. Combined Hazard (H = S * T).
    """

    THRESHOLD_WARNING_GROWTH_14D_PCT = 15.0
    THRESHOLD_WARNING_PRECIP_48H_MM = 50.0
    THRESHOLD_EMERGENCY_GROWTH_PCT = 30.0
    THRESHOLD_ADVISORY_GROWTH_1YR_PCT = 8.0
    THRESHOLD_ADVISORY_PRECIP_48H_MM = 25.0

    @classmethod
    def calculate_growth_percentage(cls, current: float, baseline: Optional[float]) -> float:
        if baseline is None or baseline <= 0:
            return 0.0
        return round(((current - baseline) / baseline) * 100.0, 2)

    @classmethod
    def calculate_susceptibility_score(
        cls,
        moraine_slope_deg: float = 28.0,
        terrain_ruggedness_m: float = 450.0,
        lake_volume_mcm: float = 50.0,
        freeboard_m: float = 15.0
    ) -> float:
        f_slope = min(1.0, max(0.0, moraine_slope_deg / 40.0))
        f_rugged = min(1.0, max(0.0, terrain_ruggedness_m / 650.0))
        f_vol = min(1.0, max(0.0, (lake_volume_mcm / 100.0) ** 0.5))
        f_freeboard = min(1.0, max(0.0, 1.0 - (freeboard_m / 35.0)))

        s = 0.35 * f_slope + 0.25 * f_rugged + 0.25 * f_vol + 0.15 * f_freeboard
        return round(min(1.0, max(0.0, s)), 3)

    @classmethod
    def calculate_trigger_urgency_score(
        cls,
        growth_14d_pct: float = 0.0,
        growth_30d_pct: float = 0.0,
        precip_48h_mm: float = 0.0,
        is_dam_anomaly: bool = False
    ) -> float:
        if is_dam_anomaly:
            return 1.0

        f_rain = min(1.0, max(0.0, precip_48h_mm / 70.0))
        eff_growth = max(growth_14d_pct * 1.5, growth_30d_pct)
        f_growth = min(1.0, max(0.0, eff_growth / 30.0))

        t = max(f_rain, f_growth) * 0.7 + (f_rain * f_growth) * 0.3
        return round(min(1.0, max(0.0, t)), 3)

    @classmethod
    def evaluate_lake_risk(cls, data: LakeMetricsInput) -> Optional[FloodAlertPayload]:
        triggers: List[str] = []

        growth_30d_pct = cls.calculate_growth_percentage(data.current_area_sqm, data.baseline_30d_area_sqm)
        growth_1yr_pct = cls.calculate_growth_percentage(data.current_area_sqm, data.baseline_1yr_area_sqm)

        growth_14d_pct = 0.0
        if data.recent_observations_14d and len(data.recent_observations_14d) > 0:
            earliest_14d = sorted(data.recent_observations_14d, key=lambda x: x["date"])[0]
            growth_14d_pct = cls.calculate_growth_percentage(data.current_area_sqm, earliest_14d["area_sqm"])
        elif data.baseline_30d_area_sqm is not None:
            growth_14d_pct = round(growth_30d_pct * (14.0 / 30.0), 2)

        is_dam_anomaly = data.sudden_dam_anomaly_detected or (data.dam_distortion_ratio < 0.70 or data.dam_distortion_ratio > 1.35)

        s_score = cls.calculate_susceptibility_score(
            moraine_slope_deg=data.moraine_slope_deg,
            terrain_ruggedness_m=data.terrain_ruggedness_m,
            lake_volume_mcm=data.lake_volume_mcm,
            freeboard_m=data.freeboard_m
        )
        t_score = cls.calculate_trigger_urgency_score(
            growth_14d_pct=growth_14d_pct,
            growth_30d_pct=growth_30d_pct,
            precip_48h_mm=data.precip_48h_mm,
            is_dam_anomaly=is_dam_anomaly
        )
        h_index = round(s_score * t_score, 3)

        # Record granular cause indicators
        if data.precip_48h_mm > cls.THRESHOLD_WARNING_PRECIP_48H_MM:
            triggers.append(f"Heavy antecedent precipitation: {data.precip_48h_mm:.1f} mm in 48 hours")
        if growth_14d_pct > cls.THRESHOLD_WARNING_GROWTH_14D_PCT:
            triggers.append(f"Rapid 14-day surface area expansion: +{growth_14d_pct:.1f}%")
        if growth_30d_pct > cls.THRESHOLD_EMERGENCY_GROWTH_PCT:
            triggers.append(f"Catastrophic lake expansion: +{growth_30d_pct:.1f}% surge within 30 days")
        if is_dam_anomaly:
            triggers.append(f"Sudden moraine dam geometry instability detected (distortion ratio: {data.dam_distortion_ratio:.2f})")

        # Quadrant Classification & Severity Mapping
        severity: Optional[str] = None
        quadrant: str = "DORMANT_STABLE"

        # EMERGENCY Rule
        if is_dam_anomaly or growth_30d_pct > cls.THRESHOLD_EMERGENCY_GROWTH_PCT or (s_score >= 0.60 and t_score >= 0.60):
            severity = "EMERGENCY"
            quadrant = "CRITICAL_DUAL_TRIGGER"
            if s_score >= 0.60 and t_score >= 0.60:
                triggers.append(f"Dual-axis hazard convergence: S={s_score:.2f}, T={t_score:.2f}, H={h_index:.2f}")

        # WARNING Rule
        elif (growth_14d_pct > cls.THRESHOLD_WARNING_GROWTH_14D_PCT) or (data.precip_48h_mm > cls.THRESHOLD_WARNING_PRECIP_48H_MM) or (t_score >= 0.55):
            severity = "WARNING"
            quadrant = "TRIGGERED_TRANSIENT_WARNING"
            if t_score >= 0.55 and not any("Heavy antecedent" in tr for tr in triggers):
                triggers.append(f"High trigger urgency window (T={t_score:.2f})")

        # ADVISORY Rule
        elif (s_score >= 0.60) or (growth_1yr_pct > cls.THRESHOLD_ADVISORY_GROWTH_1YR_PCT) or (data.precip_48h_mm > cls.THRESHOLD_ADVISORY_PRECIP_48H_MM):
            severity = "ADVISORY"
            quadrant = "HIGH_SUSCEPTIBILITY_WATCH"
            if s_score >= 0.60:
                triggers.append(f"High geomorphic susceptibility index (S={s_score:.2f}, volume={data.lake_volume_mcm:.1f}MCM, slope={data.moraine_slope_deg}°)")
            if growth_1yr_pct > cls.THRESHOLD_ADVISORY_GROWTH_1YR_PCT:
                triggers.append(f"Steady annual expansion: +{growth_1yr_pct:.1f}% relative to baseline")

        if not severity:
            logger.info(f"Lake {data.lake_name} ({data.lake_id}) is DORMANT_STABLE (S={s_score:.2f}, T={t_score:.2f}). No alert triggered.")
            return None

        combined_reason = f"GLOF {severity} [{quadrant}]: " + "; ".join(triggers)
        now_iso = datetime.now(timezone.utc).isoformat()

        two_axis = TwoAxisRiskScore(
            susceptibility_score=s_score,
            trigger_urgency_score=t_score,
            combined_hazard_index=h_index,
            risk_matrix_quadrant=quadrant
        )

        alert_payload = FloodAlertPayload(
            lake_id=data.lake_id,
            severity=severity,
            trigger_reason=combined_reason,
            created_at=now_iso,
            resolved_at=None,
            two_axis_score=two_axis,
            metadata={
                "lake_name": data.lake_name,
                "current_area_sqm": data.current_area_sqm,
                "susceptibility_score": s_score,
                "trigger_urgency_score": t_score,
                "combined_hazard_index": h_index,
                "risk_matrix_quadrant": quadrant,
                "growth_14d_pct": growth_14d_pct,
                "growth_30d_pct": growth_30d_pct,
                "precip_48h_mm": data.precip_48h_mm,
                "individual_triggers": triggers
            }
        )

        logger.warning(f"🚨 [TWO-AXIS SCORER] {severity} [{quadrant}] for {data.lake_name}: S={s_score:.2f}, T={t_score:.2f} -> {combined_reason}")
        return alert_payload
