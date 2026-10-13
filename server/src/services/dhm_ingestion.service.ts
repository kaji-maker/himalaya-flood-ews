import { Knex } from 'knex';
import { db } from './db.service';
import { fetchDhmRiverWatch, parseDhmThresholdSnapshot, persistDhmThresholdSnapshot } from './dhm_thresholds.service';
import { storeHydrometricObservation } from './hydrology.service';
import { DEFAULT_RAINFALL_STATION_IDS, DhmFeedError, fetchDhmRainfallPage, persistDhmRainfallPage } from './dhm_rainfall.service';

export function getDhmIngestionConfig(env: NodeJS.ProcessEnv = process.env) {
  const seconds = Number(env.DHM_POLL_INTERVAL_SECONDS || 900);
  if (!Number.isInteger(seconds) || seconds < 300 || seconds > 86400) throw new Error('DHM_POLL_INTERVAL_SECONDS must be 300–86400');
  const stationIds = env.DHM_RAINFALL_STATION_IDS === undefined
    ? DEFAULT_RAINFALL_STATION_IDS : env.DHM_RAINFALL_STATION_IDS.split(',').map(value => Number(value.trim()));
  if (!stationIds.length || stationIds.length > 100 || stationIds.some(id => !Number.isInteger(id) || id <= 0)) {
    throw new Error('DHM_RAINFALL_STATION_IDS must list 1–100 positive portal IDs');
  }
  return { interval_ms: seconds * 1000, rainfall_station_ids: [...new Set(stationIds)] };
}

export function parseDhmRiverReadings(payload: unknown) {
  const snapshot = parseDhmThresholdSnapshot(payload);
  const readings = new Map<number, { station_number: number; observed_at: string; stage_m: number; trend: string; source_key: string; raw_payload: any }>();
  const conflicts = new Set<number>();
  for (const item of (payload as any).data) {
    const stationNumber = Number(item?.stationIndex);
    if (!snapshot.rows.has(stationNumber) || conflicts.has(stationNumber)) continue;
    const level = item?.waterLevel;
    if (!level || typeof level.value !== 'number' || !Number.isFinite(level.value) || level.value < 0 ||
        typeof level.datetime !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(level.datetime) || !Number.isFinite(Date.parse(level.datetime))) continue;
    const previous = readings.get(stationNumber);
    if (previous && (previous.stage_m !== level.value || previous.observed_at !== level.datetime)) {
      readings.delete(stationNumber); conflicts.add(stationNumber); continue;
    }
    readings.set(stationNumber, { station_number: stationNumber, observed_at: level.datetime, stage_m: level.value,
      trend: ['RISING', 'FALLING', 'STEADY'].includes(item.steady) ? item.steady : 'UNKNOWN',
      source_key: 'dhm-hydrology', raw_payload: item });
  }
  return readings;
}

type FeedResult = { status: 'SUCCESS' | 'PARTIAL' | 'FAILED'; counts: Record<string, number>; last_data_at: string | null; last_error_code: string | null };
const latestDate = (values: Array<string | null>) => values.filter((value): value is string => Boolean(value))
  .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;

async function recordFeedState(trx: Knex, key: string, source: string, started: Date, result: FeedResult) {
  const previous = await trx('ingestion_feed_state').where({ feed_key: key }).first();
  await trx('ingestion_feed_state').insert({ feed_key: key, source_key: source, last_attempt_at: started,
    last_success_at: result.status === 'FAILED' ? previous?.last_success_at ?? null : new Date(),
    last_data_at: result.last_data_at ?? previous?.last_data_at ?? null,
    status: result.status, consecutive_failures: result.status === 'FAILED' ? (previous?.consecutive_failures ?? 0) + 1 : 0,
    last_error_code: result.last_error_code, latency_ms: Date.now() - started.getTime(), counts: JSON.stringify(result.counts),
  }).onConflict('feed_key').merge();
}

export const defaultDhmDependencies = { river: fetchDhmRiverWatch, rainfall: fetchDhmRainfallPage };

/** One database lock coordinates manual/daemon cycles; no overlapping ingestion processes. */
export async function runDhmIngestionCycle(store: Knex = db, dependencies = defaultDhmDependencies) {
  const config = getDhmIngestionConfig();
  return store.transaction(async trx => {
    const lock = await trx.raw('SELECT pg_try_advisory_xact_lock(731304, 1) AS acquired');
    if (!lock.rows[0]?.acquired) return { skipped: true, reason: 'CYCLE_ALREADY_RUNNING' };
    const riverStarted = new Date();
    let river: FeedResult;
    try {
      const payload = await dependencies.river();
      river = await trx.transaction(async feed => {
        const thresholds = await persistDhmThresholdSnapshot(payload, feed);
        const readings = parseDhmRiverReadings(payload);
        const stations = await feed('hydrometric_stations').where({ active: true, source_key: 'dhm-hydrology' });
        const timestamps: string[] = [];
        for (const station of stations) {
          const reading = readings.get(Number(station.station_number));
          if (!reading) continue;
          await storeHydrometricObservation(reading, feed); timestamps.push(reading.observed_at);
        }
        return { status: timestamps.length < stations.length ? 'PARTIAL' : 'SUCCESS',
          counts: { registered_stations: stations.length, thresholds: thresholds.synced.length,
            observations: timestamps.length, missing_readings: stations.length - timestamps.length },
          last_data_at: latestDate(timestamps), last_error_code: null } as FeedResult;
      });
    } catch {
      river = { status: 'FAILED', counts: {}, last_data_at: null, last_error_code: 'DHM_RIVER_FETCH_OR_PERSIST_FAILED' };
    }
    await recordFeedState(trx, 'dhm-river', 'dhm-hydrology', riverStarted, river);

    const rainStarted = new Date();
    let observations = 0, missing = 0, failedStations = 0;
    const timestamps: Array<string | null> = [];
    const errors: Array<{ dhm_station_id: number; code: string }> = [];
    // Two public page fetches at a time, followed by sequential database saves.
    for (let offset = 0; offset < config.rainfall_station_ids.length; offset += 2) {
      const ids = config.rainfall_station_ids.slice(offset, offset + 2);
      const fetched = await Promise.allSettled(ids.map(id => dependencies.rainfall(id)));
      for (let i = 0; i < ids.length; i++) {
        const page = fetched[i];
        try {
          if (page.status === 'rejected') throw page.reason;
          const result = await persistDhmRainfallPage(page.value, ids[i], trx);
          observations += result.observations; missing += result.missing; timestamps.push(result.last_data_at);
        } catch (error) {
          failedStations++;
          errors.push({ dhm_station_id: ids[i], code: error instanceof DhmFeedError ? error.code : 'RAINFALL_PERSIST_FAILED' });
        }
      }
    }
    const rainfall: FeedResult = {
      status: failedStations === config.rainfall_station_ids.length ? 'FAILED' : failedStations || missing ? 'PARTIAL' : 'SUCCESS',
      counts: { configured_stations: config.rainfall_station_ids.length, failed_stations: failedStations, observations, missing_values: missing },
      last_data_at: latestDate(timestamps), last_error_code: errors[0]?.code ?? null,
    };
    await recordFeedState(trx, 'dhm-rainfall', 'dhm-rainfall', rainStarted, rainfall);
    return { skipped: false, river, rainfall, rainfall_errors: errors };
  });
}

export function describeFeedHealth(row: any, intervalMs: number, now = new Date()) {
  const attemptAge = now.getTime() - new Date(row.last_attempt_at).getTime();
  const dataAge = row.last_data_at ? now.getTime() - new Date(row.last_data_at).getTime() : null;
  return { ...row, scheduler_stale: !Number.isFinite(attemptAge) || attemptAge < -300_000 || attemptAge > intervalMs * 2,
    data_stale: dataAge === null || !Number.isFinite(dataAge) || dataAge < -300_000 || dataAge > 6 * 3600_000 };
}

export async function getDhmIngestionHealth() {
  const config = getDhmIngestionConfig();
  const rows = await db('ingestion_feed_state').orderBy('feed_key');
  const feeds = rows.map(row => describeFeedHealth(row, config.interval_ms));
  return { poll_interval_seconds: config.interval_ms / 1000, rainfall_station_ids: config.rainfall_station_ids,
    status: feeds.length < 2 ? 'NEVER_RUN' : feeds.some(feed => feed.scheduler_stale || feed.data_stale || feed.status === 'FAILED')
      ? 'DEGRADED' : feeds.some(feed => feed.status === 'PARTIAL') ? 'PARTIAL' : 'HEALTHY', feeds };
}
