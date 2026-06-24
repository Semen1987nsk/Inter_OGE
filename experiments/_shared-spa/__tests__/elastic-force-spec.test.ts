import { describe, expect, it } from 'vitest';
import { ELASTIC_FORCE_SPEC } from '../src/lib/journal/specs';
import { verifyRow } from '../src/lib/journal/verify';

describe('ELASTIC_FORCE_SPEC', () => {
  it('F_упр derived = m·g/1000 (100 г → 0,98 Н)', () => {
    const col = ELASTIC_FORCE_SPEC.columns.find(c => c.key === 'F_N')!;
    expect(col.expectedFromRow!({ m_g: 100 })).toBeCloseTo(0.98, 2);
  });
  it('verifyRow: введённое 0,98 при 100 г → ok', () => {
    const v = verifyRow(ELASTIC_FORCE_SPEC.columns, {
      idx: 1, timestamp: 1, values: { m_g: 100, F_N: 0.98 },
    });
    expect(v.F_N).toBe('ok');
  });
});
