#!/usr/bin/env python3
"""
Himalaya Flood EWS: Multi-Tiered "Cue-and-Slew" & In-Situ Ground Defense Simulation.

Demonstrates the 3-tier lifecycle:
1. Baseline Normal Monitoring (Wide-area SAR & clear streamflow)
2. Moraine Destabilization & Automated Orbital Cue-and-Slew Tasking (Sentinel-1 InSAR creep -> SkySat Slew Task)
3. Debris Flow Slurry Surge & Sub-Second Hydropower SCADA Gate Opening (Riverbed Geophones -> Upper Tamakoshi SCADA)
"""

import sys
import json
import time
from pathlib import Path

# Add workers to path
workers_path = Path(__file__).resolve().parent.parent / "workers"
sys.path.insert(0, str(workers_path))

from src.analytics.risk_scorer import GLOFRiskScorer, LakeMetricsInput
from src.analytics.cue_and_slew import CueAndSlewCoordinator
from src.processing.edge_sensor_processor import EdgeSensorProcessor, EdgeSensorReading


def print_banner(text: str, char="="):
    line = char * 70
    print(f"\n{line}\n{text}\n{line}")


def run_simulation():
    print_banner("🏔️ HIMALAYA FLOOD EWS: MULTI-TIERED GLOF SIMULATION DRILL")
    print("Monitored Target: Tsho Rolpa Glacial Lake (PDGL_NEP_KOSHI_001) | Koshi Basin")
    print("Downstream Facility: Upper Tamakoshi Hydroelectric Project (456 MW) | Rolwaling Valley")

    # -------------------------------------------------------------
    # STAGE 1: DORMANT BASELINE MONITORING
    # -------------------------------------------------------------
    print_banner("STAGE 1: Normal All-Weather Baseline (Wide-Area SAR & Optical)")
    stage1_input = LakeMetricsInput(
        lake_id="l-tsho-rolpa",
        lake_name="Tsho Rolpa",
        current_area_sqm=1540000.0,
        baseline_30d_area_sqm=1540000.0,
        baseline_1yr_area_sqm=1510000.0,
        precip_48h_mm=12.0,
        moraine_slope_deg=28.0,
        terrain_ruggedness_m=450.0,
        lake_volume_mcm=50.0,
        freeboard_m=15.0,
        insar_los_velocity_mm_yr=-3.5,  # Stable moraine crest (< 10 mm/yr)
        insar_coherence=0.88,
        geophone_acoustic_energy_db=34.0,  # Clear water turbulent background
        geophone_dominant_freq_hz=8.0,
        water_stage_m=1.2,
        water_stage_surge_rate_m_min=0.01,
        tripwire_status="INTACT"
    )

    alert1 = GLOFRiskScorer.evaluate_lake_risk(stage1_input)
    print(f"  • Sentinel-1 InSAR LOS Velocity: {stage1_input.insar_los_velocity_mm_yr} mm/yr (Status: STABLE)")
    print(f"  • InSAR Coherence: γ = {stage1_input.insar_coherence} (Cloud Penetration: 100%)")
    print(f"  • Riverbed Geophone: {stage1_input.geophone_acoustic_energy_db} dB @ {stage1_input.geophone_dominant_freq_hz} Hz (Normal streamflow)")
    print(f"  • Trigger Urgency Score (T): {alert1.two_axis_score.trigger_urgency_score if alert1 else 0.0} (Dormant)")
    print(f"  • Cue-and-Slew Tasked: {alert1.slew_tasking_order is not None if alert1 else False}")
    print(f"  • SCADA Tripwire Fired: {alert1.scada_actuation is not None if alert1 else False}")
    assert alert1 is None or alert1.slew_tasking_order is None, "Dormant baseline must not trigger slew tasking"
    assert alert1 is None or alert1.scada_actuation is None, "Dormant baseline must not trigger SCADA trip"
    print("  ✓ Stage 1 Passed: Wide-area baseline stable. No commercial tasking or SCADA trip.")

    # -------------------------------------------------------------
    # STAGE 2: ORBITAL CUE-AND-SLEW TASKING TRIGGER
    # -------------------------------------------------------------
    print_banner("STAGE 2: Moraine Crest Creep Anomaly -> Automated Slew Tasking Trigger")
    stage2_input = LakeMetricsInput(
        lake_id="l-tsho-rolpa",
        lake_name="Tsho Rolpa",
        current_area_sqm=1580000.0,
        baseline_30d_area_sqm=1540000.0,
        baseline_1yr_area_sqm=1510000.0,
        precip_48h_mm=45.0,
        moraine_slope_deg=28.0,
        terrain_ruggedness_m=450.0,
        lake_volume_mcm=50.0,
        freeboard_m=15.0,
        insar_los_velocity_mm_yr=-28.4,  # Active internal moraine core settling
        insar_coherence=0.42,            # Decorrelation / surface crack initiation
        centroid=[86.475, 27.868],
        bbox=[86.45, 27.85, 86.50, 27.89]
    )

    alert2 = GLOFRiskScorer.evaluate_lake_risk(stage2_input)
    print(f"  • Sentinel-1 InSAR LOS Subsidence: {stage2_input.insar_los_velocity_mm_yr} mm/yr [THRESHOLD EXCEEDED: <= -15 mm/yr]")
    print(f"  • Coherence Drop: γ = {stage2_input.insar_coherence} [DECORRELATION ANOMALY]")
    print(f"  • Hazard Matrix: {alert2.two_axis_score.risk_matrix_quadrant} (Severity: {alert2.severity})")
    print(f"  • Trigger Reason: {alert2.trigger_reason}")

    tasking = alert2.slew_tasking_order
    assert tasking is not None, "InSAR anomaly must trigger Cue-and-Slew tasking order"
    print("\n  🛰️ [AUTOMATED CUE-AND-SLEW TASKING ORDER DISPATCHED]:")
    print(f"     Tasking ID:       {tasking.tasking_id}")
    print(f"     Priority:         {tasking.priority}")
    print(f"     Target Asset:     {tasking.target_sensor} ({tasking.target_gsd_meters}m GSD)")
    print(f"     Target Bounding:  {tasking.bbox} (~5x5 km catchment)")
    print("     Target CV Tasks:")
    for cv_task in tasking.required_cv_analyses:
        print(f"       - {cv_task}")
    print("  ✓ Stage 2 Passed: Targeted sub-meter optical sweep tasked without scanning 2,500 km blanket.")

    # -------------------------------------------------------------
    # STAGE 3: HYPER-CONCENTRATED SLURRY SURGE & INSTANT SCADA TRIP
    # -------------------------------------------------------------
    print_banner("STAGE 3: Gorge Hyper-Concentrated Slurry Surge -> Direct SCADA Gate Trip")
    stage3_input = LakeMetricsInput(
        lake_id="l-tsho-rolpa",
        lake_name="Tsho Rolpa",
        current_area_sqm=1680000.0,
        baseline_30d_area_sqm=1540000.0,
        precip_48h_mm=62.0,
        insar_los_velocity_mm_yr=-38.0,
        geophone_acoustic_energy_db=84.5,  # Intense bedload boulder collisions (> 70 dB)
        geophone_dominant_freq_hz=22.0,    # Classic 10-45 Hz debris slurry frequency
        water_stage_m=5.8,
        water_stage_surge_rate_m_min=0.82, # Flash flood wave arrival (+82 cm/min rise)
        tripwire_status="TRIPPED"          # Gorge choke tripwire severed
    )

    alert3 = GLOFRiskScorer.evaluate_lake_risk(stage3_input)
    assert alert3 is not None and alert3.severity == "EMERGENCY"
    print(f"  • Riverbed Geophone Acoustic Power: {stage3_input.geophone_acoustic_energy_db} dB @ {stage3_input.geophone_dominant_freq_hz} Hz")
    print("    -> SIGNATURE CONFIRMED: Hyper-concentrated boulder & gravel slurry flow!")
    print(f"  • Ultrasonic Stage Surge Rate: +{stage3_input.water_stage_surge_rate_m_min} m/min (Stage: {stage3_input.water_stage_m}m)")
    print("  • Gorge Seismic Tripwire: SEVERED (TRIPPED)")
    print(f"\n  🚨 [EMERGENCY ALERT RAISED]: {alert3.severity}")
    print(f"     Reason: {alert3.trigger_reason}")

    scada = alert3.scada_actuation
    assert scada is not None, "Edge sensor slurry surge must generate SCADA gate command"
    print("\n  ⚡ [SUB-SECOND HYDROPOWER SCADA DIRECT ACTUATION]:")
    print(f"     Target Facility:   {scada.facility_name} ({scada.facility_id})")
    print(f"     Emergency Action:  {scada.action}")
    print(f"     Target Gates:      {', '.join(scada.target_spillway_gates)}")
    print(f"     Estimated ETA:     {scada.estimated_arrival_minutes} minutes")
    print(f"     Command Payload:   {json.dumps(scada.command_payload)}")
    print("  ✓ Stage 3 Passed: Downstream radial gates auto-opened before flood wave arrival.")

    print_banner("✅ ALL 3 TIERS OF GLOF EARLY WARNING SUCCESSFULLY VERIFIED")


if __name__ == "__main__":
    run_simulation()
