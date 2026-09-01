import numpy as np
from typing import Tuple, Optional


class MNDWIExtractor:
    """
    Modified Normalized Difference Water Index (MNDWI) Extractor
    Formula: MNDWI = (Green - SWIR1) / (Green + SWIR1)
    Reference: Xu, H. (2006). Modification of normalised difference water index (NDWI)
    to enhance open water features in remotely sensed imagery.
    """

    def __init__(self, default_threshold: float = 0.05, epsilon: float = 1e-6):
        self.default_threshold = default_threshold
        self.epsilon = epsilon

    def compute_mndwi(self, green_band: np.ndarray, swir1_band: np.ndarray) -> np.ndarray:
        """
        Calculates the MNDWI index array.
        Output range is [-1.0, 1.0].
        """
        green = green_band.astype(np.float32)
        swir1 = swir1_band.astype(np.float32)

        numerator = green - swir1
        denominator = green + swir1 + self.epsilon

        mndwi = numerator / denominator
        # Clip to valid mathematical range
        return np.clip(mndwi, -1.0, 1.0)

    def calculate_otsu_threshold(self, mndwi_array: np.ndarray, mask: Optional[np.ndarray] = None) -> float:
        """
        Computes an optimal bimodal threshold separating water from non-water pixels using Otsu's method.
        """
        valid_pixels = mndwi_array[mask] if mask is not None else mndwi_array.flatten()
        valid_pixels = valid_pixels[~np.isnan(valid_pixels)]

        if len(valid_pixels) == 0:
            return self.default_threshold

        # Discretize into 256 bins between -1.0 and 1.0
        hist, bin_edges = np.histogram(valid_pixels, bins=256, range=(-1.0, 1.0))
        total_pixels = len(valid_pixels)
        
        current_max = 0.0
        threshold_idx = 0
        sum_total = np.dot(np.arange(256), hist)
        sum_background = 0.0
        weight_background = 0

        for i in range(256):
            weight_background += hist[i]
            if weight_background == 0:
                continue
            weight_foreground = total_pixels - weight_background
            if weight_foreground == 0:
                break

            sum_background += i * hist[i]
            mean_background = sum_background / weight_background
            mean_foreground = (sum_total - sum_background) / weight_foreground

            # Between class variance
            var_between = weight_background * weight_foreground * (mean_background - mean_foreground) ** 2

            if var_between > current_max:
                current_max = var_between
                threshold_idx = i

        otsu_val = bin_edges[threshold_idx]
        # In alpine glacial lakes, limit Otsu to reasonable bounds [-0.1, 0.3]
        return float(np.clip(otsu_val, -0.1, 0.3))

    def extract_water_mask(
        self,
        green_band: np.ndarray,
        swir1_band: np.ndarray,
        use_otsu: bool = False,
        custom_threshold: Optional[float] = None
    ) -> Tuple[np.ndarray, float]:
        """
        Generates binary water mask (True for water, False for non-water).
        Returns (water_mask, threshold_used).
        """
        mndwi = self.compute_mndwi(green_band, swir1_band)

        if custom_threshold is not None:
            thresh = custom_threshold
        elif use_otsu:
            thresh = self.calculate_otsu_threshold(mndwi)
        else:
            thresh = self.default_threshold

        water_mask = mndwi > thresh
        return water_mask, thresh
