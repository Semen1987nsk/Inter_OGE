import { describe, it, expect } from 'vitest';
import { KITS, totalExperiments, kitsByCategory } from '../kits';

describe('KITS data integrity', () => {
  it('у всех китов уникальные num и slug', () => {
    expect(new Set(KITS.map(k => k.num)).size).toBe(KITS.length);
    expect(new Set(KITS.map(k => k.slug)).size).toBe(KITS.length);
  });
  it('progress.done не превышает total', () => {
    for (const k of KITS) expect(k.progress.done).toBeLessThanOrEqual(k.progress.total);
  });
  it('каждый кит имеет category и accent', () => {
    for (const k of KITS) {
      expect(['mechanics','electricity','optics','thermal']).toContain(k.category);
      expect(k.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
  it('каждый опыт имеет resultVerb', () => {
    for (const k of KITS) for (const e of k.experiments) expect(e.resultVerb.length).toBeGreaterThan(0);
  });
  it('totalExperiments = 8/35', () => {
    expect(totalExperiments()).toEqual({ done: 8, total: 35 });
  });
  it('kitsByCategory(mechanics) включает киты 1,2,5,6', () => {
    expect(kitsByCategory('mechanics').map(k => k.num).sort()).toEqual([1,2,5,6]);
  });
});
