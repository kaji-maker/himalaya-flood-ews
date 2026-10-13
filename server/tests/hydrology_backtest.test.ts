import express from 'express';
import request from 'supertest';
import fixture from './fixtures/hydrology_replay.synthetic.json';
import { replayHydrology, ReplayQuerySchema } from '../src/services/hydrology_backtest.service';
import researchRouter from '../src/routes/research.routes';
import { db } from '../src/services/db.service';

jest.mock('../src/services/db.service', () => ({ db: Object.assign(jest.fn(), { transaction: jest.fn() }) }));

const input = () => structuredClone(fixture);
const app = express().use(express.json()).use('/api/v1/research', researchRouter);

it('replays inclusive warning/danger boundaries, zero stage, and late observations', () => {
  const report = replayHydrology(input());
  expect(report.timeline.map(row => row.status)).toEqual(['NORMAL', 'WATCH', 'CRITICAL_SURGE', 'NORMAL', 'UNKNOWN']);
  expect(report.timeline[3].stage_m).toBe(0);
  expect(report.timeline[4].flags).toContain('STALE_OBSERVATION');
  expect(report).toMatchObject({ experimental: true, data_kind: 'synthetic', operationally_validated: false });
});
it('reports all four labeled outcomes and abstentions without inventing event or lead-time skill', () => {
  expect(replayHydrology(input()).performance).toMatchObject({ true_positive: 1, false_positive: 1, true_negative: 1,
    false_negative: 1, abstained: 1, classified_label_fraction: 0.8, precision: 0.5, recall: 0.5,
    abstained_hazard_positive: 1, recall_lower_bound_including_abstentions: 1 / 3,
    event_detection_rate: null, lead_time_seconds: null });
});
it('leaves unlabeled historical performance null rather than deriving truth from threshold breaches', () => {
  const data = input(); data.data_kind = 'historical'; data.labels = [];
  const report = replayHydrology(data);
  expect(report.validation_status).toBe('RULE_REPLAY_ONLY');
  expect(report.performance).toBeNull();
  expect(report.summary.unlabeled_captures).toBe(5);
});
it('fingerprints normalized capture data reproducibly without depending on input array order', () => {
  const data = input(), shuffled = input();
  shuffled.observations.reverse(); shuffled.labels.reverse();
  expect(replayHydrology(data).input_sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(replayHydrology(data).input_sha256).toBe(replayHydrology(shuffled).input_sha256);
});
it('withholds baseline observations whose original receipt-time values cannot be reconstructed', () => {
  const data = input(); data.observations[0].capture_kind = 'BASELINE';
  const report = replayHydrology(data);
  expect(report.timeline[0].status).toBe('UNKNOWN');
  expect(report.timeline[0].flags).toContain('BASELINE_RECEIPT_HISTORY_UNVERIFIED');
  expect(report.timeline[0].threshold_capture_id).toBe('threshold-capture-1');
  expect(report.timeline[0].threshold_status).toBe('VERIFIED');
});
it('does not look ahead to thresholds captured or retrieved after a decision', () => {
  const data = input(); data.thresholds[0].availability_order = 7;
  expect(replayHydrology(data).timeline.every(row => row.status === 'UNKNOWN')).toBe(true);
  data.thresholds[0].availability_order = 1;
  data.thresholds[0].available_at = '2024-07-02T06:00:00Z';
  expect(replayHydrology(data).timeline[0].status).toBe('UNKNOWN');
  data.thresholds[0].available_at = '2024-07-01T06:00:00Z';
  data.thresholds[0].retrieved_at = '2024-07-02T06:00:00Z';
  expect(replayHydrology(data).timeline[0].status).toBe('UNKNOWN');
});
it('keeps past assessments stable when a later threshold change or withdrawal is appended', () => {
  const data = input();
  data.thresholds.push({ ...data.thresholds[0], id: 'withdrawal', availability_order: 7, capture_kind: 'UPDATE',
    available_at: '2024-07-01T13:10:00Z', effective_to: '2024-07-01T13:10:00Z', status: 'RETIRED' } as any);
  expect(replayHydrology(data).timeline[1].status).toBe('WATCH');
  data.observations.push({ ...data.observations[1], id: 'post-withdrawal', availability_order: 8,
    available_at: '2024-07-01T13:20:00Z', received_at: '2024-07-01T13:20:00Z', observed_at: '2024-07-01T13:20:00Z' });
  expect(replayHydrology(data).timeline.at(-1)?.status).toBe('UNKNOWN');
});
it('never uses unverified, expired, or not-yet-effective thresholds', () => {
  for (const change of [{ status: 'PROVISIONAL' }, { effective_from: '2024-07-02T06:00:00Z' },
    { effective_to: '2024-07-01T06:05:00Z' }, { retrieved_at: '2024-01-01T06:00:00Z' }]) {
    const data = input(); Object.assign(data.thresholds[0], change);
    expect(replayHydrology(data).timeline[0].status).toBe('UNKNOWN');
  }
});
it('keeps separate capture versions for a corrected observation instead of applying the final value backward', () => {
  const data = input();
  data.observations[1].observation_id = data.observations[0].observation_id;
  data.observations[1].capture_kind = 'UPDATE';
  const report = replayHydrology(data);
  expect(report.timeline[0].status).toBe('NORMAL');
  expect(report.timeline[1].status).toBe('WATCH');
  expect(report.timeline[0].stage_m).toBe(4);
});
it('withholds simulated, suspect, missing-stage, and future-source readings', () => {
  for (const change of [{ observation_state: 'SIMULATED' }, { quality_status: 'SUSPECT' }, { stage_m: null },
    { observed_at: '2024-07-02T06:10:00Z' }, { received_at: '2024-07-02T06:10:00Z' }]) {
    const data = input(); Object.assign(data.observations[0], change);
    expect(replayHydrology(data).timeline[0].status).toBe('UNKNOWN');
  }
});
it('reports registered gauges with no captures and observed source gaps without filling them', () => {
  const data = input(); data.stations.push({ station_number: 505, name: 'Missing gauge' });
  data.observations[4].observed_at = '2024-07-01T13:00:00Z';
  const report = replayHydrology(data);
  expect(report.summary.stations[1]).toMatchObject({ readings: 0, classified: 0 });
  expect(report.summary.stations[0].source_gap_count).toBe(1);
});
it('uses null metrics for undefined denominators and counts unknown labeled points separately', () => {
  const data = input(); data.thresholds = [];
  expect(replayHydrology(data).performance).toMatchObject({ abstained: 5, precision: null, recall: null, false_alarm_ratio: null });
  data.observations = []; data.labels = [];
  expect(replayHydrology(data).summary.classified_fraction).toBeNull();
});
it.each(['unit', 'duplicate', 'label', 'station', 'credentials', 'evidence'])('rejects invalid %s provenance or conflicting input', kind => {
  const data = input();
  if (kind === 'unit') data.observations[0].stage_unit = 'ft';
  if (kind === 'duplicate') data.observations[1].availability_order = 2;
  if (kind === 'label') data.labels.push(data.labels[0]);
  if (kind === 'station') data.observations[0].station_number = 999;
  if (kind === 'credentials') data.thresholds[0].source_url = 'https://user:private@example.org/';
  if (kind === 'evidence') data.data_kind = 'historical';
  expect(() => replayHydrology(data)).toThrow();
});
it('bounds canonical windows and rejects ambiguous timestamps', () => {
  expect(ReplayQuerySchema.safeParse({ start: '2024-07-01T00:00:00Z', end: '2024-07-02T00:00:00Z', station_number: '289.95' }).success).toBe(true);
  for (const value of [{ start: '2024-07-01T00:00:00', end: '2024-07-02T00:00:00Z' },
    { start: '2024-07-01T00:00:00Z', end: '2024-09-01T00:00:00Z' }, { start: '2024-07-02T00:00:00Z', end: '2024-07-01T00:00:00Z' }])
    expect(ReplayQuerySchema.safeParse(value).success).toBe(false);
});
it('supplied replay endpoint is deterministic and makes no provider calls', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('provider call forbidden'));
  try {
    const response = await request(app).post('/api/v1/research/hydrology/replay').send(input());
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(replayHydrology(input()));
    expect(fetchMock).not.toHaveBeenCalled();
  } finally { fetchMock.mockRestore(); }
});
it('rejects a malformed supplied replay or canonical query with 400', async () => {
  expect((await request(app).post('/api/v1/research/hydrology/replay').send({})).status).toBe(400);
  expect((await request(app).get('/api/v1/research/hydrology/backtest?start=yesterday&end=today')).status).toBe(400);
});
it('reports canonical database failures without private details or simulated fallback', async () => {
  const failure = db.transaction as unknown as jest.Mock;
  failure.mockRejectedValue(new Error('private database connection detail'));
  try {
    const response = await request(app).get('/api/v1/research/hydrology/backtest?start=2024-07-01T00:00:00Z&end=2024-07-02T00:00:00Z');
    expect(response.status).toBe(503);
    expect(response.body).not.toHaveProperty('data');
    expect(JSON.stringify(response.body)).not.toContain('private database connection detail');
  } finally { failure.mockReset(); }
});
