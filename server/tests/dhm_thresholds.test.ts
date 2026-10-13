import { parseDhmRiverWatchPayload, parseDhmThresholdSnapshot } from '../src/services/dhm_thresholds.service';

describe('DHM River Watch threshold parsing', () => {
  it('preserves decimal station numbers and converts blank thresholds to null', () => {
    const result = parseDhmRiverWatchPayload({
      status: 'success',
      data: [
        { stationIndex: '289.95', warning_level: '6.8', danger_level: '7.8' },
        { stationIndex: '604.5', warning_level: '6.00', danger_level: '' },
        { stationIndex: '505', warning_level: ' ', danger_level: ' ' },
      ],
    });

    expect(result).toEqual([
      expect.objectContaining({ station_number: 289.95, warning_stage_m: 6.8, danger_stage_m: 7.8 }),
      expect.objectContaining({ station_number: 604.5, warning_stage_m: 6, danger_stage_m: null }),
    ]);
  });

  it('rejects malformed or inverted thresholds', () => {
    const result = parseDhmRiverWatchPayload({
      status: 'success',
      data: [
        { stationIndex: 'abc', warning_level: '1', danger_level: '2' },
        { stationIndex: '620', warning_level: '8', danger_level: '7' },
      ],
    });
    expect(result).toHaveLength(0);
  });

  it('treats whitespace as missing while rejecting malformed numeric thresholds', () => {
    expect(parseDhmRiverWatchPayload({ status: 'success', data: [
      { stationIndex: '604.5', warning_level: '6.00', danger_level: '   ' },
      { stationIndex: '620', warning_level: '5.8', danger_level: 'broken' },
      { stationIndex: '505', warning_level: '2.8', danger_level: '2.8' },
    ] })).toEqual([expect.objectContaining({ station_number: 604.5, danger_stage_m: null })]);
  });

  it('flags conflicting station duplicates rather than selecting one arbitrarily', () => {
    const snapshot = parseDhmThresholdSnapshot({ status: 'success', data: [
      { stationIndex: '289.95', warning_level: '5.5', danger_level: '6.8' },
      { stationIndex: '289.95', warning_level: '5.4', danger_level: '6.8' },
    ] });
    expect(snapshot.rows.has(289.95)).toBe(false);
    expect(snapshot.issues.get(289.95)).toBe('CONFLICTING_THRESHOLDS');
  });

  it('retains explicit withdrawals for persistence while omitting them from the threshold-only parser', () => {
    const payload = { status: 'success', data: [{ stationIndex: '505', warning_level: '', danger_level: null }] };
    expect(parseDhmThresholdSnapshot(payload).rows.get(505)).toMatchObject({ warning_stage_m: null, danger_stage_m: null });
    expect(parseDhmRiverWatchPayload(payload)).toHaveLength(0);
  });

  it.each([{ status: 'error', data: [] }, { status: 'success', data: [] }, {}])('refuses incomplete snapshots before persistence', payload => {
    expect(() => parseDhmThresholdSnapshot(payload)).toThrow();
  });
});
