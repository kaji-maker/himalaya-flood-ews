-- 004_create_insar_and_edge_sensors.sql
-- Multi-Tiered Cue-and-Slew Tasking & In-Situ Edge Ground Network schema

-- 1. InSAR Moraine Crest Subsidence & Creep Baseline (Sentinel-1 / NISAR SBAS)
CREATE TABLE IF NOT EXISTS insar_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lake_id UUID NOT NULL REFERENCES glacial_lakes(id) ON DELETE CASCADE,
    observation_date TIMESTAMPTZ NOT NULL,
    mean_los_velocity_mm_year NUMERIC(7, 2) NOT NULL,
    max_subsidence_mm_year NUMERIC(7, 2) NOT NULL,
    mean_coherence NUMERIC(4, 3) NOT NULL,
    deformation_rating VARCHAR(32) NOT NULL, -- 'STABLE', 'MODERATE_CREEP', 'CRITICAL_DESTABILIZATION'
    geom GEOMETRY(MultiPoint, 4326),
    points_json JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_insar_observations_lake_date ON insar_observations (lake_id, observation_date DESC);
CREATE INDEX IF NOT EXISTS idx_insar_observations_geom ON insar_observations USING GIST (geom);

-- 2. Orbital "Cue-and-Slew" Sub-Meter Optical Tasking Orders (SkySat / WorldView-3)
CREATE TABLE IF NOT EXISTS cue_slew_tasking_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tasking_id VARCHAR(64) UNIQUE NOT NULL,
    lake_id UUID NOT NULL REFERENCES glacial_lakes(id) ON DELETE CASCADE,
    priority VARCHAR(32) NOT NULL, -- 'STANDARD', 'PRIORITY', 'IMMEDIATE_INTERVENTION'
    target_sensor VARCHAR(64) NOT NULL, -- 'SkySat-Submeter', 'WorldView-3', etc.
    target_gsd_meters NUMERIC(4, 2) NOT NULL,
    bbox_geom GEOMETRY(Polygon, 4326) NOT NULL,
    trigger_reasons JSONB NOT NULL,
    required_cv_analyses JSONB NOT NULL,
    status VARCHAR(32) DEFAULT 'TASKED', -- 'TASKED', 'ACQUIRED', 'PROCESSED', 'FAILED'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cue_slew_tasking_lake ON cue_slew_tasking_orders (lake_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cue_slew_tasking_bbox ON cue_slew_tasking_orders USING GIST (bbox_geom);

-- 3. In-Situ Gorge Edge Sensor Stations (Gorge Constrictions & Hydropower Inlets)
CREATE TABLE IF NOT EXISTS edge_sensor_stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_code VARCHAR(64) UNIQUE NOT NULL,
    lake_id UUID NOT NULL REFERENCES glacial_lakes(id) ON DELETE CASCADE,
    gorge_name VARCHAR(128) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    elevation_m NUMERIC(7, 2),
    coupled_scada_facility VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_edge_sensor_stations_location ON edge_sensor_stations USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_edge_sensor_stations_lake ON edge_sensor_stations (lake_id);

-- 4. In-Situ High-Rate Telemetry (Riverbed Geophones, Ultrasonic Stage Gauges, Tripwires)
CREATE TABLE IF NOT EXISTS edge_sensor_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES edge_sensor_stations(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL,
    geophone_dominant_freq_hz NUMERIC(6, 2) NOT NULL,
    geophone_acoustic_energy_db NUMERIC(6, 2) NOT NULL,
    water_stage_m NUMERIC(6, 2) NOT NULL,
    water_stage_rate_m_min NUMERIC(6, 2) NOT NULL,
    tripwire_status VARCHAR(16) DEFAULT 'INTACT', -- 'INTACT', 'TRIPPED'
    is_slurry_surge BOOLEAN DEFAULT FALSE,
    scada_dispatched BOOLEAN DEFAULT FALSE,
    scada_command_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_edge_sensor_readings_station_date ON edge_sensor_readings (station_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_sensor_readings_surge ON edge_sensor_readings (is_slurry_surge) WHERE is_slurry_surge = TRUE;
