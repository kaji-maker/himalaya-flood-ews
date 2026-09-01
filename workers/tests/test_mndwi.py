import io
import pytest
import numpy as np
import rasterio
import rasterio.transform
import rasterio.crs
from src.processing.mndwi_extractor import MNDWIExtractor


def test_mndwi_division_by_zero_handling():
    extractor = MNDWIExtractor()
    
    # Cases with zeros, negative numbers, and standard values
    green = np.array([[0.0, 0.4], [0.1, 0.0]], dtype=np.float32)
    swir = np.array([[0.0, 0.05], [0.3, 0.0]], dtype=np.float32)

    mndwi = extractor.compute_mndwi(green, swir)

    # 0.0 / 0.0 should be safely mapped to 0.0 via np.nan_to_num
    assert mndwi[0, 0] == 0.0
    assert mndwi[1, 1] == 0.0
    # Water pixel (green 0.4, swir 0.05) -> (0.4 - 0.05) / (0.4 + 0.05) = 0.35 / 0.45 ~ 0.777
    assert 0.75 <= mndwi[0, 1] <= 0.80
    # Land pixel (green 0.1, swir 0.3) -> (0.1 - 0.3) / (0.1 + 0.3) = -0.2 / 0.4 = -0.5
    assert -0.55 <= mndwi[1, 0] <= -0.45
    # No NaNs or infinities
    assert not np.isnan(mndwi).any()
    assert not np.isinf(mndwi).any()


def test_sieve_noise_removal():
    extractor = MNDWIExtractor(min_sieve_size=10)

    # Create a 30x30 mask with:
    # 1. A small isolated speckle noise cluster of 4 pixels (should be removed)
    # 2. A large water body of 36 pixels (6x6) (should be kept)
    mask = np.zeros((30, 30), dtype=bool)
    mask[2:4, 2:4] = True      # 4 pixels
    mask[15:21, 15:21] = True  # 36 pixels

    sieved = extractor.sieve_noise(mask, min_size=10)

    # Small cluster should be eliminated
    assert not sieved[2:4, 2:4].any()
    # Large cluster should be preserved
    assert sieved[15:21, 15:21].all()


def test_full_extraction_geojson_feature_collection():
    extractor = MNDWIExtractor(default_threshold=0.05, min_sieve_size=10)

    shape = (50, 50)
    green = np.full(shape, 0.15, dtype=np.float32)
    swir = np.full(shape, 0.35, dtype=np.float32)

    # Insert a 20x20 lake in the middle
    green[15:35, 15:35] = 0.40
    swir[15:35, 15:35] = 0.02

    # Georeference around Tsho Rolpa, Nepal (EPSG:4326)
    # ~0.0001 deg per pixel (~10m)
    transform = rasterio.transform.from_origin(86.47, 27.88, 0.0001, 0.0001)

    result = extractor.extract(
        green_input=green,
        swir_input=swir,
        custom_transform=transform,
        custom_crs=rasterio.crs.CRS.from_epsg(4326)
    )

    assert result["type"] == "FeatureCollection"
    assert "features" in result
    assert len(result["features"]) == 1

    feature = result["features"][0]
    assert feature["type"] == "Feature"
    assert feature["geometry"]["type"] in ["Polygon", "MultiPolygon"]
    assert feature["properties"]["area_sqm"] > 0
    assert feature["properties"]["metric_crs"] == "EPSG:32645"
    assert result["properties"]["total_water_bodies_count"] == 1


def test_extraction_from_rasterio_memory_buffers():
    extractor = MNDWIExtractor(default_threshold=0.05, min_sieve_size=5)

    # Generate synthetic GeoTIFF byte buffers in memory
    transform = rasterio.transform.from_origin(86.5, 27.9, 0.0001, 0.0001)
    crs = rasterio.crs.CRS.from_epsg(4326)

    data_green = np.full((20, 20), 0.1, dtype=np.float32)
    data_green[5:15, 5:15] = 0.45  # 100 water pixels

    data_swir = np.full((20, 20), 0.3, dtype=np.float32)
    data_swir[5:15, 5:15] = 0.01

    green_buf = io.BytesIO()
    with rasterio.open(
        green_buf, 'w', driver='GTiff', height=20, width=20, count=1,
        dtype=rasterio.float32, crs=crs, transform=transform
    ) as dst:
        dst.write(data_green, 1)

    swir_buf = io.BytesIO()
    with rasterio.open(
        swir_buf, 'w', driver='GTiff', height=20, width=20, count=1,
        dtype=rasterio.float32, crs=crs, transform=transform
    ) as dst:
        dst.write(data_swir, 1)

    green_buf.seek(0)
    swir_buf.seek(0)

    result = extractor.extract(green_buf, swir_buf)
    assert result["type"] == "FeatureCollection"
    assert len(result["features"]) == 1
    assert result["features"][0]["properties"]["area_sqm"] > 5000.0
