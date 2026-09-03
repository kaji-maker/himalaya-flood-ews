import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class CueTrigger(BaseModel):
    source: str  # 'INSAR_SUBSIDENCE' | 'COHERENCE_LOSS' | 'PRECIP_ANOMALY' | 'CRYOSEISMIC_TREMOR'
    severity: str  # 'ADVISORY' | 'ELEVATED' | 'CRITICAL'
    description: str
    observed_value: float
    threshold_value: float
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SlewTaskingOrder(BaseModel):
    tasking_id: str
    lake_id: str
    lake_name: str
    priority: str  # 'STANDARD' | 'PRIORITY' | 'IMMEDIATE_INTERVENTION'
    target_sensor: str  # 'SkySat-Submeter' | 'WorldView-3' | 'Sentinel-2-Targeted' | 'PlanetScope'
    target_gsd_meters: float  # Ground Sample Distance (e.g. 0.5m for SkySat, 0.3m for WorldView)
    bbox: List[float]  # [min_lon, min_lat, max_lon, max_lat]
    centroid: List[float]  # [lon, lat]
    reasons: List[CueTrigger]
    required_cv_analyses: List[str]
    status: str = "TASKED"  # 'TASKED' | 'ACQUIRED' | 'PROCESSED' | 'FAILED'
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class CueAndSlewCoordinator:
    """
    Automated Multi-Tiered "Cue-and-Slew" Tasking Coordinator.
    
    Addresses the bottlenecks of pure 3m optical monitoring across the 2,500 km Himalayan arc:
    1. Avoids expensive, petabyte-scale daily blanket optical ingestion by using wide-area,
       weather-independent SAR (Sentinel-1 / NISAR) and GPM rainfall as continuous baseline 'Cues'.
    2. Upon anomalous moraine deformation (InSAR velocity <= -15 mm/yr), sudden interferometric
       coherence loss (surface disruption/landslide damming), or extreme antecedent rain (> 50 mm),
       generates automated 'Slew' tasking orders directing commercial sub-meter optical assets
       (SkySat 0.5m, WorldView-3 0.3m) precisely at the threatened coordinates.
    """

    # InSAR thresholds
    THRESHOLD_INSAR_CREEP_WARNING_MM_YR = -15.0
    THRESHOLD_INSAR_SUBSIDENCE_CRITICAL_MM_YR = -35.0
    THRESHOLD_COHERENCE_LOSS_DELTA = 0.35
    THRESHOLD_MIN_COHERENCE_FLOOR = 0.40

    # Hydrometeorological thresholds
    THRESHOLD_PRECIP_48H_TRIGGER_MM = 50.0

    @classmethod
    def evaluate_cues(
        cls,
        lake_id: str,
        lake_name: str,
        centroid: List[float],
        bbox: List[float],
        insar_velocity_mm_yr: Optional[float] = None,
        insar_coherence: Optional[float] = None,
        coherence_baseline: float = 0.85,
        precip_48h_mm: float = 0.0,
        micro_seismic_energy_ratio: Optional[float] = None
    ) -> Optional[SlewTaskingOrder]:
        """
        Evaluates multi-sensor baseline cues and generates targeted optical slew tasking if anomalies exceed thresholds.
        """
        triggers: List[CueTrigger] = []

        # 1. Evaluate InSAR Moraine Creep & Crest Subsidence
        if insar_velocity_mm_yr is not None:
            if insar_velocity_mm_yr <= cls.THRESHOLD_INSAR_SUBSIDENCE_CRITICAL_MM_YR:
                triggers.append(CueTrigger(
                    source="INSAR_SUBSIDENCE",
                    severity="CRITICAL",
                    description=f"Severe moraine crest subsidence: {insar_velocity_mm_yr:.1f} mm/yr indicates internal core degradation",
                    observed_value=insar_velocity_mm_yr,
                    threshold_value=cls.THRESHOLD_INSAR_SUBSIDENCE_CRITICAL_MM_YR
                ))
            elif insar_velocity_mm_yr <= cls.THRESHOLD_INSAR_CREEP_WARNING_MM_YR:
                triggers.append(CueTrigger(
                    source="INSAR_SUBSIDENCE",
                    severity="ELEVATED",
                    description=f"Active moraine crest creep: {insar_velocity_mm_yr:.1f} mm/yr",
                    observed_value=insar_velocity_mm_yr,
                    threshold_value=cls.THRESHOLD_INSAR_CREEP_WARNING_MM_YR
                ))

        # 2. Evaluate InSAR Coherence Loss (Sudden rock/ice avalanche or crest collapse)
        if insar_coherence is not None:
            coherence_drop = coherence_baseline - insar_coherence
            if coherence_drop >= cls.THRESHOLD_COHERENCE_LOSS_DELTA or insar_coherence < cls.THRESHOLD_MIN_COHERENCE_FLOOR:
                triggers.append(CueTrigger(
                    source="COHERENCE_LOSS",
                    severity="CRITICAL" if coherence_drop >= 0.45 else "ELEVATED",
                    description=f"Interferometric SAR decorrelation: gamma={insar_coherence:.2f} (delta={coherence_drop:.2f}) indicates rapid surface disruption",
                    observed_value=round(insar_coherence, 2),
                    threshold_value=cls.THRESHOLD_MIN_COHERENCE_FLOOR
                ))

        # 3. Evaluate GPM Extreme Antecedent Rainfall
        if precip_48h_mm >= cls.THRESHOLD_PRECIP_48H_TRIGGER_MM:
            triggers.append(CueTrigger(
                source="PRECIP_ANOMALY",
                severity="ELEVATED",
                description=f"Extreme 48h antecedent precipitation: {precip_48h_mm:.1f} mm",
                observed_value=precip_48h_mm,
                threshold_value=cls.THRESHOLD_PRECIP_48H_TRIGGER_MM
            ))

        # 4. Evaluate Upstream Cryoseismic / Micro-seismic Tremors
        if micro_seismic_energy_ratio is not None and micro_seismic_energy_ratio >= 3.0:
            triggers.append(CueTrigger(
                source="CRYOSEISMIC_TREMOR",
                severity="CRITICAL" if micro_seismic_energy_ratio >= 5.0 else "ELEVATED",
                description=f"Micro-seismic cryospheric tremor surge: {micro_seismic_energy_ratio:.1f}x baseline amplitude",
                observed_value=micro_seismic_energy_ratio,
                threshold_value=3.0
            ))

        # If no cues flagged, baseline is stable
        if not triggers:
            return None

        # Determine Tasking Priority & Optical Asset
        has_critical = any(t.severity == "CRITICAL" for t in triggers)
        priority = "IMMEDIATE_INTERVENTION" if has_critical else "PRIORITY"
        target_sensor = "SkySat-Submeter" if has_critical else "WorldView-3"
        target_gsd = 0.50 if has_critical else 0.31

        required_analyses = [
            "Tension crack propagation and shear aperture widening",
            "Dam crest piping seepage and thermokarst pond formation",
            "Hanging ice avalanche detachment zone stability",
            "Outflow channel sediment choke or breach incision"
        ]

        tasking_id = f"task-slew-{lake_id}-{int(datetime.now(timezone.utc).timestamp())}"

        logger.warning(
            f"[Cue-and-Slew Coordinator] Triggered {priority} slew tasking {tasking_id} for {lake_name}: "
            f"{len(triggers)} cues detected -> Directing {target_sensor} ({target_gsd}m GSD)"
        )

        return SlewTaskingOrder(
            tasking_id=tasking_id,
            lake_id=lake_id,
            lake_name=lake_name,
            priority=priority,
            target_sensor=target_sensor,
            target_gsd_meters=target_gsd,
            bbox=bbox,
            centroid=centroid,
            reasons=triggers,
            required_cv_analyses=required_analyses,
            status="TASKED"
        )
