import pytest
import numpy as np
import rasterio.transform
from src.processing.lake_vectorizer import LakeVectorizer


def test_lake_vectorizer_polygon_creation():
    vectorizer = LakeVectorizer()
    # 20x20 grid with a 10x10 water square in the center
    mask = np.zeros((20, 20), dtype=bool)
    mask[5:15, 5:15] = True

    # 10m pixel size transform (0.0001 deg in WGS84)
    transform = rasterio.transform.from_origin(86.4, 27.9, 0.0001, 0.0001)

    result = vectorizer.vectorize_mask(mask, affine_transform=transform, pixel_size_m=10.0)

    assert result["lake_count"] >= 1
    # Projected area in UTM Zone 45N (EPSG:32645) for 100 pixels (~10.9k m² at 27.9°N)
    assert 10000.0 <= result["area_sqm"] <= 11500.0
    assert result["area_sqkm"] > 0.009
    assert result["geojson"]["type"] == "MultiPolygon"
    assert len(result["geojson"]["coordinates"]) > 0
    assert result["planar_crs"] == "EPSG:32645"


def test_empty_mask_handling():
    vectorizer = LakeVectorizer()
    empty_mask = np.zeros((10, 10), dtype=bool)
    transform = rasterio.transform.from_origin(86.0, 28.0, 0.001, 0.001)

    result = vectorizer.vectorize_mask(empty_mask, affine_transform=transform)
    assert result["lake_count"] == 0
    assert result["area_sqkm"] == 0.0
    assert result["geojson"]["coordinates"] == []
