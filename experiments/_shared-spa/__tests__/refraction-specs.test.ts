import { describe, it, expect } from 'vitest';
import { REFRACTION_INDEX_SPEC, REFRACTION_ANGLE_SPEC, getSpecByExperimentId } from '../src/lib/journal/specs';
import { verifyRow } from '../src/lib/journal/verify';

describe('REFRACTION_INDEX_SPEC (4.3)', () => {
  it('experimentId 4.3, kit-4, зарегистрирован в ALL_SPECS', () => {
    expect(REFRACTION_INDEX_SPEC.experimentId).toBe('4.3');
    expect(REFRACTION_INDEX_SPEC.kitId).toBe('kit-4');
    expect(getSpecByExperimentId('4.3')).toBe(REFRACTION_INDEX_SPEC);
  });
  it('колонки: idx, i_deg(direct), r_deg(direct), n(derived)', () => {
    const keys = REFRACTION_INDEX_SPEC.columns.map((c) => c.key);
    expect(keys).toEqual(['idx', 'i_deg', 'r_deg', 'n']);
    const n = REFRACTION_INDEX_SPEC.columns.find((c) => c.key === 'n')!;
    expect(n.source).toBe('derived');
  });
  it('n derived = sin i / sin r (i=45,r=28 → ≈1.506)', () => {
    const n = REFRACTION_INDEX_SPEC.columns.find((c) => c.key === 'n')!;
    const val = n.expectedFromRow!({ i_deg: 45, r_deg: 28 });
    expect(Math.abs(val - 1.506)).toBeLessThan(0.005);
  });
  it('n derived не делит на ноль при r=0 (guard → 0)', () => {
    const n = REFRACTION_INDEX_SPEC.columns.find((c) => c.key === 'n')!;
    expect(n.expectedFromRow!({ i_deg: 0, r_deg: 0 })).toBe(0);
  });
  it('verifyRow: верное n=1.51 при i=45,r=28 → ok; неверное 1.0 → wrong', () => {
    const okRow = { idx: 1, timestamp: 0, values: { idx: 1, i_deg: 45, r_deg: 28, n: 1.51 } };
    const badRow = { idx: 1, timestamp: 0, values: { idx: 1, i_deg: 45, r_deg: 28, n: 1.0 } };
    expect(verifyRow(REFRACTION_INDEX_SPEC.columns, okRow)['n']).toBe('ok');
    expect(verifyRow(REFRACTION_INDEX_SPEC.columns, badRow)['n']).toBe('wrong');
  });
});

describe('REFRACTION_ANGLE_SPEC (4.6)', () => {
  it('experimentId 4.6, зарегистрирован', () => {
    expect(REFRACTION_ANGLE_SPEC.experimentId).toBe('4.6');
    expect(getSpecByExperimentId('4.6')).toBe(REFRACTION_ANGLE_SPEC);
  });
  it('колонки: idx, i_deg(direct), r_deg(direct); без derived', () => {
    const keys = REFRACTION_ANGLE_SPEC.columns.map((c) => c.key);
    expect(keys).toEqual(['idx', 'i_deg', 'r_deg']);
    expect(REFRACTION_ANGLE_SPEC.columns.every((c) => c.source !== 'derived')).toBe(true);
  });
});
