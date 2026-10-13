import { db } from './db.service';
import { assessObservationQuality } from './data_quality.service';
import { z } from 'zod';
import { Knex } from 'knex';

export const HydrometricObservationSchema = z.object({
  station_number: z.coerce.number().positive(),
  observed_at: z.string().datetime({ offset: true }),
  stage_m: z.number().finite().min(0).nullable().optional(),
  discharge_cms: z.number().finite().min(0).nullable().optional(),
  rainfall_mm: z.number().finite().min(0).nullable().optional(),
  trend: z.enum(['RISING', 'FALLING', 'STEADY', 'UNKNOWN']).optional(),
  source_key: z.string().min(1).default('dhm-hydrology'),
  raw_payload: z.record(z.unknown()).default({}),
}).refine(value => value.stage_m != null || value.discharge_cms != null || value.rainfall_mm != null,
  { message: 'At least one hydrometric measurement is required' });

export class HydrologyValidationError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

export async function storeHydrometricObservation(input: unknown, store: Knex = db) {
  const parsed = HydrometricObservationSchema.safeParse(input);
  if (!parsed.success) throw new HydrologyValidationError('Invalid hydrometric observation', 400);
  const value = parsed.data;
  const station = await store('hydrometric_stations').where({ station_number: value.station_number, active: true }).first();
  if (!station) throw new HydrologyValidationError('Active hydrometric station is not registered', 404);
  const source = await store('data_sources').where({ source_key: value.source_key, enabled: true }).first();
  if (!source) throw new HydrologyValidationError('Data source is unknown or disabled', 422);
  const quality = assessObservationQuality(value);
  if (quality.quality_status === 'REJECTED') throw new HydrologyValidationError('Observation rejected by quality checks', 422);
  const [observation] = await store('hydrometric_observations').insert({
    station_id: station.id, observed_at: value.observed_at,
    stage_m: value.stage_m ?? null, discharge_cms: value.discharge_cms ?? null, rainfall_mm: value.rainfall_mm ?? null,
    trend: value.trend ?? 'UNKNOWN', ...quality,
    quality_flags: JSON.stringify(quality.quality_flags), source_key: value.source_key,
    raw_payload: JSON.stringify(value.raw_payload),
  }).onConflict(['station_id', 'observed_at', 'source_key']).merge().returning('*');
  return { station, observation, quality };
}

/** Bind VERIFIED as a value, not a SQL identifier; never activate provisional rows. */
export function queryHydrometricStations() {
  return db('hydrometric_stations as s')
    .leftJoin('data_sources as d', 'd.source_key', 's.source_key')
    .leftJoin('hydrometric_station_thresholds as t', function () {
      this.on('t.station_id', '=', 's.id').onNull('t.effective_to')
        .andOnVal('t.status', '=', 'VERIFIED').on('t.effective_from', '<=', db.fn.now());
    })
    .select('s.*', 'd.provider', 'd.product', 'd.is_authoritative',
      't.warning_stage_m as active_warning_stage_m', 't.danger_stage_m as active_danger_stage_m',
      't.source_url as threshold_source_url', 't.retrieved_at as threshold_retrieved_at')
    .where('s.active', true).orderBy('s.basin').orderBy('s.station_number');
}

/** Canonical read-only dashboard snapshot. Never substitutes demo observations. */
export async function getLatestHydrometricStations() {
  const registered = await queryHydrometricStations();
  const ids = registered.map(station => station.id);
  const observations = ids.length ? await db('hydrometric_observations').distinctOn('station_id')
    .whereIn('station_id', ids).orderBy('station_id').orderBy('observed_at', 'desc') : [];
  const latest = new Map(observations.map(row => [row.station_id, row]));
  return registered.map(station => {
    const observation = latest.get(station.id);
    return {
      id: station.id, station_number: Number(station.station_number), name: station.name,
      river: station.river, basin: station.basin, source_key: observation?.source_key ?? station.source_key,
      provider: station.provider, product: station.product, is_authoritative: station.is_authoritative,
      stage_m: observation?.stage_m == null ? null : Number(observation.stage_m), stage_unit: 'm',
      discharge_cms: observation?.discharge_cms == null ? null : Number(observation.discharge_cms), discharge_unit: 'm3/s',
      observed_at: observation?.observed_at ?? null, received_at: observation?.received_at ?? null,
      warning_stage_m: station.active_warning_stage_m == null ? null : Number(station.active_warning_stage_m),
      danger_stage_m: station.active_danger_stage_m == null ? null : Number(station.active_danger_stage_m),
      threshold_source_url: station.threshold_source_url ?? null,
      threshold_retrieved_at: station.threshold_retrieved_at ?? null,
      ...assessHydrometricStatus(station, observation),
    };
  });
}

export function assessHydrometricStatus(station: any, observation: any, now = new Date()) {
  const warning = station.active_warning_stage_m == null ? null : Number(station.active_warning_stage_m);
  const danger = station.active_danger_stage_m == null ? null : Number(station.active_danger_stage_m);
  const retrievedAt = new Date(station.threshold_retrieved_at ?? NaN).getTime();
  const hasThreshold = warning !== null || danger !== null;
  const staleThreshold = hasThreshold && (!Number.isFinite(retrievedAt) || now.getTime() - retrievedAt > 30 * 86400_000);
  const thresholdFlags: string[] = [];
  if (!hasThreshold) thresholdFlags.push('NO_VERIFIED_THRESHOLD');
  if (staleThreshold) thresholdFlags.push('STALE_THRESHOLD');
  if (warning === null) thresholdFlags.push('MISSING_WARNING_LEVEL');
  if (danger === null) thresholdFlags.push('MISSING_DANGER_LEVEL');
  const quality = observation ? assessObservationQuality({
    observed_at: observation.observed_at instanceof Date ? observation.observed_at.toISOString() : String(observation.observed_at),
    source_key: observation.source_key, observation_state: observation.observation_state,
    stage_m: observation.stage_m == null ? null : Number(observation.stage_m),
    discharge_cms: observation.discharge_cms == null ? null : Number(observation.discharge_cms),
    rainfall_mm: observation.rainfall_mm == null ? null : Number(observation.rainfall_mm), now,
  }) : { observation_state: 'UNAVAILABLE', quality_status: 'MISSING', quality_score: 0, quality_flags: ['NO_OBSERVATION'] };
  if (observation?.quality_status === 'REJECTED' || observation?.quality_status === 'SUSPECT') {
    quality.quality_status = observation.quality_status;
  }
  if (Array.isArray(observation?.quality_flags)) {
    quality.quality_flags = [...new Set([...quality.quality_flags, ...observation.quality_flags])];
  }
  const stage = observation?.stage_m == null ? null : Number(observation.stage_m);
  let status: 'NORMAL' | 'WATCH' | 'CRITICAL_SURGE' | 'UNKNOWN' = 'UNKNOWN';
  if (stage !== null && hasThreshold && !staleThreshold && quality.observation_state === 'OBSERVED' &&
      quality.quality_status === 'GOOD' && observation.quality_status === 'GOOD') {
    if (danger !== null && stage >= danger) status = 'CRITICAL_SURGE';
    else if (warning !== null && stage >= warning) status = 'WATCH';
    else if (warning !== null) status = 'NORMAL';
  }
  return { status, ...quality, threshold_status: !hasThreshold ? 'MISSING' : staleThreshold ? 'STALE' :
    warning === null || danger === null ? 'PARTIAL' : 'VERIFIED', threshold_flags: thresholdFlags };
}
