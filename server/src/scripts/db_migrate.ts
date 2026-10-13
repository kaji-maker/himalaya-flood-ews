import '../config/environment';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { db } from '../services/db.service';

async function main() {
  try {
    const directory = path.resolve(__dirname, '../../../database/migrations');
    const files = readdirSync(directory).filter(file => /^\d+.*\.sql$/.test(file)).sort();
    await db.transaction(async trx => {
      for (const file of files) {
        await trx.raw(readFileSync(path.join(directory, file), 'utf8'));
        console.log('Applied ' + file);
      }
    });
    console.log('Database migrations committed');
  } catch {
    console.error('Database migrations failed and were rolled back');
    process.exitCode = 1;
  } finally { await db.destroy(); }
}

void main();
