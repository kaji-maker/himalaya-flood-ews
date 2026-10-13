-- Receipt-time snapshots for research replay. No pre-migration history is invented.
CREATE TABLE IF NOT EXISTS hydrometric_replay_audit (
    sequence BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(16) NOT NULL CHECK (entity_type IN ('OBSERVATION', 'THRESHOLD')),
    entity_id UUID NOT NULL,
    station_id UUID NOT NULL REFERENCES hydrometric_stations(id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    capture_kind VARCHAR(16) NOT NULL CHECK (capture_kind IN ('BASELINE', 'INSERT', 'UPDATE')),
    snapshot JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hydrometric_replay_station_time
    ON hydrometric_replay_audit (station_id, recorded_at, sequence);
CREATE INDEX IF NOT EXISTS idx_hydrometric_replay_entity_time
    ON hydrometric_replay_audit (entity_type, recorded_at, sequence);

CREATE OR REPLACE FUNCTION hydrometric_replay_snapshot(row_value hydrometric_observations)
RETURNS JSONB LANGUAGE SQL IMMUTABLE AS $$
    SELECT (to_jsonb(row_value) - 'raw_payload') || jsonb_build_object('stage_unit', 'm', 'discharge_unit', 'm3/s');
$$;
CREATE OR REPLACE FUNCTION hydrometric_replay_snapshot(row_value hydrometric_station_thresholds)
RETURNS JSONB LANGUAGE SQL IMMUTABLE AS $$
    SELECT (to_jsonb(row_value) - 'raw_payload' - 'notes') || jsonb_build_object('unit', 'm');
$$;

CREATE OR REPLACE FUNCTION capture_hydrometric_replay()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE value JSONB;
BEGIN
    value := hydrometric_replay_snapshot(NEW);
    IF TG_OP = 'UPDATE' AND value = hydrometric_replay_snapshot(OLD) THEN RETURN NEW; END IF;
    INSERT INTO hydrometric_replay_audit (entity_type, entity_id, station_id, capture_kind, snapshot)
    VALUES (CASE WHEN TG_TABLE_NAME = 'hydrometric_observations' THEN 'OBSERVATION' ELSE 'THRESHOLD' END,
        NEW.id, NEW.station_id, TG_OP, value);
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_observation_replay_capture ON hydrometric_observations;
CREATE TRIGGER trg_observation_replay_capture AFTER INSERT OR UPDATE ON hydrometric_observations
    FOR EACH ROW EXECUTE FUNCTION capture_hydrometric_replay();
DROP TRIGGER IF EXISTS trg_threshold_replay_capture ON hydrometric_station_thresholds;
CREATE TRIGGER trg_threshold_replay_capture AFTER INSERT OR UPDATE ON hydrometric_station_thresholds
    FOR EACH ROW EXECUTE FUNCTION capture_hydrometric_replay();

-- Existing values are only known at baseline capture, not at their old receipt times.
INSERT INTO hydrometric_replay_audit (entity_type, entity_id, station_id, capture_kind, snapshot)
SELECT 'THRESHOLD', t.id, t.station_id, 'BASELINE', hydrometric_replay_snapshot(t)
FROM hydrometric_station_thresholds t
WHERE NOT EXISTS (SELECT 1 FROM hydrometric_replay_audit a WHERE a.entity_type = 'THRESHOLD' AND a.entity_id = t.id)
ORDER BY t.station_id, t.effective_from;
INSERT INTO hydrometric_replay_audit (entity_type, entity_id, station_id, capture_kind, snapshot)
SELECT 'OBSERVATION', o.id, o.station_id, 'BASELINE', hydrometric_replay_snapshot(o)
FROM hydrometric_observations o
WHERE NOT EXISTS (SELECT 1 FROM hydrometric_replay_audit a WHERE a.entity_type = 'OBSERVATION' AND a.entity_id = o.id)
ORDER BY o.station_id, o.received_at, o.observed_at;

CREATE OR REPLACE FUNCTION prevent_hydrometric_replay_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Hydrometric replay snapshots are append-only'; END $$;
DROP TRIGGER IF EXISTS trg_replay_no_mutation ON hydrometric_replay_audit;
CREATE TRIGGER trg_replay_no_mutation BEFORE UPDATE OR DELETE ON hydrometric_replay_audit
    FOR EACH ROW EXECUTE FUNCTION prevent_hydrometric_replay_mutation();
DROP TRIGGER IF EXISTS trg_replay_no_truncate ON hydrometric_replay_audit;
CREATE TRIGGER trg_replay_no_truncate BEFORE TRUNCATE ON hydrometric_replay_audit
    FOR EACH STATEMENT EXECUTE FUNCTION prevent_hydrometric_replay_mutation();
