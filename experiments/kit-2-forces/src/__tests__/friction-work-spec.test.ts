/**
 * FRICTION_WORK_SPEC (опыт 2.3 «Работа силы трения») — контракт колонок журнала.
 *
 * A = F_тр · s. Колонки: №/Поверхность/F_тр/s(см)/A(Дж).
 * SPEC выбирается по задаче: A/C/D → FRICTION_SPEC (μ), B → FRICTION_WORK_SPEC.
 */
import { describe, expect, it } from 'vitest';
import {
  ALL_SPECS,
  FRICTION_WORK_SPEC,
  getSpecByExperimentId,
} from '@labosfera/shared-spa/lib/journal/specs';

describe('FRICTION_WORK_SPEC — опыт 2.3 «Работа силы трения»', () => {
  it('идентификаторы: experimentId 2.3, kitId kit-2', () => {
    expect(FRICTION_WORK_SPEC.experimentId).toBe('2.3');
    expect(FRICTION_WORK_SPEC.kitId).toBe('kit-2');
  });

  it('колонки в порядке: idx, surface, F_friction_N, s_cm, work_J', () => {
    expect(FRICTION_WORK_SPEC.columns.map((c) => c.key)).toEqual([
      'idx',
      'surface',
      'F_friction_N',
      's_cm',
      'work_J',
    ]);
  });

  it('F_тр и s — direct (показания приборов), work — derived', () => {
    const byKey = Object.fromEntries(FRICTION_WORK_SPEC.columns.map((c) => [c.key, c]));
    expect(byKey['F_friction_N']!.source).toBe('direct');
    expect(byKey['s_cm']!.source).toBe('direct');
    expect(byKey['work_J']!.source).toBe('derived');
  });

  it('work_J = F · (s_см/100) [Дж], формат fixed3, tolerance 0.10', () => {
    const work = FRICTION_WORK_SPEC.columns.find((c) => c.key === 'work_J')!;
    expect(work.format).toBe('fixed3');
    expect(work.tolerance).toBe(0.1);
    // F=0.30 Н, s=20 см=0.20 м → A=0.060 Дж
    expect(work.expectedFromRow!({ F_friction_N: 0.3, s_cm: 20 })).toBeCloseTo(0.06, 5);
    // F=0.60 Н, s=35 см → A=0.210 Дж
    expect(work.expectedFromRow!({ F_friction_N: 0.6, s_cm: 35 })).toBeCloseTo(0.21, 5);
  });

  it('work_J устойчива к пустым полям (null → 0)', () => {
    const work = FRICTION_WORK_SPEC.columns.find((c) => c.key === 'work_J')!;
    expect(work.expectedFromRow!({})).toBe(0);
  });

  it('зарегистрирована в ALL_SPECS и доступна по id 2.3', () => {
    expect(ALL_SPECS).toContain(FRICTION_WORK_SPEC);
    expect(getSpecByExperimentId('2.3')).toBe(FRICTION_WORK_SPEC);
  });
});
