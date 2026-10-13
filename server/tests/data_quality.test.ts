import { assessObservationQuality } from '../src/services/data_quality.service';

describe('Phase 1 observation quality', () => {
  const now = new Date('2026-10-12T00:00:00.000Z');

  it('accepts a current authoritative observation', () => {
    expect(assessObservationQuality({
      observed_at: '2026-10-11T23:30:00.000Z',
      source_key: 'dhm-hydrology',
      stage_m: 4.2,
      now,
    })).toMatchObject({ observation_state: 'OBSERVED', quality_status: 'GOOD', quality_score: 1 });
  });

  it('marks legacy fixtures as simulated', () => {
    expect(assessObservationQuality({
      observed_at: '2026-10-11T23:30:00.000Z',
      source_key: 'legacy-demo',
      rainfall_mm: 12,
      now,
    }).observation_state).toBe('SIMULATED');
  });

  it('rejects future and invalid measurements', () => {
    const result = assessObservationQuality({
      observed_at: '2026-10-12T02:00:00.000Z',
      source_key: 'dhm-hydrology',
      stage_m: -1,
      now,
    });
    expect(result.quality_status).toBe('REJECTED');
    expect(result.quality_flags).toEqual(expect.arrayContaining(['FUTURE_TIMESTAMP', 'INVALID_STAGE_M']));
  });
});
