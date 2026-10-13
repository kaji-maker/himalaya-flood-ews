import '../config/environment';
import assert from 'node:assert/strict';
import { db } from '../services/db.service';
import { fetchDhmRiverWatch } from '../services/dhm_thresholds.service';
import { fetchDhmRainfallPage } from '../services/dhm_rainfall.service';
import { runDhmIngestionCycle } from '../services/dhm_ingestion.service';

/** Live feeds + replay + locking + failure isolation; no Nebius calls. */
async function main() {
  process.env.NODE_ENV = 'test';
  const { app } = await import('../app');
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    assert(address && typeof address !== 'string');
    const base = 'http://127.0.0.1:' + address.port + '/api/v1/hydrology';
    const pages = new Map<number, string>();
    let riverPayload: unknown;
    const dependencies = {
      river: async () => { riverPayload = await fetchDhmRiverWatch(); return riverPayload; },
      rainfall: async (id: number) => { const page = await fetchDhmRainfallPage(id); pages.set(id, page); return page; },
    };
    const first = await runDhmIngestionCycle(db, dependencies);
    assert(!first.skipped && first.river?.status !== 'FAILED' && first.rainfall?.status !== 'FAILED');
    const riverBefore = await db('hydrometric_observations').count('* as count').first();
    const rainBefore = await db('rainfall_observations').count('* as count').first();
    const thresholdBefore = await db('hydrometric_station_thresholds').count('* as count').first();
    assert(pages.size > 0);
    const repeat = await runDhmIngestionCycle(db, {
      river: async () => riverPayload,
      rainfall: async (id: number) => { const page = pages.get(id); assert(page); return page; },
    });
    assert(!repeat.skipped);
    assert.equal((await db('hydrometric_observations').count('* as count').first())?.count, riverBefore?.count);
    assert.equal((await db('rainfall_observations').count('* as count').first())?.count, rainBefore?.count);
    assert.equal((await db('hydrometric_station_thresholds').count('* as count').first())?.count, thresholdBefore?.count);

    const lock = await db.transaction();
    try {
      await lock.raw('SELECT pg_advisory_xact_lock(731304, 1)');
      let requested = false;
      const skip = await runDhmIngestionCycle(db, {
        river: async () => { requested = true; return {}; }, rainfall: async () => { requested = true; return ''; },
      });
      assert.equal(skip.skipped, true); assert.equal(requested, false);
    } finally { await lock.rollback(); }

    const failureTransaction = await db.transaction();
    try {
      const failures = await runDhmIngestionCycle(failureTransaction, {
        river: async () => { throw new Error('synthetic network failure'); },
        rainfall: async () => { throw new Error('synthetic network failure'); },
      });
      assert.equal(failures.river?.status, 'FAILED'); assert.equal(failures.rainfall?.status, 'FAILED');
      const state = await failureTransaction('ingestion_feed_state');
      assert(state.every(row => row.consecutive_failures > 0 && row.last_success_at));
    } finally { await failureTransaction.rollback(); }

    const rainfallResponse = await fetch(base + '/rainfall/stations?hours=24');
    assert.equal(rainfallResponse.status, 200);
    const rainfall = await rainfallResponse.json() as any;
    assert.equal(rainfall.count, pages.size);
    for (const station of rainfall.data) {
      assert.equal(station.unit, 'mm'); assert.equal(station.source_key, 'dhm-rainfall');
      assert.equal(station.timestamp_basis, 'LATEST_STATION_OBSERVATION');
    }
    const detail = await fetch(base + '/rainfall/stations/' + rainfall.data[0].dhm_station_id + '/observations');
    assert.equal(detail.status, 200);
    const history = await detail.json() as any;
    assert([1, 3, 6, 12, 24].every(hours => history.data.some((row: any) => row.duration_hours === hours)));
    assert.equal((await fetch(base + '/rainfall/stations?hours=2')).status, 400);
    const healthResponse = await fetch(base + '/ingestion/status');
    assert.equal(healthResponse.status, 200);
    const health = await healthResponse.json() as any;
    assert.equal(health.data.feeds.length, 2);
    assert(health.data.feeds.every((feed: any) => feed.status !== 'FAILED'));
    console.log(JSON.stringify({ success: true, poll_interval_seconds: health.data.poll_interval_seconds,
      feed_status: health.data.status, rainfall_stations: rainfall.count, rainfall_observations_in_cycle: first.rainfall?.counts.observations,
      replay_idempotent: true, singleton_lock_verified: true, failure_isolation_verified: true,
      api_readback_verified: true, rollback_experiments_discarded: true }));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await db.destroy();
  }
}

main().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : 'DHM ingestion smoke check failed'); process.exitCode = 1; });
