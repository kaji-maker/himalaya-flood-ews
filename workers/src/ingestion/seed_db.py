import json
import logging
import os
import psycopg2
from ..config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_db")

BASINS_DATA = [
    {
        "name": "Koshi",
        "boundary_geojson": {
            "type": "MultiPolygon",
            "coordinates": [[
                [[85.3, 26.8], [88.2, 26.8], [88.3, 28.5], [85.5, 28.5], [85.3, 26.8]]
            ]]
        }
    },
    {
        "name": "Gandaki",
        "boundary_geojson": {
            "type": "MultiPolygon",
            "coordinates": [[
                [[83.0, 27.4], [85.5, 27.4], [85.5, 29.3], [83.0, 29.3], [83.0, 27.4]]
            ]]
        }
    },
    {
        "name": "Karnali",
        "boundary_geojson": {
            "type": "MultiPolygon",
            "coordinates": [[
                [[80.5, 28.2], [83.4, 28.2], [83.4, 30.5], [80.5, 30.5], [80.5, 28.2]]
            ]]
        }
    },
    {
        "name": "Mahakali",
        "boundary_geojson": {
            "type": "MultiPolygon",
            "coordinates": [[
                [[79.8, 28.7], [80.6, 28.7], [80.6, 30.2], [79.8, 30.2], [79.8, 28.7]]
            ]]
        }
    }
]

SAMPLE_LAKES_DATA = [
    {
        "icimod_code": "PDGL_NEP_KOSHI_001",
        "name": "Tsho Rolpa",
        "basin_name": "Koshi",
        "lon": 86.475,
        "lat": 27.868,
        "initial_area_sqm": 1540000.0,
        "danger_level": "CRITICAL"
    },
    {
        "icimod_code": "PDGL_NEP_KOSHI_002",
        "name": "Imja Tsho",
        "basin_name": "Koshi",
        "lon": 86.924,
        "lat": 27.910,
        "initial_area_sqm": 1280000.0,
        "danger_level": "HIGH"
    },
    {
        "icimod_code": "PDGL_NEP_KOSHI_003",
        "name": "Lower Barun Lake",
        "basin_name": "Koshi",
        "lon": 87.102,
        "lat": 27.808,
        "initial_area_sqm": 1720000.0,
        "danger_level": "HIGH"
    },
    {
        "icimod_code": "PDGL_NEP_KOSHI_004",
        "name": "Lumding Tsho",
        "basin_name": "Koshi",
        "lon": 86.612,
        "lat": 27.765,
        "initial_area_sqm": 1050000.0,
        "danger_level": "HIGH"
    },
    {
        "icimod_code": "PDGL_NEP_KOSHI_005",
        "name": "Chamlang Tsho (Hongu-2)",
        "basin_name": "Koshi",
        "lon": 86.974,
        "lat": 27.782,
        "initial_area_sqm": 910000.0,
        "danger_level": "HIGH"
    },
    {
        "icimod_code": "PDGL_NEP_KOSHI_006",
        "name": "Dig Tsho (1985 Breach)",
        "basin_name": "Koshi",
        "lon": 86.584,
        "lat": 27.876,
        "initial_area_sqm": 680000.0,
        "danger_level": "MEDIUM"
    },
    {
        "icimod_code": "PDGL_NEP_KOSHI_007",
        "name": "Galong Co / Cirenmaco (Poiqu Transboundary)",
        "basin_name": "Koshi",
        "lon": 85.996,
        "lat": 28.084,
        "initial_area_sqm": 1580000.0,
        "danger_level": "CRITICAL"
    },
    {
        "icimod_code": "PDGL_NEP_GANDAKI_001",
        "name": "Thulagi Lake",
        "basin_name": "Gandaki",
        "lon": 84.532,
        "lat": 28.517,
        "initial_area_sqm": 940000.0,
        "danger_level": "HIGH"
    },
    {
        "icimod_code": "PDGL_NEP_GANDAKI_002",
        "name": "Birendra Lake (Manaslu)",
        "basin_name": "Gandaki",
        "lon": 84.638,
        "lat": 28.563,
        "initial_area_sqm": 350000.0,
        "danger_level": "CRITICAL"
    },
    {
        "icimod_code": "PDGL_NEP_GANDAKI_003",
        "name": "Kaldang Lake (Langtang)",
        "basin_name": "Gandaki",
        "lon": 85.485,
        "lat": 28.215,
        "initial_area_sqm": 590000.0,
        "danger_level": "MEDIUM"
    },
    {
        "icimod_code": "PDGL_NEP_KARNALI_001",
        "name": "Karnali High-Alpine Glacial Lake",
        "basin_name": "Karnali",
        "lon": 82.342,
        "lat": 29.893,
        "initial_area_sqm": 680000.0,
        "danger_level": "LOW"
    },
    {
        "icimod_code": "PDGL_NEP_KARNALI_002",
        "name": "Rara Headwater Glacial Lake",
        "basin_name": "Karnali",
        "lon": 82.115,
        "lat": 29.542,
        "initial_area_sqm": 510000.0,
        "danger_level": "LOW"
    },
    {
        "icimod_code": "PDGL_NEP_MAHAKALI_001",
        "name": "Api Nampa Glacial Lake",
        "basin_name": "Mahakali",
        "lon": 80.950,
        "lat": 29.980,
        "initial_area_sqm": 420000.0,
        "danger_level": "LOW"
    },
    {
        "icimod_code": "PDGL_IND_SIKKIM_001",
        "name": "South Lhonak Lake (2023 Benchmark)",
        "basin_name": "Koshi",
        "lon": 88.196,
        "lat": 27.912,
        "initial_area_sqm": 810000.0,
        "danger_level": "CRITICAL"
    }
]



def seed_database():
    logger.info(f"Connecting to PostGIS database: {settings.DATABASE_URL}")
    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()

    try:
        # 1. Insert Basins
        logger.info("Seeding basins (Koshi, Gandaki, Karnali, Mahakali)...")
        basin_id_map = {}
        for b in BASINS_DATA:
            cur.execute(
                """
                INSERT INTO basins (name, boundary)
                VALUES (%s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
                ON CONFLICT (name) DO UPDATE SET
                    boundary = EXCLUDED.boundary,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id, name;
                """,
                (b["name"], json.dumps(b["boundary_geojson"]))
            )
            basin_id, name = cur.fetchone()
            basin_id_map[name] = basin_id

        conn.commit()
        logger.info(f"Seeded {len(basin_id_map)} basins: {list(basin_id_map.keys())}")

        # 2. Insert Glacial Lakes
        logger.info("Seeding glacial lakes inventory...")
        for lake in SAMPLE_LAKES_DATA:
            basin_id = basin_id_map.get(lake["basin_name"])
            cur.execute(
                """
                INSERT INTO glacial_lakes (
                    icimod_code, name, centroid, initial_area_sqm, danger_level, basin_id
                )
                VALUES (
                    %s, %s, ST_SetSRID(ST_Point(%s, %s), 4326), %s, %s, %s
                )
                ON CONFLICT (icimod_code) DO UPDATE SET
                    name = EXCLUDED.name,
                    centroid = EXCLUDED.centroid,
                    initial_area_sqm = EXCLUDED.initial_area_sqm,
                    danger_level = EXCLUDED.danger_level,
                    basin_id = EXCLUDED.basin_id,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id, name;
                """,
                (
                    lake["icimod_code"],
                    lake["name"],
                    lake["lon"],
                    lake["lat"],
                    lake["initial_area_sqm"],
                    lake["danger_level"],
                    basin_id
                )
            )
            lake_id, lake_name = cur.fetchone()
            logger.info(f"  -> Seeded Glacial Lake: {lake_name} ({lake_id})")

        conn.commit()
        logger.info("Database seeding successfully completed.")
    except Exception as e:
        conn.rollback()
        logger.error(f"Error seeding database: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    seed_database()
