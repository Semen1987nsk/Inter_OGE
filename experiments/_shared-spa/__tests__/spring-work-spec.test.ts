/**
 * Spec-тест для SPRING_WORK_SPEC — журнал опыта «Работа силы упругости» (бонус).
 *
 * ⚠️ БОНУС ЛАБОСФЕРА — НЕ ВХОДИТ В ФИПИ.
 * Причина: работа упругости в ФИПИ только для kit-6 (блоки). КОДИФ §1.29.
 *
 * Проверяем:
 *  - наличие обязательных ключей колонок (m_g, dl_cm, F_N, W_k_J, W_F_J, A_grav_J)
 *  - формулы derived-колонок:
 *    F_N   = k · Δl_m         (при k=50, Δl=4 см → 2,0 Н)
 *    W_k_J = k · Δl_m² / 2   (при k=50, Δl=4 см → 0,04 Дж)
 *    W_F_J = F · Δl_m / 2    (при F=2, Δl=4 см → 0,04 Дж)
 *    A_grav_J = m_kg · g · Δl_m (при m=100 г, Δl=4 см → 0,0392 Дж)
 *  - verifyRow: вердикты для правильных значений → 'ok'
 */

import { describe, expect, it } from 'vitest';
import { SPRING_WORK_SPEC } from '../src/lib/journal/specs';
import { verifyRow } from '../src/lib/journal/verify';

const G = 9.8;

describe('SPRING_WORK_SPEC', () => {
  it('содержит обязательные ключи колонок (m_g, dl_cm, F_N, W_k_J, W_F_J, A_grav_J)', () => {
    const keys = SPRING_WORK_SPEC.columns.map((c) => c.key);
    expect(keys).toEqual(expect.arrayContaining(['m_g', 'dl_cm', 'F_N', 'W_k_J', 'W_F_J', 'A_grav_J']));
  });

  it('W_k_J derived = k·Δl²/2 (k=50 Н/м, Δl=4 см → 0,04 Дж)', () => {
    const col = SPRING_WORK_SPEC.columns.find((c) => c.key === 'W_k_J')!;
    expect(col).toBeDefined();
    expect(col.expectedFromRow!({ k_N_m: 50, dl_cm: 4 })).toBeCloseTo(0.04, 3);
  });

  it('W_F_J derived = F·Δl/2 (F=2 Н, Δl=4 см → 0,04 Дж)', () => {
    const col = SPRING_WORK_SPEC.columns.find((c) => c.key === 'W_F_J')!;
    expect(col).toBeDefined();
    // F_N = k * dl_m = 50 * 0.04 = 2, W_F = 2 * 0.04 / 2 = 0.04
    expect(col.expectedFromRow!({ F_N: 2, dl_cm: 4 })).toBeCloseTo(0.04, 3);
  });

  it('A_grav_J derived = m_kg·g·Δl (m=100 г, Δl=4 см → 0,0392 Дж)', () => {
    const col = SPRING_WORK_SPEC.columns.find((c) => c.key === 'A_grav_J')!;
    expect(col).toBeDefined();
    const expected = (100 / 1000) * G * (4 / 100);
    expect(col.expectedFromRow!({ m_g: 100, dl_cm: 4 })).toBeCloseTo(expected, 4);
  });

  it('F_N derived = k·Δl_m (k=50, Δl=4 см → 2,0 Н)', () => {
    const col = SPRING_WORK_SPEC.columns.find((c) => c.key === 'F_N')!;
    expect(col).toBeDefined();
    expect(col.expectedFromRow!({ k_N_m: 50, dl_cm: 4 })).toBeCloseTo(2.0, 2);
  });

  it('verifyRow: правильные значения для k=50, Δl=4 см → ok', () => {
    const k = 50;
    const dl_cm = 4;
    const dl_m = dl_cm / 100;
    const F_N = k * dl_m;
    const W_k = 0.5 * k * dl_m * dl_m;
    const W_F = F_N * dl_m / 2;
    const A_grav = (100 / 1000) * G * dl_m;
    const v = verifyRow(SPRING_WORK_SPEC.columns, {
      idx: 1,
      timestamp: 1,
      values: {
        m_g: 100,
        dl_cm,
        k_N_m: k,
        F_N,
        W_k_J: W_k,
        W_F_J: W_F,
        A_grav_J: A_grav,
      },
    });
    expect(v['F_N']).toBe('ok');
    expect(v['W_k_J']).toBe('ok');
    expect(v['W_F_J']).toBe('ok');
    expect(v['A_grav_J']).toBe('ok');
  });

  it('experimentId = "bonus-spring-work" (бонус, не ФИПИ), kitId = "kit-2"', () => {
    expect(SPRING_WORK_SPEC.experimentId).toBe('bonus-spring-work');
    expect(SPRING_WORK_SPEC.kitId).toBe('kit-2');
  });
});
