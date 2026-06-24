import { describe, it, expect } from 'vitest';
import { KITS, totalExperiments, kitsByCategory, kitFipiProgress, kitBonusCount } from '../kits';

describe('KITS data integrity', () => {
  it('у всех китов уникальные num и slug', () => {
    expect(new Set(KITS.map(k => k.num)).size).toBe(KITS.length);
    expect(new Set(KITS.map(k => k.slug)).size).toBe(KITS.length);
  });
  it('каждый кит имеет category и accent', () => {
    for (const k of KITS) {
      expect(['mechanics','electricity','optics','thermal']).toContain(k.category);
      expect(k.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
  it('каждый опыт имеет resultVerb и булев isFipi/done', () => {
    for (const k of KITS) for (const e of k.experiments) {
      expect(e.resultVerb.length).toBeGreaterThan(0);
      expect(typeof e.isFipi).toBe('boolean');
      expect(typeof e.done).toBe('boolean');
    }
  });
  it('бонус (isFipi:false) обязан иметь bonusReason', () => {
    for (const k of KITS) for (const e of k.experiments) {
      if (!e.isFipi) expect((e.bonusReason ?? '').length).toBeGreaterThan(0);
    }
  });
  it('kitFipiProgress считает только ФИПИ-опыты, done ≤ total', () => {
    for (const k of KITS) {
      const p = kitFipiProgress(k);
      const fipi = k.experiments.filter(e => e.isFipi);
      expect(p.total).toBe(fipi.length);
      expect(p.done).toBe(fipi.filter(e => e.done).length);
      expect(p.done).toBeLessThanOrEqual(p.total);
    }
  });
  it('ФИПИ-перечень по китам = 5/7/9/6/9/4/4 (всего 44)', () => {
    const byNum = (n: number) => KITS.find(k => k.num === n)!;
    expect(kitFipiProgress(byNum(1)).total).toBe(5);
    expect(kitFipiProgress(byNum(2)).total).toBe(7);
    expect(kitFipiProgress(byNum(3)).total).toBe(9);
    expect(kitFipiProgress(byNum(4)).total).toBe(6);
    expect(kitFipiProgress(byNum(5)).total).toBe(9);
    expect(kitFipiProgress(byNum(6)).total).toBe(4);
    expect(kitFipiProgress(byNum(7)).total).toBe(4);
    expect(totalExperiments().total).toBe(44);
  });
  it('kit-1 готов 5/5 (1.5 реализован), kit-2 готов 7/7 (F_упр реализован)', () => {
    const byNum = (n: number) => KITS.find(k => k.num === n)!;
    expect(kitFipiProgress(byNum(1)).done).toBe(5);
    expect(kitFipiProgress(byNum(2)).done).toBe(7);
  });
  it('kitsByCategory(mechanics) включает киты 1,2,5,6', () => {
    expect(kitsByCategory('mechanics').map(k => k.num).sort()).toEqual([1,2,5,6]);
  });
  it('внутри кита пара (id, fipiTask) уникальна', () => {
    for (const k of KITS) {
      const keys = k.experiments.map(e => `${e.id}|${e.fipiTask ?? ''}`);
      expect(new Set(keys).size).toBe(k.experiments.length);
    }
  });
  it('kitBonusCount(kit-2) === 1 (бонус spring-work)', () => {
    const byNum = (n: number) => KITS.find(k => k.num === n)!;
    expect(kitBonusCount(byNum(2))).toBe(1);
  });
});
