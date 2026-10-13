import { fetchHydrologySnapshot, RAINFALL_WINDOWS } from '../src/lib/hydrology';

async function main() {
  const base = process.env.HYDROLOGY_SMOKE_BASE_URL || 'http://localhost:4000/api/v1';
  for (const hours of RAINFALL_WINDOWS) {
    const snapshot = await fetchHydrologySnapshot(base, hours, new AbortController().signal);
    const errors = [snapshot.rivers.error, snapshot.rainfall.error, snapshot.health.error].filter(Boolean);
    console.log(JSON.stringify({ hours, river_stations: snapshot.rivers.data?.length ?? null,
      rainfall_stations: snapshot.rainfall.data?.length ?? null, ingestion_status: snapshot.health.data?.status ?? null,
      errors, success: errors.length === 0 }));
    if (errors.length) process.exitCode = 1;
  }
}
void main().catch(() => { console.error('Hydrology read-only smoke check failed'); process.exitCode = 1; });
