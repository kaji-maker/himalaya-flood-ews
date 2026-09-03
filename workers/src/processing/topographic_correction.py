import math
import logging
from typing import Dict, Any, Tuple
import numpy as np

logger = logging.getLogger(__name__)


class HimalayanTopographicCorrector:
    """
    Topographic Solar Illumination & Cast Shadow Correction for Steep Himalayan Catchments.
    
    Solves the severe optical distortion and shadow fall noted in deep mountain gorges:
    1. Cosine Illumination Angle (cos i) calculation from DEM slope and aspect.
    2. Cast Shadow Ray-Tracing to isolate deep north-facing gorge shadows.
    3. Minnaert / C-Correction normalization to recover MNDWI water signals under shadow.
    """

    @staticmethod
    def calculate_illumination(
        slope_deg: np.ndarray,
        aspect_deg: np.ndarray,
        solar_zenith_deg: float,
        solar_azimuth_deg: float,
    ) -> np.ndarray:
        """
        Calculates local solar incidence angle cos(i) on inclined terrain.
        cos(i) = cos(zenith) * cos(slope) + sin(zenith) * sin(slope) * cos(solar_azimuth - aspect)
        """
        zenith_rad = math.radians(solar_zenith_deg)
        azimuth_rad = math.radians(solar_azimuth_deg)

        slope_rad = np.radians(slope_deg)
        aspect_rad = np.radians(aspect_deg)

        cos_i = (
            math.cos(zenith_rad) * np.cos(slope_rad)
            + math.sin(zenith_rad) * np.sin(slope_rad) * np.cos(azimuth_rad - aspect_rad)
        )

        # Clip values below zero (self-shadowed surfaces facing directly away from the sun)
        return np.clip(cos_i, 0.001, 1.0)

    @staticmethod
    def detect_cast_shadows(
        dem_elevation_m: np.ndarray,
        cell_size_m: float = 30.0,
        solar_zenith_deg: float = 45.0,
        solar_azimuth_deg: float = 145.0,
        max_search_dist_cells: int = 15,
    ) -> np.ndarray:
        """
        Ray-tracing cast shadow detection along the solar illumination vector.
        Flags pixels obstructed by towering ridgelines or steep cirque walls.
        """
        rows, cols = dem_elevation_m.shape
        shadow_mask = np.zeros((rows, cols), dtype=bool)

        sun_elev_rad = math.radians(90.0 - solar_zenith_deg)
        tan_sun = math.tan(sun_elev_rad)

        az_rad = math.radians(solar_azimuth_deg)
        # Direction towards sun
        dx = -math.sin(az_rad)
        dy = -math.cos(az_rad)

        for step in range(1, max_search_dist_cells + 1):
            shift_r = int(round(step * dy))
            shift_c = int(round(step * dx))

            if abs(shift_r) >= rows or abs(shift_c) >= cols:
                break

            # Rolled elevated terrain towards sun
            rolled_elev = np.roll(dem_elevation_m, (shift_r, shift_c), axis=(0, 1))
            dist_m = step * cell_size_m

            # Required elevation of an obstacle to cast shadow
            min_shadowing_elev = dem_elevation_m + dist_m * tan_sun
            shadow_mask = shadow_mask | (rolled_elev > min_shadowing_elev)

        return shadow_mask

    @classmethod
    def apply_c_correction(
        cls,
        reflectance_band: np.ndarray,
        cos_i: np.ndarray,
        solar_zenith_deg: float,
        c_parameter: float = 0.25,
    ) -> np.ndarray:
        """
        Applies empirical C-Correction:
        L_corrected = L_observed * (cos(zenith) + C) / (cos(i) + C)
        """
        cos_zenith = math.cos(math.radians(solar_zenith_deg))
        correction_factor = (cos_zenith + c_parameter) / (cos_i + c_parameter)

        # Dampen extreme ratios on steep sheer cliffs to avoid noise amplification
        correction_factor = np.clip(correction_factor, 0.4, 3.0)
        corrected = reflectance_band * correction_factor

        return np.clip(corrected, 0.0, 1.0).astype(np.float32)

    @classmethod
    def process_shadow_corrected_mndwi(
        cls,
        green_band: np.ndarray,
        swir1_band: np.ndarray,
        dem_m: np.ndarray,
        solar_zenith_deg: float = 40.0,
        solar_azimuth_deg: float = 140.0,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        End-to-end topographic normalization and MNDWI calculation.
        Returns:
        - shadow_corrected_mndwi: Float32 array [-1.0, 1.0]
        - shadow_mask: Bool array indicating terrain and cast shadows
        """
        # 1. Approximate slope and aspect from DEM via spatial gradients
        grad_y, grad_x = np.gradient(dem_m, 30.0, 30.0)
        slope_rad = np.arctan(np.sqrt(grad_x**2 + grad_y**2))
        slope_deg = np.degrees(slope_rad)

        aspect_rad = np.arctan2(-grad_x, grad_y)
        aspect_deg = (np.degrees(aspect_rad) + 360.0) % 360.0

        # 2. Compute illumination incidence angle
        cos_i = cls.calculate_illumination(
            slope_deg=slope_deg,
            aspect_deg=aspect_deg,
            solar_zenith_deg=solar_zenith_deg,
            solar_azimuth_deg=solar_azimuth_deg,
        )

        # 3. Detect cast shadows from high ridge crests
        cast_shadow = cls.detect_cast_shadows(
            dem_elevation_m=dem_m,
            cell_size_m=30.0,
            solar_zenith_deg=solar_zenith_deg,
            solar_azimuth_deg=solar_azimuth_deg,
        )

        # Self-shadow when surface normal is oriented away from sun
        self_shadow = cos_i < 0.05
        total_shadow_mask = cast_shadow | self_shadow

        # 4. Topographically correct Green and SWIR1 bands
        corrected_green = cls.apply_c_correction(green_band, cos_i, solar_zenith_deg, c_parameter=0.20)
        corrected_swir1 = cls.apply_c_correction(swir1_band, cos_i, solar_zenith_deg, c_parameter=0.35)

        # 5. Compute Normalized Difference Water Index (MNDWI)
        denom = corrected_green + corrected_swir1
        safe_denom = np.where(denom == 0, 1e-6, denom)
        corrected_mndwi = (corrected_green - corrected_swir1) / safe_denom

        return corrected_mndwi, total_shadow_mask
