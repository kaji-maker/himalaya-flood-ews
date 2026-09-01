import pytest
import numpy as np
from src.processing.mndwi_extractor import MNDWIExtractor
from src.processing.cloud_mask import CloudAndSnowMask


def test_mndwi_math_range():
    extractor = MNDWIExtractor()
    green = np.array([[0.3, 0.1], [0.5, 0.2]], dtype=np.float32)
    swir1 = np.array([[0.02, 0.4], [0.01, 0.2]], dtype=np.float32)

    mndwi = extractor.compute_mndwi(green, swir1)
    
    # Water pixel (green 0.3, swir1 0.02) -> high positive MNDWI
    assert mndwi[0, 0] > 0.8
    # Land pixel (green 0.1, swir1 0.4) -> negative MNDWI
    assert mndwi[0, 1] < -0.5
    # All values bounded in [-1.0, 1.0]
    assert np.all(mndwi >= -1.0) and np.all(mndwi <= 1.0)


def test_mndwi_water_mask_extraction():
    extractor = MNDWIExtractor(default_threshold=0.1)
    green = np.array([[0.4, 0.05], [0.35, 0.1]], dtype=np.float32)
    swir1 = np.array([[0.02, 0.3], [0.03, 0.2]], dtype=np.float32)

    mask, thresh = extractor.extract_water_mask(green, swir1)
    assert thresh == 0.1
    assert mask[0, 0] == True  # Water
    assert mask[0, 1] == False # Land
    assert mask[1, 0] == True  # Water
    assert mask[1, 1] == False # Land


def test_snow_ice_filtering():
    # Simulate a pixel with high green but also high NIR (snow) vs water (low NIR)
    water_mask = np.array([[True, True]])
    nir_band = np.array([[0.03, 0.85]]) # Pixel 0: water, Pixel 1: snow

    filtered = CloudAndSnowMask.filter_snow_contamination(water_mask, nir_band, nir_water_threshold=0.12)
    assert filtered[0, 0] == True  # True water
    assert filtered[0, 1] == False # Snow filtered out
