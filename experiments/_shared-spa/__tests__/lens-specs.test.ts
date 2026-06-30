import { describe, expect, it } from 'vitest';
import { LENS_POWER_SPEC, ALL_SPECS, FOCAL_2F_SPEC, getSpecByExperimentId } from '../src/lib/journal/specs';
import { verifyRow } from '../src/lib/journal/verify';

describe('LENS_POWER_SPEC (4.1)', () => {
  it('experimentId = "4.1", kitId = "kit-4"', () => {
    expect(LENS_POWER_SPEC.experimentId).toBe('4.1');
    expect(LENS_POWER_SPEC.kitId).toBe('kit-4');
  });

  it('зарегистрирован в ALL_SPECS', () => {
    expect(ALL_SPECS).toContain(LENS_POWER_SPEC);
  });

  it('d_mm и f_mm — source: direct, format: int', () => {
    const d = LENS_POWER_SPEC.columns.find((c) => c.key === 'd_mm')!;
    const f = LENS_POWER_SPEC.columns.find((c) => c.key === 'f_mm')!;
    expect(d.source).toBe('direct');
    expect(d.format).toBe('int');
    expect(d.unit).toBe('мм');
    expect(f.source).toBe('direct');
    expect(f.format).toBe('int');
    expect(f.unit).toBe('мм');
  });

  it('F_mm — derived, format: int, tolerance 0.05', () => {
    const col = LENS_POWER_SPEC.columns.find((c) => c.key === 'F_mm')!;
    expect(col.source).toBe('derived');
    expect(col.format).toBe('int');
    expect(col.unit).toBe('мм');
    expect(col.tolerance).toBe(0.05);
  });

  it('D_dptr — derived, format: fixed1, tolerance 0.08', () => {
    const col = LENS_POWER_SPEC.columns.find((c) => c.key === 'D_dptr')!;
    expect(col.source).toBe('derived');
    expect(col.format).toBe('fixed1');
    expect(col.unit).toBe('дптр');
    expect(col.tolerance).toBe(0.08);
  });

  it('F_mm.expectedFromRow: F = d·f/(d+f) — d=200,f=200 → F=100', () => {
    const col = LENS_POWER_SPEC.columns.find((c) => c.key === 'F_mm')!;
    // d=2F, f=2F → F = 200·200/(200+200) = 100
    expect(col.expectedFromRow!({ d_mm: 200, f_mm: 200 })).toBeCloseTo(100, 3);
  });

  it('F_mm.expectedFromRow: F = d·f/(d+f) — d=150,f=300 → F=100', () => {
    const col = LENS_POWER_SPEC.columns.find((c) => c.key === 'F_mm')!;
    // 150·300/450 = 45000/450 = 100
    expect(col.expectedFromRow!({ d_mm: 150, f_mm: 300 })).toBeCloseTo(100, 3);
  });

  it('D_dptr.expectedFromRow: D = 1000/F_mm — F_mm=100 → D=10', () => {
    const col = LENS_POWER_SPEC.columns.find((c) => c.key === 'D_dptr')!;
    // D = 1000/100 = 10 дптр
    expect(col.expectedFromRow!({ d_mm: 200, f_mm: 200, F_mm: 100 })).toBeCloseTo(10, 3);
  });

  it('D_dptr.expectedFromRow: F_mm=50 → D=20', () => {
    const col = LENS_POWER_SPEC.columns.find((c) => c.key === 'D_dptr')!;
    expect(col.expectedFromRow!({ d_mm: 100, f_mm: 100, F_mm: 50 })).toBeCloseTo(20, 3);
  });

  it('verifyRow: F≈100 при d=200,f=200 → ok', () => {
    const v = verifyRow(LENS_POWER_SPEC.columns, {
      idx: 1,
      timestamp: 1,
      values: { d_mm: 200, f_mm: 200, F_mm: 100, D_dptr: 10 },
    });
    expect(v['F_mm']).toBe('ok');
    expect(v['D_dptr']).toBe('ok');
  });

  it('verifyRow: F сильно неверное → wrong', () => {
    const v = verifyRow(LENS_POWER_SPEC.columns, {
      idx: 1,
      timestamp: 1,
      values: { d_mm: 200, f_mm: 200, F_mm: 50, D_dptr: 10 },
    });
    expect(v['F_mm']).toBe('wrong');
  });

  it('verifyRow: D немного неверное (close) при F_mm=100 → close', () => {
    // D=10, tolerance=0.08; close = relErr ∈ (0.08×0.4, 0.08] = (0.032, 0.08]
    // D=10.6 → relErr = 0.06 → close
    const v = verifyRow(LENS_POWER_SPEC.columns, {
      idx: 1,
      timestamp: 1,
      values: { d_mm: 200, f_mm: 200, F_mm: 100, D_dptr: 10.6 },
    });
    expect(v['D_dptr']).toBe('close');
  });

  it('порядок колонок: d_mm, f_mm, F_mm, D_dptr', () => {
    const keys = LENS_POWER_SPEC.columns.map((c) => c.key);
    expect(keys).toEqual(['d_mm', 'f_mm', 'F_mm', 'D_dptr']);
  });
});

describe('FOCAL_2F_SPEC (опыт 4.2)', () => {
  it('experimentId=4.2, kitId=kit-4', () => {
    expect(FOCAL_2F_SPEC.experimentId).toBe('4.2');
    expect(FOCAL_2F_SPEC.kitId).toBe('kit-4');
  });

  it('колонки: twoF_mm (direct) + F_mm (derived)', () => {
    const keys = FOCAL_2F_SPEC.columns.map((c) => c.key);
    expect(keys).toEqual(['twoF_mm', 'F_mm']);
    const twoF = FOCAL_2F_SPEC.columns.find((c) => c.key === 'twoF_mm')!;
    const F = FOCAL_2F_SPEC.columns.find((c) => c.key === 'F_mm')!;
    expect(twoF.source).toBe('direct');
    expect(F.source).toBe('derived');
  });

  it('F_mm = twoF_mm / 2 (считается ТОЛЬКО из twoF_mm)', () => {
    const F = FOCAL_2F_SPEC.columns.find((c) => c.key === 'F_mm')!;
    expect(F.expectedFromRow!({ twoF_mm: 200 })).toBeCloseTo(100, 6);
    expect(F.expectedFromRow!({ twoF_mm: 100 })).toBeCloseTo(50, 6);
    // не использует посторонние поля
    expect(F.expectedFromRow!({ twoF_mm: 200, F_mm: 999 })).toBeCloseTo(100, 6);
  });

  it('F_mm.expectedFromRow на пустой строке → 0 (без NaN)', () => {
    const F = FOCAL_2F_SPEC.columns.find((c) => c.key === 'F_mm')!;
    expect(F.expectedFromRow!({})).toBe(0);
  });

  it('зарегистрирован в ALL_SPECS / getSpecByExperimentId', () => {
    expect(getSpecByExperimentId('4.2')).toBe(FOCAL_2F_SPEC);
  });
});
