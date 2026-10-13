import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  emptySnapshot, fetchHydrologySnapshot, formatMeasurement, formatNepalTime, HydrologySnapshot,
  measurementState, officialSourceUrl, RainfallStation, RiverStation, riverStatus,
} from '../src/lib/hydrology';
import { HydrologySnapshotView } from '../src/components/hydrology/HydrologyPanel';

const time = '2026-10-13T04:00:00Z';
const now = Date.parse(time);
const quality = { observed_at: time, received_at: time, source_key: 'dhm-hydrology', observation_state: 'OBSERVED', quality_status: 'GOOD', quality_flags: [] };
const river: RiverStation = { ...quality, id: 'r1', station_number: 289.95, name: 'Test river', river: 'Rapti', basin: 'West Rapti',
  stage_m: 0, stage_unit: 'm', discharge_cms: null, discharge_unit: 'm3/s', warning_stage_m: 5, danger_stage_m: 7,
  status: 'NORMAL', threshold_status: 'VERIFIED', threshold_flags: [], threshold_source_url: 'https://dhm.gov.np/hydrology', threshold_retrieved_at: time };
const rain: RainfallStation = { ...quality, source_key: 'dhm-rainfall', id: 'p1', dhm_station_id: 663, station_number: '0526', name: 'Test rainfall',
  basin: null, district: null, duration_hours: 24, unit: 'mm', rainfall_mm: 0,
  source_url: 'https://dhm.gov.np/station/663', timestamp_basis: 'LATEST_STATION_OBSERVATION' };
const health = { status: 'PARTIAL', poll_interval_seconds: 900, rainfall_station_ids: [663], feeds: [
  { feed_key: 'dhm-rainfall', source_key: 'dhm-rainfall', status: 'SUCCESS', last_attempt_at: time, last_success_at: time,
    last_data_at: time, consecutive_failures: 0, scheduler_stale: false, data_stale: false, last_error_code: null },
] };
const resource = <T,>(data: T) => ({ data, error: null, checked_at: time });
const snapshot: HydrologySnapshot = { rivers: resource([river]), rainfall: resource([rain]), health: resource(health) };
const response = (data: unknown) => new Response(JSON.stringify({ success: true, data }));
function mockFetch(override?: (url: string) => Response): typeof fetch {
  return (async input => {
    const url = String(input);
    return override?.(url) ?? response(url.includes('/rainfall/') ? [rain] : url.endsWith('/latest') ? [river] : health);
  }) as typeof fetch;
}

test('zero is a measurement, missing is unavailable, and timestamps use Nepal Time', () => {
  assert.equal(formatMeasurement(0, 'mm'), '0.00 mm');
  assert.equal(formatMeasurement(null, 'm'), 'Unavailable');
  assert.equal(formatMeasurement(NaN, 'mm'), 'Unavailable');
  assert.match(formatNepalTime(time), /09:45:00 NPT$/);
  assert.equal(formatNepalTime(null), 'Unavailable');
});
test('measurement freshness is based on source time, never receipt time', () => {
  assert.equal(measurementState(river, 0, now), 'OBSERVED');
  assert.equal(measurementState({ ...river, received_at: '2026-10-14T04:00:00Z' }, 0, now + 7 * 3600_000), 'STALE');
  assert.equal(measurementState({ ...river, observed_at: null }, 0, now), 'UNAVAILABLE');
  assert.equal(measurementState({ ...river, observed_at: '2026-10-14T04:00:00Z' }, 0, now), 'UNAVAILABLE');
  assert.equal(measurementState({ ...river, observation_state: 'SIMULATED' }, 0, now), 'SIMULATED');
  assert.equal(measurementState({ ...river, quality_status: 'SUSPECT' }, 0, now), 'SUSPECT');
});
test('the client displays backend decisions and suppresses stale or unsupported comparisons', () => {
  assert.equal(riverStatus({ ...river, status: 'WATCH' }, now), 'WATCH'); // not recalculated from stage
  assert.equal(riverStatus(river, now + 7 * 3600_000), 'UNKNOWN');
  assert.equal(riverStatus({ ...river, threshold_status: 'MISSING' }, now), 'UNKNOWN');
  assert.equal(riverStatus({ ...river, threshold_retrieved_at: '2020-01-01T00:00:00Z' }, now), 'UNKNOWN');
  assert.equal(riverStatus({ ...river, observation_state: 'SIMULATED' }, now), 'UNKNOWN');
});
test('source links allow only credential-free official HTTPS links', () => {
  assert.equal(officialSourceUrl('https://dhm.gov.np/station/663'), 'https://dhm.gov.np/station/663');
  for (const url of ['javascript:alert(1)', 'http://dhm.gov.np/', 'https://dhm.gov.np.evil.test/', 'https://user:pass@dhm.gov.np/', null]) assert.equal(officialSourceUrl(url), null);
});
test('GET snapshots preserve units, decimal river IDs, and leading-zero rainfall codes', async () => {
  const result = await fetchHydrologySnapshot('https://local.test/api/v1/', 24, new AbortController().signal, mockFetch());
  assert.equal(result.rivers.data?.[0].station_number, 289.95);
  assert.equal(result.rainfall.data?.[0].station_number, '0526');
  assert.equal(result.rainfall.data?.[0].rainfall_mm, 0);
  assert.equal(result.health.data?.status, 'PARTIAL');
});
test('one failed resource does not erase successful siblings or inject demo data', async () => {
  const result = await fetchHydrologySnapshot('https://local.test', 24, new AbortController().signal,
    mockFetch(url => url.includes('/rainfall/') ? new Response('private failure', { status: 503 }) : response(url.endsWith('/latest') ? [river] : health)));
  assert.equal(result.rainfall.data, null);
  assert.equal(result.rainfall.error, 'HTTP 503');
  assert.equal(result.rivers.data?.length, 1);
  assert.equal(result.health.error, null);
});
test('a missing rainfall station code is not invented or rejected as a whole-feed failure', async () => {
  const result = await fetchHydrologySnapshot('https://local.test', 24, new AbortController().signal,
    mockFetch(url => response(url.includes('/rainfall/') ? [{ ...rain, station_number: null, basin: '', district: '' }] : url.endsWith('/latest') ? [river] : health)));
  assert.equal(result.rainfall.error, null);
  assert.equal(result.rainfall.data?.[0].station_number, null);
});
test('wrong units or accumulation windows are rejected rather than mislabeled', async () => {
  const wrongUnit = await fetchHydrologySnapshot('https://local.test', 24, new AbortController().signal,
    mockFetch(url => response(url.includes('/rainfall/') ? [{ ...rain, unit: 'mm/h' }] : url.endsWith('/latest') ? [{ ...river, stage_unit: 'ft' }] : health)));
  assert.equal(wrongUnit.rivers.error, 'Invalid river response');
  assert.equal(wrongUnit.rainfall.error, 'Invalid rainfall response');
  const wrongWindow = await fetchHydrologySnapshot('https://local.test', 1, new AbortController().signal, mockFetch());
  assert.equal(wrongWindow.rainfall.error, 'Invalid rainfall response');
});
test('empty catalogs remain empty and malformed JSON is an explicit failure', async () => {
  const empty = await fetchHydrologySnapshot('https://local.test', 24, new AbortController().signal,
    mockFetch(url => url.endsWith('/status') ? response(health) : response([])));
  assert.deepEqual(empty.rivers.data, []);
  assert.deepEqual(empty.rainfall.data, []);
  const invalid = await fetchHydrologySnapshot('https://local.test', 24, new AbortController().signal,
    mockFetch(() => new Response('not JSON')));
  assert.equal(invalid.rivers.error, 'Request failed');
});
test('timed-out requests abort without automatic retries', async () => {
  let calls = 0;
  const stalled = ((_url: unknown, init: RequestInit) => {
    calls++;
    return new Promise<Response>((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  }) as typeof fetch;
  const result = await fetchHydrologySnapshot('https://local.test', 24, new AbortController().signal, stalled, 5);
  assert.equal(calls, 3);
  assert.equal(result.rivers.error, 'Request timed out');
  assert.equal(result.rainfall.data, null);
});
test('renders experimental labels, missing discharge, zero rainfall, and source timestamps', () => {
  const html = renderToStaticMarkup(<HydrologySnapshotView snapshot={snapshot} hours={24} now={now} loading={false} onHoursChange={() => {}} onRefresh={() => {}} />);
  for (const text of ['Experimental research view', 'not an operational public-warning service', '0.00 mm', '#0526', '289.95', 'Unavailable', 'Observed:', 'Received:', '09:45:00 NPT', 'Below warning level']) assert.ok(html.includes(text), text);
});
test('renders failed/empty states and ages source data without treating partial coverage as safe', () => {
  const failed = emptySnapshot();
  failed.rivers.error = 'HTTP 503';
  const html = renderToStaticMarkup(<HydrologySnapshotView snapshot={failed} hours={24} now={now} loading={false} onHoursChange={() => {}} onRefresh={() => {}} />);
  assert.ok(html.includes('No demo fallback'));
  assert.ok(!html.includes('>Below warning level</span>'));
  const stale = renderToStaticMarkup(<HydrologySnapshotView snapshot={snapshot} hours={24} now={now + 7 * 3600_000} loading={false} onHoursChange={() => {}} onRefresh={() => {}} />);
  assert.ok(stale.includes('Unknown'));
  assert.ok(stale.includes('Last known measurement'));
  assert.ok(stale.includes('STALE / unavailable'));
  assert.ok(!stale.includes('>Below warning level</span>'));
});
