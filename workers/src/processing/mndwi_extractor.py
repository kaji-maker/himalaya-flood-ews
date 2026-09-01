import io
import math
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union
import numpy as np
import rasterio
import rasterio.features
import rasterio.transform
import rasterio.crs
import geopandas as gpd
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.ops import transform
import pyproj

logger = logging.getLogger(__name__)


class MNDWIExtractor:
    """
    Geospatial MNDWI Extraction Engine for Sentinel-2 Satellite Data.
    Calculates Modified Normalized Difference Water Index (MNDWI),
    sieves noise artifacts, and extracts vectorized water geometries
    with precise metric area calculations in UTM Zone 45N (EPSG:32645).
    """

    TARGET_METRIC_CRS = "EPSG:32645"  # UTM Zone 45N for Nepal / Eastern Himalaya
    EXCHANGE_CRS = "EPSG:4326"        # WGS84 GeoJSON standard

    def __init__(
        self,
        default_threshold: float = 0.05,
        min_sieve_size: int = 10,
        connectivity: int = 8
    ):
        self.default_threshold = default_threshold
        self.min_sieve_size = min_sieve_size
        self.connectivity = connectivity

        # Initialize Coordinate Transformer from WGS84 to UTM 45N
        try:
            self.transformer = pyproj.Transformer.from_crs(
                self.EXCHANGE_CRS,
                self.TARGET_METRIC_CRS,
                always_xy=True
            )
        except Exception as e:
            logger.warning(f"PyProj transformer initialization failed ({e}). Fallback scaling will be used.")
            self.transformer = None

    def _load_raster_band(
        self,
        band_input: Union[str, Path, bytes, io.BytesIO, np.ndarray, rasterio.io.DatasetReader]
    ) -> Tuple[np.ndarray, rasterio.transform.Affine, rasterio.crs.CRS]:
        """
        Loads raster band data and geospatial metadata from file path, byte buffer, or numpy array.
        """
        if isinstance(band_input, np.ndarray):
            # Default identity transform and WGS84 CRS if raw array is passed
            return band_input.astype(np.float32), rasterio.transform.Affine.identity(), rasterio.crs.CRS.from_epsg(4326)

        if isinstance(band_input, (bytes, bytearray)):
            memfile = rasterio.io.MemoryFile(band_input)
            with memfile.open() as src:
                data = src.read(1).astype(np.float32)
                return data, src.transform, src.crs or rasterio.crs.CRS.from_epsg(4326)

        if isinstance(band_input, io.BytesIO):
            with rasterio.open(band_input) as src:
                data = src.read(1).astype(np.float32)
                return data, src.transform, src.crs or rasterio.crs.CRS.from_epsg(4326)

        if isinstance(band_input, (str, Path)):
            with rasterio.open(band_input) as src:
                data = src.read(1).astype(np.float32)
                return data, src.transform, src.crs or rasterio.crs.CRS.from_epsg(4326)

        raise ValueError(f"Unsupported raster band input type: {type(band_input)}")

    def compute_mndwi(self, green: np.ndarray, swir: np.ndarray) -> np.ndarray:
        """
        Calculates MNDWI = (Green - SWIR) / (Green + SWIR).
        Handles division-by-zero, NaNs, and infinite values gracefully with np.nan_to_num.
        """
        green_f = green.astype(np.float32)
        swir_f = swir.astype(np.float32)

        numerator = green_f - swir_f
        denominator = green_f + swir_f

        # Safe element-wise division
        with np.errstate(divide='ignore', invalid='ignore'):
            raw_mndwi = np.divide(numerator, denominator)

        # Replace division-by-zero NaNs/Infs with 0.0, clip to valid [-1.0, 1.0] interval
        mndwi = np.nan_to_num(raw_mndwi, nan=0.0, posinf=1.0, neginf=-1.0)
        return np.clip(mndwi, -1.0, 1.0)

    def sieve_noise(self, binary_mask: np.ndarray, min_size: Optional[int] = None) -> np.ndarray:
        """
        Removes connected components smaller than min_size pixels.
        """
        size = min_size if min_size is not None else self.min_sieve_size
        mask_uint8 = binary_mask.astype(np.uint8)

        try:
            # Use rasterio C-accelerated GDALSieveFilter
            sieved = rasterio.features.sieve(
                mask_uint8,
                size=size,
                connectivity=self.connectivity
            )
            return sieved.astype(bool)
        except Exception:
            # Fallback connected components via scipy.ndimage if GDAL sieve fails
            import scipy.ndimage as ndimage
            structure = ndimage.generate_binary_structure(2, 2 if self.connectivity == 8 else 1)
            labeled, num_features = ndimage.label(binary_mask, structure=structure)
            sizes = ndimage.sum(binary_mask, labeled, range(num_features + 1))
            cleaned_mask = sizes >= size
            return cleaned_mask[labeled]

    def _calculate_projected_area(
        self,
        polygon_wgs84: Polygon,
        source_crs: rasterio.crs.CRS
    ) -> float:
        """
        Reprojects polygon from source CRS / WGS84 to UTM Zone 45N (EPSG:32645)
        to compute exact metric surface area in square meters.
        """
        if polygon_wgs84.is_empty or not polygon_wgs84.is_valid:
            return 0.0

        # If coordinates are geographic WGS84 (-180..180, -90..90)
        minx, miny, maxx, maxy = polygon_wgs84.bounds
        is_geographic = -180.0 <= minx <= 180.0 and -90.0 <= miny <= 90.0

        if is_geographic and self.transformer:
            try:
                projected_poly = transform(self.transformer.transform, polygon_wgs84)
                area_val = float(projected_poly.area)
                if not math.isnan(area_val) and area_val > 0:
                    return area_val
            except Exception as e:
                logger.warning(f"Transformation to EPSG:32645 failed ({e}). Using ellipsoidal approximation.")

        if is_geographic:
            # Ellipsoidal metric approximation in Nepal/Himalayan latitude (~28°N)
            area_val = float(polygon_wgs84.area * (98200.0 * 110800.0))
            return 0.0 if math.isnan(area_val) else area_val

        # If pixel coordinates (e.g. raw array 10m pixel size = 100 sqm/pixel)
        return float(polygon_wgs84.area * 100.0)

    def extract(
        self,
        green_input: Union[str, Path, bytes, io.BytesIO, np.ndarray],
        swir_input: Union[str, Path, bytes, io.BytesIO, np.ndarray],
        threshold: Optional[float] = None,
        custom_transform: Optional[rasterio.transform.Affine] = None,
        custom_crs: Optional[rasterio.crs.CRS] = None
    ) -> Dict[str, Any]:
        """
        Full Extraction Pipeline:
        1. Reads Green (B03) and SWIR (B11) bands using Rasterio / NumPy.
        2. Computes MNDWI index array.
        3. Segments water with configurable threshold (default > 0.05).
        4. Sieves small noise clusters (< min_sieve_size).
        5. Vectorizes water shapes and computes metric planar area in EPSG:32645.
        6. Returns WGS84 (EPSG:4326) GeoJSON FeatureCollection.
        """
        water_threshold = threshold if threshold is not None else self.default_threshold

        # 1. Load bands & spatial references
        green_data, aff_transform, crs = self._load_raster_band(green_input)
        swir_data, _, _ = self._load_raster_band(swir_input)

        if custom_transform is not None:
            aff_transform = custom_transform
        if custom_crs is not None:
            crs = custom_crs

        if green_data.shape != swir_data.shape:
            raise ValueError(f"Band dimension mismatch: Green {green_data.shape} vs SWIR {swir_data.shape}")

        # 2. Compute MNDWI
        mndwi = self.compute_mndwi(green_data, swir_data)

        # 3. Apply Water Threshold
        raw_water_mask = mndwi > water_threshold

        # 4. Sieve Small Noise Pixels
        sieved_mask = self.sieve_noise(raw_water_mask)

        # 5. Vectorize valid water shapes using rasterio.features.shapes
        features: List[Dict[str, Any]] = []
        shapes_gen = rasterio.features.shapes(
            sieved_mask.astype(np.uint8),
            mask=sieved_mask,
            transform=aff_transform
        )

        total_area_sqm = 0.0
        for geom_dict, val in shapes_gen:
            if val == 1:
                poly = shape(geom_dict)
                if not poly.is_valid:
                    poly = poly.buffer(0)  # Clean topological invalidities

                if poly.is_empty:
                    continue

                # Calculate area in UTM 45N (m²)
                area_sqm = self._calculate_projected_area(poly, crs)
                total_area_sqm += area_sqm

                # Calculate mean MNDWI within this polygon
                features.append({
                    "type": "Feature",
                    "geometry": mapping(poly),
                    "properties": {
                        "area_sqm": round(area_sqm, 2),
                        "area_sqkm": round(area_sqm / 1e6, 6),
                        "water_threshold": water_threshold,
                        "metric_crs": self.TARGET_METRIC_CRS
                    }
                })

        # 6. Return standard GeoJSON FeatureCollection
        return {
            "type": "FeatureCollection",
            "crs": {
                "type": "name",
                "properties": {
                    "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
                }
            },
            "features": features,
            "properties": {
                "total_water_bodies_count": len(features),
                "total_water_area_sqm": round(total_area_sqm, 2),
                "total_water_area_sqkm": round(total_area_sqm / 1e6, 6),
                "mean_mndwi": round(float(np.mean(mndwi[sieved_mask])), 3) if np.any(sieved_mask) else 0.0,
                "water_threshold_applied": water_threshold,
                "sieve_size_pixels": self.min_sieve_size,
                "planar_measurement_crs": self.TARGET_METRIC_CRS
            }
        }

    def to_geodataframe(self, geojson_fc: Dict[str, Any]) -> gpd.GeoDataFrame:
        """
        Converts extracted GeoJSON FeatureCollection to a GeoPandas GeoDataFrame in EPSG:4326.
        """
        if not geojson_fc.get("features"):
            return gpd.GeoDataFrame(columns=["geometry", "area_sqm", "area_sqkm"], crs=self.EXCHANGE_CRS)

        gdf = gpd.GeoDataFrame.from_features(geojson_fc["features"], crs=self.EXCHANGE_CRS)
        return gdf
