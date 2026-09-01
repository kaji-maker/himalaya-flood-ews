-- 003_create_observations_and_alerts.sql
-- Multi-temporal satellite observations, precipitation telemetry, and GLOF alerts

DO $$ BEGIN
    CREATE TYPE sensor_type_enum AS ENUM ('SENTINEL_2_L2A', 'LANDSAT_9_OLI', 'PLANETSCOPE', 'SENTINEL_1_SAR', 'SYNTHETIC');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_level_enum AS ENUM ('CRITICAL', 'WARNING', 'WATCH', 'ADVISORY', 'NORMAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_status_enum AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Glacial Lake Multi-Temporal Observations
CREATE TABLE IF NOT EXISTS lake_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lake_id UUID NOT NULL REFERENCES lakes(id) ON DELETE CASCADE,
    observed_at TIMESTAMPTZ NOT NULL,
    sensor sensor_type_enum DEFAULT 'SENTINEL_2_L2A',
    raw_scene_id VARCHAR(128),
    area_sqkm NUMERIC(8, 4) NOT NULL,
    area_change_sqkm NUMERIC(8, 4), -- Delta relative to previous observation
    expansion_rate_pct_yr NUMERIC(6, 2), -- Annualized expansion rate
    cloud_cover_pct NUMERIC(5, 2) DEFAULT 0.00,
    mndwi_mean NUMERIC(5, 3),
    freeboard_est_m NUMERIC(6, 2),
    geom GEOMETRY(MultiPolygon, 4326),
    quality_flag VARCHAR(32) DEFAULT 'VALID',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lake_obs_lake_date ON lake_observations (lake_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lake_obs_geom ON lake_observations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_lake_obs_sensor ON lake_observations (sensor);

-- 2. Precipitation Telemetry (NASA GPM IMERG & Ground Stations)
CREATE TABLE IF NOT EXISTS precipitation_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    basin_id UUID REFERENCES basins(id) ON DELETE SET NULL,
    lake_id UUID REFERENCES lakes(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    sensor VARCHAR(64) DEFAULT 'GPM_IMERG_V07',
    precip_rate_mm_hr NUMERIC(6, 2) NOT NULL,
    accumulated_24h_mm NUMERIC(7, 2) NOT NULL,
    accumulated_72h_mm NUMERIC(7, 2) NOT NULL,
    anomaly_pct NUMERIC(6, 2), -- Deviation from seasonal climatology
    location GEOMETRY(Point, 4326),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_precip_lake_time ON precipitation_telemetry (lake_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_precip_basin_time ON precipitation_telemetry (basin_id, recorded_at DESC);

-- 3. GLOF & Flash Flood Early Warning Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_code VARCHAR(32) UNIQUE NOT NULL, -- e.g. 'GLOF-2026-TSHOROLPA-01'
    lake_id UUID NOT NULL REFERENCES lakes(id) ON DELETE CASCADE,
    basin_id UUID REFERENCES basins(id) ON DELETE SET NULL,
    alert_level alert_level_enum NOT NULL,
    risk_score NUMERIC(4, 3) NOT NULL,
    headline VARCHAR(256) NOT NULL,
    description TEXT NOT NULL,
    triggers JSONB NOT NULL, -- { "expansion_surge_pct": 24.5, "rainfall_72h_mm": 138.4, "freeboard_loss_m": 1.2 }
    affected_villages TEXT[] DEFAULT '{}',
    status alert_status_enum DEFAULT 'ACTIVE',
    dispatched_channels TEXT[] DEFAULT '{"WEBHOOK", "SMS"}',
    issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_lake_id ON alerts (lake_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts (status);
CREATE INDEX IF NOT EXISTS idx_alerts_level ON alerts (alert_level);
CREATE INDEX IF NOT EXISTS idx_alerts_issued ON alerts (issued_at DESC);
