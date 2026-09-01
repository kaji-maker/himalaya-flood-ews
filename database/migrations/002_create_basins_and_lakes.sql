-- 002_create_basins_and_lakes.sql
-- Create river basin and glacial lake entities with spatial geometry support

-- Enum types for hazard classifications
DO $$ BEGIN
    CREATE TYPE pdgl_hazard_level AS ENUM ('VERY_HIGH', 'HIGH', 'MEDIUM', 'POTENTIAL', 'LOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE dam_type_enum AS ENUM ('MORAINE_DAMMED', 'ICE_DAMMED', 'BEDROCK_DAMMED', 'COMPLEX');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Major River Basins (Koshi, Gandaki, Karnali, Mahakali)
CREATE TABLE IF NOT EXISTS basins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(32) UNIQUE NOT NULL, -- e.g. 'KOSHI', 'GANDAKI', 'KARNALI'
    name VARCHAR(128) NOT NULL,
    country VARCHAR(64) DEFAULT 'Nepal',
    area_sqkm NUMERIC(10, 2),
    upstream_glaciers_count INT DEFAULT 0,
    geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_basins_geom ON basins USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_basins_code ON basins (code);

-- 2. Glacial Lakes Inventory (based on ICIMOD / GLIMS inventory)
CREATE TABLE IF NOT EXISTS lakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    glims_id VARCHAR(64) UNIQUE NOT NULL, -- e.g. 'G086554E27885N'
    name VARCHAR(128) NOT NULL,
    basin_id UUID REFERENCES basins(id) ON DELETE SET NULL,
    sub_basin VARCHAR(64), -- e.g. 'Tama Koshi', 'Dudh Koshi', 'Marsyangdi'
    elevation_m NUMERIC(7, 2) NOT NULL,
    dam_type dam_type_enum DEFAULT 'MORAINE_DAMMED',
    pdgl_status pdgl_hazard_level DEFAULT 'MEDIUM',
    baseline_area_sqkm NUMERIC(8, 4) NOT NULL,
    baseline_volume_mcm NUMERIC(10, 4), -- Million Cubic Meters
    freeboard_m NUMERIC(6, 2), -- Distance between lake surface and lowest dam crest point
    moraine_slope_deg NUMERIC(5, 2),
    downstream_settlements_count INT DEFAULT 0,
    current_risk_score NUMERIC(4, 3) DEFAULT 0.000, -- Composite score 0.0 to 1.0
    geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
    centroid GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_Centroid(geom)) STORED,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lakes_geom ON lakes USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_lakes_centroid ON lakes USING GIST (centroid);
CREATE INDEX IF NOT EXISTS idx_lakes_basin_id ON lakes (basin_id);
CREATE INDEX IF NOT EXISTS idx_lakes_pdgl_status ON lakes (pdgl_status);
CREATE INDEX IF NOT EXISTS idx_lakes_risk_score ON lakes (current_risk_score DESC);
