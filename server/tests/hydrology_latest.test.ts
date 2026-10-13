import express from 'express';
import request from 'supertest';
import { db } from '../src/services/db.service';
import { getLatestHydrometricStations } from '../src/services/hydrology.service';
import router from '../src/routes/hydrology.routes';

jest.mock('../src/services/db.service', () => ({ db: Object.assign(jest.fn(), { fn: { now: jest.fn(() => 'now') } }) }));
const app = express().use('/api/v1/hydrology', router);
const dbMock = db as unknown as jest.Mock;
const now = new Date().toISOString();
const station = { id: 'canonical-test', station_number: '289.95', name: 'Fixture gauge', river: 'Rapti', basin: 'West Rapti',
  source_key: 'dhm-hydrology', active_warning_stage_m: '5', active_danger_stage_m: '7',
  threshold_retrieved_at: now, threshold_source_url: 'https://dhm.gov.np/hydrology', provider: 'DHM' };
const observation = { station_id: station.id, observed_at: now, received_at: now, stage_m: '0', discharge_cms: null,
  source_key: 'dhm-hydrology', observation_state: 'OBSERVED', quality_status: 'GOOD', quality_flags: [] };

function results(registered: unknown[], readings: unknown[]) {
  dbMock.mockImplementation((table: string) => {
    const data = table === 'hydrometric_stations as s' ? registered : readings;
    const chain: Record<string, unknown> = {
      then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(data).then(resolve, reject),
    };
    for (const method of ['leftJoin', 'select', 'where', 'orderBy', 'distinctOn', 'whereIn']) chain[method] = jest.fn(() => chain);
    return chain;
  });
}
beforeEach(() => { dbMock.mockReset(); results([station], [observation]); });

it('preserves zero stage, decimal station IDs, null discharge, provenance, and timestamps', async () => {
  const rows = await getLatestHydrometricStations();
  expect(rows[0]).toMatchObject({ station_number: 289.95, stage_m: 0, stage_unit: 'm', discharge_cms: null,
    discharge_unit: 'm3/s', observed_at: now, received_at: now, source_key: 'dhm-hydrology', status: 'NORMAL' });
});
it('keeps registered gauges without observations explicitly unknown', async () => {
  results([station], []);
  expect((await getLatestHydrometricStations())[0]).toMatchObject({ stage_m: null, observed_at: null, received_at: null,
    status: 'UNKNOWN', observation_state: 'UNAVAILABLE', quality_flags: ['NO_OBSERVATION'] });
});
it('does not label stale source data below a threshold as normal', async () => {
  results([station], [{ ...observation, observed_at: '2020-01-01T00:00:00Z' }]);
  expect((await getLatestHydrometricStations())[0]).toMatchObject({ status: 'UNKNOWN', observation_state: 'STALE' });
});
it('does not query observations when the canonical station catalog is empty', async () => {
  results([], []);
  expect(await getLatestHydrometricStations()).toEqual([]);
  expect(dbMock).toHaveBeenCalledTimes(1);
});
it('serves the canonical latest route before station-number history matching', async () => {
  const response = await request(app).get('/api/v1/hydrology/stations/latest');
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ success: true, count: 1, data: [{ id: station.id, stage_m: 0 }] });
});
it('returns 503 without fixture fallback or internal database errors', async () => {
  dbMock.mockImplementation(() => { throw new Error('private connection detail'); });
  const response = await request(app).get('/api/v1/hydrology/stations/latest');
  expect(response.status).toBe(503);
  expect(response.body.success).toBe(false);
  expect(response.body).not.toHaveProperty('data');
  expect(JSON.stringify(response.body)).not.toContain('private connection detail');
});
