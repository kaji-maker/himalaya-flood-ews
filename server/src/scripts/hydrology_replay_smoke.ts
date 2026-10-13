import '../config/environment';
import assert from 'node:assert/strict';
import { db } from '../services/db.service';
import { replayHydrology } from '../services/hydrology_backtest.service';

/** Synthetic SQL experiments stay in a rolled-back transaction; no provider calls. */
async function main() {
  const trx = await db.transaction();
  let experimentId: string | undefined;
  try {
    const threshold = await trx('hydrometric_station_thresholds').where({ status: 'VERIFIED' }).whereNull('effective_to')
      .whereNotNull('danger_stage_m').whereNotNull('warning_stage_m').first();
    assert(threshold, 'A verified complete threshold is needed for this smoke check');
    const station = await trx('hydrometric_stations').where({ id: threshold.station_id }).first();
    assert(station);
    const time = new Date().toISOString();
    await trx('hydrometric_station_thresholds').where({ id: threshold.id }).update({ retrieved_at: time });
    const [created] = await trx('hydrometric_observations').insert({ station_id: station.id,
      observed_at: time, received_at: time, stage_m: Number(threshold.warning_stage_m),
      source_key: 'dhm-hydrology', observation_state: 'OBSERVED', quality_status: 'GOOD',
      quality_flags: JSON.stringify([]), raw_payload: JSON.stringify({ synthetic_rollback_experiment: true }) }).returning('*');
    experimentId = created.id;
    await trx('hydrometric_observations').where({ id: created.id }).update({ stage_m: Number(threshold.danger_stage_m) });
    const captures = await trx('hydrometric_replay_audit').where({ entity_type: 'OBSERVATION', entity_id: created.id }).orderBy('sequence');
    assert.equal(captures.length, 2);
    assert.equal(Number(captures[0].snapshot.stage_m), Number(threshold.warning_stage_m));
    assert.equal(Number(captures[1].snapshot.stage_m), Number(threshold.danger_stage_m));
    assert(!('raw_payload' in captures[0].snapshot));
    const history = await trx('hydrometric_replay_audit').where({ entity_type: 'THRESHOLD', station_id: station.id }).orderBy('sequence');
    const row = (capture: any) => ({ ...capture.snapshot, id: 'capture-' + capture.sequence,
      station_number: Number(station.station_number), available_at: new Date(capture.recorded_at).toISOString(),
      availability_order: Number(capture.sequence), capture_kind: capture.capture_kind });
    const report = replayHydrology({ data_kind: 'synthetic', stations: [{ station_number: Number(station.station_number), name: 'Synthetic SQL rollback experiment' }],
      observations: captures.map(capture => ({ ...row(capture), observation_id: capture.entity_id })),
      thresholds: history.map(capture => ({ ...row(capture), threshold_id: capture.entity_id })), labels: [],
    });
    assert.deepEqual(report.timeline.map(point => point.status), ['WATCH', 'CRITICAL_SURGE']);
    await assert.rejects(trx.transaction(async savepoint => {
      await savepoint('hydrometric_replay_audit').where({ sequence: captures[0].sequence }).update({ snapshot: {} });
    }), /append-only/);
    await assert.rejects(trx.transaction(async savepoint => {
      await savepoint('hydrometric_replay_audit').where({ sequence: captures[0].sequence }).delete();
    }), /append-only/);
    await trx.rollback();
    assert.equal(await db('hydrometric_observations').where({ id: experimentId }).first(), undefined);
    assert.equal(await db('hydrometric_replay_audit').where({ entity_id: experimentId }).first(), undefined);
    console.log(JSON.stringify({ success: true, observation_corrections_preserved: true, as_of_thresholds_verified: true,
      append_only_update_delete_verified: true, raw_payload_excluded: true, experiments_rolled_back: true, provider_calls: 0 }));
  } finally {
    if (!trx.isCompleted()) await trx.rollback();
    await db.destroy();
  }
}
void main().catch(() => { console.error('Replay archive smoke check failed'); process.exitCode = 1; });
