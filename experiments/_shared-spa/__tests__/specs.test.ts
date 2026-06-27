import { describe, expect, it } from 'vitest';
import { R_LENGTH_SPEC, R_AREA_SPEC, R_RHO_SPEC, ALL_SPECS } from '../src/lib/journal/specs';

describe('Wire-resistance specs 3.5–3.7', () => {
  it.each([R_LENGTH_SPEC, R_AREA_SPEC, R_RHO_SPEC])('зарегистрирован в ALL_SPECS', (s) => {
    expect(ALL_SPECS).toContain(s);
  });
  it('R_Ohm = U/I с допуском 0,10', () => {
    const col = R_LENGTH_SPEC.columns.find((c) => c.key === 'R_Ohm')!;
    expect(col.source).toBe('derived');
    expect(col.tolerance).toBe(0.10);
    expect(col.expectedFromRow!({ U_V: 4.4, I_A: 1.0 })).toBeCloseTo(4.4, 6);
  });
  it('I=0 → expected 0 (без деления на ноль)', () => {
    const col = R_AREA_SPEC.columns.find((c) => c.key === 'R_Ohm')!;
    expect(col.expectedFromRow!({ U_V: 4, I_A: 0 })).toBe(0);
  });
  it('паспортные колонки material/l_m/S_mm2 — meta', () => {
    for (const key of ['material', 'l_m', 'S_mm2']) {
      expect(R_RHO_SPEC.columns.find((c) => c.key === key)!.source).toBe('meta');
    }
  });
  it('experimentId соответствует опыту', () => {
    expect([R_LENGTH_SPEC.experimentId, R_AREA_SPEC.experimentId, R_RHO_SPEC.experimentId])
      .toEqual(['3.5', '3.6', '3.7']);
  });
});
