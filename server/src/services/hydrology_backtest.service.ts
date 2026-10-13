import { z } from 'zod';
import { createHash } from 'node:crypto';
import { db } from './db.service';
import { assessHydrometricStatus, HydrologyValidationError } from './hydrology.service';

export const MAX_REPLAY_POINTS = 5000;
const date = z.string().datetime({ offset: true });
const measurement = z.number().finite().min(0).nullable();
const sourceUrl = z.string().url().refine(value => {
  const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password;
}, 'A credential-free HTTPS source URL is required');
const capture = {
  id: z.string().min(1).max(128), station_number: z.number().finite().positive(),
  available_at: date, availability_order: z.number().int().positive().safe(),
  capture_kind: z.enum(['BASELINE', 'INSERT', 'UPDATE']), source_key: z.string().min(1).max(96),
};
export const ReplayInputSchema = z.object({
  data_kind: z.enum(['historical', 'synthetic']),
  stations: z.array(z.object({ station_number: z.number().finite().positive(), name: z.string().min(1).max(160) })).max(200),
  observations: z.array(z.object({ ...capture, observation_id: z.string().min(1).max(128),
    observed_at: date, received_at: date, stage_m: measurement, stage_unit: z.literal('m'),
    discharge_cms: measurement, discharge_unit: z.literal('m3/s'),
    observation_state: z.enum(['OBSERVED', 'STALE', 'SIMULATED', 'FORECAST', 'MODELLED', 'UNAVAILABLE']),
    quality_status: z.enum(['GOOD', 'SUSPECT', 'REJECTED', 'MISSING']), quality_flags: z.array(z.string().max(160)).max(30),
  })).max(MAX_REPLAY_POINTS),
  thresholds: z.array(z.object({ ...capture, threshold_id: z.string().min(1).max(128),
    effective_from: date, effective_to: date.nullable(), retrieved_at: date, unit: z.literal('m'),
    warning_stage_m: measurement, danger_stage_m: measurement,
    status: z.enum(['VERIFIED', 'PROVISIONAL', 'RETIRED']), source_url: sourceUrl,
  }).refine(row => row.effective_to === null || Date.parse(row.effective_to) > Date.parse(row.effective_from))
    .refine(row => row.warning_stage_m !== null || row.danger_stage_m !== null)
    .refine(row => row.warning_stage_m === null || row.danger_stage_m === null || row.warning_stage_m <= row.danger_stage_m))
    .max(20_000),
  labels: z.array(z.object({ observation_capture_id: z.string().min(1).max(128), hazard_present: z.boolean(),
    source_url: sourceUrl, reviewed_by: z.string().min(1).max(160),
    evidence_kind: z.enum(['INDEPENDENT_EVENT_RECORD', 'SYNTHETIC_TEST_EXPECTATION']),
  })).max(MAX_REPLAY_POINTS).default([]),
});
export type ReplayInput = z.infer<typeof ReplayInputSchema>;
const RULE_ID = 'dhm-river-stage-v1';

function invalid(message: string): never { throw new HydrologyValidationError(message, 400); }
/** No dispatch, model invocation, optimization, or label-derived thresholds. */
export function replayHydrology(input: unknown) {
  const parsed = ReplayInputSchema.safeParse(input);
  if (!parsed.success) invalid('Invalid replay dataset, units, timestamps, or limits');
  const data = parsed.data;
  const stations = new Map(data.stations.map(row => [row.station_number, row]));
  if (stations.size !== data.stations.length) invalid('Duplicate station identifiers');
  const ids = new Set<string>(), orders = new Set<number>();
  for (const row of [...data.observations, ...data.thresholds]) {
    if (ids.has(row.id) || orders.has(row.availability_order)) invalid('Duplicate capture identifier or availability order');
    ids.add(row.id); orders.add(row.availability_order);
    if (!stations.has(row.station_number)) invalid('Capture references an unregistered dataset station');
  }
  const observationIds = new Set(data.observations.map(row => row.id));
  const labels = new Map(data.labels.map(row => [row.observation_capture_id, row]));
  if (labels.size !== data.labels.length) invalid('Duplicate or conflicting outcome labels');
  for (const label of data.labels) {
    if (!observationIds.has(label.observation_capture_id)) invalid('Outcome label references an absent observation capture');
    if (label.evidence_kind !== (data.data_kind === 'synthetic' ? 'SYNTHETIC_TEST_EXPECTATION' : 'INDEPENDENT_EVENT_RECORD'))
      invalid('Label evidence kind does not match the dataset kind');
  }
  const history = [...data.thresholds].sort((a, b) => a.availability_order - b.availability_order);
  const points = [...data.observations].sort((a, b) => a.availability_order - b.availability_order);
  const asOf = new Map<number, typeof history[number]>();
  let cursor = 0;
  const counts = { NORMAL: 0, WATCH: 0, CRITICAL_SURGE: 0, UNKNOWN: 0 };
  const perStation = new Map(data.stations.map(row => [row.station_number, { ...row, readings: 0, classified: 0, unknown: 0, source_gap_count: 0, max_source_gap_seconds: 0 }]));
  const lastSource = new Map<number, number>();
  const confusion = { true_positive: 0, false_positive: 0, true_negative: 0, false_negative: 0, abstained: 0,
    abstained_hazard_positive: 0, abstained_hazard_negative: 0, labeled_total: data.labels.length };
  const timeline = points.map(point => {
    while (cursor < history.length && history[cursor].availability_order < point.availability_order) {
      asOf.set(history[cursor].station_number, history[cursor]); cursor++;
    }
    const threshold = asOf.get(point.station_number);
    const clock = new Date(point.available_at);
    const flags: string[] = [];
    if (point.capture_kind === 'BASELINE') flags.push('BASELINE_RECEIPT_HISTORY_UNVERIFIED');
    if (Date.parse(point.received_at) > clock.getTime()) flags.push('RECEIPT_AFTER_CAPTURE');
    const thresholdAvailable = threshold !== undefined && Date.parse(threshold.available_at) <= clock.getTime() &&
      Date.parse(threshold.retrieved_at) <= clock.getTime() && Date.parse(threshold.effective_from) <= clock.getTime() &&
      (threshold.effective_to === null || Date.parse(threshold.effective_to) > clock.getTime()) && threshold.status === 'VERIFIED';
    if (!thresholdAvailable) flags.push('NO_AS_OF_VERIFIED_THRESHOLD');
    const assessment = assessHydrometricStatus(!thresholdAvailable ? {} : {
      active_warning_stage_m: threshold?.warning_stage_m, active_danger_stage_m: threshold?.danger_stage_m,
      threshold_retrieved_at: threshold?.retrieved_at,
    }, point, clock);
    const status = flags.length ? 'UNKNOWN' : assessment.status;
    counts[status]++;
    const station = perStation.get(point.station_number)!;
    station.readings++; station[status === 'UNKNOWN' ? 'unknown' : 'classified']++;
    const sourceTime = Date.parse(point.observed_at), previous = lastSource.get(point.station_number);
    if (previous !== undefined && sourceTime > previous) {
      const gap = (sourceTime - previous) / 1000;
      station.max_source_gap_seconds = Math.max(station.max_source_gap_seconds, gap);
      if (gap > 6 * 3600) station.source_gap_count++;
    }
    lastSource.set(point.station_number, Math.max(previous ?? -Infinity, sourceTime));
    const label = labels.get(point.id);
    if (label) {
      if (status === 'UNKNOWN') {
        confusion.abstained++;
        confusion[label.hazard_present ? 'abstained_hazard_positive' : 'abstained_hazard_negative']++;
      }
      else {
        const positive = status === 'WATCH' || status === 'CRITICAL_SURGE';
        confusion[positive ? label.hazard_present ? 'true_positive' : 'false_positive' : label.hazard_present ? 'false_negative' : 'true_negative']++;
      }
    }
    return { ...point, recorded_quality_status: point.quality_status, recorded_observation_state: point.observation_state,
      replay_at: point.available_at, rule_id: RULE_ID, status,
      threshold_capture_id: !thresholdAvailable ? null : threshold?.id ?? null,
      warning_stage_m: !thresholdAvailable ? null : threshold?.warning_stage_m ?? null,
      danger_stage_m: !thresholdAvailable ? null : threshold?.danger_stage_m ?? null,
      threshold_source_url: !thresholdAvailable ? null : threshold?.source_url ?? null,
      threshold_retrieved_at: !thresholdAvailable ? null : threshold?.retrieved_at ?? null,
      threshold_status: assessment.threshold_status, quality_status: assessment.quality_status,
      observation_state: assessment.observation_state, flags: [...new Set([...flags, ...assessment.quality_flags, ...assessment.threshold_flags])],
      outcome_label: label ?? null };
  });
  const divide = (numerator: number, denominator: number) => denominator === 0 ? null : numerator / denominator;
  return {
    experimental: true, rule_id: RULE_ID, data_kind: data.data_kind,
    input_sha256: createHash('sha256').update(JSON.stringify({ ...data,
      stations: [...data.stations].sort((a, b) => a.station_number - b.station_number), observations: points, thresholds: history,
      labels: [...data.labels].sort((a, b) => a.observation_capture_id === b.observation_capture_id ? 0 : a.observation_capture_id < b.observation_capture_id ? -1 : 1),
    })).digest('hex'),
    validation_status: data.data_kind === 'synthetic' ? 'SYNTHETIC_RULE_CHECK' : data.labels.length ? 'LABELED_REPLAY_UNVALIDATED' : 'RULE_REPLAY_ONLY',
    operationally_validated: false,
    summary: { observation_captures: timeline.length, registered_stations: stations.size, counts,
      classified_fraction: divide(timeline.length - counts.UNKNOWN, timeline.length), labeled_captures: data.labels.length,
      unlabeled_captures: timeline.length - data.labels.length, stations: [...perStation.values()] },
    performance: data.labels.length ? { ...confusion, evaluation_unit: 'LABELED_OBSERVATION_CAPTURE', metric_scope: 'CONDITIONAL_ON_CLASSIFIED_LABELS',
      positive_rule_states: ['WATCH', 'CRITICAL_SURGE'], classified_label_fraction: divide(data.labels.length - confusion.abstained, data.labels.length),
      precision: divide(confusion.true_positive, confusion.true_positive + confusion.false_positive),
      recall: divide(confusion.true_positive, confusion.true_positive + confusion.false_negative),
      recall_lower_bound_including_abstentions: divide(confusion.true_positive,
        confusion.true_positive + confusion.false_negative + confusion.abstained_hazard_positive),
      false_alarm_ratio: divide(confusion.false_positive, confusion.true_positive + confusion.false_positive),
      event_detection_rate: null, lead_time_seconds: null } : null,
    limitations: ['RESEARCH_NOT_PUBLIC_WARNING', 'NO_FORECAST_OR_FLASH_FLOOD_OR_LANDSLIDE_MODEL',
      'BASELINE_CAPTURES_CANNOT_RECONSTRUCT_ORIGINAL_RECEIPT_HISTORY', 'CAPTURE_TIME_IS_NOT_TRANSACTION_COMMIT_TIME',
      'PER_OBSERVATION_COUNTS_ARE_NOT_INDEPENDENT_EVENT_SKILL', 'UNKNOWN_LABELS_ARE_ABSTENTIONS_NOT_TRUE_NEGATIVES'],
    timeline,
  };
}

export const ReplayQuerySchema = z.object({ start: date, end: date, station_number: z.coerce.number().finite().positive().optional() })
  .refine(value => Date.parse(value.end) > Date.parse(value.start) && Date.parse(value.end) - Date.parse(value.start) <= 31 * 86400_000);

/** Read-only, consistent database snapshot; no network providers or alert writes. */
export async function backtestCanonicalHydrology(input: unknown) {
  const parsed = ReplayQuerySchema.safeParse(input);
  if (!parsed.success) invalid('Replay needs timezone-qualified start/end spanning at most 31 days');
  const query = parsed.data;
  return db.transaction(async trx => {
    await trx.raw('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    let catalog = trx('hydrometric_stations').select('id', 'station_number', 'name').orderBy('station_number');
    if (query.station_number !== undefined) catalog = catalog.where('station_number', query.station_number);
    const stations = await catalog;
    if (query.station_number !== undefined && !stations.length) throw new HydrologyValidationError('Replay station is not registered', 404);
    const ids = stations.map(row => row.id);
    const points = ids.length ? await trx('hydrometric_replay_audit').where({ entity_type: 'OBSERVATION' }).whereIn('station_id', ids)
      .where('recorded_at', '>=', query.start).where('recorded_at', '<', query.end).orderBy('sequence').limit(MAX_REPLAY_POINTS + 1) : [];
    if (points.length > MAX_REPLAY_POINTS) throw new HydrologyValidationError('Replay exceeds 5000 captures; narrow the range or station', 413);
    // One prior state per station plus interval changes; don't load the entire growing archive.
    const initial = ids.length ? await trx('hydrometric_replay_audit').distinctOn('station_id')
      .where({ entity_type: 'THRESHOLD' }).whereIn('station_id', ids).where('recorded_at', '<', query.start)
      .orderBy('station_id').orderBy('sequence', 'desc') : [];
    const changes = ids.length ? await trx('hydrometric_replay_audit').where({ entity_type: 'THRESHOLD' }).whereIn('station_id', ids)
      .where('recorded_at', '>=', query.start).where('recorded_at', '<', query.end).orderBy('sequence').limit(20_001) : [];
    const thresholds = [...initial, ...changes];
    if (thresholds.length > 20_000) throw new HydrologyValidationError('Replay exceeds threshold history limit; narrow the range or station', 413);
    const numbers = new Map(stations.map(row => [row.id, Number(row.station_number)]));
    const captureRow = (row: any) => ({ ...row.snapshot, id: 'capture-' + row.sequence,
      station_number: numbers.get(row.station_id), available_at: new Date(row.recorded_at).toISOString(),
      availability_order: Number(row.sequence), capture_kind: row.capture_kind });
    const report = replayHydrology({ data_kind: 'historical',
      stations: stations.map(row => ({ station_number: Number(row.station_number), name: row.name })),
      observations: points.map(row => ({ ...captureRow(row), observation_id: row.entity_id })),
      thresholds: thresholds.map(row => ({ ...captureRow(row), threshold_id: row.entity_id })), labels: [],
    });
    const archive = ids.length ? await trx('hydrometric_observations').whereIn('station_id', ids)
      .count('* as count').min('observed_at as first_observed_at').max('observed_at as last_observed_at').first() : null;
    return { ...report, requested_window: { ...query, basis: 'AUDIT_CAPTURE_TIME', end_exclusive: true },
      archive_context: { current_observation_rows: Number(archive?.count ?? 0), first_source_time: archive?.first_observed_at ?? null,
        last_source_time: archive?.last_observed_at ?? null, independent_outcome_labels: 0 } };
  });
}
