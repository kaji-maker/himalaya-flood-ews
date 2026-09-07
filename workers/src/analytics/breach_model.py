import math
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class DamBreachParameters(BaseModel):
    lake_name: str
    icimod_code: str
    lake_volume_mcm: float = Field(..., description="Stored lake water volume in Million Cubic Meters (MCM)")
    dam_height_m: float = Field(..., description="Moraine or landslide dam crest height above valley floor in meters")
    breach_width_m: float = Field(default=45.0, description="Average breach top width in meters")
    breach_depth_m: float = Field(default=25.0, description="Breach vertical erosion incision depth in meters")
    valley_slope_deg: float = Field(default=4.5, description="Average downstream river channel gradient in degrees")
    manning_n: float = Field(default=0.055, description="Roughness coefficient for steep boulder-strewn Himalayan gorges")
    is_ephemeral_landslide_dam: bool = Field(default=False, description="True if temporary rock-ice avalanche valley choke (Bhotekoshi-type)")
    sediment_bulking_factor: float = Field(default=1.35, description="Slurry sediment bulking factor Bf = 1 / (1 - Cv), typical 1.3 - 1.6 for Himalayan debris gorges")
    volumetric_sediment_concentration: Optional[float] = Field(default=None, description="Volumetric sediment concentration Cv in [0.15, 0.45]")


class ReachImpact(BaseModel):
    settlement_name: str
    distance_km: float
    elevation_drop_m: float
    travel_time_minutes: float
    peak_discharge_cms: float
    peak_stage_rise_m: float
    hazard_level: str


class BreachSimulationResult(BaseModel):
    lake_name: str
    icimod_code: str
    peak_outflow_q_froehlich_cms: float
    peak_outflow_q_costa_cms: float
    peak_outflow_q_usbr_cms: float
    peak_outflow_q_nws_breach_cms: float  # Kayastha & Maskey (PIAHS 2024) benchmark
    recommended_peak_q_cms: float
    total_breach_formation_time_hrs: float
    sediment_bulking_factor: float = 1.35
    hydrograph: Optional[List[Dict[str, float]]] = None
    downstream_impacts: List[ReachImpact]
    inundation_geojson: Dict[str, Any]


class GLOFBreachModel:
    """
    Empirical & Hydrodynamic Moraine & Landslide Dam Breach Outflow Routing Engine.
    Implements:
    1. Froehlich (1995), Costa (1985), USBR (1988) empirical envelopes
    2. NWS-BREACH / HEC-RAS Hydrodynamic Benchmarks (Kayastha & Maskey, PIAHS 2024)
    3. Ephemeral Landslide Dam & Rock-Ice Avalanche Surge Formulation (Costa & Schuster 1988)
    4. Kinematic wave routing with attenuation along steep Himalayan river gorges.
    """

    @classmethod
    def calculate_sediment_bulking_factor(cls, cv: float) -> float:
        """
        Calculates sediment bulking factor B_f = 1 / (1 - C_v) for debris flow surge.
        C_v is the volumetric sediment concentration (typically 0.15 - 0.45 in Himalayan GLOFs).
        """
        clamped_cv = max(0.0, min(0.60, cv))
        return 1.0 / (1.0 - clamped_cv)

    @classmethod
    def calculate_peak_outflow(cls, params: DamBreachParameters) -> Dict[str, float]:
        """
        Calculates peak discharge (Q_p in m³/s) using peer-reviewed moraine & landslide breach formulas:
        1. Froehlich (1995): Q_p = 0.607 * (V_w^0.295) * (h_w^1.24)
        2. Costa (1985): Q_p = 0.0181 * (V_w^0.42) * (h_w^1.28)
        3. USBR (1988): Q_p = 19.1 * (h_w^1.85)
        4. NWS-BREACH (Kayastha & Maskey, PIAHS 2024): Q_p = 1.42 * Froehlich
        5. Ephemeral Landslide Dam Choke (Costa & Schuster 1988): Fast 0.05-0.1h runaway failure
        """
        v_w = params.lake_volume_mcm * 1e6  # Convert MCM to m³
        h_w = min(params.dam_height_m, params.breach_depth_m) if params.breach_depth_m > 0 else params.dam_height_m

        # Froehlich (1995)
        q_froehlich = 0.607 * math.pow(v_w, 0.295) * math.pow(h_w, 1.24)

        # Costa (1985) Envelope for Moraine Dams
        q_costa = 0.0181 * math.pow(v_w, 0.42) * math.pow(h_w, 1.28)

        # US Bureau of Reclamation (USBR)
        q_usbr = 19.1 * math.pow(h_w, 1.85)

        # NWS-BREACH / HEC-RAS calibrated hydrodynamic peak (Kayastha & Maskey, PIAHS 2024)
        breach_depth_ratio = h_w / 20.0
        q_nws_breach = 8198.0 * math.pow(params.lake_volume_mcm / 85.9, 0.35) * math.pow(breach_depth_ratio, 1.65)

        # Ephemeral Landslide Dam Rapid Surge Mode (e.g. 2026 Bhotekoshi Lhende Khola failure)
        if params.is_ephemeral_landslide_dam:
            # Landslide dams fail with higher instantaneous discharge and rapid erosion
            q_landslide_choke = 0.063 * math.pow(v_w, 0.42) * math.pow(h_w, 1.35)
            q_clean = max(q_nws_breach, q_landslide_choke)
            t_formation_hrs = 0.05  # Fast 3-minute runaway breaching
        else:
            q_clean = 0.4 * q_froehlich + 0.3 * q_nws_breach + 0.2 * q_costa + 0.1 * q_usbr
            # Breach formation time (Froehlich 1995): t_f = 0.00254 * (V_w^0.53) * (h_b^-0.90) in hours
            t_formation_hrs = 0.00254 * math.pow(v_w, 0.53) * math.pow(h_w, -0.90)
            t_formation_hrs = max(0.25, min(t_formation_hrs, 4.0))

        # Sediment bulking factor calculation: Bf = 1 / (1 - Cv)
        if params.volumetric_sediment_concentration is not None:
            cv = max(0.05, min(0.60, params.volumetric_sediment_concentration))
            b_factor = 1.0 / (1.0 - cv)
        else:
            b_factor = max(1.0, params.sediment_bulking_factor)

        # Bulked peak slurry discharge
        q_bulked = q_clean * b_factor

        return {
            "q_froehlich_cms": round(q_froehlich, 1),
            "q_costa_cms": round(q_costa, 1),
            "q_usbr_cms": round(q_usbr, 1),
            "q_nws_breach_cms": round(q_nws_breach, 1),
            "q_clean_recommended_cms": round(q_clean, 1),
            "q_recommended_cms": round(q_bulked, 1),
            "q_recommended_bulked_cms": round(q_bulked, 1),
            "sediment_bulking_factor": round(b_factor, 2),
            "volumetric_sediment_concentration": params.volumetric_sediment_concentration,
            "formation_time_hrs": round(t_formation_hrs, 2)
        }

    @classmethod
    def synthesize_breach_hydrograph(
        cls,
        q_peak_cms: float = 0.0,
        formation_time_hrs: float = 0.0,
        time_step_mins: float = 2.0,
        duration_factor: float = 3.5,
        **kwargs: Any
    ) -> List[Dict[str, float]]:
        """
        Synthesizes dynamic unsteady GLOF breach outflow hydrograph Q(t).
        Follows steep triangular/exponential breach curve (Fread 1988, Froehlich 2008):
        - Rapid rising limb peaking at t_rise = 0.20 * t_f
        - Exponential recession limb draining stored lake volume
        """
        peak_q = kwargs.get("peak_discharge_cms", q_peak_cms)
        tf_hrs = kwargs.get("failure_duration_hrs", formation_time_hrs)
        num_pts = kwargs.get("num_points")

        total_time_hrs = max(0.5, tf_hrs * duration_factor)
        if num_pts and num_pts > 1:
            time_step_mins = (total_time_hrs * 60.0) / (num_pts - 1)
        total_steps = int(round((total_time_hrs * 60.0) / max(0.5, time_step_mins)))
        t_peak_hrs = max(0.01, 0.20 * tf_hrs)

        hydrograph: List[Dict[str, float]] = []
        base_flow = max(15.0, 0.005 * peak_q)

        for i in range(total_steps + 1):
            t_min = i * time_step_mins
            t_hr = t_min / 60.0

            if t_hr <= t_peak_hrs:
                frac = t_hr / t_peak_hrs
                q_t = base_flow + (peak_q - base_flow) * (frac ** 2.0)
            else:
                decay_k = 2.2 / max(0.1, tf_hrs)
                q_t = base_flow + (peak_q - base_flow) * math.exp(-decay_k * (t_hr - t_peak_hrs))

            hydrograph.append({
                "time_minutes": round(t_min, 1),
                "discharge_cms": round(max(base_flow, q_t), 1)
            })

        return hydrograph

    @classmethod
    def route_flood_wave(
        cls,
        q_peak_cms: float,
        settlements: List[Dict[str, Any]],
        valley_slope_deg: float = 4.5,
        manning_n: float = 0.055
    ) -> List[ReachImpact]:
        """
        Routes GLOF flood wave downstream using steep channel wave celerity,
        peak discharge attenuation, and reach-variable channel slope/roughness.
        """
        impacts: List[ReachImpact] = []

        for s in settlements:
            dist_km = s["distance_km"]
            dist_m = dist_km * 1000.0
            elev_drop = s.get("elevation_drop_m", dist_km * 45.0)
            reach_slope = s.get("channel_slope_deg", s.get("reach_slope", valley_slope_deg))
            reach_manning = s.get("reach_manning_n", s.get("manning_n", manning_n))

            if reach_slope < 1.0:
                # Given as dimensionless gradient / slope (e.g. 0.08 m/m)
                sin_slope = max(0.002, reach_slope)
            else:
                slope_rad = math.radians(max(0.2, reach_slope))
                sin_slope = math.sin(slope_rad)

            # Peak discharge attenuation along valley: Q(x) = Q_0 * exp(-k * x)
            # where k ~ 0.016 km^-1 for steep Himalayan incised gorges
            attenuation_factor = math.exp(-0.016 * dist_km)
            q_local = q_peak_cms * attenuation_factor

            # Approximate flood wave celerity (Manning / kinematic wave): c = (5/3) * v
            channel_width = max(30.0, s.get("channel_width_m", 25.0 + 0.8 * dist_km))
            hydraulic_depth = max(1.5, math.pow((q_local * reach_manning) / (channel_width * math.sqrt(sin_slope)), 0.6))
            velocity = q_local / (channel_width * hydraulic_depth)
            celerity_m_s = max(3.0, min(24.0, (5.0 / 3.0) * velocity))

            travel_time_sec = dist_m / celerity_m_s
            travel_time_min = travel_time_sec / 60.0

            # Peak water stage rise above riverbed (meters)
            stage_rise_m = round(hydraulic_depth * 1.25, 1)

            # Hazard Rating based on arrival time & flood wave height
            if travel_time_min < 30.0 or stage_rise_m > 6.0:
                hazard = "EXTREME_IMMEDIATE_EVACUATION"
            elif travel_time_min < 90.0 or stage_rise_m > 3.0:
                hazard = "HIGH_PRIORITY_EVACUATION"
            else:
                hazard = "MODERATE_WARNING"

            impacts.append(ReachImpact(
                settlement_name=s["name"],
                distance_km=dist_km,
                elevation_drop_m=round(elev_drop, 1),
                travel_time_minutes=round(travel_time_min, 1),
                peak_discharge_cms=round(q_local, 1),
                peak_stage_rise_m=stage_rise_m,
                hazard_level=hazard
            ))

        return impacts

    @classmethod
    def generate_inundation_geojson(
        cls,
        lake_coords: List[float],
        settlements: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generates downstream flood corridor buffer swath GeoJSON in EPSG:4326.
        """
        features = []
        lon0, lat0 = lake_coords

        coords = [[lon0, lat0]]
        for s in settlements:
            coords.append([s["lon"], s["lat"]])

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": coords
            },
            "properties": {
                "layer": "GLOF_Inundation_Thalweg",
                "hazard": "FLOOD_SURGE_PATH"
            }
        })

        for s in settlements:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [s["lon"], s["lat"]]
                },
                "properties": {
                    "settlement": s["name"],
                    "distance_km": s["distance_km"],
                    "layer": "AT_RISK_SETTLEMENT"
                }
            })

        return {
            "type": "FeatureCollection",
            "features": features
        }

    @classmethod
    def simulate_lake_breach(
        cls,
        params: DamBreachParameters,
        lake_coords: List[float],
        downstream_settlements: List[Dict[str, Any]]
    ) -> BreachSimulationResult:
        """
        Full GLOF Dam Breach Outflow & Inundation Simulation Pipeline.
        """
        outflow = cls.calculate_peak_outflow(params)
        impacts = cls.route_flood_wave(
            q_peak_cms=outflow["q_recommended_cms"],
            settlements=downstream_settlements,
            valley_slope_deg=params.valley_slope_deg,
            manning_n=params.manning_n
        )
        geojson = cls.generate_inundation_geojson(lake_coords, downstream_settlements)
        hydrograph = cls.synthesize_breach_hydrograph(
            q_peak_cms=outflow["q_recommended_cms"],
            formation_time_hrs=outflow["formation_time_hrs"]
        )

        return BreachSimulationResult(
            lake_name=params.lake_name,
            icimod_code=params.icimod_code,
            peak_outflow_q_froehlich_cms=outflow["q_froehlich_cms"],
            peak_outflow_q_costa_cms=outflow["q_costa_cms"],
            peak_outflow_q_usbr_cms=outflow["q_usbr_cms"],
            peak_outflow_q_nws_breach_cms=outflow["q_nws_breach_cms"],
            recommended_peak_q_cms=outflow["q_recommended_cms"],
            total_breach_formation_time_hrs=outflow["formation_time_hrs"],
            sediment_bulking_factor=outflow["sediment_bulking_factor"],
            hydrograph=hydrograph,
            downstream_impacts=impacts,
            inundation_geojson=geojson
        )
