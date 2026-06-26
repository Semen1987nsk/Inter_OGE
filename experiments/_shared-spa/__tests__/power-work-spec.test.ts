import { describe, expect, it } from 'vitest';
import { POWER_SPEC, WORK_CURRENT_SPEC } from '../src/lib/journal/specs';
import { verifyRow } from '../src/lib/journal/verify';

describe('POWER_SPEC (3.2)', () => {
  it('experimentId/kitId', () => {
    expect(POWER_SPEC.experimentId).toBe('3.2');
    expect(POWER_SPEC.kitId).toBe('kit-3');
  });
  it('P derived = U·I (эталон R3: U=5,7 I=0,70 → ≈3,99 Вт)', () => {
    const col = POWER_SPEC.columns.find((c) => c.key === 'P_W')!;
    expect(col.source).toBe('derived');
    expect(col.expectedFromRow!({ U_V: 5.7, I_A: 0.7 })).toBeCloseTo(3.99, 2);
  });
  it('verifyRow: P=4,0 при U=5,7 I=0,70 → ok', () => {
    const v = verifyRow(POWER_SPEC.columns, {
      idx: 1, timestamp: 1, values: { U_V: 5.7, I_A: 0.7, P_W: 4.0 },
    });
    expect(v.P_W).toBe('ok');
  });
});

describe('WORK_CURRENT_SPEC (3.3)', () => {
  it('experimentId/kitId', () => {
    expect(WORK_CURRENT_SPEC.experimentId).toBe('3.3');
    expect(WORK_CURRENT_SPEC.kitId).toBe('kit-3');
  });
  it('имеет direct-колонку t_s', () => {
    const t = WORK_CURRENT_SPEC.columns.find((c) => c.key === 't_s')!;
    expect(t.source).toBe('direct');
  });
  it('A derived = U·I·t (эталон R2: U=2,9 I=0,51 t=60 → ≈88,7 Дж)', () => {
    const col = WORK_CURRENT_SPEC.columns.find((c) => c.key === 'A_J')!;
    expect(col.source).toBe('derived');
    expect(col.expectedFromRow!({ U_V: 2.9, I_A: 0.51, t_s: 60 })).toBeCloseTo(88.74, 2);
  });
  it('verifyRow: A=88,7 при U=2,9 I=0,51 t=60 → ok', () => {
    const v = verifyRow(WORK_CURRENT_SPEC.columns, {
      idx: 1, timestamp: 1, values: { U_V: 2.9, I_A: 0.51, t_s: 60, A_J: 88.7 },
    });
    expect(v.A_J).toBe('ok');
  });
});
