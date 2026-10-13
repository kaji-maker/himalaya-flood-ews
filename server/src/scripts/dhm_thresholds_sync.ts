import '../config/environment';
import { db } from '../services/db.service';
import { syncDhmRiverWatchThresholds } from '../services/dhm_thresholds.service';

async function main() {
  try {
    const result = await syncDhmRiverWatchThresholds();
    console.log(JSON.stringify({ source_url: result.source_url, received: result.received,
      synced: result.synced, skipped_count: result.skipped.length,
      registered_gaps: result.skipped.filter(row => row.reason !== 'STATION_NOT_REGISTERED') }));
  } catch {
    console.error('DHM threshold sync failed; check database availability and the DHM feed');
    process.exitCode = 1;
  } finally { await db.destroy(); }
}

void main();
