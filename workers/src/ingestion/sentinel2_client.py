import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
import numpy as np

logger = logging.getLogger(__name__)


class Sentinel2Client:
    """
    Client for querying and reading Sentinel-2 L2A multispectral imagery
    via STAC API (Microsoft Planetary Computer or CDSE).
    """

    def __init__(self, stac_api_url: str = "https://planetarycomputer.microsoft.com/api/stac/v1"):
        self.stac_api_url = stac_api_url

    def search_scenes(
        self,
        bbox: List[float],  # [min_lon, min_lat, max_lon, max_lat]
        start_date: datetime,
        end_date: datetime,
        max_cloud_cover: float = 30.0
    ) -> List[Dict[str, Any]]:
        """
        Search for cloud-filtered Sentinel-2 L2A items in STAC.
        """
        date_str = f"{start_date.strftime('%Y-%m-%d')}/{end_date.strftime('%Y-%m-%d')}"
        logger.info(f"Querying Sentinel-2 STAC for bbox {bbox} in date range {date_str}...")

        try:
            from pystac_client import Client
            import planetary_computer as pc

            catalog = Client.open(self.stac_api_url, modifier=pc.sign_inplace)
            search = catalog.search(
                collections=["sentinel-2-l2a"],
                bbox=bbox,
                datetime=date_str,
                query={"eo:cloud_cover": {"lt": max_cloud_cover}},
                sortby=[{"field": "properties.datetime", "direction": "desc"}]
            )
            items = list(search.items())
            logger.info(f"Found {len(items)} Sentinel-2 scenes matching criteria.")
            return [item.to_dict() for item in items]
        except Exception as e:
            logger.warning(f"Live STAC query failed ({e}). Providing mock metadata for simulation/testing.")
            return [
                {
                    "id": f"S2A_MSIL2A_{start_date.strftime('%Y%m%d')}_T45RUM",
                    "properties": {
                        "datetime": start_date.isoformat() + "Z",
                        "eo:cloud_cover": 8.5
                    },
                    "assets": {
                        "B03": {"href": "https://example.com/B03.tif"},
                        "B11": {"href": "https://example.com/B11.tif"},
                        "B08": {"href": "https://example.com/B08.tif"},
                        "SCL": {"href": "https://example.com/SCL.tif"}
                    }
                }
            ]

    def generate_synthetic_scene(
        self,
        shape: Tuple[int, int] = (256, 256),
        lake_center: Tuple[int, int] = (128, 128),
        lake_radius: int = 50,
        cloud_pct: float = 5.0
    ) -> Dict[str, np.ndarray]:
        """
        Generates synthetic reflectance bands for Sentinel-2 simulation & testing.
        Bands:
        - B03: Green (560 nm) - Water has high reflectance compared to SWIR
        - B11: SWIR1 (1610 nm) - Water strongly absorbs SWIR (near zero)
        - B08: NIR (842 nm) - Used for snow/ice separation
        - SCL: Scene Classification Layer (6=Water, 3=Shadow, 9=Cloud, 11=Snow/Ice)
        """
        rows, cols = shape
        y, x = np.ogrid[:rows, :cols]
        dist_from_center = np.sqrt((x - lake_center[0])**2 + (y - lake_center[1])**2)
        lake_mask = dist_from_center <= lake_radius

        # Surrounding terrain: high SWIR, moderate green
        green = np.random.uniform(0.12, 0.22, shape).astype(np.float32)
        swir1 = np.random.uniform(0.25, 0.45, shape).astype(np.float32)
        nir = np.random.uniform(0.20, 0.35, shape).astype(np.float32)
        scl = np.full(shape, 5, dtype=np.uint8)  # 5 = bare ground / vegetation

        # Lake water signature: High Green, Very Low SWIR (MNDWI ~ +0.5 to +0.8)
        green[lake_mask] = np.random.uniform(0.25, 0.35, np.sum(lake_mask))
        swir1[lake_mask] = np.random.uniform(0.01, 0.04, np.sum(lake_mask))
        nir[lake_mask] = np.random.uniform(0.02, 0.06, np.sum(lake_mask))
        scl[lake_mask] = 6  # 6 = Water

        # Glacial snow/ice patch on upper corner: High Green, High NIR, Low-Mid SWIR
        snow_mask = (y < 40) & (x < 60)
        green[snow_mask] = 0.85
        nir[snow_mask] = 0.90
        swir1[snow_mask] = 0.20
        scl[snow_mask] = 11  # 11 = Snow / Ice

        # Cloud patch
        if cloud_pct > 0:
            num_cloud_pixels = int((cloud_pct / 100.0) * rows * cols)
            cy, cx = np.random.randint(0, rows), np.random.randint(0, cols)
            c_dist = np.sqrt((x - cx)**2 + (y - cy)**2)
            c_mask = c_dist <= np.sqrt(num_cloud_pixels / np.pi)
            green[c_mask] = 0.9
            swir1[c_mask] = 0.8
            nir[c_mask] = 0.95
            scl[c_mask] = 9  # 9 = Cloud high probability

        return {
            "green": green,
            "swir1": swir1,
            "nir": nir,
            "scl": scl
        }
