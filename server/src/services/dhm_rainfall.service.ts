import { Knex } from 'knex';
import { z } from 'zod';
import { db } from './db.service';
import { assessObservationQuality } from './data_quality.service';

export const RAINFALL_HOURS = [1, 3, 6, 12, 24] as const;
export const DEFAULT_RAINFALL_STATION_IDS = [55, 57, 107, 408, 663, 923];
export const rainfallSourceUrl = (id: number) => 'https://dhm.gov.np/hydrology/rainfallSingle/' + id;

const StationSchema = z.object({
  id: z.number().int().positive(), name: z.string().min(1).max(160),
  stationIndex: z.union([z.string().max(64), z.number()]).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  basin: z.string().max(96).nullable().optional(), district: z.string().max(96).nullable().optional(),
  latest_observation: z.unknown().optional(), averages: z.array(z.unknown()),
}).passthrough();

export class DhmFeedError extends Error {
  constructor(public readonly code: string) { super(code); }
}

/** JSON only; never execute provider JavaScript. Fail visibly if the page format changes. */
export function parseDhmRainfallPage(html: string, expectedId: number) {
  const match = html.match(/(?:var|let|const)\s+rainfallWatch\s*=\s*(\{[^\r\n]*\})\s*;/);
  if (!match) throw new DhmFeedError('RAINFALL_PAGE_FORMAT_CHANGED');
  let raw: any;
  try { raw = JSON.parse(match[1]); } catch { throw new DhmFeedError('RAINFALL_INVALID_JSON'); }
  const result = StationSchema.safeParse(raw);
  if (!result.success || result.data.id !== expectedId) throw new DhmFeedError('RAINFALL_INVALID_STATION');
  const timestamp = z.string().datetime({ offset: true }).safeParse(raw.latest_observation?.datetime);
  const flags: string[] = timestamp.success ? [] : ['MISSING_OR_INVALID_SOURCE_TIMESTAMP'];
  const intervals = RAINFALL_HOURS.map(hours => {
    const candidates = raw.averages.filter((entry: any) => entry?.interval === hours);
    const values = candidates.map((entry: any) => entry?.value);
    const valid = values.length === 1 && typeof values[0] === 'number' && Number.isFinite(values[0]) && values[0] >= 0 && values[0] < 1_000_000;
    return { duration_hours: hours, rainfall_mm: valid ? values[0] as number : null,
      quality_flags: valid ? [] : [values.length > 1 ? 'CONFLICTING_INTERVAL_VALUES' : 'MISSING_OR_INVALID_RAINFALL'] };
  });
  return { station: result.data, raw_payload: raw as Record<string, unknown>,
    observed_at: timestamp.success ? timestamp.data : null, intervals, quality_flags: flags };
}

export async function fetchDhmRainfallPage(id: number) {
  try {
    const response = await fetch(rainfallSourceUrl(id), { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new DhmFeedError('RAINFALL_HTTP_' + response.status);
    return await response.text();
  } catch (error) {
    if (error instanceof DhmFeedError) throw error;
    throw new DhmFeedError('RAINFALL_NETWORK_OR_TIMEOUT');
  }
}

export function rainfallQuality(row: { observed_at: string | Date; rainfall_mm: number | null; quality_flags?: string[] }, now = new Date()) {
  if (row.rainfall_mm === null) return { observation_state: 'UNAVAILABLE', quality_status: 'MISSING',
    quality_flags: row.quality_flags?.length ? row.quality_flags : ['MISSING_RAINFALL'] };
  const quality = assessObservationQuality({ observed_at: new Date(row.observed_at).toISOString(),
    source_key: 'dhm-rainfall', rainfall_mm: Number(row.rainfall_mm), now });
  return { observation_state: quality.observation_state, quality_status: quality.quality_status,
    quality_flags: [...new Set([...(row.quality_flags ?? []), ...quality.quality_flags])] };
}

export async function persistDhmRainfallPage(html: string, id: number, store: Knex = db) {
  const page = parseDhmRainfallPage(html, id);
  return store.transaction(async trx => {
    const enabled = await trx('data_sources').where({ source_key: 'dhm-rainfall', enabled: true }).first();
    if (!enabled) throw new DhmFeedError('RAINFALL_SOURCE_DISABLED');
    const metadata = { source_url: rainfallSourceUrl(id), timestamp_basis: 'LATEST_STATION_OBSERVATION',
      latest_source_timestamp: page.observed_at, quality_flags: page.quality_flags };
    const location = page.station.latitude != null && page.station.longitude != null
      ? trx.raw('ST_SetSRID(ST_Point(?, ?), 4326)', [page.station.longitude, page.station.latitude]) : null;
    const [station] = await trx('rainfall_stations').insert({ dhm_station_id: id,
      station_number: page.station.stationIndex == null || page.station.stationIndex === '' ? null : String(page.station.stationIndex),
      name: page.station.name, basin: page.station.basin ?? null, district: page.station.district ?? null,
      location, source_key: 'dhm-rainfall', metadata: JSON.stringify(metadata), retrieved_at: new Date(),
    }).onConflict('dhm_station_id').merge().returning('*');
    if (!page.observed_at) return { station_id: station.id, observations: 0, missing: 5, last_data_at: null, quality_flags: page.quality_flags };
    for (const interval of page.intervals) {
      const quality = rainfallQuality({ ...interval, observed_at: page.observed_at });
      await trx('rainfall_observations').insert({ station_id: station.id, observed_at: page.observed_at,
        duration_hours: interval.duration_hours, rainfall_mm: interval.rainfall_mm, unit: 'mm',
        source_key: 'dhm-rainfall', source_url: rainfallSourceUrl(id), ...quality,
        quality_flags: JSON.stringify(quality.quality_flags), raw_payload: JSON.stringify(page.raw_payload),
      }).onConflict(['station_id', 'observed_at', 'duration_hours', 'source_key']).merge();
    }
    return { station_id: station.id, observations: 5, missing: page.intervals.filter(value => value.rainfall_mm === null).length,
      last_data_at: page.observed_at, quality_flags: page.quality_flags };
  });
}

export async function getRainfallStations(hours = 24) {
  const stations = await db('rainfall_stations').where({ active: true }).orderBy('dhm_station_id');
  const observations = stations.length ? await db('rainfall_observations').distinctOn('station_id')
    .whereIn('station_id', stations.map(row => row.id)).where({ duration_hours: hours })
    .orderBy('station_id').orderBy('observed_at', 'desc') : [];
  const latest = new Map(observations.map(row => [row.station_id, row]));
  return stations.map(station => {
    const observation = latest.get(station.id);
    const quality = observation ? rainfallQuality(observation) : { observation_state: 'UNAVAILABLE', quality_status: 'MISSING', quality_flags: ['NO_OBSERVATION'] };
    if (station.metadata?.quality_flags?.includes('MISSING_OR_INVALID_SOURCE_TIMESTAMP')) {
      quality.observation_state = 'UNAVAILABLE'; quality.quality_status = 'MISSING';
      quality.quality_flags = [...new Set([...quality.quality_flags, 'MISSING_OR_INVALID_SOURCE_TIMESTAMP'])];
    }
    return { id: station.id, dhm_station_id: station.dhm_station_id, station_number: station.station_number,
      name: station.name, basin: station.basin, district: station.district, source_key: station.source_key,
      source_url: rainfallSourceUrl(station.dhm_station_id), duration_hours: hours, unit: 'mm',
      rainfall_mm: observation?.rainfall_mm == null ? null : Number(observation.rainfall_mm),
      observed_at: observation?.observed_at ?? null, received_at: observation?.received_at ?? null,
      timestamp_basis: 'LATEST_STATION_OBSERVATION', ...quality, metadata: station.metadata };
  });
}
