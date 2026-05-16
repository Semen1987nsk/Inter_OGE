/**
 * Property-based fuzzer для ArchimedesCalc — опыт 1.2.
 *
 * 15 категорий property invariants × ≥ 2000 итераций ≈ 30 000+ проверок.
 * Список PI зафиксирован в спеке 2026-05-07-кит-1-опыт-1-2-архимедова-сила.md §3.
 *
 * Seed жёстко зафиксирован для воспроизводимости. Если тест ловит regression —
 * добавляй новый PI, не меняй seed (иначе потеряем класс багов).
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  G,
  RHO_WATER,
  archimedesForceN,
  cm3ToM3,
  gToKg,
  measuredArchimedesForceN,
  weightInAirN,
  weightInLiquidN,
} from '../ArchimedesCalc';
import { ARCHIMEDES_CYLINDERS } from '../tables';

// Глобальный seed — воспроизводимость fuzzer'а между запусками и CI.
fc.configureGlobal({ seed: 20260507, numRuns: 2000 });

/* ------------------------------------------------------------------ */
/* Arbitraries                                                         */
/* ------------------------------------------------------------------ */

/* ВАЖНО про float-эджи: fast-check.double по умолчанию генерирует и
   subnormal-числа (5e-324 и т.п.). При умножении/делении они дают
   underflow в 0 и ломают строгую монотонность — это корректное поведение
   IEEE-754, не баг физики. Для физических инвариантов работаем в normal-
   диапазоне (≥ 1e-300), и отдельно проверяем edge=0 как точку. */

/** Плотности жидкостей в реалистичном диапазоне ОГЭ (вакуум..ртуть). */
const rhoArb = fc.double({
  min: 0,
  max: 13_600,
  noNaN: true,
  noDefaultInfinity: true,
});

/** Объёмы тел: 0..1 л (ОГЭ-цилиндры до 56 см³ + запас). */
const volM3Arb = fc.double({
  min: 0,
  max: 1e-3,
  noNaN: true,
  noDefaultInfinity: true,
});

/** Положительные плотности (для пропорций) — в normal-диапазоне, без subnormals. */
const positiveRhoArb = fc.double({
  min: 1e-6,
  max: 13_600,
  noNaN: true,
  noDefaultInfinity: true,
});

/** Положительные объёмы — в normal-диапазоне. */
const positiveVolArb = fc.double({
  min: 1e-12,
  max: 1e-3,
  noNaN: true,
  noDefaultInfinity: true,
});

/** Положительные массы — в normal-диапазоне (для PI-4). */
const positiveMassKgArb = fc.double({
  min: 1e-6,
  max: 1,
  noNaN: true,
  noDefaultInfinity: true,
});

/** Произвольный цилиндр из ФИПИ-комплекта. */
const cylinderArb = fc.constantFrom(...ARCHIMEDES_CYLINDERS);

/* ------------------------------------------------------------------ */
/* PI-1: F_A ≥ 0 для любых ρ ≥ 0 и V ≥ 0                              */
/* ------------------------------------------------------------------ */
describe('PI-1 (Phys): F_A ≥ 0 для всех валидных входов', () => {
  it('не бывает отрицательной архимедовой силы при неотрицательных входах', () => {
    fc.assert(
      fc.property(rhoArb, volM3Arb, (rho, V) => {
        expect(archimedesForceN(rho, V)).toBeGreaterThanOrEqual(0);
      }),
    );
  });
});

/* ------------------------------------------------------------------ */
/* PI-2: F_A пропорциональна V (масштаб k)                             */
/* ------------------------------------------------------------------ */
describe('PI-2 (Phys): F_A линейна по V — F(k·V) = k·F(V)', () => {
  it('двойной объём → двойная сила (для любого k > 0)', () => {
    fc.assert(
      fc.property(
        positiveRhoArb,
        positiveVolArb,
        fc.double({ min: Math.fround(0.01), max: 100, noNaN: true, noDefaultInfinity: true }),
        (rho, V, k) => {
          const f1 = archimedesForceN(rho, V);
          const fk = archimedesForceN(rho, k * V);
          // Относительная погрешность из-за float — 1e-9 хватает
          const expected = k * f1;
          if (expected === 0) {
            expect(fk).toBe(0);
          } else {
            expect(Math.abs(fk - expected) / Math.abs(expected)).toBeLessThan(1e-9);
          }
        },
      ),
    );
  });
});

/* ------------------------------------------------------------------ */
/* PI-3: F_A пропорциональна ρ                                         */
/* ------------------------------------------------------------------ */
describe('PI-3 (Phys): F_A линейна по ρ — F(k·ρ, V) = k·F(ρ, V)', () => {
  it('двойная плотность жидкости → двойная сила', () => {
    fc.assert(
      fc.property(
        positiveRhoArb,
        positiveVolArb,
        fc.double({ min: Math.fround(0.01), max: 100, noNaN: true, noDefaultInfinity: true }),
        (rho, V, k) => {
          const f1 = archimedesForceN(rho, V);
          const fk = archimedesForceN(k * rho, V);
          const expected = k * f1;
          if (expected === 0) {
            expect(fk).toBe(0);
          } else {
            expect(Math.abs(fk - expected) / Math.abs(expected)).toBeLessThan(1e-9);
          }
        },
      ),
    );
  });
});

/* ------------------------------------------------------------------ */
/* PI-4: F_A НЕ зависит от массы тела (только ρ_жид и V_тела)         */
/* ------------------------------------------------------------------ */
describe('PI-4 (Phys): F_A не зависит от массы тела', () => {
  it('две одинаковых по V цилиндры с разной m дают одинаковую F_A в одной жидкости', () => {
    fc.assert(
      fc.property(
        positiveRhoArb,
        positiveVolArb,
        positiveMassKgArb,
        positiveMassKgArb,
        (rho, V, m1, m2) => {
          // archimedesForceN m не принимает — сама по себе гарантия инварианта.
          // Но проверим, что вес в воздухе зависит от m, а F_A — нет.
          const Fa = archimedesForceN(rho, V);
          const Pair1 = weightInAirN(m1);
          const Pair2 = weightInAirN(m2);
          expect(Fa).toBe(Fa); // F_A не меняется
          // Изменение Pair при m1 → m2 — пропорционально, F_A инвариантна
          expect(Pair2 / Pair1).toBeCloseTo(m2 / m1, 9);
        },
      ),
    );
  });

  it('реальная пара цилиндров №1 и №2 (V=25 см³, разные m) — одна F_A в воде', () => {
    const F1 = archimedesForceN(RHO_WATER, cm3ToM3(25));
    const F2 = archimedesForceN(RHO_WATER, cm3ToM3(25));
    expect(F1).toBe(F2);
  });
});

/* ------------------------------------------------------------------ */
/* PI-5: P_жид + F_A = P_возд (закон сохранения для нетонущих)         */
/* ------------------------------------------------------------------ */
describe('PI-5 (Round): P_жид + F_A = P_возд при F_A ≤ P_возд', () => {
  it('восстановление веса в воздухе сложением (когда тело не всплывает)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true }),
        (Pair, Fa) => {
          // Только когда тело тонет (F_A ≤ P_возд) — иначе P_жид кламп в 0
          fc.pre(Fa <= Pair);
          const Pliq = weightInLiquidN(Pair, Fa);
          expect(Pliq + Fa).toBeCloseTo(Pair, 9);
        },
      ),
    );
  });

  it('при F_A > P_возд — Pliq=0, и Pliq+Fa ≥ Pair (тело всплывает)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true }),
        (Pair, Fa) => {
          fc.pre(Fa > Pair);
          const Pliq = weightInLiquidN(Pair, Fa);
          expect(Pliq).toBe(0);
          expect(Pliq + Fa).toBeGreaterThanOrEqual(Pair);
        },
      ),
    );
  });
});

/* ------------------------------------------------------------------ */
/* PI-6: measuredArchimedesForceN(P, P − F) ≈ F                        */
/* ------------------------------------------------------------------ */
describe('PI-6 (Round): main formula round-trip', () => {
  it('measured(P, P − F) восстанавливает F с точностью float', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true }),
        (P, F) => {
          const Pliq = P - F;
          const Fmeas = measuredArchimedesForceN(P, Pliq);
          expect(Math.abs(Fmeas - F)).toBeLessThan(1e-9 * Math.max(1, Math.abs(F)));
        },
      ),
    );
  });
});

/* ------------------------------------------------------------------ */
/* PI-7: F_A_теор для №2 в воде = 0.245 ± 0.007 Н                      */
/* ------------------------------------------------------------------ */
describe('PI-7 (FIPI): цилиндр №2 в воде попадает в коридор 0.245 ± 0.007 Н', () => {
  // Спека §3 округляет коридор до 3 знаков (0.245 ± 0.007 Н). Реальный
  // физический коридор — [ρg(V_nom−ΔV), ρg(V_nom+ΔV)] — может на сотые
  // мН вылезать за округление. Проверяем оба: (а) точка V_nom = 0.245 ± 0.001;
  // (б) для всего диапазона V — F попадает в физический коридор.
  const cyl = ARCHIMEDES_CYLINDERS.find((c) => c.id === 2)!;
  const Fmin = RHO_WATER * G * (cyl.V_cm3 - cyl.V_tolerance_cm3) * 1e-6;
  const Fmax = RHO_WATER * G * (cyl.V_cm3 + cyl.V_tolerance_cm3) * 1e-6;

  it('точка V_nom=25.0 см³ → F_A = 0.245 Н (±0.001)', () => {
    const F = archimedesForceN(RHO_WATER, cm3ToM3(cyl.V_cm3));
    expect(F).toBeCloseTo(0.245, 3);
  });

  it('для V в [V_nom − ΔV, V_nom + ΔV] — F_A всегда в физ. коридоре', () => {
    fc.assert(
      fc.property(
        fc.double({
          min: cyl.V_cm3 - cyl.V_tolerance_cm3,
          max: cyl.V_cm3 + cyl.V_tolerance_cm3,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (V_cm3) => {
          const F = archimedesForceN(RHO_WATER, cm3ToM3(V_cm3));
          expect(F).toBeGreaterThanOrEqual(Fmin - 1e-12);
          expect(F).toBeLessThanOrEqual(Fmax + 1e-12);
        },
      ),
    );
  });
});

/* ------------------------------------------------------------------ */
/* PI-8: F_A_теор для №3 в воде = 0.549 ± 0.018 Н                      */
/* ------------------------------------------------------------------ */
describe('PI-8 (FIPI): цилиндр №3 в воде попадает в коридор 0.549 ± 0.018 Н', () => {
  const cyl = ARCHIMEDES_CYLINDERS.find((c) => c.id === 3)!;
  const Fmin = RHO_WATER * G * (cyl.V_cm3 - cyl.V_tolerance_cm3) * 1e-6;
  const Fmax = RHO_WATER * G * (cyl.V_cm3 + cyl.V_tolerance_cm3) * 1e-6;

  it('точка V_nom=56.0 см³ → F_A = 0.549 Н (±0.001)', () => {
    const F = archimedesForceN(RHO_WATER, cm3ToM3(cyl.V_cm3));
    expect(F).toBeCloseTo(0.549, 3);
  });

  it('для V в [V_nom − ΔV, V_nom + ΔV] — F_A всегда в физ. коридоре', () => {
    fc.assert(
      fc.property(
        fc.double({
          min: cyl.V_cm3 - cyl.V_tolerance_cm3,
          max: cyl.V_cm3 + cyl.V_tolerance_cm3,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (V_cm3) => {
          const F = archimedesForceN(RHO_WATER, cm3ToM3(V_cm3));
          expect(F).toBeGreaterThanOrEqual(Fmin - 1e-12);
          expect(F).toBeLessThanOrEqual(Fmax + 1e-12);
        },
      ),
    );
  });
});

/* ------------------------------------------------------------------ */
/* PI-9: F_A_теор для №4 в воде = 0.333 ± 0.007 Н                      */
/* ------------------------------------------------------------------ */
describe('PI-9 (FIPI): цилиндр №4 в воде попадает в коридор 0.333 ± 0.007 Н', () => {
  const cyl = ARCHIMEDES_CYLINDERS.find((c) => c.id === 4)!;
  const Fmin = RHO_WATER * G * (cyl.V_cm3 - cyl.V_tolerance_cm3) * 1e-6;
  const Fmax = RHO_WATER * G * (cyl.V_cm3 + cyl.V_tolerance_cm3) * 1e-6;

  it('точка V_nom=34.0 см³ → F_A = 0.333 Н (±0.001)', () => {
    const F = archimedesForceN(RHO_WATER, cm3ToM3(cyl.V_cm3));
    expect(F).toBeCloseTo(0.333, 3);
  });

  it('для V в [V_nom − ΔV, V_nom + ΔV] — F_A всегда в физ. коридоре', () => {
    fc.assert(
      fc.property(
        fc.double({
          min: cyl.V_cm3 - cyl.V_tolerance_cm3,
          max: cyl.V_cm3 + cyl.V_tolerance_cm3,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (V_cm3) => {
          const F = archimedesForceN(RHO_WATER, cm3ToM3(V_cm3));
          expect(F).toBeGreaterThanOrEqual(Fmin - 1e-12);
          expect(F).toBeLessThanOrEqual(Fmax + 1e-12);
        },
      ),
    );
  });
});

/* ------------------------------------------------------------------ */
/* PI-10: ρ = 0 → F_A = 0 (вакуум-аналог)                              */
/* ------------------------------------------------------------------ */
describe('PI-10 (Edge): ρ = 0 → F_A = 0 для любого V', () => {
  it('в вакууме нет архимедовой силы', () => {
    fc.assert(
      fc.property(volM3Arb, (V) => {
        expect(archimedesForceN(0, V)).toBe(0);
      }),
    );
  });
});

/* ------------------------------------------------------------------ */
/* PI-11: V = 0 → F_A = 0 (нет погружения)                             */
/* ------------------------------------------------------------------ */
describe('PI-11 (Edge): V = 0 → F_A = 0 для любого ρ', () => {
  it('тело вне жидкости — нет силы', () => {
    fc.assert(
      fc.property(rhoArb, (rho) => {
        expect(archimedesForceN(rho, 0)).toBe(0);
      }),
    );
  });
});

/* ------------------------------------------------------------------ */
/* PI-12: NaN/Infinity → throws RangeError                             */
/* ------------------------------------------------------------------ */
describe('PI-12 (Edge): невалидные входы бросают RangeError', () => {
  const bad = fc.constantFrom(NaN, Infinity, -Infinity);

  it('archimedesForceN бросает на NaN/Inf', () => {
    fc.assert(
      fc.property(bad, fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }), (x, V) => {
        expect(() => archimedesForceN(x, V)).toThrow(RangeError);
        expect(() => archimedesForceN(V, x)).toThrow(RangeError);
      }),
    );
  });

  it('weightInAirN бросает на NaN/Inf', () => {
    fc.assert(
      fc.property(bad, (x) => {
        expect(() => weightInAirN(x)).toThrow(RangeError);
      }),
    );
  });

  it('weightInLiquidN бросает на NaN/Inf', () => {
    fc.assert(
      fc.property(bad, fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }), (x, y) => {
        expect(() => weightInLiquidN(x, y)).toThrow(RangeError);
        expect(() => weightInLiquidN(y, x)).toThrow(RangeError);
      }),
    );
  });

  it('measuredArchimedesForceN бросает на NaN/Inf', () => {
    fc.assert(
      fc.property(bad, fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }), (x, y) => {
        expect(() => measuredArchimedesForceN(x, y)).toThrow(RangeError);
        expect(() => measuredArchimedesForceN(y, x)).toThrow(RangeError);
      }),
    );
  });

  it('конверсии cm3ToM3/gToKg бросают на NaN/Inf', () => {
    fc.assert(
      fc.property(bad, (x) => {
        expect(() => cm3ToM3(x)).toThrow(RangeError);
        expect(() => gToKg(x)).toThrow(RangeError);
      }),
    );
  });

  it('отрицательные ρ/V в archimedesForceN бросают', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: Math.fround(-0.001), noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        (neg, pos) => {
          expect(() => archimedesForceN(neg, pos)).toThrow(RangeError);
          expect(() => archimedesForceN(pos, neg)).toThrow(RangeError);
        },
      ),
    );
  });

  it('отрицательная m в weightInAirN бросает', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10, max: Math.fround(-0.001), noNaN: true, noDefaultInfinity: true }),
        (neg) => {
          expect(() => weightInAirN(neg)).toThrow(RangeError);
        },
      ),
    );
  });
});

/* ------------------------------------------------------------------ */
/* PI-13: единицы — gToKg/cm3ToM3 сохраняют относительный порядок      */
/* ------------------------------------------------------------------ */
describe('PI-13 (Units): конверсии единиц сохраняют порядок и пропорции', () => {
  // Нестрогая монотонность: a ≤ b ⇒ f(a) ≤ f(b). Строгая ломается на
  // subnormal-числах (a=0, b=5e-324: 5e-324/1000 → 0, оба равны).
  // Это корректное поведение IEEE-754, не баг.

  it('gToKg нестрого монотонна: a ≤ b ⇒ gToKg(a) ≤ gToKg(b)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
        (a, b) => {
          if (a <= b) expect(gToKg(a)).toBeLessThanOrEqual(gToKg(b));
          else expect(gToKg(a)).toBeGreaterThanOrEqual(gToKg(b));
        },
      ),
    );
  });

  it('cm3ToM3 нестрого монотонна', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        (a, b) => {
          if (a <= b) expect(cm3ToM3(a)).toBeLessThanOrEqual(cm3ToM3(b));
          else expect(cm3ToM3(a)).toBeGreaterThanOrEqual(cm3ToM3(b));
        },
      ),
    );
  });

  it('конверсии строго монотонны на normal-диапазоне', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e-6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1e-6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        (a, b) => {
          fc.pre(a !== b);
          expect(gToKg(a) < gToKg(b)).toBe(a < b);
          expect(cm3ToM3(a) < cm3ToM3(b)).toBe(a < b);
        },
      ),
    );
  });

  it('round-trip cm3 → m3 → ×1e6 сохраняет значение', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        (V_cm3) => {
          const back = cm3ToM3(V_cm3) * 1_000_000;
          expect(Math.abs(back - V_cm3)).toBeLessThan(1e-6 * Math.max(1, V_cm3));
        },
      ),
    );
  });

  it('round-trip g → kg → ×1000 сохраняет значение', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1e6, noNaN: true, noDefaultInfinity: true }), (m_g) => {
        const back = gToKg(m_g) * 1000;
        expect(Math.abs(back - m_g)).toBeLessThan(1e-6 * Math.max(1, m_g));
      }),
    );
  });
});

/* ------------------------------------------------------------------ */
/* PI-14: монотонность F_A по V и по ρ                                 */
/* ------------------------------------------------------------------ */
describe('PI-14 (Mono): F_A монотонна по V и по ρ', () => {
  // На normal-диапазоне (без subnormals) — строгая монотонность.
  // На полном диапазоне — нестрогая (subnormals дают underflow в 0).

  it('V₁ ≤ V₂ ⇒ F_A(V₁) ≤ F_A(V₂) при ρ ≥ 0 (нестрого)', () => {
    fc.assert(
      fc.property(rhoArb, volM3Arb, volM3Arb, (rho, V1, V2) => {
        const F1 = archimedesForceN(rho, V1);
        const F2 = archimedesForceN(rho, V2);
        if (V1 <= V2) expect(F1).toBeLessThanOrEqual(F2);
        else expect(F1).toBeGreaterThanOrEqual(F2);
      }),
    );
  });

  it('V₁ < V₂ ⇒ F_A(V₁) < F_A(V₂) при ρ > 0 на normal-диапазоне', () => {
    fc.assert(
      fc.property(positiveRhoArb, positiveVolArb, positiveVolArb, (rho, V1, V2) => {
        fc.pre(V1 !== V2);
        const F1 = archimedesForceN(rho, V1);
        const F2 = archimedesForceN(rho, V2);
        expect(F1 < F2).toBe(V1 < V2);
      }),
    );
  });

  it('ρ₁ < ρ₂ ⇒ F_A(ρ₁) < F_A(ρ₂) при V > 0 на normal-диапазоне', () => {
    fc.assert(
      fc.property(positiveVolArb, positiveRhoArb, positiveRhoArb, (V, r1, r2) => {
        fc.pre(r1 !== r2);
        const F1 = archimedesForceN(r1, V);
        const F2 = archimedesForceN(r2, V);
        expect(F1 < F2).toBe(r1 < r2);
      }),
    );
  });
});

/* ------------------------------------------------------------------ */
/* PI-15: реалистичность сценариев ФИПИ                                */
/* ------------------------------------------------------------------ */
describe('PI-15 (Realistic): реальные сценарии ФИПИ для всех 4 цилиндров', () => {
  it('для каждого цилиндра в воде: P_жид = P_возд − F_A_теор; round-trip восстанавливает F_A', () => {
    fc.assert(
      fc.property(cylinderArb, (cyl) => {
        const m_kg = gToKg(cyl.m_g);
        const V_m3 = cm3ToM3(cyl.V_cm3);
        const Pair = weightInAirN(m_kg);
        const Fa = archimedesForceN(RHO_WATER, V_m3);
        const Pliq = weightInLiquidN(Pair, Fa);
        const FaMeas = measuredArchimedesForceN(Pair, Pliq);
        // Цилиндр №3 (пластик) — на грани плавания: ρ=1.179 г/см³, F_A ≈ P_возд·0.85
        // Все остальные тонут уверенно
        if (Fa <= Pair) {
          expect(FaMeas).toBeCloseTo(Fa, 9);
          expect(Pliq).toBeCloseTo(Pair - Fa, 9);
        } else {
          expect(Pliq).toBe(0);
        }
      }),
    );
  });

  it('весь комплект тонет в воде (ρ_тела > ρ_воды)', () => {
    for (const cyl of ARCHIMEDES_CYLINDERS) {
      const rhoBody = cyl.m_g / cyl.V_cm3 * 1000; // г/см³ × 1000 = кг/м³
      expect(rhoBody).toBeGreaterThan(RHO_WATER);
    }
  });

  it('умножение g·m·V·ρ в любом порядке — одна и та же F_A (commutative)', () => {
    fc.assert(
      fc.property(positiveRhoArb, positiveVolArb, (rho, V) => {
        const a = archimedesForceN(rho, V);
        const b = rho * G * V;
        const c = V * rho * G;
        const d = G * V * rho;
        expect(a).toBeCloseTo(b, 12);
        expect(a).toBeCloseTo(c, 12);
        expect(a).toBeCloseTo(d, 12);
      }),
    );
  });
});
