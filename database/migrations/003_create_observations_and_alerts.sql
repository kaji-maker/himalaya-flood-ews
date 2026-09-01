-- 003_create_observations_and_alerts.sql
-- Creates lake_observations and flood_alerts tables with temporal tracking and spatial indexing

-- 1. Severity level enum for flood early warnings
DO $$ BEGIN
    CREATE TYPE alert_severity_level AS ENUM ('ADVISORY', 'WARNING', 'EMERGENCY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Multi-temporal Satellite Observations (Sentinel-2, Landsat, PlanetScope)
CREATE TABLE IF NOT EXISTS lake_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lake_id UUID NOT NULL REFERENCES glacial_lakes(id) ON DELETE CASCADE,
    observation_date TIMESTAMPTZ NOT NULL,
    sensor_name VARCHAR(64) NOT NULL, -- e.g. 'Sentinel-2A MSI L2A', 'Landsat-9 OLI-2'
    geom GEOMETRY(Polygon, 4326) NOT NULL, -- Extracted lake water polygon (WGS84)
    area_sqm NUMERIC(14, 2) NOT NULL, -- Planar area in m² (derived via UTM 45N EPSG:32645)
    mean_mndwi NUMERIC(5, 3), -- Average Modified Normalized Difference Water Index [-1.0, 1.0]
    cloud_cover_pct NUMERIC(5, 2) DEFAULT 0.00, -- Scene / chip cloud contamination percentage
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Spatial GIST index on lake_observations geometry
CREATE INDEX IF NOT EXISTS idx_lake_observations_geom ON lake_observations USING GIST (geom);
-- Temporal & FK composite index for fast time-series retrieval
CREATE INDEX IF NOT EXISTS idx_lake_observations_lake_date ON lake_observations (lake_id, observation_date DESC);
CREATE INDEX IF NOT EXISTS idx_lake_observations_sensor ON lake_observations (sensor_name);

-- 3. Triggered GLOF & Flash Flood Early Warning Alerts
CREATE TABLE IF NOT EXISTS flood_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lake_id UUID NOT NULL REFERENCES glacial_lakes(id) ON DELETE CASCADE,
    severity alert_severity_level NOT NULL,
    trigger_reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ
);

-- Indexes for alert query filtering and active dispatch lookups
CREATE INDEX IF NOT EXISTS idx_flood_alerts_lake_id ON flood_alerts (lake_id);
CREATE INDEX IF NOT EXISTS idx_flood_alerts_severity ON flood_alerts (severity);
CREATE INDEX IF NOT EXISTS idx_flood_alerts_created_at ON flood_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flood_alerts_active ON flood_alerts (resolved_at) WHERE resolved_at IS NULL;
