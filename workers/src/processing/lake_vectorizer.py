import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.ops import transform
import rasterio.features
import rasterio.transform
import scipy.ndimage as ndimage

logger = logging.getLogger(__name__)


class LakeVectorizer:
    """
    Converts raster water masks into vectorized spatial geometries (GeoJSON / MultiPolygon),
    applies morphological cleanup, and computes projected planar surface areas.
    """

    def __init__(self, min_lake_area_sqm: float = 2500.0):
        self.min_lake_area_sqm = min_lake_area_sqm

    def clean_binary_mask(self, mask: np.ndarray, iterations: int = 1) -> np.ndarray:
        """
        Morphological opening (remove speckle noise) and closing (fill small internal holes).
        """
        struct = ndimage.generate_binary_structure(2, 2)
        # 1. Opening
        opened = ndimage.binary_opening(mask, structure=struct, iterations=iterations)
        # 2. Closing
        closed = ndimage.binary_closing(opened, structure=struct, iterations=iterations)
        return closed

    def vectorize_mask(
        self,
        water_mask: np.ndarray,
        affine_transform: rasterio.transform.Affine,
        crs_epsg: int = 4326,
        pixel_size_m: float = 10.0  # Sentinel-2 B03 10m resolution
    ) -> Dict[str, Any]:
        """
        Vectorizes the 2D boolean mask into GeoJSON MultiPolygon and calculates total area.
        """
        cleaned_mask = self.clean_binary_mask(water_mask)
        mask_uint8 = cleaned_mask.astype(np.uint8)

        polygons: List[Polygon] = []
        shapes_gen = rasterio.features.shapes(
            mask_uint8,
            mask=cleaned_mask,
            transform=affine_transform
        )

        total_pixels = 0
        for geom_dict, val in shapes_gen:
            if val == 1:
                poly = shape(geom_dict)
                if poly.is_valid and not poly.is_empty:
                    polygons.append(poly)

        if not polygons:
            return {
                "geojson": {
                    "type": "MultiPolygon",
                    "coordinates": []
                },
                "area_sqkm": 0.0,
                "area_sqm": 0.0,
                "lake_count": 0
            }

        # Calculate area: (number of water pixels * pixel_size_m^2)
        water_pixel_count = int(np.sum(cleaned_mask))
        area_sqm = float(water_pixel_count * (pixel_size_m ** 2))
        area_sqkm = float(area_sqm / 1e6)

        multi_poly = MultiPolygon(polygons)

        return {
            "geojson": mapping(multi_poly),
            "area_sqkm": round(area_sqkm, 4),
            "area_sqm": round(area_sqm, 2),
            "lake_count": len(polygons)
        }
