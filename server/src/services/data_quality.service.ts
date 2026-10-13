export type ObservationState = 'OBSERVED' | 'FORECAST' | 'MODELLED' | 'SIMULATED' | 'STALE' | 'UNAVAILABLE';
export type QualityStatus = 'GOOD' | 'SUSPECT' | 'REJECTED' | 'MISSING';

export interface QualityAssessment {
  observation_state: ObservationState;
  quality_status: QualityStatus;
  quality_score: number;
  quality_flags: string[];
}

const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/**
 * Applies deterministic, explainable checks before observations enter the
 * canonical data layer. This is deliberately not a hazard model.
 */
export function assessObservationQuality(input: {
  observed_at: string;
  received_at?: string;
  source_key: string;
  observation_state?: ObservationState;
  stage_m?: number | null;
  discharge_cms?: number | null;
  rainfall_mm?: number | null;
  now?: Date;
}): QualityAssessment {
  const now = input.now ?? new Date();
  const observedAt = new Date(input.observed_at);
  const flags: string[] = [];
  let score = 1;

  if (Number.isNaN(observedAt.getTime())) {
    return { observation_state: 'UNAVAILABLE', quality_status: 'REJECTED', quality_score: 0, quality_flags: ['INVALID_OBSERVED_AT'] };
  }
  if (observedAt.getTime() > now.getTime() + MAX_FUTURE_SKEW_MS) {
    flags.push('FUTURE_TIMESTAMP');
    score -= 0.6;
  }
  if (now.getTime() - observedAt.getTime() > STALE_AFTER_MS) {
    flags.push('STALE_OBSERVATION');
    score -= 0.35;
  }
  if (input.stage_m == null && input.discharge_cms == null && input.rainfall_mm == null) {
    flags.push('NO_MEASUREMENT');
    score = 0;
  }
  for (const [name, value] of [['stage_m', input.stage_m], ['discharge_cms', input.discharge_cms], ['rainfall_mm', input.rainfall_mm]] as const) {
    if (value != null && (!Number.isFinite(value) || value < 0)) {
      flags.push(`INVALID_${name.toUpperCase()}`);
      score -= 0.7;
    }
  }
  if (!input.source_key) {
    flags.push('MISSING_SOURCE');
    score = 0;
  }

  score = Math.max(0, Math.min(1, Number(score.toFixed(4))));
  const state = input.observation_state ?? (input.source_key === 'legacy-demo' ? 'SIMULATED' : 'OBSERVED');
  const status: QualityStatus = score === 0 ? 'REJECTED' : flags.length > 0 ? 'SUSPECT' : 'GOOD';
  return {
    observation_state: flags.includes('STALE_OBSERVATION') && state === 'OBSERVED' ? 'STALE' : state,
    quality_status: status,
    quality_score: score,
    quality_flags: flags,
  };
}
