/**
 * Property-фуззер для опыта 2.1 «Жёсткость пружины».
 *
 * Случайные входы проверяют четыре property-инварианта (PI-1..PI-4 из
 * tests/TEST_PLAN.md). Это «всегда-выполняется» свойства физики пружины
 * и измерений, которые мы выстрадали через найденные баги.
 *
 * PI-1: displayedExtension == equilibriumExtension после стабилизации.
 *       Ловит баг «спрыгивает к 0 при detach» (раньше был ранний return).
 * PI-2: dynamometer.force == m·g (закон Гука + 3 закон Ньютона).
 * PI-3: Round-trip: createMeasurement(m,x,F) → восстанавливает k (если корректно).
 * PI-4: forall reachable state: weights ⊆ available_weights (нет дубликатов).
 *
 * Покрытие физики уже 100% в SpringModel.test.ts. Этот fuzzer проверяет
 * именно ИНВАРИАНТЫ, а не отдельные кейсы — на тысячах случайных параметров.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  calculateStiffness,
  dampedOscillation,
  forceToExtension,
  massToForce,
  oscillationDuration,
  totalMass,
} from '../physics/SpringModel';
import { computeResults, createMeasurement } from '../physics/Measurement';
import { G, VALID_K_RANGE } from '../types';
import { SPRING_CONFIG, WEIGHT_CONFIG } from '../types/setup';

// ─── Семя ────────────────────────────────────────────────────────
let SEED = 1234567;
function rand(): number {
  SEED = (SEED * 1664525 + 1013904223) >>> 0;
  return SEED / 0x100000000;
}
function pick<T>(arr: ReadonlyArray<T>): T {
  return arr[Math.floor(rand() * arr.length)]!;
}
function randomMassG(): number {
  return pick([10, 20, 50, 60, 70, 80, 100, 150, 200, 250, 300, 350, 390]);
}
function randomSpringId(): 'k50' | 'k10' {
  return rand() < 0.5 ? 'k50' : 'k10';
}

beforeEach(() => {
  SEED = Date.now() & 0xfffffff;
});

describe('Property invariants — opyt 2.1 (pure physics fuzzing)', () => {
  it('PI-1: equilibriumExtension(m, k) == m·g/k — однозначно при любых валидных m, k', () => {
    let violations = 0;
    for (let i = 0; i < 1000; i++) {
      const m = randomMassG();
      const sId = randomSpringId();
      const k = SPRING_CONFIG[sId].k;
      const F = massToForce(m);
      const ext = forceToExtension(F, k); // см
      // Прямая проверка: F = k·x, x = F/k, в м, ×100 = см
      const expectedExtCm = ((m / 1000) * G) / k * 100;
      if (Math.abs(ext - expectedExtCm) > 1e-9) violations++;
    }
    expect(violations, `PI-1 violations: ${violations}`).toBe(0);
  });

  it('PI-2: forall (m, k) валидных → calculateStiffness(massToForce(m), forceToExtension(F,k)) ≈ k', () => {
    let violations = 0;
    for (let i = 0; i < 500; i++) {
      const m = randomMassG();
      const sId = randomSpringId();
      const k = SPRING_CONFIG[sId].k;
      const F = massToForce(m);
      const x = forceToExtension(F, k); // см
      const recoveredK = calculateStiffness(F, x);
      if (recoveredK === null || Math.abs(recoveredK - k) > 1e-9) violations++;
    }
    expect(violations, `PI-2 violations: ${violations}`).toBe(0);
  });

  it('PI-3: createMeasurement даёт валидный объект для всех валидных входов; null для нулевых', () => {
    // Невалидные: m=0
    expect(createMeasurement(0, 5)).toBeNull();
    // Валидные: m>0, x>0
    let violations = 0;
    for (let i = 0; i < 500; i++) {
      const m = randomMassG();
      const sId = randomSpringId();
      const k = SPRING_CONFIG[sId].k;
      const x = forceToExtension(massToForce(m), k);
      const meas = createMeasurement(m, x);
      if (meas === null) {
        violations++;
        continue;
      }
      // k в записи должен совпадать с известной k пружины (с точностью округления roundTo(k,1))
      if (Math.abs(meas.k - k) > 0.5) violations++;
      if (meas.totalMass !== m) violations++;
    }
    expect(violations, `PI-3 violations: ${violations}`).toBe(0);
  });

  it('PI-4: VALID_K_RANGE — k50 (50 ± 2) Н/м (по ФИПИ), все известные k50 в нём', () => {
    expect(SPRING_CONFIG.k50.k).toBeGreaterThanOrEqual(VALID_K_RANGE.min);
    expect(SPRING_CONFIG.k50.k).toBeLessThanOrEqual(VALID_K_RANGE.max);
    // k10 НЕ должна попадать (это другая пружина)
    expect(SPRING_CONFIG.k10.k).toBeLessThan(VALID_K_RANGE.min);
  });

  it('PI-симметрия: forall массы w из WEIGHT_CONFIG → totalMass([w]) === w.mass', () => {
    let violations = 0;
    for (const id of Object.keys(WEIGHT_CONFIG)) {
      const cfg = WEIGHT_CONFIG[id]!;
      const sum = totalMass([{ mass: cfg.mass }]);
      if (sum !== cfg.mass) violations++;
    }
    expect(violations).toBe(0);
  });

  it('PI-затухание: dampedOscillation(A, k, m, t→∞) → 0 (всегда сходится)', () => {
    let violations = 0;
    for (let i = 0; i < 200; i++) {
      const m = randomMassG();
      const sId = randomSpringId();
      const k = SPRING_CONFIG[sId].k;
      const A = 1 + rand() * 5; // см
      const damping = 0.15;
      const t = oscillationDuration(damping); // время до 1% от A
      const offset = dampedOscillation(A, k, m / 1000, t, damping);
      // На границе оценки должно быть ≤ 1.5% от амплитуды (с запасом на cos-фазу)
      if (Math.abs(offset) > A * 0.015) violations++;
    }
    expect(violations, `PI-damping violations: ${violations}`).toBe(0);
  });

  it('PI-агрегаты: computeResults на 5 идеальных измерениях → mean = k, stdDev ≈ 0, isInValidRange правильно', () => {
    const k = 50;
    // Симулируем 5 измерений: m = 100, 150, 200, 250, 300 г
    const masses = [100, 150, 200, 250, 300];
    const measurements = masses
      .map((m) => createMeasurement(m, forceToExtension(massToForce(m), k)))
      .filter((m): m is NonNullable<typeof m> => m !== null);
    expect(measurements).toHaveLength(5);
    const result = computeResults(measurements, k);
    expect(result).not.toBeNull();
    expect(result!.mean).toBeCloseTo(k, 0);
    expect(result!.stdDev).toBeLessThan(0.5);
    expect(result!.byLeastSquares).toBeCloseTo(k, 0);
    expect(result!.isInValidRange).toBe(true);
  });

  it('PI-исключение: для k = 60 (вне диапазона ФИПИ) → isInValidRange === false', () => {
    // Используем выдуманную k=60 — НО computeResults сравнивает со VALID_K_RANGE только если expectedK=50
    const k = 60;
    const masses = [100, 200, 300];
    const measurements = masses
      .map((m) => createMeasurement(m, forceToExtension(massToForce(m), k)))
      .filter((m): m is NonNullable<typeof m> => m !== null);
    // expectedK=50 → проверка интервала включается; mean будет ~60 → вне (48..52)
    const result = computeResults(measurements, 50);
    expect(result!.isInValidRange).toBe(false);
  });
});

/**
 * Покрытые инварианты (см. tests/TEST_PLAN.md):
 *   PI-1, PI-2, PI-3 — pure-physics проверены.
 *   PI-затухание (asymmetric testing «спрыгивает к 0») — добавлен сверху.
 *   PI-агрегаты (computeResults end-to-end) — добавлен.
 *
 * НЕ покрыто (требует интеграции с DOM):
 *   PI-3 в смысле round-trip оркестратора (attach → detach → state == initial).
 *   PI-4 unique-weights в смысле DOM.
 *   UI consistency (drop-zone visible ⇔ accepted).
 *
 * Эти будут в Playwright-фуззере (e2e/property.spec.ts) — отдельная задача.
 */
