import '../config/environment';
import { db } from '../services/db.service';
import { getDhmIngestionConfig, runDhmIngestionCycle } from '../services/dhm_ingestion.service';
import { startPolling } from '../services/polling.service';

async function cycle() {
  const result = await runDhmIngestionCycle();
  console.log(JSON.stringify({ event: 'dhm_ingestion_cycle', at: new Date().toISOString(), ...result }));
  return result.skipped || (result.river?.status !== 'FAILED' && result.rainfall?.status !== 'FAILED');
}

async function main() {
  const config = getDhmIngestionConfig();
  if (process.argv.includes('--once')) {
    try { if (!await cycle()) process.exitCode = 1; }
    finally { await db.destroy(); }
    return;
  }
  const poller = startPolling(cycle, config.interval_ms, () => console.error('DHM ingestion cycle failed'));
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true; await poller.stop(); await db.destroy();
  }
  process.once('SIGINT', () => { void stop(); });
  process.once('SIGTERM', () => { void stop(); });
  console.log(JSON.stringify({ event: 'dhm_ingestion_started', interval_seconds: config.interval_ms / 1000,
    rainfall_station_ids: config.rainfall_station_ids }));
}

main().catch(async () => { console.error('DHM ingestion could not start'); process.exitCode = 1; await db.destroy(); });
