import { describeFeedHealth, getDhmIngestionConfig, parseDhmRiverReadings } from '../src/services/dhm_ingestion.service';

it('keeps configurable polling polite and deduplicates selected station IDs', () => {
  expect(getDhmIngestionConfig({ DHM_POLL_INTERVAL_SECONDS: '900', DHM_RAINFALL_STATION_IDS: '55,55,663' }))
    .toEqual({ interval_ms: 900_000, rainfall_station_ids: [55, 663] });
  expect(() => getDhmIngestionConfig({ DHM_POLL_INTERVAL_SECONDS: '0' })).toThrow();
  expect(() => getDhmIngestionConfig({ DHM_RAINFALL_STATION_IDS: '55,invalid' })).toThrow();
});

it('never converts missing measurements into zero or replaces their timestamp', () => {
  const payload = { status: 'success', data: [
    { stationIndex: '289.95', warning_level: '5.5', danger_level: '6.8', waterLevel: { datetime: '2026-10-12T13:40:00Z', value: 0 } },
    { stationIndex: '505', warning_level: '2.3', danger_level: '2.8', waterLevel: null },
    { stationIndex: '620', warning_level: '5.8', danger_level: '7', waterLevel: { datetime: '2026-10-12 13:40', value: 2 } },
  ] };
  const result = parseDhmRiverReadings(payload);
  expect(result.size).toBe(1);
  expect(result.get(289.95)).toMatchObject({ observed_at: '2026-10-12T13:40:00Z', stage_m: 0 });
});

it('rejects conflicting readings for the same gauge', () => {
  const item = { stationIndex: '289.95', warning_level: '5.5', danger_level: '6.8', waterLevel: { datetime: '2026-10-12T13:40:00Z', value: 2 } };
  expect(parseDhmRiverReadings({ status: 'success', data: [item, { ...item, waterLevel: { ...item.waterLevel, value: 8 } }] }).size).toBe(0);
});

it('distinguishes scheduler freshness from data freshness', () => {
  const now = new Date('2026-10-12T14:00:00Z');
  expect(describeFeedHealth({ last_attempt_at: now, last_data_at: '2026-10-12T01:00:00Z' }, 900_000, now))
    .toMatchObject({ scheduler_stale: false, data_stale: true });
  expect(describeFeedHealth({ last_attempt_at: '2026-10-12T13:00:00Z', last_data_at: now }, 900_000, now))
    .toMatchObject({ scheduler_stale: true, data_stale: false });
});
