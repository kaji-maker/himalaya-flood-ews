-- Phase 1: canonical source provenance, quality state, and DHM hydrometric data.
-- This migration deliberately separates observed, modelled, stale, unavailable,
-- and simulated values so demo data cannot masquerade as operational data.

CREATE TABLE IF NOT EXISTS data_sources (
    source_key VARCHAR(96) PRIMARY KEY,
    provider VARCHAR(128) NOT NULL,
    product VARCHAR(160) NOT NULL,
    authority VARCHAR(160),
    base_url TEXT,
    is_authoritative BOOLEAN NOT NULL DEFAULT FALSE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO data_sources (source_key, provider, product, authority, base_url, is_authoritative)
VALUES
    ('legacy-demo', 'Himalaya EWS', 'Legacy/demo fixture', NULL, NULL, FALSE),
    ('dhm-hydrology', 'Department of Hydrology and Meteorology, Nepal', 'Hydrometric observations and River Watch', 'Government of Nepal', 'https://dhm.gov.np/hydrology/river-watch', TRUE),
    ('dhm-rainfall', 'Department of Hydrology and Meteorology, Nepal', 'Rainfall Watch', 'Government of Nepal', 'https://dhm.gov.np', TRUE),
    ('nasa-imerg-early', 'NASA GPM', 'IMERG Early Run precipitation', 'NASA', 'https://gpm.nasa.gov/data/imerg', FALSE),
    ('copernicus-sentinel-2', 'Copernicus', 'Sentinel-2 L2A optical imagery', 'European Union / Copernicus', 'https://dataspace.copernicus.eu', FALSE),
    ('copernicus-sentinel-1', 'Copernicus', 'Sentinel-1 SAR imagery', 'European Union / Copernicus', 'https://dataspace.copernicus.eu', FALSE)
ON CONFLICT (source_key) DO NOTHING;

DO $$ BEGIN
    CREATE TYPE data_observation_state AS ENUM ('OBSERVED', 'FORECAST', 'MODELLED', 'SIMULATED', 'STALE', 'UNAVAILABLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE data_quality_status AS ENUM ('GOOD', 'SUSPECT', 'REJECTED', 'MISSING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS hydrometric_stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_number NUMERIC(8, 2) UNIQUE NOT NULL,
    name VARCHAR(160) NOT NULL,
    river VARCHAR(160),
    basin VARCHAR(64) NOT NULL,
    district VARCHAR(96),
    elevation_m NUMERIC(8, 2),
    location GEOMETRY(Point, 4326) NOT NULL,
    warning_stage_m NUMERIC(8, 3),
    danger_stage_m NUMERIC(8, 3),
    source_key VARCHAR(96) NOT NULL REFERENCES data_sources(source_key),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT hydrometric_stage_order CHECK (
        warning_stage_m IS NULL OR danger_stage_m IS NULL OR warning_stage_m <= danger_stage_m
    )
);

-- Preserve decimal DHM identifiers when rerunning after an early INTEGER draft.
ALTER TABLE hydrometric_stations
    ALTER COLUMN station_number TYPE NUMERIC(8, 2)
    USING station_number::NUMERIC;

CREATE INDEX IF NOT EXISTS idx_hydrometric_stations_location
    ON hydrometric_stations USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_hydrometric_stations_basin
    ON hydrometric_stations (basin);

CREATE TABLE IF NOT EXISTS hydrometric_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES hydrometric_stations(id) ON DELETE CASCADE,
    observed_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    stage_m NUMERIC(8, 3),
    discharge_cms NUMERIC(12, 3),
    rainfall_mm NUMERIC(10, 3),
    trend VARCHAR(16),
    observation_state data_observation_state NOT NULL DEFAULT 'OBSERVED',
    quality_status data_quality_status NOT NULL DEFAULT 'GOOD',
    quality_score NUMERIC(5, 4),
    quality_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_key VARCHAR(96) NOT NULL REFERENCES data_sources(source_key),
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT hydrometric_measurement_present CHECK (stage_m IS NOT NULL OR discharge_cms IS NOT NULL OR rainfall_mm IS NOT NULL),
    CONSTRAINT hydrometric_non_negative CHECK (
        (stage_m IS NULL OR stage_m >= 0) AND
        (discharge_cms IS NULL OR discharge_cms >= 0) AND
        (rainfall_mm IS NULL OR rainfall_mm >= 0)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hydrometric_station_observed_at
    ON hydrometric_observations (station_id, observed_at, source_key);
CREATE INDEX IF NOT EXISTS idx_hydrometric_observations_latest
    ON hydrometric_observations (station_id, observed_at DESC);

ALTER TABLE lake_observations
    ADD COLUMN IF NOT EXISTS source_key VARCHAR(96),
    ADD COLUMN IF NOT EXISTS observation_state data_observation_state NOT NULL DEFAULT 'SIMULATED',
    ADD COLUMN IF NOT EXISTS observed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS quality_status data_quality_status NOT NULL DEFAULT 'SUSPECT',
    ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5, 4),
    ADD COLUMN IF NOT EXISTS quality_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS provenance JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE lake_observations
SET source_key = 'legacy-demo', observed_at = COALESCE(observed_at, observation_date)
WHERE source_key IS NULL;

ALTER TABLE lake_observations
    ALTER COLUMN source_key SET DEFAULT 'legacy-demo',
    ALTER COLUMN source_key SET NOT NULL;

DO $$ BEGIN
    ALTER TABLE lake_observations
        ADD CONSTRAINT lake_observations_source_fk
        FOREIGN KEY (source_key) REFERENCES data_sources(source_key);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_lake_observations_state_date
    ON lake_observations (observation_state, observation_date DESC);
CREATE INDEX IF NOT EXISTS idx_lake_observations_source
    ON lake_observations (source_key);
