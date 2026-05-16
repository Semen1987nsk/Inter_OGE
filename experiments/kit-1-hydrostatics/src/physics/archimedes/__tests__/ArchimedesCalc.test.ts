/**
 * ArchimedesCalc — unit-тесты pure-функций физики архимедовой силы.
 *
 * Цель: 100% покрытия строк ArchimedesCalc.ts. ≥40 кейсов.
 * happy path + boundary + invalid inputs + ФИПИ-номиналы для всех 4 цилиндров.
 */

import { describe, expect, it } from 'vitest';
import {
  G,
  RHO_WATER,
  archimedesForceN,
  cm3ToM3,
  gToKg,
  measuredArchimedesForceN,
  weightInAirN,
  weightInLiquidN,
  weightInLiquidPartialN,
} from '../ArchimedesCalc';
import { ARCHIMEDES_CYLINDERS, ARCHIMEDES_CYLINDER_BY_ID } from '../tables';

describe('константы', () => {
  it('G = 9.8 (РФ-школа, не 9.81)', () => {
    expect(G).toBe(9.8);
  });

  it('RHO_WATER = 1000 кг/м³', () => {
    expect(RHO_WATER).toBe(1000);
  });
});

describe('archimedesForceN', () => {
  it('считает F_A = ρ · g · V для воды и V=25 см³ (цилиндр №2)', () => {
    expect(archimedesForceN(1000, 25e-6)).toBeCloseTo(0.245, 6);
  });

  it('считает F_A для цилиндра №3 (V=56 см³ в воде)', () => {
    expect(archimedesForceN(1000, 56e-6)).toBeCloseTo(0.5488, 6);
  });

  it('считает F_A для цилиндра №4 (V=34 см³ в воде)', () => {
    expect(archimedesForceN(1000, 34e-6)).toBeCloseTo(0.3332, 6);
  });

  it('считает F_A для цилиндра №1 (нерекомендованный, V=25 см³)', () => {
    // Хотя ФИПИ исключает №1 — физика должна посчитать корректно
    expect(archimedesForceN(1000, 25e-6)).toBeCloseTo(0.245, 6);
  });

  it('F_A = 0 при V = 0 (нет погружения)', () => {
    expect(archimedesForceN(1000, 0)).toBe(0);
  });

  it('F_A = 0 при ρ = 0 (вакуум-аналог)', () => {
    expect(archimedesForceN(0, 25e-6)).toBe(0);
  });

  it('F_A = 0 при обоих = 0', () => {
    expect(archimedesForceN(0, 0)).toBe(0);
  });

  it('масштабируется линейно по V', () => {
    const f1 = archimedesForceN(1000, 1e-6);
    const f2 = archimedesForceN(1000, 2e-6);
    const f10 = archimedesForceN(1000, 10e-6);
    expect(f2).toBeCloseTo(2 * f1, 9);
    expect(f10).toBeCloseTo(10 * f1, 9);
  });

  it('масштабируется линейно по ρ', () => {
    const f1 = archimedesForceN(500, 25e-6);
    const f2 = archimedesForceN(1000, 25e-6);
    const f4 = archimedesForceN(2000, 25e-6);
    expect(f2).toBeCloseTo(2 * f1, 9);
    expect(f4).toBeCloseTo(4 * f1, 9);
  });

  it('бросает RangeError при отрицательной ρ', () => {
    expect(() => archimedesForceN(-1, 25e-6)).toThrow(RangeError);
    expect(() => archimedesForceN(-1000, 25e-6)).toThrow(RangeError);
  });

  it('бросает RangeError при отрицательном V', () => {
    expect(() => archimedesForceN(1000, -1e-6)).toThrow(RangeError);
  });

  it('бросает RangeError при NaN', () => {
    expect(() => archimedesForceN(NaN, 25e-6)).toThrow(RangeError);
    expect(() => archimedesForceN(1000, NaN)).toThrow(RangeError);
    expect(() => archimedesForceN(NaN, NaN)).toThrow(RangeError);
  });

  it('бросает RangeError при Infinity', () => {
    expect(() => archimedesForceN(Infinity, 25e-6)).toThrow(RangeError);
    expect(() => archimedesForceN(1000, Infinity)).toThrow(RangeError);
    expect(() => archimedesForceN(-Infinity, 25e-6)).toThrow(RangeError);
  });
});

describe('weightInAirN', () => {
  it('считает P_возд = m·g для цилиндра №2 (m=70 г)', () => {
    expect(weightInAirN(0.07)).toBeCloseTo(0.686, 6);
  });

  it('считает P_возд для цилиндра №3 (m=66 г)', () => {
    expect(weightInAirN(0.066)).toBeCloseTo(0.6468, 6);
  });

  it('считает P_возд для цилиндра №4 (m=95 г)', () => {
    expect(weightInAirN(0.095)).toBeCloseTo(0.931, 6);
  });

  it('считает P_возд для цилиндра №1 (m=195 г, перегрузка для дин-ра №1)', () => {
    expect(weightInAirN(0.195)).toBeCloseTo(1.911, 6);
  });

  it('P_возд = 0 при m = 0', () => {
    expect(weightInAirN(0)).toBe(0);
  });

  it('бросает при отрицательной m', () => {
    expect(() => weightInAirN(-0.01)).toThrow(RangeError);
  });

  it('бросает при NaN/Infinity', () => {
    expect(() => weightInAirN(NaN)).toThrow(RangeError);
    expect(() => weightInAirN(Infinity)).toThrow(RangeError);
    expect(() => weightInAirN(-Infinity)).toThrow(RangeError);
  });
});

describe('weightInLiquidN', () => {
  it('считает P_жид = P_возд − F_A для цилиндра №2 в воде', () => {
    // P_возд=0.686 Н, F_A=0.245 Н → P_жид=0.441 Н
    expect(weightInLiquidN(0.686, 0.245)).toBeCloseTo(0.441, 6);
  });

  it('считает P_жид для цилиндра №3 (плавает на грани: P=0.6468, F_A=0.549)', () => {
    expect(weightInLiquidN(0.6468, 0.549)).toBeCloseTo(0.0978, 6);
  });

  it('клампит в 0, если F_A ≥ P_возд (тело всплывает)', () => {
    expect(weightInLiquidN(0.5, 0.5)).toBe(0);
    expect(weightInLiquidN(0.5, 1.0)).toBe(0);
    expect(weightInLiquidN(0.245, 0.5)).toBe(0);
  });

  it('возвращает P_возд при F_A = 0 (нет жидкости)', () => {
    expect(weightInLiquidN(0.686, 0)).toBeCloseTo(0.686, 6);
  });

  it('возвращает 0 при обоих 0', () => {
    expect(weightInLiquidN(0, 0)).toBe(0);
  });

  it('бросает при NaN/Infinity', () => {
    expect(() => weightInLiquidN(NaN, 0.1)).toThrow(RangeError);
    expect(() => weightInLiquidN(0.5, NaN)).toThrow(RangeError);
    expect(() => weightInLiquidN(Infinity, 0.1)).toThrow(RangeError);
    expect(() => weightInLiquidN(0.5, -Infinity)).toThrow(RangeError);
  });
});

describe('weightInLiquidPartialN', () => {
  // Цилиндр №2: P_возд=0.686, F_A_full=0.245
  it('frac=0 → P_air (нет погружения)', () => {
    expect(weightInLiquidPartialN(0.686, 0.245, 0)).toBeCloseTo(0.686, 9);
  });

  it('frac=1 → P_air − F_A_full (= weightInLiquidN)', () => {
    const partial = weightInLiquidPartialN(0.686, 0.245, 1);
    const full = weightInLiquidN(0.686, 0.245);
    expect(partial).toBeCloseTo(full, 9);
    expect(partial).toBeCloseTo(0.441, 9);
  });

  it('frac=0.5 → P_air − F_A_full/2', () => {
    expect(weightInLiquidPartialN(0.686, 0.245, 0.5)).toBeCloseTo(
      0.686 - 0.245 * 0.5,
      9,
    );
  });

  it('линейность по frac: 0 → 0.25 → 0.5 → 0.75 → 1', () => {
    const fracs = [0, 0.25, 0.5, 0.75, 1];
    const prev = fracs.map((f) => weightInLiquidPartialN(0.686, 0.245, f));
    // Разности должны быть равны (линейность)
    const d1 = prev[1]! - prev[0]!;
    const d2 = prev[2]! - prev[1]!;
    const d3 = prev[3]! - prev[2]!;
    const d4 = prev[4]! - prev[3]!;
    expect(d2).toBeCloseTo(d1, 9);
    expect(d3).toBeCloseTo(d1, 9);
    expect(d4).toBeCloseTo(d1, 9);
    // И отрицательные (вес уменьшается с погружением)
    expect(d1).toBeLessThan(0);
  });

  it('clamp frac < 0 в 0 (frac=-0.1 → P_air)', () => {
    expect(weightInLiquidPartialN(0.686, 0.245, -0.1)).toBeCloseTo(0.686, 9);
  });

  it('clamp frac > 1 в 1 (frac=1.5 → как frac=1)', () => {
    expect(weightInLiquidPartialN(0.686, 0.245, 1.5)).toBeCloseTo(
      weightInLiquidN(0.686, 0.245),
      9,
    );
  });

  it('клампит в 0 если P_air − F_A_full·frac отрицательно (тело всплыло)', () => {
    expect(weightInLiquidPartialN(0.5, 1.0, 1)).toBe(0);
    expect(weightInLiquidPartialN(0.5, 1.0, 0.6)).toBe(0); // 0.5 - 0.6 = -0.1 → 0
  });

  it('бросает RangeError при отрицательных P_air / F_A_full', () => {
    expect(() => weightInLiquidPartialN(-0.1, 0.245, 0.5)).toThrow(RangeError);
    expect(() => weightInLiquidPartialN(0.686, -0.1, 0.5)).toThrow(RangeError);
  });

  it('бросает при NaN/Infinity в любом параметре', () => {
    expect(() => weightInLiquidPartialN(NaN, 0.245, 0.5)).toThrow(RangeError);
    expect(() => weightInLiquidPartialN(0.686, NaN, 0.5)).toThrow(RangeError);
    expect(() => weightInLiquidPartialN(0.686, 0.245, NaN)).toThrow(RangeError);
    expect(() => weightInLiquidPartialN(Infinity, 0.245, 0.5)).toThrow(RangeError);
    expect(() => weightInLiquidPartialN(0.686, Infinity, 0.5)).toThrow(RangeError);
    expect(() => weightInLiquidPartialN(0.686, 0.245, Infinity)).toThrow(RangeError);
  });

  it('реалистичный сценарий №3 (P=0.6468, F_A=0.5488): частичное → плавный диапазон', () => {
    // Начальное (frac=0) — P_возд
    expect(weightInLiquidPartialN(0.6468, 0.5488, 0)).toBeCloseTo(0.6468, 9);
    // Полупогружение — почти равновесие
    expect(weightInLiquidPartialN(0.6468, 0.5488, 0.5)).toBeCloseTo(
      0.6468 - 0.5488 * 0.5,
      9,
    );
    // Полное — почти 0 (плавающее тело на пороге)
    expect(weightInLiquidPartialN(0.6468, 0.5488, 1)).toBeCloseTo(0.098, 3);
  });

  it('round-trip с архимедовой силой пропорционально объёму погружения', () => {
    // F_A_partial = ρ·g·V_partial; должно совпадать с F_A_full · frac
    const V_full = 25e-6;
    const F_A_full = archimedesForceN(1000, V_full);
    for (const frac of [0, 0.1, 0.33, 0.5, 0.7, 1]) {
      const V_partial = V_full * frac;
      const F_A_partial = archimedesForceN(1000, V_partial);
      expect(F_A_partial).toBeCloseTo(F_A_full * frac, 9);
      // И вес в жидкости через partial совпадает с прямым вычислением
      const P_air = 0.686;
      expect(weightInLiquidPartialN(P_air, F_A_full, frac)).toBeCloseTo(
        Math.max(0, P_air - F_A_partial),
        9,
      );
    }
  });
});

describe('measuredArchimedesForceN', () => {
  it('главная формула опыта: F_A_изм = P_возд − P_жид', () => {
    expect(measuredArchimedesForceN(0.686, 0.441)).toBeCloseTo(0.245, 6);
    expect(measuredArchimedesForceN(0.6468, 0.0978)).toBeCloseTo(0.549, 3);
    expect(measuredArchimedesForceN(0.931, 0.598)).toBeCloseTo(0.333, 3);
  });

  it('возвращает 0 при равных показаниях (нет погружения)', () => {
    expect(measuredArchimedesForceN(0.686, 0.686)).toBe(0);
  });

  it('возвращает отрицательное при ошибке считывания (P_жид > P_возд)', () => {
    // Не клампим — должна остаться отрицательной для сигнала об ошибке ученика
    expect(measuredArchimedesForceN(0.5, 0.6)).toBeCloseTo(-0.1, 6);
  });

  it('round-trip: measured(P, P − F) = F', () => {
    const F = 0.245;
    const P = 0.686;
    expect(measuredArchimedesForceN(P, P - F)).toBeCloseTo(F, 9);
  });

  it('бросает при NaN/Infinity', () => {
    expect(() => measuredArchimedesForceN(NaN, 0.1)).toThrow(RangeError);
    expect(() => measuredArchimedesForceN(0.5, Infinity)).toThrow(RangeError);
  });
});

describe('cm3ToM3', () => {
  it('переводит см³ → м³ ровно ×1e-6', () => {
    expect(cm3ToM3(1)).toBe(1e-6);
    expect(cm3ToM3(25)).toBe(25e-6);
    expect(cm3ToM3(56)).toBe(56e-6);
    expect(cm3ToM3(1_000_000)).toBe(1);
  });

  it('cm3ToM3(0) = 0', () => {
    expect(cm3ToM3(0)).toBe(0);
  });

  it('бросает при NaN/Infinity', () => {
    expect(() => cm3ToM3(NaN)).toThrow(RangeError);
    expect(() => cm3ToM3(Infinity)).toThrow(RangeError);
  });
});

describe('gToKg', () => {
  it('переводит г → кг ровно ×1e-3', () => {
    expect(gToKg(1)).toBe(0.001);
    expect(gToKg(70)).toBe(0.07);
    expect(gToKg(195)).toBe(0.195);
    expect(gToKg(1000)).toBe(1);
  });

  it('gToKg(0) = 0', () => {
    expect(gToKg(0)).toBe(0);
  });

  it('бросает при NaN/Infinity', () => {
    expect(() => gToKg(NaN)).toThrow(RangeError);
    expect(() => gToKg(Infinity)).toThrow(RangeError);
    expect(() => gToKg(-Infinity)).toThrow(RangeError);
  });
});

describe('сквозной расчёт: F_A теоретическая для всех 4 цилиндров в воде', () => {
  // ФИПИ-tolerance по объёму: F_A ± ρ·g·ΔV
  const cases: Array<{ id: 1 | 2 | 3 | 4; nominalN: number; deltaN: number }> = [
    { id: 1, nominalN: 0.245, deltaN: 0.003 }, // V=25.0±0.3 → ΔF=9.8·0.3e-6·1000=0.00294
    { id: 2, nominalN: 0.245, deltaN: 0.007 }, // V=25.0±0.7
    { id: 3, nominalN: 0.5488, deltaN: 0.018 }, // V=56.0±1.8
    { id: 4, nominalN: 0.3332, deltaN: 0.007 }, // V=34.0±0.7
  ];

  for (const { id, nominalN, deltaN } of cases) {
    it(`цилиндр №${id}: F_A_теор ≈ ${nominalN} Н ± ${deltaN} Н`, () => {
      const cyl = ARCHIMEDES_CYLINDER_BY_ID.get(id)!;
      const F = archimedesForceN(RHO_WATER, cm3ToM3(cyl.V_cm3));
      expect(F).toBeCloseTo(nominalN, 3);
      expect(Math.abs(F - nominalN)).toBeLessThanOrEqual(deltaN + 1e-9);
    });
  }

  it('все 4 цилиндра дают F_A > 0 в воде', () => {
    for (const cyl of ARCHIMEDES_CYLINDERS) {
      const F = archimedesForceN(RHO_WATER, cm3ToM3(cyl.V_cm3));
      expect(F).toBeGreaterThan(0);
    }
  });
});

describe('сквозной расчёт: P_возд для всех 4 цилиндров', () => {
  const expected: Array<{ id: 1 | 2 | 3 | 4; P_N: number }> = [
    { id: 1, P_N: 1.911 }, // 0.195 · 9.8
    { id: 2, P_N: 0.686 }, // 0.070 · 9.8
    { id: 3, P_N: 0.6468 }, // 0.066 · 9.8
    { id: 4, P_N: 0.931 }, // 0.095 · 9.8
  ];

  for (const { id, P_N } of expected) {
    it(`цилиндр №${id}: P_возд ≈ ${P_N} Н`, () => {
      const cyl = ARCHIMEDES_CYLINDER_BY_ID.get(id)!;
      const P = weightInAirN(gToKg(cyl.m_g));
      expect(P).toBeCloseTo(P_N, 3);
    });
  }
});

describe('реалистичный сценарий ФИПИ — цилиндр №2 в воде', () => {
  it('P_возд=0.686, F_A=0.245 → P_жид=0.441; обратно через measured восстанавливаем F_A', () => {
    const m_kg = gToKg(70);
    const V_m3 = cm3ToM3(25);
    const Pair = weightInAirN(m_kg);
    const Fa = archimedesForceN(RHO_WATER, V_m3);
    const Pliq = weightInLiquidN(Pair, Fa);
    const FaMeasured = measuredArchimedesForceN(Pair, Pliq);

    expect(Pair).toBeCloseTo(0.686, 3);
    expect(Fa).toBeCloseTo(0.245, 3);
    expect(Pliq).toBeCloseTo(0.441, 3);
    expect(FaMeasured).toBeCloseTo(Fa, 9);
  });
});

describe('реалистичный сценарий — цилиндр №1 (перегрузка дин-ра №1)', () => {
  it('P_возд=1.91 Н превышает 1 Н — ученик увидит перегрузку', () => {
    const Pair = weightInAirN(gToKg(195));
    expect(Pair).toBeGreaterThan(1.0);
    // F_A в воде всё равно считается корректно (физика честная)
    const Fa = archimedesForceN(RHO_WATER, cm3ToM3(25));
    expect(Fa).toBeCloseTo(0.245, 3);
  });
});
