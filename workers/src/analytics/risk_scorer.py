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
    recent_observations_14d: Optional[List[Dict[str, Any]]] = None  # [{"date": datetime, "area_sqm": float}]
    precip_48h_mm: float = 0.0
    dam_distortion_ratio: float = 1.0  # Ratio of perimeter-to-area or moraine freeboard change (<0.7 or >1.3 indicates sudden collapse)
    sudden_dam_anomaly_detected: bool = False


class FloodAlertPayload(BaseModel):
    lake_id: str
    severity: str  # 'ADVISORY', 'WARNING', 'EMERGENCY'
    trigger_reason: str
    created_at: str
    resolved_at: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class GLOFRiskScorer:
    """
    GLOF & Flash Flood Risk Scorer Engine for HimalayaFlood-EWS.
    Evaluates multi-temporal area expansion dynamics, antecedent rainfall,
    and moraine dam stability to produce structured 'flood_alerts' payloads.
    """

    # Escalation Thresholds
    THRESHOLD_WARNING_GROWTH_14D_PCT = 15.0   # > 15% growth within 14 days
    THRESHOLD_WARNING_PRECIP_48H_MM = 50.0    # > 50mm rainfall in 48 hours
    THRESHOLD_EMERGENCY_GROWTH_PCT = 30.0     # > 30% surge relative to baseline
    THRESHOLD_ADVISORY_GROWTH_1YR_PCT = 8.0   # > 8% annual growth
    THRESHOLD_ADVISORY_PRECIP_48H_MM = 25.0   # > 25mm rainfall in 48 hours

    @classmethod
    def calculate_growth_percentage(cls, current: float, baseline: Optional[float]) -> float:
        """
        Calculates percentage change relative to baseline.
        """
        if baseline is None or baseline <= 0:
            return 0.0
        return round(((current - baseline) / baseline) * 100.0, 2)

    @classmethod
    def evaluate_lake_risk(cls, data: LakeMetricsInput) -> Optional[FloodAlertPayload]:
        """
        Core Risk Evaluation Rule Engine:
        1. Compares current area against 30-day and 1-year baselines.
        2. Escalates to 'EMERGENCY' if area growth > 30% OR sudden dam contraction/expansion detected.
        3. Escalates to 'WARNING' if area growth > 15% within 14 days OR 48h rain > 50 mm.
        4. Escalates to 'ADVISORY' if moderate growth > 8% or 48h rain > 25 mm.
        5. Returns structured FloodAlertPayload for insertion into 'flood_alerts', or None if normal.
        """
        triggers: List[str] = []
        severity: Optional[str] = None

        # 1. Compute baseline growth deltas
        growth_30d_pct = cls.calculate_growth_percentage(data.current_area_sqm, data.baseline_30d_area_sqm)
        growth_1yr_pct = cls.calculate_growth_percentage(data.current_area_sqm, data.baseline_1yr_area_sqm)

        # Compute 14-day growth if observations are available
        growth_14d_pct = 0.0
        if data.recent_observations_14d and len(data.recent_observations_14d) > 0:
            earliest_14d = sorted(data.recent_observations_14d, key=lambda x: x["date"])[0]
            growth_14d_pct = cls.calculate_growth_percentage(data.current_area_sqm, earliest_14d["area_sqm"])
        elif data.baseline_30d_area_sqm is not None:
            # Fallback estimation if only 30-day baseline is given
            growth_14d_pct = round(growth_30d_pct * (14.0 / 30.0), 2)

        # Check for dam distortion / moraine crest contraction or expansion anomaly
        is_dam_anomaly = data.sudden_dam_anomaly_detected or (data.dam_distortion_ratio < 0.70 or data.dam_distortion_ratio > 1.35)

        # 2. Rule: EMERGENCY Evaluation
        # Area growth > 30% OR sudden dam contraction/expansion detected
        if growth_30d_pct > cls.THRESHOLD_EMERGENCY_GROWTH_PCT or growth_1yr_pct > cls.THRESHOLD_EMERGENCY_GROWTH_PCT or is_dam_anomaly:
            severity = "EMERGENCY"
            if is_dam_anomaly:
                triggers.append(f"Sudden moraine dam geometry instability detected (distortion ratio: {data.dam_distortion_ratio:.2f})")
            if growth_30d_pct > cls.THRESHOLD_EMERGENCY_GROWTH_PCT:
                triggers.append(f"Catastrophic lake expansion: +{growth_30d_pct:.1f}% surge within 30 days")
            elif growth_1yr_pct > cls.THRESHOLD_EMERGENCY_GROWTH_PCT:
                triggers.append(f"Critical annualized expansion: +{growth_1yr_pct:.1f}% relative to 1-year baseline")

        # 3. Rule: WARNING Evaluation
        # Area growth > 15% within 14 days OR upstream 48-hour precipitation > 50 mm
        elif (growth_14d_pct > cls.THRESHOLD_WARNING_GROWTH_14D_PCT) or (data.precip_48h_mm > cls.THRESHOLD_WARNING_PRECIP_48H_MM):
            severity = "WARNING"
            if growth_14d_pct > cls.THRESHOLD_WARNING_GROWTH_14D_PCT:
                triggers.append(f"Rapid 14-day surface area expansion: +{growth_14d_pct:.1f}% (threshold: >15%)")
            if data.precip_48h_mm > cls.THRESHOLD_WARNING_PRECIP_48H_MM:
                triggers.append(f"Heavy antecedent precipitation: {data.precip_48h_mm:.1f} mm in 48 hours (threshold: >50 mm)")

        # 4. Rule: ADVISORY Evaluation
        elif (growth_1yr_pct > cls.THRESHOLD_ADVISORY_GROWTH_1YR_PCT) or (data.precip_48h_mm > cls.THRESHOLD_ADVISORY_PRECIP_48H_MM):
            severity = "ADVISORY"
            if growth_1yr_pct > cls.THRESHOLD_ADVISORY_GROWTH_1YR_PCT:
                triggers.append(f"Steady lake surface expansion: +{growth_1yr_pct:.1f}% over 1 year")
            if data.precip_48h_mm > cls.THRESHOLD_ADVISORY_PRECIP_48H_MM:
                triggers.append(f"Elevated upstream precipitation: {data.precip_48h_mm:.1f} mm in 48 hours")

        # If normal, no flood alert is triggered
        if not severity:
            logger.info(f"Lake {data.lake_name} ({data.lake_id}) within normal baseline parameters. No alert triggered.")
            return None

        # Format trigger reason text
        combined_reason = f"GLOF {severity} Alert for {data.lake_name}: " + "; ".join(triggers)

        now_iso = datetime.now(timezone.utc).isoformat()

        alert_payload = FloodAlertPayload(
            lake_id=data.lake_id,
            severity=severity,
            trigger_reason=combined_reason,
            created_at=now_iso,
            resolved_at=None,
            metadata={
                "lake_name": data.lake_name,
                "current_area_sqm": data.current_area_sqm,
                "growth_14d_pct": growth_14d_pct,
                "growth_30d_pct": growth_30d_pct,
                "growth_1yr_pct": growth_1yr_pct,
                "precip_48h_mm": data.precip_48h_mm,
                "dam_distortion_ratio": data.dam_distortion_ratio,
                "individual_triggers": triggers
            }
        )

        logger.warning(f"🚨 [RISK SCORER] {severity} Alert Generated for {data.lake_name}: {combined_reason}")
        return alert_payload
