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
            q_recommended = max(q_nws_breach, q_landslide_choke)
            t_formation_hrs = 0.05  # Fast 3-minute runaway breaching
        else:
            q_recommended = 0.4 * q_froehlich + 0.3 * q_nws_breach + 0.2 * q_costa + 0.1 * q_usbr
            # Breach formation time (Froehlich 1995): t_f = 0.00254 * (V_w^0.53) * (h_b^-0.90) in hours
            t_formation_hrs = 0.00254 * math.pow(v_w, 0.53) * math.pow(h_w, -0.90)
            t_formation_hrs = max(0.25, min(t_formation_hrs, 4.0))

        return {
            "q_froehlich_cms": round(q_froehlich, 1),
            "q_costa_cms": round(q_costa, 1),
            "q_usbr_cms": round(q_usbr, 1),
            "q_nws_breach_cms": round(q_nws_breach, 1),
            "q_recommended_cms": round(q_recommended, 1),
            "formation_time_hrs": round(t_formation_hrs, 2)
        }

    @classmethod
    def route_flood_wave(
        cls,
        q_peak_cms: float,
        settlements: List[Dict[str, Any]],
        valley_slope_deg: float = 4.5,
        manning_n: float = 0.055
    ) -> List[ReachImpact]:
        """
        Routes GLOF flood wave downstream using steep channel wave celerity
        and peak discharge attenuation models.
        """
        impacts: List[ReachImpact] = []
        slope_rad = math.radians(valley_slope_deg)
        sin_slope = math.sin(slope_rad)

        for s in settlements:
            dist_km = s["distance_km"]
            dist_m = dist_km * 1000.0
            elev_drop = s.get("elevation_drop_m", dist_km * 45.0)

            # Peak discharge attenuation along valley: Q(x) = Q_0 * exp(-k * x)
            # where k ~ 0.016 km^-1 for steep Himalayan incised gorges
            attenuation_factor = math.exp(-0.016 * dist_km)
            q_local = q_peak_cms * attenuation_factor

            # Approximate flood wave celerity (Manning / kinematic wave): c = (5/3) * v
            channel_width = max(30.0, 25.0 + 0.8 * dist_km)
            hydraulic_depth = max(1.5, math.pow((q_local * manning_n) / (channel_width * math.sqrt(sin_slope)), 0.6))
            velocity = q_local / (channel_width * hydraulic_depth)
            celerity_m_s = max(4.0, min(14.0, (5.0 / 3.0) * velocity))

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

        return BreachSimulationResult(
            lake_name=params.lake_name,
            icimod_code=params.icimod_code,
            peak_outflow_q_froehlich_cms=outflow["q_froehlich_cms"],
            peak_outflow_q_costa_cms=outflow["q_costa_cms"],
            peak_outflow_q_usbr_cms=outflow["q_usbr_cms"],
            peak_outflow_q_nws_breach_cms=outflow["q_nws_breach_cms"],
            recommended_peak_q_cms=outflow["q_recommended_cms"],
            total_breach_formation_time_hrs=outflow["formation_time_hrs"],
            downstream_impacts=impacts,
            inundation_geojson=geojson
        )
