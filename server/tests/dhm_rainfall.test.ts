import { parseDhmRainfallPage, rainfallQuality } from '../src/services/dhm_rainfall.service';

const source = {
  id: 663, name: 'Fixture station', stationIndex: '0526', latitude: 28.3, longitude: 82.4,
  latest_observation: { datetime: '2026-10-12T13:40:00+00:00' },
  averages: [{ interval: 1, value: 0 }, { interval: 3, value: 9.2 }, { interval: 6, value: null },
    { interval: 12, value: -1 }, { interval: 24, value: 10.6 }],
};
const html = (value: unknown) => '<script>var rainfallWatch = ' + JSON.stringify(value) + ';</script>';

it('preserves source code, timestamp, zero rainfall, and separate accumulation periods', () => {
  const result = parseDhmRainfallPage(html(source), 663);
  expect(result.station.stationIndex).toBe('0526');
  expect(result.observed_at).toBe('2026-10-12T13:40:00+00:00');
  expect(result.intervals.map(row => [row.duration_hours, row.rainfall_mm])).toEqual([[1, 0], [3, 9.2], [6, null], [12, null], [24, 10.6]]);
  expect(result.raw_payload).toEqual(source);
});

it('does not replace an absent or ambiguous timestamp with retrieval time', () => {
  for (const datetime of [null, 'Mon, Oct 12 2026 ,07:25', '2026-10-12T13:40:00']) {
    const result = parseDhmRainfallPage(html({ ...source, latest_observation: { datetime } }), 663);
    expect(result.observed_at).toBeNull();
    expect(result.quality_flags).toContain('MISSING_OR_INVALID_SOURCE_TIMESTAMP');
  }
});

it('refuses to execute JavaScript or accept another station', () => {
  expect(() => parseDhmRainfallPage('<script>rainfallWatch = dangerous();</script>', 663)).toThrow();
  expect(() => parseDhmRainfallPage(html(source), 55)).toThrow();
});

it('marks duplicate interval values missing rather than choosing one', () => {
  const result = parseDhmRainfallPage(html({ ...source, averages: [...source.averages, { interval: 1, value: 20 }] }), 663);
  expect(result.intervals[0]).toMatchObject({ rainfall_mm: null, quality_flags: ['CONFLICTING_INTERVAL_VALUES'] });
});

it('reassesses source age at read time and leaves missing rainfall unavailable', () => {
  expect(rainfallQuality({ observed_at: '2026-10-12T01:00:00Z', rainfall_mm: 2 }, new Date('2026-10-12T14:00:00Z')))
    .toMatchObject({ observation_state: 'STALE', quality_status: 'SUSPECT' });
  expect(rainfallQuality({ observed_at: source.latest_observation.datetime, rainfall_mm: null }))
    .toMatchObject({ observation_state: 'UNAVAILABLE', quality_status: 'MISSING' });
});
