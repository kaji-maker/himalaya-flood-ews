-- Migration 005: Add UTM Zone 45N (EPSG:32645) Metric Area & PostGIS Vector Tile MVT Functions

-- 1. Add precise metric area column to lake_observations calculated in UTM Zone 45N
ALTER TABLE lake_observations 
ADD COLUMN IF NOT EXISTS area_sqm_utm numeric(14,2);

-- Function to automatically calculate UTM 45N area on insert/update
CREATE OR REPLACE FUNCTION calculate_lake_utm_area()
RETURNS TRIGGER AS $$
BEGIN
    NEW.area_sqm_utm := ROUND(ST_Area(ST_Transform(NEW.geom, 32645))::numeric, 2);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_lake_utm_area ON lake_observations;
CREATE TRIGGER trg_calculate_lake_utm_area
BEFORE INSERT OR UPDATE OF geom ON lake_observations
FOR EACH ROW
EXECUTE FUNCTION calculate_lake_utm_area();

-- Update existing observation rows
UPDATE lake_observations 
SET area_sqm_utm = ROUND(ST_Area(ST_Transform(geom, 32645))::numeric, 2)
WHERE area_sqm_utm IS NULL;

-- 2. PostGIS Mapbox Vector Tile (MVT) generator function for high-performance frontend rendering
CREATE OR REPLACE FUNCTION get_glacial_lakes_mvt(z integer, x integer, y integer)
RETURNS bytea AS $$
DECLARE
    bbox geometry;
    mvt bytea;
BEGIN
    bbox := ST_TileEnvelope(z, x, y);
    
    SELECT ST_AsMVT(mvtgeom, 'glacial_lakes', 4096, 'geom')
    INTO mvt
    FROM (
        SELECT 
            id,
            icimod_code,
            name,
            initial_area_sqm,
            danger_level,
            ST_AsMVTGeom(ST_Transform(centroid, 3857), bbox, 4096, 64, true) AS geom
        FROM glacial_lakes
        WHERE ST_Transform(centroid, 3857) && bbox
    ) mvtgeom;
    
    RETURN mvt;
END;
$$ LANGUAGE plpgsql STABLE PARALLEL SAFE;
