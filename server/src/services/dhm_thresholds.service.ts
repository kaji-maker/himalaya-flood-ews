import { db } from './db.service';
import { Knex } from 'knex';

export const DHM_RIVER_WATCH_URL = 'https://dhm.gov.np/site/riverWatchTableViewData';

export interface DhmRiverWatchThreshold {
  station_number: number;
  warning_stage_m: number | null;
  danger_stage_m: number | null;
  raw_payload: Record<string, unknown>;
}

function parseNumber(value: unknown): number | null | undefined {
  if (value == null || (typeof value === 'string' && !value.trim())) return null;
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  if (typeof value === 'string' && !/^\d+(\.\d+)?$/.test(value.trim())) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number < 100000 ? number : undefined;
}

/** A successful nonempty full snapshot can include explicitly withdrawn thresholds. */
export function parseDhmThresholdSnapshot(payload: unknown) {
  const value = payload as any;
  if (value?.status !== 'success' || !Array.isArray(value.data) || !value.data.length) {
    throw new Error('DHM River Watch did not return a successful nonempty snapshot');
  }
  const rows = new Map<number, DhmRiverWatchThreshold>();
  const issues = new Map<number, string>();
  for (const item of value.data) {
    const stationNumber = parseNumber(item?.stationIndex);
    if (stationNumber == null || stationNumber <= 0 || Math.abs(stationNumber * 100 - Math.round(stationNumber * 100)) > 1e-6) continue;
    const warning = parseNumber(item?.warning_level);
    const danger = parseNumber(item?.danger_level);
    if (warning === undefined || danger === undefined ||
        (warning !== null && danger !== null && warning >= danger)) {
      issues.set(stationNumber, 'INVALID_THRESHOLDS');
      rows.delete(stationNumber);
      continue;
    }
    if (issues.has(stationNumber)) continue;
    const previous = rows.get(stationNumber);
    if (previous && (previous.warning_stage_m !== warning || previous.danger_stage_m !== danger)) {
      rows.delete(stationNumber);
      issues.set(stationNumber, 'CONFLICTING_THRESHOLDS');
      continue;
    }
    rows.set(stationNumber, {
      station_number: stationNumber, warning_stage_m: warning, danger_stage_m: danger,
      raw_payload: item,
    });
  }
  if (!rows.size && !issues.size) throw new Error('DHM snapshot contains no usable station identifiers');
  return { rows, issues, received: value.data.length };
}

/** Preserve the existing parser API: return only usable, nonempty threshold pairs. */
export function parseDhmRiverWatchPayload(payload: unknown): DhmRiverWatchThreshold[] {
  return [...parseDhmThresholdSnapshot(payload).rows.values()]
    .filter(row => row.warning_stage_m !== null || row.danger_stage_m !== null);
}

export async function fetchDhmRiverWatch(): Promise<unknown> {
  const response = await fetch(DHM_RIVER_WATCH_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error('DHM River Watch returned HTTP ' + response.status);
  return response.json();
}

/** Injectable snapshot for replay validation; production sync fetches the official feed. */
export async function persistDhmThresholdSnapshot(payload: unknown, store: Knex = db) {
  const parsed = parseDhmThresholdSnapshot(payload);
  const synced: Array<{ station_number: number; station_id: string; action: 'CREATED' | 'UPDATED' | 'REFRESHED' }> = [];
  const skipped: Array<{ station_number: number; reason: string }> = [];
  await store.transaction(async trx => {
    const source = await trx('data_sources').where({ source_key: 'dhm-hydrology', enabled: true }).first();
    if (!source) throw new Error('DHM hydrology source is disabled or unregistered');
    // Ordered station locks serialize simultaneous syncs before reading active versions.
    const stations = await trx('hydrometric_stations').where({ active: true, source_key: 'dhm-hydrology' })
      .orderBy('station_number').forUpdate();
    for (const station of stations) {
      const stationNumber = Number(station.station_number);
      const threshold = parsed.rows.get(stationNumber);
      const current = await trx('hydrometric_station_thresholds').where({ station_id: station.id })
        .whereNull('effective_to').whereNot('status', 'RETIRED').first();
      const retrievedAt = new Date();
      if (!threshold || (threshold.warning_stage_m === null && threshold.danger_stage_m === null)) {
        const reason = parsed.issues.get(stationNumber) ||
          (threshold ? 'THRESHOLDS_WITHDRAWN' : 'STATION_NOT_IN_SNAPSHOT');
        if (current && current.source_key === 'dhm-hydrology') {
          const retiredAt = new Date(Math.max(retrievedAt.getTime(), new Date(current.effective_from).getTime() + 1));
          await trx('hydrometric_station_thresholds').where({ id: current.id })
            .update({ effective_to: retiredAt, status: 'RETIRED', notes: reason });
        }
        skipped.push({ station_number: stationNumber, reason });
        continue;
      }
      const same = current && current.status === 'VERIFIED' && current.source_key === 'dhm-hydrology' &&
        (current.warning_stage_m == null ? null : Number(current.warning_stage_m)) === threshold.warning_stage_m &&
        (current.danger_stage_m == null ? null : Number(current.danger_stage_m)) === threshold.danger_stage_m;
      if (same) {
        await trx('hydrometric_station_thresholds').where({ id: current.id }).update({
          retrieved_at: retrievedAt, raw_payload: JSON.stringify(threshold.raw_payload),
        });
      } else {
        const effectiveAt = new Date(Math.max(retrievedAt.getTime(), current ? new Date(current.effective_from).getTime() + 1 : 0));
        if (current) await trx('hydrometric_station_thresholds').where({ id: current.id })
          .update({ effective_to: effectiveAt, status: 'RETIRED' });
        await trx('hydrometric_station_thresholds').insert({
          station_id: station.id, warning_stage_m: threshold.warning_stage_m, danger_stage_m: threshold.danger_stage_m,
          source_key: 'dhm-hydrology', source_url: DHM_RIVER_WATCH_URL, effective_from: effectiveAt,
          retrieved_at: retrievedAt, raw_payload: JSON.stringify(threshold.raw_payload), status: 'VERIFIED',
        });
      }
      synced.push({ station_number: stationNumber, station_id: station.id, action: same ? 'REFRESHED' : current ? 'UPDATED' : 'CREATED' });
    }
    const registered = new Set(stations.map(s => Number(s.station_number)));
    for (const row of parsed.rows.values()) {
      if (!registered.has(row.station_number)) skipped.push({ station_number: row.station_number, reason: 'STATION_NOT_REGISTERED' });
    }
  });
  return { source_url: DHM_RIVER_WATCH_URL, received: parsed.received, synced, skipped };
}

export async function syncDhmRiverWatchThresholds() {
  return persistDhmThresholdSnapshot(await fetchDhmRiverWatch());
}
