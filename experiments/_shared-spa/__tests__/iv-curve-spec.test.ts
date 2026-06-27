import { describe, expect, it } from 'vitest';
import { IV_CURVE_SPEC } from '../src/lib/journal/specs';
import { verifyRow } from '../src/lib/journal/verify';

describe('IV_CURVE_SPEC (3.4)', () => {
  it('experimentId/kitId', () => {
    expect(IV_CURVE_SPEC.experimentId).toBe('3.4');
    expect(IV_CURVE_SPEC.kitId).toBe('kit-3');
  });
  it('element — meta, U_V/I_A — direct', () => {
    expect(IV_CURVE_SPEC.columns.find((c) => c.key === 'element')!.source).toBe('meta');
    expect(IV_CURVE_SPEC.columns.find((c) => c.key === 'U_V')!.source).toBe('direct');
    expect(IV_CURVE_SPEC.columns.find((c) => c.key === 'I_A')!.source).toBe('direct');
  });
  it('R derived = U/I (резистор: U=3 I=0,64 → ≈4,69)', () => {
    const col = IV_CURVE_SPEC.columns.find((c) => c.key === 'R_Ohm')!;
    expect(col.source).toBe('derived');
    expect(col.expectedFromRow!({ U_V: 3, I_A: 0.64 })).toBeCloseTo(4.6875, 3);
  });
  it('verifyRow: R=4,7 при U=3 I=0,64 → ok', () => {
    const v = verifyRow(IV_CURVE_SPEC.columns, { idx: 1, timestamp: 1, values: { U_V: 3, I_A: 0.64, R_Ohm: 4.7 } });
    expect(v.R_Ohm).toBe('ok');
  });
});
