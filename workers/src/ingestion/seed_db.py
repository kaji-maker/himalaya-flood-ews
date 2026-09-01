import json
import logging
import os
import psycopg2
from psycopg2.extras import execute_values
from ..config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_db")

BASINS_DATA = [
    {
        "code": "KOSHI",
        "name": "Koshi River Basin",
        "country": "Nepal / China / India",
        "area_sqkm": 74500.0,
        "upstream_glaciers": 2168,
        "geojson_geom": {
            "type": "MultiPolygon",
            "coordinates": [[
                [[85.3, 26.8], [88.2, 26.8], [88.3, 28.5], [85.5, 28.5], [85.3, 26.8]]
            ]]
        }
    },
    {
        "code": "GANDAKI",
        "name": "Gandaki (Narayani) Basin",
        "country": "Nepal / China / India",
        "area_sqkm": 46300.0,
        "upstream_glaciers": 1719,
        "geojson_geom": {
            "type": "MultiPolygon",
            "coordinates": [[
                [[83.0, 27.4], [85.5, 27.4], [85.5, 29.3], [83.0, 29.3], [83.0, 27.4]]
            ]]
        }
    },
    {
        "code": "KARNALI",
        "name": "Karnali River Basin",
        "country": "Nepal / China / India",
        "area_sqkm": 44000.0,
        "upstream_glaciers": 1361,
        "geojson_geom": {
            "type": "MultiPolygon",
            "coordinates": [[
                [[80.5, 28.2], [83.4, 28.2], [83.4, 30.5], [80.5, 30.5], [80.5, 28.2]]
            ]]
        }
    }
]


def seed_database():
    logger.info(f"Connecting to PostGIS database: {settings.DATABASE_URL}")
    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()

    try:
        # 1. Insert Basins
        logger.info("Seeding major Himalayan river basins...")
        basin_id_map = {}
        for b in BASINS_DATA:
            cur.execute(
                """
                INSERT INTO basins (code, name, country, area_sqkm, upstream_glaciers_count, geom)
                VALUES (%s, %s, %s, %s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
                ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    area_sqkm = EXCLUDED.area_sqkm,
                    geom = EXCLUDED.geom
                RETURNING id, code;
                """,
                (b["code"], b["name"], b["country"], b["area_sqkm"], b["upstream_glaciers"], json.dumps(b["geojson_geom"]))
            )
            basin_id, code = cur.fetchone()
            basin_id_map[code] = basin_id
        
        conn.commit()
        logger.info(f"Seeded {len(basin_id_map)} basins: {list(basin_id_map.keys())}")

        # 2. Seed ICIMOD PDGL Sample GeoJSON
        seed_path = os.path.join(os.path.dirname(__file__), "../../../database/seeds/icimod_pdgl_sample.geojson")
        with open(seed_path, "r") as f:
            geojson_data = json.load(f)

        logger.info(f"Seeding {len(geojson_data['features'])} glacial lakes from {seed_path}...")
        for feat in geojson_data["features"]:
            props = feat["properties"]
            geom = feat["geometry"]
            basin_id = basin_id_map.get(props.get("basin_code", "KOSHI"))

            cur.execute(
                """
                INSERT INTO lakes (
                    glims_id, name, basin_id, sub_basin, elevation_m,
                    dam_type, pdgl_status, baseline_area_sqkm, baseline_volume_mcm,
                    freeboard_m, moraine_slope_deg, downstream_settlements_count,
                    current_risk_score, geom
                )
                VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
                )
                ON CONFLICT (glims_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    elevation_m = EXCLUDED.elevation_m,
                    pdgl_status = EXCLUDED.pdgl_status,
                    baseline_area_sqkm = EXCLUDED.baseline_area_sqkm,
                    current_risk_score = EXCLUDED.current_risk_score,
                    geom = EXCLUDED.geom
                RETURNING id, name;
                """,
                (
                    props["glims_id"],
                    props["name"],
                    basin_id,
                    props.get("sub_basin", "Unknown"),
                    props["elevation_m"],
                    props.get("dam_type", "MORAINE_DAMMED"),
                    props.get("pdgl_status", "HIGH"),
                    props["baseline_area_sqkm"],
                    props.get("baseline_volume_mcm", 50.0),
                    props.get("freeboard_m", 15.0),
                    props.get("moraine_slope_deg", 25.0),
                    props.get("downstream_settlements_count", 5),
                    props.get("current_risk_score", 0.5),
                    json.dumps(geom)
                )
            )
            lake_id, lake_name = cur.fetchone()
            logger.info(f"  -> Inserted/Updated Lake: {lake_name} ({lake_id})")

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
