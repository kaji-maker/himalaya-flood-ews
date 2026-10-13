import '../config/environment';
import assert from 'node:assert/strict';
import { db } from '../services/db.service';
import { fetchDhmRiverWatch, persistDhmThresholdSnapshot } from '../services/dhm_thresholds.service';
import { assessHydrometricStatus, storeHydrometricObservation } from '../services/hydrology.service';

/** Live DB/HTTP verification; experiments run in a transaction that always rolls back. */
async function main() {
  process.env.NODE_ENV = 'test';
  const { app } = await import('../app');
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    assert(address && typeof address !== 'string');
    const origin = 'http://127.0.0.1:' + address.port;
    const base = origin + '/api/v1';
    async function call(route: string, body?: unknown) {
      const response = await fetch((route.startsWith('/health') ? origin : base) + route, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(25_000),
      });
      const result = await response.json() as any;
      assert(response.ok, route + ' failed with HTTP ' + response.status);
      return result;
    }

    const before = await db('glacial_lakes').count('* as count').first();
    const beforeObservations = await db('lake_observations').count('* as count').first();
    const snapshot = await fetchDhmRiverWatch() as any;
    const first = await persistDhmThresholdSnapshot(snapshot);
    const historyBefore = await db('hydrometric_station_thresholds').count('* as count').first();
    const second = await persistDhmThresholdSnapshot(snapshot);
    const historyAfter = await db('hydrometric_station_thresholds').count('* as count').first();
    assert.equal(historyBefore?.count, historyAfter?.count, 'Repeat sync changed threshold history');
    assert(second.synced.every(row => row.action === 'REFRESHED'));

    const registry = await call('/hydrology/stations');
    const registered = new Set(registry.data.map((station: any) => Number(station.station_number)));
    assert(registered.has(289.95), 'Decimal station identifier is missing');
    const ingested: Array<{ station_number: number; id: string; observed_at: string }> = [];
    for (const row of snapshot.data) {
      const stationNumber = Number(row.stationIndex);
      if (!registered.has(stationNumber) || !row.waterLevel?.datetime || !Number.isFinite(row.waterLevel?.value)) continue;
      const input = {
        station_number: stationNumber, observed_at: row.waterLevel.datetime, stage_m: row.waterLevel.value,
        trend: ['RISING', 'FALLING', 'STEADY'].includes(row.steady) ? row.steady : 'UNKNOWN',
        source_key: 'dhm-hydrology', raw_payload: row,
      };
      const result = await call('/hydrology/observations', input);
      const repeat = await call('/hydrology/observations', input);
      assert.equal(result.data.id, repeat.data.id, 'Observation replay was not idempotent');
      assert.equal(new Date(result.data.observed_at).toISOString(), new Date(input.observed_at).toISOString());
      assert.equal(result.data.source_key, 'dhm-hydrology');
      assert.equal(Number(result.data.stage_m), Number(input.stage_m.toFixed(3)));
      const compatibility = await call('/dispatch/dhm-stations/' + stationNumber + '/reading', input);
      assert.equal(compatibility.data.observation.id, result.data.id);
      const history = await call('/hydrology/stations/' + stationNumber + '/observations?limit=1');
      assert.equal(history.data[0].id, result.data.id);
      ingested.push({ station_number: stationNumber, id: result.data.id, observed_at: result.data.observed_at });
    }

    // Replay edge cases in savepoints under an outer transaction that is discarded.
    const trx = await db.transaction();
    try {
      const activeBefore = await trx('hydrometric_station_thresholds').whereNull('effective_to').count('* as count').first();
      const changed = JSON.parse(JSON.stringify(snapshot));
      const target = changed.data.find((row: any) => Number(row.stationIndex) === 289.95);
      assert(target, 'Expected Chepang in the successful snapshot');
      target.warning_level = String(Number(target.warning_level) - 0.1);
      const update = await persistDhmThresholdSnapshot(changed, trx);
      assert.equal(update.synced.find(row => row.station_number === 289.95)?.action, 'UPDATED');
      const changedCount = await trx('hydrometric_station_thresholds').count('* as count').first();
      assert.equal(Number(changedCount?.count), Number(historyAfter?.count) + 1);
      const activeAfter = await trx('hydrometric_station_thresholds').whereNull('effective_to').count('* as count').first();
      assert.equal(activeBefore?.count, activeAfter?.count);

      const withdrawn = JSON.parse(JSON.stringify(changed));
      const withdrawnRow = withdrawn.data.find((row: any) => Number(row.stationIndex) === 289.95);
      withdrawnRow.warning_level = ''; withdrawnRow.danger_level = '';
      const removal = await persistDhmThresholdSnapshot(withdrawn, trx);
      assert(removal.skipped.some(row => row.station_number === 289.95 && row.reason === 'THRESHOLDS_WITHDRAWN'));
      const station = await trx('hydrometric_stations').where({ station_number: 289.95 }).first();
      assert.equal(await trx('hydrometric_station_thresholds').where({ station_id: station.id }).whereNull('effective_to').first(), undefined);

      await assert.rejects(persistDhmThresholdSnapshot({ status: 'error', data: [] }, trx));
      const sample = await storeHydrometricObservation({
        station_number: 289.95, observed_at: new Date().toISOString(), stage_m: 9, source_key: 'legacy-demo',
        raw_payload: { purpose: 'rollback-only smoke experiment' },
      }, trx);
      assert.equal(sample.observation.observation_state, 'SIMULATED');
      assert.equal(assessHydrometricStatus({ active_warning_stage_m: 5.5, active_danger_stage_m: 6.8,
        threshold_retrieved_at: new Date() }, sample.observation).status, 'UNKNOWN');
    } finally { await trx.rollback(); }

    const finalHistory = await db('hydrometric_station_thresholds').count('* as count').first();
    assert.equal(finalHistory?.count, historyAfter?.count, 'Rollback experiments affected real threshold history');
    const lakes = await db('glacial_lakes').count('* as count').first();
    const lakeObservations = await db('lake_observations').count('* as count').first();
    assert.equal(lakes?.count, before?.count);
    assert.equal(lakeObservations?.count, beforeObservations?.count);
    const dashboard = await call('/dispatch/dhm-stations');
    assert.equal(dashboard.count, registry.count);
    for (const station of dashboard.data) {
      if (station.observation_state !== 'OBSERVED' || station.threshold_status === 'MISSING' || station.threshold_status === 'STALE') {
        assert.equal(station.status, 'UNKNOWN');
      }
    }
    const health = await call('/health/deep');
    assert.equal(health.components.database.status, 'healthy');
    console.log(JSON.stringify({
      success: true, database: 'healthy', registered_stations: registry.count, threshold_stations: first.synced.length,
      ingested_observations: ingested.length, threshold_replay_idempotent: true, observation_replay_idempotent: true,
      rollback_cases_verified: true, lakes_preserved: Number(lakes?.count), lake_observations_preserved: Number(lakeObservations?.count),
      stations: dashboard.data.map((row: any) => ({ station_number: row.station_number, status: row.status,
        observation_state: row.observation_state, threshold_status: row.threshold_status })),
    }));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await db.destroy();
  }
}

main().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : 'Hydrology smoke check failed'); process.exitCode = 1; });
