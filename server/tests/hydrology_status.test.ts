import { assessHydrometricStatus, queryHydrometricStations, HydrometricObservationSchema } from '../src/services/hydrology.service';

const now = new Date('2026-10-12T05:00:00Z');
const station = { active_warning_stage_m: '5.50', active_danger_stage_m: '6.80', threshold_retrieved_at: now };
const observation = {
  stage_m: 5, observed_at: now, source_key: 'dhm-hydrology', observation_state: 'OBSERVED', quality_status: 'GOOD',
};

it.each([[5, 'NORMAL'], [5.5, 'WATCH'], [6.8, 'CRITICAL_SURGE']])('classifies stage %s at inclusive thresholds', (stage_m, status) => {
  expect(assessHydrometricStatus(station, { ...observation, stage_m }, now).status).toBe(status);
});

it('binds the VERIFIED threshold status as a value', () => {
  const query = queryHydrometricStations().toSQL();
  expect(query.bindings).toContain('VERIFIED');
  expect(query.sql).not.toContain('"RETIRED"');
});

it('keeps absent readings and absent thresholds UNKNOWN', () => {
  expect(assessHydrometricStatus(station, null, now).status).toBe('UNKNOWN');
  expect(assessHydrometricStatus({}, observation, now)).toMatchObject({ status: 'UNKNOWN', threshold_status: 'MISSING' });
});

it('reevaluates stale observations at read time', () => {
  const stale = { ...observation, observed_at: new Date(now.getTime() - 7 * 3600_000) };
  expect(assessHydrometricStatus(station, stale, now)).toMatchObject({ status: 'UNKNOWN', observation_state: 'STALE' });
});

it('marks thresholds older than 30 days stale', () => {
  const stale = { ...station, threshold_retrieved_at: new Date(now.getTime() - 31 * 86400_000) };
  expect(assessHydrometricStatus(stale, observation, now)).toMatchObject({ status: 'UNKNOWN', threshold_status: 'STALE' });
});

it.each(['SIMULATED', 'MODELLED', 'FORECAST'])('never assigns observed-stage status to %s data', observation_state => {
  expect(assessHydrometricStatus(station, { ...observation, observation_state, stage_m: 9 }, now).status).toBe('UNKNOWN');
});

it('keeps rejected data UNKNOWN even when its stored stage exceeds danger', () => {
  expect(assessHydrometricStatus(station, { ...observation, quality_status: 'REJECTED', stage_m: 9 }, now).status).toBe('UNKNOWN');
});

it('handles a published warning-only threshold without inventing danger', () => {
  const partial = { ...station, active_danger_stage_m: null };
  expect(assessHydrometricStatus(partial, { ...observation, stage_m: 8 }, now)).toMatchObject({ status: 'WATCH', threshold_status: 'PARTIAL' });
});

it('does not infer NORMAL below a danger-only threshold', () => {
  expect(assessHydrometricStatus({ ...station, active_warning_stage_m: null }, observation, now).status).toBe('UNKNOWN');
});

it('accepts decimal identifiers but rejects an empty measurement set', () => {
  expect(HydrometricObservationSchema.safeParse({ station_number: 289.95, observed_at: now.toISOString(), stage_m: 2.4 }).success).toBe(true);
  expect(HydrometricObservationSchema.safeParse({ station_number: 289.95, observed_at: now.toISOString() }).success).toBe(false);
});
