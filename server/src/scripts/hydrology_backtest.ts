import '../config/environment';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { db } from '../services/db.service';
import { backtestCanonicalHydrology, replayHydrology } from '../services/hydrology_backtest.service';
import { HydrologyValidationError } from '../services/hydrology.service';

async function main() {
  const args = process.argv.slice(2);
  const value = (flag: string) => { const i = args.indexOf(flag); return i === -1 ? undefined : args[i + 1]; };
  const accepted = new Set(['--input', '--start', '--end', '--station']);
  try {
    for (let i = 0; i < args.length; i += 2) {
      if (!accepted.has(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw new HydrologyValidationError('Invalid replay CLI arguments', 400);
    }
    if (new Set(args.filter((_, i) => i % 2 === 0)).size !== args.length / 2) throw new HydrologyValidationError('Duplicate replay CLI arguments', 400);
    const input = value('--input');
    if (input && args.length !== 2) throw new HydrologyValidationError('Use --input alone or canonical --start/--end/--station options', 400);
    let report;
    if (input) {
      const filename = path.resolve(input);
      if (statSync(filename).size > 2_000_000) throw new HydrologyValidationError('Replay fixture exceeds 2 MB', 413);
      report = replayHydrology(JSON.parse(readFileSync(filename, 'utf8')));
    } else {
      const end = value('--end') ?? new Date().toISOString();
      const start = value('--start') ?? new Date(Date.parse(end) - 24 * 3600_000).toISOString();
      report = await backtestCanonicalHydrology({ start, end, station_number: value('--station') });
    }
    const { timeline, ...summary } = report;
    console.log(JSON.stringify({ ...summary, timeline_omitted_from_cli: true }, null, 2));
  } catch (error) {
    console.error(error instanceof HydrologyValidationError ? error.message : 'Replay failed: check the input file or canonical database/migration configuration');
    process.exitCode = 1;
  } finally { await db.destroy(); }
}
void main();
