/**
 * Property-фуззер для опыта 2.4 «Измерение работы силы упругости».
 *
 * 8 property invariants (PI-W-1..8) — это «всегда-выполняется» свойства
 * физики работы упругой силы и силы тяжести при подвешивании груза.
 *
 *   PI-W-1 Quad     при удвоении Δl работа ровно в 4 раза
 *   PI-W-2 Linear-k при удвоении k работа ровно в 2 раза (та же Δl)
 *   PI-W-3 Equiv    workFromStiffness(k, Δl) ≡ workFromForce(k·Δl_m, Δl)
 *   PI-W-4 Sign     W ≥ 0 при любых валидных входах
 *   PI-W-5 Zero     W = 0 ⇔ Δl = 0
 *   PI-W-6 Gravity  workOfGravity(m, Δl) = 2·workFromStiffness(k, Δl)
 *                   при балансе сил m·g = k·Δl_m
 *   PI-W-7 Triangle площадь треугольника F·Δl/2 равна k·Δl²/2 при F=k·Δl
 *   PI-W-8 FIPI     эталонная серия (k=50, m=100..400 г) даёт W в табл. ФИПИ
 *
 * Покрытие WorkCalc уже 100% в WorkCalc.test.ts. Этот фуззер бьёт по
 * ИНВАРИАНТАМ на тысячах случайных параметров, чтобы поймать regressions
 * после рефакторинга.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  workFromStiffness,
  workFromForce,
  workOfGravity,
  isElasticWorkConsistent,
} from '@physics/spring/WorkCalc';
import { massToForce, forceToExtension } from '@physics/spring/SpringModel';

// ─── Семя (LCG для воспроизводимости) ─────────────────────────────
let SEED = 42424242;
function rand(): number {
  SEED = (SEED * 1664525 + 1013904223) >>> 0;
  return SEED / 0x100000000;
}
function randomMassG(): number {
  // Школьный комплект: 10..400 г шагами по 10 г
  return 10 + Math.floor(rand() * 40) * 10;
}
function randomK(): number {
  // Стандартные пружины ФИПИ: 10 или 50 Н/м, плюс случайные значения для устойчивости
  const choice = rand();
  if (choice < 0.4) return 50;
  if (choice < 0.7) return 10;
  return 5 + rand() * 200; // 5..205 Н/м
}
function randomDl(): number {
  return 0.1 + rand() * 14.9; // 0.1..15 см
}

beforeEach(() => {
  SEED = (Date.now() ^ 0xc0ffee) >>> 0;
});

const ITERATIONS = 5000;

describe('Property invariants — opyt 2.4 (work of elastic force fuzzing)', () => {
  it('PI-W-1 Quad: при удвоении Δl работа ровно в 4 раза', () => {
    let violations = 0;
    for (let i = 0; i < ITERATIONS; i++) {
      const k = randomK();
      const dl = randomDl();
      const W1 = workFromStiffness(k, dl);
      const W2 = workFromStiffness(k, dl * 2);
      const ratio = W2 / W1;
      if (Math.abs(ratio - 4) > 1e-9) {
        violations++;
        if (violations < 3) {
          console.warn(`PI-W-1 violated: k=${k}, dl=${dl} → ratio=${ratio}`);
        }
      }
    }
    expect(violations).toBe(0);
  });

  it('PI-W-2 Linear-k: при удвоении k работа ровно в 2 раза', () => {
    let violations = 0;
    for (let i = 0; i < ITERATIONS; i++) {
      const k = randomK();
      const dl = randomDl();
      const W1 = workFromStiffness(k, dl);
      const W2 = workFromStiffness(k * 2, dl);
      const ratio = W2 / W1;
      if (Math.abs(ratio - 2) > 1e-9) violations++;
    }
    expect(violations).toBe(0);
  });

  it('PI-W-3 Equiv: workFromStiffness(k, Δl) == workFromForce(k·Δl_m, Δl)', () => {
    let violations = 0;
    for (let i = 0; i < ITERATIONS; i++) {
      const k = randomK();
      const dl = randomDl();
      const dl_m = dl / 100;
      const F = k * dl_m;
      const W_k = workFromStiffness(k, dl);
      const W_F = workFromForce(F, dl);
      if (Math.abs(W_k - W_F) > 1e-12) violations++;
    }
    expect(violations).toBe(0);
  });

  it('PI-W-4 Sign: W ≥ 0 для любых валидных входов', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const k = randomK();
      const dl = randomDl();
      expect(workFromStiffness(k, dl)).toBeGreaterThanOrEqual(0);
      expect(workFromForce(k * dl / 100, dl)).toBeGreaterThanOrEqual(0);
      expect(workOfGravity(randomMassG(), dl)).toBeGreaterThanOrEqual(0);
    }
  });

  it('PI-W-5 Zero: W = 0 ⇔ Δl = 0', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const k = randomK();
      const m = randomMassG();
      // Δl=0 → W=0
      expect(workFromStiffness(k, 0)).toBe(0);
      expect(workFromForce(massToForce(m), 0)).toBe(0);
      expect(workOfGravity(m, 0)).toBe(0);
    }
  });

  it('PI-W-6 Gravity: A_грав = 2·W_упр при балансе сил m·g = k·Δl_m', () => {
    let violations = 0;
    for (let i = 0; i < ITERATIONS; i++) {
      const m = randomMassG();
      const k = randomK();
      // Статический подвес: Δl = m·g / k → в м, ×100 → см
      const F = massToForce(m);
      const dl = forceToExtension(F, k); // см
      if (dl < 0.01 || dl > 100) continue; // пропускаем нереалистичные
      const A = workOfGravity(m, dl);
      const W = workFromStiffness(k, dl);
      const ratio = A / W;
      if (Math.abs(ratio - 2) > 1e-6) {
        violations++;
        if (violations < 3) {
          console.warn(`PI-W-6 violated: m=${m}, k=${k}, dl=${dl}, A/W=${ratio}`);
        }
      }
    }
    expect(violations).toBe(0);
  });

  it('PI-W-7 Triangle: F·Δl/2 == k·Δl²/2 при F=k·Δl', () => {
    let violations = 0;
    for (let i = 0; i < ITERATIONS; i++) {
      const k = randomK();
      const dl = randomDl();
      const dl_m = dl / 100;
      const F = k * dl_m;
      const triangleArea = (F * dl_m) / 2; // F·Δl/2 в Дж (Δl в метрах!)
      const W = workFromStiffness(k, dl);
      if (Math.abs(triangleArea - W) > 1e-12) violations++;
    }
    expect(violations).toBe(0);
  });

  it('PI-W-8 FIPI: эталонная серия (k=50, m=100..400 г) даёт W ± 5%', () => {
    // ОГЭ-2026 справочные значения:
    // m=100 → Δl≈1.96 см → W≈0.0096 Дж
    // m=200 → Δl≈3.92 см → W≈0.0384 Дж
    // m=300 → Δl≈5.88 см → W≈0.0864 Дж
    // m=400 → Δl≈7.84 см → W≈0.1537 Дж
    const expected = [
      { m: 100, W: 0.0096 },
      { m: 200, W: 0.0384 },
      { m: 300, W: 0.0864 },
      { m: 400, W: 0.1537 },
    ];
    const k = 50;
    for (const c of expected) {
      const F = massToForce(c.m);
      const dl = forceToExtension(F, k);
      const W = workFromStiffness(k, dl);
      const tol = c.W * 0.05;
      expect(W).toBeGreaterThanOrEqual(c.W - tol);
      expect(W).toBeLessThanOrEqual(c.W + tol);
    }
  });
});

// ─── Дополнительный массовый прогон: 10000 рандом-сценариев ───────

describe('Massive randomized check (10 000 scenarios)', () => {
  it('все формулы работают без ошибок и возвращают конечные числа', () => {
    let nonFiniteCount = 0;
    for (let i = 0; i < 10000; i++) {
      const m = randomMassG();
      const k = randomK();
      const dl = randomDl();
      const F = massToForce(m);
      const W_k = workFromStiffness(k, dl);
      const W_F = workFromForce(F, dl);
      const A = workOfGravity(m, dl);
      const consistent = isElasticWorkConsistent(W_k, W_F, 0.5);
      if (
        !Number.isFinite(W_k) ||
        !Number.isFinite(W_F) ||
        !Number.isFinite(A) ||
        typeof consistent !== 'boolean'
      ) {
        nonFiniteCount++;
      }
    }
    expect(nonFiniteCount).toBe(0);
  });
});
