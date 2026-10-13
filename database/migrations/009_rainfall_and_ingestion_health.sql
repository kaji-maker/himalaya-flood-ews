-- Rainfall station codes are strings: leading zeroes and portal IDs have distinct meanings.
CREATE TABLE IF NOT EXISTS rainfall_stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dhm_station_id INTEGER UNIQUE NOT NULL CHECK (dhm_station_id > 0),
    station_number VARCHAR(64),
    name VARCHAR(160) NOT NULL,
    basin VARCHAR(96),
    district VARCHAR(96),
    location GEOMETRY(Point, 4326),
    source_key VARCHAR(96) NOT NULL REFERENCES data_sources(source_key),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rainfall_stations_location ON rainfall_stations USING GIST(location);

CREATE TABLE IF NOT EXISTS rainfall_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES rainfall_stations(id) ON DELETE CASCADE,
    observed_at TIMESTAMPTZ NOT NULL,
    duration_hours SMALLINT NOT NULL CHECK (duration_hours IN (1, 3, 6, 12, 24)),
    rainfall_mm NUMERIC(10,3) CHECK (rainfall_mm IS NULL OR rainfall_mm >= 0),
    unit VARCHAR(8) NOT NULL DEFAULT 'mm' CHECK (unit = 'mm'),
    timestamp_basis VARCHAR(40) NOT NULL DEFAULT 'LATEST_STATION_OBSERVATION'
        CHECK (timestamp_basis = 'LATEST_STATION_OBSERVATION'),
    source_key VARCHAR(96) NOT NULL REFERENCES data_sources(source_key),
    source_url TEXT NOT NULL,
    observation_state data_observation_state NOT NULL,
    quality_status data_quality_status NOT NULL,
    quality_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (station_id, observed_at, duration_hours, source_key)
);
CREATE INDEX IF NOT EXISTS idx_rainfall_observations_latest
    ON rainfall_observations(station_id, duration_hours, observed_at DESC);

CREATE TABLE IF NOT EXISTS ingestion_feed_state (
    feed_key VARCHAR(64) PRIMARY KEY,
    source_key VARCHAR(96) NOT NULL REFERENCES data_sources(source_key),
    last_attempt_at TIMESTAMPTZ NOT NULL,
    last_success_at TIMESTAMPTZ,
    last_data_at TIMESTAMPTZ,
    status VARCHAR(16) NOT NULL CHECK (status IN ('SUCCESS', 'PARTIAL', 'FAILED')),
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    last_error_code VARCHAR(64),
    latency_ms INTEGER NOT NULL DEFAULT 0,
    counts JSONB NOT NULL DEFAULT '{}'::jsonb
);
