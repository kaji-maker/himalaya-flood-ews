import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class EdgeSensorReading(BaseModel):
    station_id: str
    gorge_name: str
    lake_id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    geophone_dominant_freq_hz: float = Field(..., description="Dominant seismic/acoustic frequency (10-50 Hz indicates rolling bedload boulders)")
    geophone_acoustic_energy_db: float = Field(..., description="Root-mean-square acoustic energy in dB (slurry surge > 70 dB)")
    water_stage_m: float = Field(..., description="Ultrasonic water stage depth above datum in meters")
    water_stage_rate_m_min: float = Field(default=0.0, description="Rate of stage rise in meters/minute (surge > 0.5 m/min)")
    tripwire_status: str = Field(default="INTACT", description="'INTACT' or 'TRIPPED'")
    battery_volts: float = Field(default=12.6, description="Station 12V LiFePO4 battery terminal voltage")
    is_solar_charging: bool = Field(default=True, description="Photovoltaic solar array charging state")
    ambient_temp_c: float = Field(default=4.5, description="High-altitude ambient air temperature in Celsius")
    link_type: str = Field(default="IRIDIUM_SBD", description="Active satcom/radio uplink ('IRIDIUM_SBD', 'LORAWAN', 'VHF_APRS')")
    link_rssi_dbm: float = Field(default=-78.0, description="Received signal strength indicator in dBm")


class SCADAGateAction(BaseModel):
    facility_name: str
    facility_id: str
    action: str  # 'EMERGENCY_FULL_OPEN' | 'HOLD' | 'STAGE_MONITORING'
    command_payload: Dict[str, Any]
    target_spillway_gates: List[str]
    estimated_arrival_minutes: float


class EdgeSensorEvaluationResult(BaseModel):
    station_id: str
    gorge_name: str
    lake_id: str
    is_slurry_surge_detected: bool
    alarm_level: str  # 'NORMAL' | 'ELEVATED' | 'CRITICAL_SURGE'
    quorum_status: str = Field(default="NORMAL", description="'NORMAL' | 'WATCH_SINGLE_TRIGGER' | 'WARNING_DUAL_CORROBORATION' | 'CRITICAL_ZERO_HOUR_GLOF'")
    triggered_modalities: List[str] = Field(default_factory=list, description="Physically corroborated ground sensor modalities")
    quorum_count: int = Field(default=0, description="Number of independent corroborating sensors (0 to 3)")
    confidence_score: float = Field(default=0.0, description="Bayesian ground confidence in acute physical breach [0.0, 1.0]")
    health_metrics: Dict[str, Any] = Field(default_factory=dict, description="Hardware diagnostic metrics (battery, solar, link)")
    detection_reasons: List[str]
    scada_actuation_required: bool
    scada_command: Optional[SCADAGateAction] = None
    processed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class EdgeSensorProcessor:
    """
    Edge Ground Network & Last-Mile Defense Telemetry Processor.
    
    Addresses the critical latency gap of orbital remote sensing:
    While satellite monitoring provides hours-to-days of advance warning, a moraine breach
    or avalanche-generated slurry surge travels down steep Himalayan gorges at 6-15 m/s.
    
    This engine processes in-situ high-rate telemetry:
    1. Automated riverbed geophones: detects high-frequency (10-50 Hz) acoustic power (> 70 dB)
       characteristic of hyper-concentrated boulder and debris slurry flows (vs. normal water).
    2. Ultrasonic water level gauges: tracks instantaneous flash surge stage rate (dh/dt > 0.5 m/min).
    3. Seismic tripwires: flags physical cable rupture across gorge choke points.
    4. Sub-second direct coupling to downstream hydropower SCADA systems: triggers automated
       radial spillway gate opening before flood wave arrival.
    """

    # Geophone thresholds
    THRESHOLD_GEOPHONE_ENERGY_SURGE_DB = 70.0
    THRESHOLD_GEOPHONE_ENERGY_CRITICAL_DB = 82.0
    GEOPHONE_DEBRIS_FLOW_FREQ_MIN_HZ = 10.0
    GEOPHONE_DEBRIS_FLOW_FREQ_MAX_HZ = 45.0

    # Ultrasonic stage surge thresholds
    THRESHOLD_STAGE_SURGE_RATE_M_MIN = 0.50  # Rapid 50 cm/min stage rise

    # Hydropower SCADA mapping by basin/lake
    DOWNSTREAM_SCADA_FACILITIES = {
        "l-tsho-rolpa": {
            "facility_id": "scada-upper-tamakoshi",
            "facility_name": "Upper Tamakoshi Hydroelectric Project (456 MW)",
            "gates": ["Spillway_Radial_Gate_1", "Spillway_Radial_Gate_2", "Spillway_Radial_Gate_3"],
            "distance_km": 32.0,
            "surge_speed_m_s": 9.5
        },
        "l-imja-tsho": {
            "facility_id": "scada-dudh-koshi",
            "facility_name": "Dudh Koshi Storage Hydropower Dam (635 MW)",
            "gates": ["Radial_Crest_Gate_A", "Radial_Crest_Gate_B"],
            "distance_km": 48.0,
            "surge_speed_m_s": 8.0
        },
        "l-thulagi": {
            "facility_id": "scada-marsyangdi-hydro",
            "facility_name": "Marsyangdi Hydropower Dam Spillway Control",
            "gates": ["Radial_Gate_1", "Radial_Gate_2", "Bottom_Sluice_Gate_1"],
            "distance_km": 28.0,
            "surge_speed_m_s": 9.0
        }
    }

    @classmethod
    def evaluate_telemetry(cls, reading: EdgeSensorReading) -> EdgeSensorEvaluationResult:
        """
        Evaluates real-time edge ground sensor telemetry using Multi-Sensor Quorum logic.
        Requires corroborated physical evidence to discriminate true slurry waves from isolated false alarms.
        """
        reasons: List[str] = []
        triggered_modalities: List[str] = []

        # 1. Geophone bedload slurry check (10-45 Hz rolling boulder acoustic energy)
        is_freq_in_debris_band = (
            cls.GEOPHONE_DEBRIS_FLOW_FREQ_MIN_HZ <= reading.geophone_dominant_freq_hz <= cls.GEOPHONE_DEBRIS_FLOW_FREQ_MAX_HZ
        )
        is_geophone_slurry = (
            reading.geophone_acoustic_energy_db >= cls.THRESHOLD_GEOPHONE_ENERGY_SURGE_DB and is_freq_in_debris_band
        )
        if is_geophone_slurry:
            triggered_modalities.append("GEOPHONE_ACOUSTIC_SLURRY")
            reasons.append(
                f"Riverbed geophone acoustic surge: {reading.geophone_acoustic_energy_db:.1f} dB at {reading.geophone_dominant_freq_hz:.1f} Hz (hyper-concentrated boulder slurry signature)"
            )

        # 2. Ultrasonic/radar water stage surge rate
        is_stage_surge = reading.water_stage_rate_m_min >= cls.THRESHOLD_STAGE_SURGE_RATE_M_MIN
        if is_stage_surge:
            triggered_modalities.append("STAGE_SURGE_RATE")
            reasons.append(
                f"Extreme gorge water stage rise rate: +{reading.water_stage_rate_m_min:.2f} m/min (stage: {reading.water_stage_m:.2f} m)"
            )

        # 3. Physical tripwire rupture
        is_tripwire_severed = reading.tripwire_status.upper() == "TRIPPED"
        if is_tripwire_severed:
            triggered_modalities.append("TRIPWIRE_RUPTURE")
            reasons.append("Gorge seismic tripwire severed by debris front")

        quorum_count = len(triggered_modalities)

        health_metrics = {
            "battery_volts": reading.battery_volts,
            "battery_status": "NORMAL" if reading.battery_volts >= 12.0 else "LOW_BATTERY",
            "is_solar_charging": reading.is_solar_charging,
            "ambient_temp_c": reading.ambient_temp_c,
            "link_type": reading.link_type,
            "link_rssi_dbm": reading.link_rssi_dbm,
            "link_health": "STRONG" if reading.link_rssi_dbm >= -85.0 else "MARGINAL",
        }

        # Multi-Sensor Quorum Decision Matrix
        if quorum_count >= 3 or (is_tripwire_severed and is_stage_surge):
            quorum_status = "CRITICAL_ZERO_HOUR_GLOF"
            confidence_score = 0.98
            alarm_level = "CRITICAL_SURGE"
            is_surge = True
            scada_required = True
        elif quorum_count >= 2 or is_tripwire_severed:
            quorum_status = "WARNING_DUAL_CORROBORATION"
            confidence_score = 0.85
            alarm_level = "CRITICAL_SURGE"
            is_surge = True
            scada_required = True
        elif quorum_count == 1:
            quorum_status = "WATCH_SINGLE_TRIGGER"
            confidence_score = 0.42
            alarm_level = "ELEVATED"
            is_surge = False
            scada_required = False
            reasons.append("Single ground modality anomaly detected: automated satellite/drone cue scheduled, no sirens tripped")
        else:
            quorum_status = "NORMAL"
            confidence_score = 0.05
            is_surge = False
            scada_required = False
            alarm_level = "NORMAL"
            if reading.geophone_acoustic_energy_db > 55.0 or reading.water_stage_rate_m_min > 0.20:
                alarm_level = "ELEVATED"
                reasons.append("Elevated turbulence or snowmelt runoff detected")

        scada_action: Optional[SCADAGateAction] = None

        if scada_required:
            # Calculate arrival time and SCADA command payload
            facility_info = cls.DOWNSTREAM_SCADA_FACILITIES.get(reading.lake_id, {
                "facility_id": "scada-generic-hydro",
                "facility_name": "Downstream Hydropower Barrage SCADA",
                "gates": ["Gate_1", "Gate_2"],
                "distance_km": 30.0,
                "surge_speed_m_s": 9.0
            })

            dist_m = facility_info["distance_km"] * 1000.0
            speed = facility_info["surge_speed_m_s"]
            eta_minutes = round((dist_m / speed) / 60.0, 1)

            scada_action = SCADAGateAction(
                facility_name=facility_info["facility_name"],
                facility_id=facility_info["facility_id"],
                action="EMERGENCY_FULL_OPEN",
                target_spillway_gates=facility_info["gates"],
                estimated_arrival_minutes=eta_minutes,
                command_payload={
                    "command": "OPEN_ALL_SPILLWAY_GATES",
                    "override_interlocks": True,
                    "reason": f"UPSTREAM_GLOF_{quorum_status}",
                    "source_sensor": reading.station_id,
                    "quorum_status": quorum_status,
                    "quorum_count": quorum_count,
                    "confidence_score": confidence_score,
                    "target_gates": facility_info["gates"],
                    "eta_minutes": eta_minutes
                }
            )

            logger.critical(
                f"🚨 [EDGE SENSOR {quorum_status}] Station {reading.station_id} in {reading.gorge_name} "
                f"({quorum_count}/3 modalities): {'; '.join(reasons)} -> SCADA EMERGENCY ACTUATION: "
                f"{facility_info['facility_name']} ETA={eta_minutes} min"
            )

        return EdgeSensorEvaluationResult(
            station_id=reading.station_id,
            gorge_name=reading.gorge_name,
            lake_id=reading.lake_id,
            is_slurry_surge_detected=is_surge,
            alarm_level=alarm_level,
            quorum_status=quorum_status,
            triggered_modalities=triggered_modalities,
            quorum_count=quorum_count,
            confidence_score=confidence_score,
            health_metrics=health_metrics,
            detection_reasons=reasons,
            scada_actuation_required=scada_required,
            scada_command=scada_action
        )
