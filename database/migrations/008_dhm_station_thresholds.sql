-- DHM River Watch warning/danger thresholds with historical provenance.
CREATE TABLE IF NOT EXISTS hydrometric_station_thresholds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES hydrometric_stations(id) ON DELETE CASCADE,
    warning_stage_m NUMERIC(8, 3),
    danger_stage_m NUMERIC(8, 3),
    source_key VARCHAR(96) NOT NULL REFERENCES data_sources(source_key),
    source_url TEXT NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMPTZ,
    status VARCHAR(16) NOT NULL DEFAULT 'VERIFIED',
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT,
    CONSTRAINT hydrometric_threshold_value_present CHECK (
        warning_stage_m IS NOT NULL OR danger_stage_m IS NOT NULL
    ),
    CONSTRAINT hydrometric_threshold_order CHECK (
        warning_stage_m IS NULL OR danger_stage_m IS NULL OR warning_stage_m <= danger_stage_m
    ),
    CONSTRAINT hydrometric_threshold_status CHECK (status IN ('VERIFIED', 'PROVISIONAL', 'RETIRED')),
    CONSTRAINT hydrometric_threshold_period CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hydrometric_station_active_threshold
    ON hydrometric_station_thresholds (station_id)
    WHERE effective_to IS NULL AND status <> 'RETIRED';

CREATE INDEX IF NOT EXISTS idx_hydrometric_thresholds_history
    ON hydrometric_station_thresholds (station_id, effective_from DESC);
