import numpy as np
from typing import Tuple, Optional


class CloudAndSnowMask:
    """
    Quality masking for alpine satellite observations:
    - Excludes clouds, cirrus, cloud shadows
    - Disambiguates clean glacier snow/ice from supraglacial lakes
    """

    # Sentinel-2 SCL (Scene Classification Layer) classes to reject:
    SCL_INVALID_CLASSES = {
        0: "NO_DATA",
        1: "SATURATED_OR_DEFECTIVE",
        3: "CLOUD_SHADOWS",
        8: "CLOUD_MEDIUM_PROBABILITY",
        9: "CLOUD_HIGH_PROBABILITY",
        10: "THIN_CIRRUS"
    }

    @classmethod
    def create_valid_mask(
        cls,
        scl_band: Optional[np.ndarray] = None,
        green_band: Optional[np.ndarray] = None,
        nir_band: Optional[np.ndarray] = None,
        shape: Optional[Tuple[int, int]] = None
    ) -> Tuple[np.ndarray, float]:
        """
        Returns (valid_pixels_mask, cloud_cover_percentage).
        """
        if scl_band is not None:
            # Mask out cloud and shadow classes
            is_cloud_or_shadow = np.isin(scl_band, list(cls.SCL_INVALID_CLASSES.keys()))
            valid_mask = ~is_cloud_or_shadow
            cloud_pct = float((np.sum(is_cloud_or_shadow) / scl_band.size) * 100.0)
            return valid_mask, round(cloud_pct, 2)

        if shape is None and green_band is not None:
            shape = green_band.shape

        if shape is None:
            raise ValueError("Must provide either scl_band or shape.")

        # Default fallback: all valid if no SCL available
        valid_mask = np.ones(shape, dtype=bool)
        return valid_mask, 0.0

    @classmethod
    def filter_snow_contamination(
        cls,
        water_mask: np.ndarray,
        nir_band: np.ndarray,
        nir_water_threshold: float = 0.12
    ) -> np.ndarray:
        """
        Snow and clean ice can exhibit high green reflectance.
        Water absorbs NIR strongly (NIR < 0.12), whereas snow has high NIR (> 0.60).
        This rejects false water positives caused by melting snow or wet ice.
        """
        refined_water_mask = water_mask & (nir_band < nir_water_threshold)
        return refined_water_mask
