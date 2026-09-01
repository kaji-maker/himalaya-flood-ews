-- 002_create_basins_and_lakes.sql
-- Creates basins and glacial_lakes tables with WGS84 (EPSG:4326) geometry and GIST spatial indexes

-- 1. Hazard classification enum for glacial lakes
DO $$ BEGIN
    CREATE TYPE lake_danger_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Major River Basins (Koshi, Gandaki, Karnali, Mahakali)
CREATE TABLE IF NOT EXISTS basins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(64) UNIQUE NOT NULL, -- 'Koshi', 'Gandaki', 'Karnali', 'Mahakali'
    boundary GEOMETRY(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Spatial GIST index on basins boundary
CREATE INDEX IF NOT EXISTS idx_basins_boundary ON basins USING GIST (boundary);

-- 3. Glacial Lakes Inventory (ICIMOD / GLIMS registry)
CREATE TABLE IF NOT EXISTS glacial_lakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    icimod_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. 'PDGL_NEP_KOSHI_001'
    name VARCHAR(128) NOT NULL, -- e.g. 'Tsho Rolpa', 'Imja Tsho', 'Thulagi'
    centroid GEOMETRY(Point, 4326) NOT NULL,
    initial_area_sqm NUMERIC(14, 2) NOT NULL, -- Initial baseline area in square meters
    danger_level lake_danger_level NOT NULL DEFAULT 'LOW',
    basin_id UUID NOT NULL REFERENCES basins(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Spatial GIST index on glacial_lakes centroid
CREATE INDEX IF NOT EXISTS idx_glacial_lakes_centroid ON glacial_lakes USING GIST (centroid);
CREATE INDEX IF NOT EXISTS idx_glacial_lakes_basin_id ON glacial_lakes (basin_id);
CREATE INDEX IF NOT EXISTS idx_glacial_lakes_danger_level ON glacial_lakes (danger_level);
