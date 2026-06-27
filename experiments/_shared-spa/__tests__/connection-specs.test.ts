import { describe, expect, it } from 'vitest';
import { SERIES_VOLTAGE_SPEC, PARALLEL_CURRENT_SPEC, ALL_SPECS } from '../src/lib/journal/specs';

describe('SERIES_VOLTAGE_SPEC (3.8)', () => {
  it('experimentId = "3.8", kitId = "kit-3"', () => {
    expect(SERIES_VOLTAGE_SPEC.experimentId).toBe('3.8');
    expect(SERIES_VOLTAGE_SPEC.kitId).toBe('kit-3');
  });
  it('зарегистрирован в ALL_SPECS', () => {
    expect(ALL_SPECS).toContain(SERIES_VOLTAGE_SPEC);
  });
  it('колонки: idx(meta), point(meta), U_V(direct)', () => {
    const cols = SERIES_VOLTAGE_SPEC.columns;
    expect(cols.find((c) => c.key === 'idx')?.source).toBe('meta');
    expect(cols.find((c) => c.key === 'point')?.source).toBe('meta');
    expect(cols.find((c) => c.key === 'U_V')?.source).toBe('direct');
    expect(cols.find((c) => c.key === 'U_V')?.unit).toBe('В');
  });
  it('нет derived-колонок (правило — в result-panel)', () => {
    const derived = SERIES_VOLTAGE_SPEC.columns.filter((c) => c.source === 'derived');
    expect(derived.length).toBe(0);
  });
  it('колонка U_V format=fixed2', () => {
    const col = SERIES_VOLTAGE_SPEC.columns.find((c) => c.key === 'U_V')!;
    expect(col.format).toBe('fixed2');
  });
});

describe('PARALLEL_CURRENT_SPEC (3.9)', () => {
  it('experimentId = "3.9", kitId = "kit-3"', () => {
    expect(PARALLEL_CURRENT_SPEC.experimentId).toBe('3.9');
    expect(PARALLEL_CURRENT_SPEC.kitId).toBe('kit-3');
  });
  it('зарегистрирован в ALL_SPECS', () => {
    expect(ALL_SPECS).toContain(PARALLEL_CURRENT_SPEC);
  });
  it('колонки: idx(meta), point(meta), I_A(direct)', () => {
    const cols = PARALLEL_CURRENT_SPEC.columns;
    expect(cols.find((c) => c.key === 'idx')?.source).toBe('meta');
    expect(cols.find((c) => c.key === 'point')?.source).toBe('meta');
    expect(cols.find((c) => c.key === 'I_A')?.source).toBe('direct');
    expect(cols.find((c) => c.key === 'I_A')?.unit).toBe('А');
  });
  it('нет derived-колонок', () => {
    const derived = PARALLEL_CURRENT_SPEC.columns.filter((c) => c.source === 'derived');
    expect(derived.length).toBe(0);
  });
  it('колонка I_A format=fixed2', () => {
    const col = PARALLEL_CURRENT_SPEC.columns.find((c) => c.key === 'I_A')!;
    expect(col.format).toBe('fixed2');
  });
});
