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
    applies morphological cleanup, and computes projected planar surface areas in UTM Zone 45N (EPSG:32645).
    """

    TARGET_UTM_EPSG = 32645  # UTM Zone 45N (Nepal / Eastern Himalaya)

    def __init__(self, min_lake_area_sqm: float = 2500.0):
        self.min_lake_area_sqm = min_lake_area_sqm

    def clean_binary_mask(self, mask: np.ndarray, iterations: int = 1) -> np.ndarray:
        """
        Morphological opening (remove speckle noise) and closing (fill small internal holes).
        """
        struct = ndimage.generate_binary_structure(2, 2)
        opened = ndimage.binary_opening(mask, structure=struct, iterations=iterations)
        closed = ndimage.binary_closing(opened, structure=struct, iterations=iterations)
        return closed

    def compute_projected_area_sqm(self, multi_poly: MultiPolygon, source_epsg: int = 4326) -> float:
        """
        Reprojects Shapely geometry to UTM Zone 45N (EPSG:32645) to compute exact metric area in m².
        """
        if multi_poly.is_empty:
            return 0.0

        if source_epsg == self.TARGET_UTM_EPSG:
            return float(multi_poly.area)

        try:
            import pyproj
            transformer = pyproj.Transformer.from_crs(
                f"EPSG:{source_epsg}",
                f"EPSG:{self.TARGET_UTM_EPSG}",
                always_xy=True
            )
            projected_geom = transform(transformer.transform, multi_poly)
            return float(projected_geom.area)
        except Exception as e:
            logger.warning(f"pyproj reprojection failed ({e}). Approximating area using ellipsoidal metric scale.")
            # At ~28°N latitude in Nepal, 1 deg lon ~ 98.2 km, 1 deg lat ~ 110.8 km
            return float(multi_poly.area * 98200.0 * 110800.0)

    def vectorize_mask(
        self,
        water_mask: np.ndarray,
        affine_transform: rasterio.transform.Affine,
        source_epsg: int = 4326,
        pixel_size_m: float = 10.0  # Sentinel-2 B03 10m resolution
    ) -> Dict[str, Any]:
        """
        Vectorizes 2D boolean water mask into GeoJSON MultiPolygon (EPSG:4326)
        and computes projected planar area in UTM Zone 45N (EPSG:32645).
        """
        cleaned_mask = self.clean_binary_mask(water_mask)
        mask_uint8 = cleaned_mask.astype(np.uint8)

        polygons: List[Polygon] = []
        shapes_gen = rasterio.features.shapes(
            mask_uint8,
            mask=cleaned_mask,
            transform=affine_transform
        )

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
                "lake_count": 0,
                "planar_crs": f"EPSG:{self.TARGET_UTM_EPSG}"
            }

        multi_poly = MultiPolygon(polygons)
        area_sqm = self.compute_projected_area_sqm(multi_poly, source_epsg=source_epsg)
        area_sqkm = area_sqm / 1e6

        return {
            "geojson": mapping(multi_poly),
            "area_sqkm": round(area_sqkm, 4),
            "area_sqm": round(area_sqm, 2),
            "lake_count": len(polygons),
            "planar_crs": f"EPSG:{self.TARGET_UTM_EPSG}"
        }
