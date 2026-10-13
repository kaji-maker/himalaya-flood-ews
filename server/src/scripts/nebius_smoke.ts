import '../config/environment';
import assert from 'node:assert/strict';

/** Explicit live smoke check: one billed synthetic summary, never run by npm test. */
async function main() {
  // Use the exported app on an ephemeral local port, without a second listener.
  process.env.NODE_ENV = 'test';
  const { app } = await import('../app');
  const { db } = await import('../services/db.service');
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    assert(address && typeof address !== 'string');
    const endpoint = 'http://127.0.0.1:' + address.port + '/api/v1/research/nebius';
    const statusResponse = await fetch(endpoint + '/status');
    const status = await statusResponse.json() as any;
    if (!statusResponse.ok || !status.data?.configured) {
      console.log(JSON.stringify({ success: false, code: status.code || 'NEBIUS_NOT_CONFIGURED' }));
      process.exitCode = 1;
      return;
    }
    const observations = [
      { timestamp: '2024-07-01T04:25:00+05:45', metric: 'river_stage', value: 2.4, unit: 'm', source: 'synthetic-test' },
      { timestamp: '2024-07-01T04:25:00+05:45', metric: 'rainfall_24h', value: 61, unit: 'mm', source: 'synthetic-test' },
    ];
    const response = await fetch(endpoint + '/hydrology-summary', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Synthetic connectivity test', data_kind: 'synthetic', observations }),
      signal: AbortSignal.timeout(25_000),
    });
    const payload = await response.json() as any;
    if (!response.ok) {
      console.log(JSON.stringify({ success: false, http_status: response.status, code: payload.code, metadata: payload.metadata }));
      process.exitCode = 1;
      return;
    }
    assert.deepEqual(payload.data.observations, observations);
    assert.equal(payload.data.experimental, true);
    assert.equal(payload.data.truncated, false);
    assert(payload.data.summary?.trim());
    console.log(JSON.stringify({ success: true, http_status: response.status, measurements_preserved: true,
      experimental: payload.data.experimental, model: payload.data.model,
      latency_ms: payload.data.latency_ms, usage: payload.data.usage, truncated: payload.data.truncated }));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await db.destroy();
  }
}

main().catch(() => { console.error('Live research smoke check failed'); process.exitCode = 1; });
