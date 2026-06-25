import { describe, expect, it } from 'vitest';
import { RESISTANCE_SPEC } from '../src/lib/journal/specs';
import { verifyRow } from '../src/lib/journal/verify';

describe('RESISTANCE_SPEC', () => {
  it('R derived = U/I (U=1.5, I=0.32 → ≈4.69)', () => {
    const col = RESISTANCE_SPEC.columns.find(c => c.key === 'R_Ohm')!;
    expect(col.expectedFromRow!({ U_V: 1.5, I_A: 0.32 })).toBeCloseTo(4.6875, 3);
  });
  it('verifyRow: 4.7 при U=1.5 I=0.32 → ok', () => {
    const v = verifyRow(RESISTANCE_SPEC.columns, { idx:1, timestamp:1, values:{ U_V:1.5, I_A:0.32, R_Ohm:4.7 } });
    expect(v.R_Ohm).toBe('ok');
  });
});
