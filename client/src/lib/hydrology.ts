export const RAINFALL_WINDOWS = [1, 3, 6, 12, 24] as const;
export type RainfallWindow = typeof RAINFALL_WINDOWS[number];
export const DASHBOARD_REFRESH_MS = 60_000;
const MAX_DATA_AGE_MS = 6 * 3600_000;

export interface MeasurementQuality {
  observed_at: string | null;
  received_at: string | null;
  source_key: string;
  observation_state: string;
  quality_status: string;
  quality_flags: string[];
}
export interface RiverStation extends MeasurementQuality {
  id: string;
  station_number: number;
  name: string;
  river: string;
  basin: string;
  stage_m: number | null;
  discharge_cms: number | null;
  stage_unit: 'm';
  discharge_unit: 'm3/s';
  warning_stage_m: number | null;
  danger_stage_m: number | null;
  status: string;
  threshold_status: string;
  threshold_flags: string[];
  threshold_source_url: string | null;
  threshold_retrieved_at: string | null;
}
export interface RainfallStation extends MeasurementQuality {
  id: string;
  dhm_station_id: number;
  station_number: string | null;
  name: string;
  basin: string | null;
  district: string | null;
  duration_hours: RainfallWindow;
  unit: 'mm';
  rainfall_mm: number | null;
  source_url: string;
  timestamp_basis: 'LATEST_STATION_OBSERVATION';
}
export interface IngestionFeed {
  feed_key: string;
  source_key: string;
  status: string;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_data_at: string | null;
  consecutive_failures: number;
  scheduler_stale: boolean;
  data_stale: boolean;
  last_error_code: string | null;
}
export interface IngestionHealth {
  status: string;
  poll_interval_seconds: number;
  rainfall_station_ids: number[];
  feeds: IngestionFeed[];
}
export interface Resource<T> { data: T | null; error: string | null; checked_at: string | null }
export interface HydrologySnapshot {
  rivers: Resource<RiverStation[]>;
  rainfall: Resource<RainfallStation[]>;
  health: Resource<IngestionHealth>;
}
export const emptySnapshot = (): HydrologySnapshot => ({
  rivers: { data: null, error: null, checked_at: null },
  rainfall: { data: null, error: null, checked_at: null },
  health: { data: null, error: null, checked_at: null },
});

/** Ages the source timestamp, not browser refresh or server receipt time. */
export function measurementState(row: MeasurementQuality, value: number | null, now: number): string {
  if (value === null || !Number.isFinite(value) || !row.observed_at) return 'UNAVAILABLE';
  const age = now - Date.parse(row.observed_at);
  if (!Number.isFinite(age) || age < -300_000) return 'UNAVAILABLE';
  if (age > MAX_DATA_AGE_MS || row.observation_state === 'STALE') return 'STALE';
  if (row.observation_state !== 'OBSERVED') return row.observation_state;
  return row.quality_status === 'GOOD' ? 'OBSERVED' : 'SUSPECT';
}

/** Only displays an existing backend assessment; never computes an alert threshold. */
export function riverStatus(row: RiverStation, now: number): string {
  const thresholdAge = row.threshold_retrieved_at ? now - Date.parse(row.threshold_retrieved_at) : NaN;
  if (measurementState(row, row.stage_m, now) !== 'OBSERVED' ||
    !['VERIFIED', 'PARTIAL'].includes(row.threshold_status) || !Number.isFinite(thresholdAge) ||
    thresholdAge < -300_000 || thresholdAge > 30 * 86400_000) return 'UNKNOWN';
  return ['NORMAL', 'WATCH', 'CRITICAL_SURGE'].includes(row.status) ? row.status : 'UNKNOWN';
}

export function formatMeasurement(value: number | null, unit: string): string {
  return value === null || !Number.isFinite(value) ? 'Unavailable' : `${value.toFixed(2)} ${unit}`;
}
export function formatNepalTime(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Unavailable';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kathmandu', year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(value)) + ' NPT';
}
export function officialSourceUrl(value: string | null): string | null {
  try {
    const url = new URL(value ?? '');
    return url.protocol === 'https:' && url.hostname === 'dhm.gov.np' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
const nullableNumber = (value: unknown) => value === null || (typeof value === 'number' && Number.isFinite(value));
const nullableTime = (value: unknown) => value === null || (typeof value === 'string' && Number.isFinite(Date.parse(value)) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value));
const strings = (value: unknown) => Array.isArray(value) && value.every(item => typeof item === 'string');
const quality = (row: Record<string, unknown>) => nullableTime(row.observed_at) && nullableTime(row.received_at) &&
  typeof row.source_key === 'string' && typeof row.observation_state === 'string' &&
  typeof row.quality_status === 'string' && strings(row.quality_flags);

function parseRivers(value: unknown): RiverStation[] {
  if (!Array.isArray(value) || !value.every(row => object(row) && quality(row) &&
    typeof row.id === 'string' && typeof row.name === 'string' && typeof row.river === 'string' &&
    typeof row.basin === 'string' && typeof row.station_number === 'number' && Number.isFinite(row.station_number) &&
    nullableNumber(row.stage_m) && nullableNumber(row.discharge_cms) && row.stage_unit === 'm' && row.discharge_unit === 'm3/s' &&
    nullableNumber(row.warning_stage_m) && nullableNumber(row.danger_stage_m) && typeof row.status === 'string' &&
    typeof row.threshold_status === 'string' && strings(row.threshold_flags) && nullableTime(row.threshold_retrieved_at) &&
    (row.threshold_source_url === null || typeof row.threshold_source_url === 'string'))) throw new Error('Invalid river response');
  return value as RiverStation[];
}
function parseRainfall(value: unknown, hours: RainfallWindow): RainfallStation[] {
  if (!Array.isArray(value) || !value.every(row => object(row) && quality(row) &&
    typeof row.id === 'string' && typeof row.name === 'string' && (row.station_number === null || typeof row.station_number === 'string') &&
    typeof row.dhm_station_id === 'number' && Number.isInteger(row.dhm_station_id) &&
    (row.basin === null || typeof row.basin === 'string') && (row.district === null || typeof row.district === 'string') &&
    row.duration_hours === hours && row.unit === 'mm' && nullableNumber(row.rainfall_mm) &&
    typeof row.source_url === 'string' && row.timestamp_basis === 'LATEST_STATION_OBSERVATION')) throw new Error('Invalid rainfall response');
  return value as RainfallStation[];
}
function parseHealth(value: unknown): IngestionHealth {
  if (!object(value) || typeof value.status !== 'string' || typeof value.poll_interval_seconds !== 'number' ||
    !Number.isFinite(value.poll_interval_seconds) || value.poll_interval_seconds <= 0 ||
    !Array.isArray(value.rainfall_station_ids) || !value.rainfall_station_ids.every(id => typeof id === 'number' && Number.isInteger(id)) ||
    !Array.isArray(value.feeds) || !value.feeds.every(row => object(row) && typeof row.feed_key === 'string' &&
      typeof row.source_key === 'string' && typeof row.status === 'string' && nullableTime(row.last_attempt_at) &&
      nullableTime(row.last_success_at) && nullableTime(row.last_data_at) && typeof row.consecutive_failures === 'number' &&
      Number.isInteger(row.consecutive_failures) && typeof row.scheduler_stale === 'boolean' && typeof row.data_stale === 'boolean' &&
      (row.last_error_code === null || typeof row.last_error_code === 'string'))) throw new Error('Invalid health response');
  return value as unknown as IngestionHealth;
}

/** GET-only, bounded requests. Errors clear only the affected resource, never fill fixtures. */
export async function fetchHydrologySnapshot(baseUrl: string, hours: RainfallWindow, signal: AbortSignal,
  fetcher: typeof fetch = fetch, timeoutMs = 10_000): Promise<HydrologySnapshot> {
  async function load<T>(route: string, parse: (value: unknown) => T): Promise<Resource<T>> {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; cancel(); }, timeoutMs);
    try {
      const response = await fetcher(`${baseUrl.replace(/\/$/, '')}${route}`, { signal: controller.signal, cache: 'no-store', method: 'GET' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body: unknown = await response.json();
      if (!object(body) || body.success !== true) throw new Error('Unsuccessful response');
      return { data: parse(body.data), error: null, checked_at: new Date().toISOString() };
    } catch (error) {
      return { data: null, error: timedOut ? 'Request timed out' : signal.aborted ? 'Request cancelled' :
        error instanceof Error && /^(HTTP \d+|Invalid \w+ response|Unsuccessful response)$/.test(error.message)
          ? error.message : 'Request failed', checked_at: new Date().toISOString() };
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener('abort', cancel);
    }
  }
  const [rivers, rainfall, health] = await Promise.all([
    load('/hydrology/stations/latest', parseRivers),
    load(`/hydrology/rainfall/stations?hours=${hours}`, value => parseRainfall(value, hours)),
    load('/hydrology/ingestion/status', parseHealth),
  ]);
  return { rivers, rainfall, health };
}
