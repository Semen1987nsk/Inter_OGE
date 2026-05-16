import { describe, expect, it } from 'vitest';
import {
  workFromStiffness,
  workFromForce,
  workOfGravity,
  isElasticWorkConsistent,
  formatWork,
} from '../WorkCalc';

// ─── workFromStiffness: W = k·Δl²/2 ────────────────────────────────

describe('workFromStiffness', () => {
  it('k=50 Н/м, Δl=1.96 см → ≈ 0.0096 Дж (груз 100 г)', () => {
    expect(workFromStiffness(50, 1.96)).toBeCloseTo(0.009604, 5);
  });

  it('k=50 Н/м, Δl=3.92 см → ≈ 0.0384 Дж (удвоили Δl → работа в 4 раза)', () => {
    expect(workFromStiffness(50, 3.92)).toBeCloseTo(0.038416, 5);
  });

  it('k=10 Н/м, Δl=9.8 см → ≈ 0.048 Дж', () => {
    expect(workFromStiffness(10, 9.8)).toBeCloseTo(0.04802, 4);
  });

  it('Δl=0 → W=0', () => {
    expect(workFromStiffness(50, 0)).toBe(0);
  });

  it('квадратичная зависимость: при удвоении Δl работа в 4 раз', () => {
    const W1 = workFromStiffness(50, 2);
    const W2 = workFromStiffness(50, 4);
    expect(W2 / W1).toBeCloseTo(4, 5);
  });

  it('линейная зависимость от k: при удвоении k работа удваивается', () => {
    const W1 = workFromStiffness(50, 2);
    const W2 = workFromStiffness(100, 2);
    expect(W2 / W1).toBeCloseTo(2, 5);
  });

  it('бросает RangeError при k ≤ 0', () => {
    expect(() => workFromStiffness(0, 5)).toThrow(RangeError);
    expect(() => workFromStiffness(-10, 5)).toThrow(RangeError);
  });
});

// ─── workFromForce: W = F·Δl/2 ─────────────────────────────────────

describe('workFromForce', () => {
  it('F=0.98 Н, Δl=1.96 см → ≈ 0.0096 Дж', () => {
    expect(workFromForce(0.98, 1.96)).toBeCloseTo(0.009604, 5);
  });

  it('F=2.94 Н, Δl=5.88 см → ≈ 0.0864 Дж (груз 300 г, k=50)', () => {
    expect(workFromForce(2.94, 5.88)).toBeCloseTo(0.086436, 4);
  });

  it('Δl=0 → W=0', () => {
    expect(workFromForce(0.98, 0)).toBe(0);
  });

  it('F=0 → W=0', () => {
    expect(workFromForce(0, 5)).toBe(0);
  });

  it('линейная зависимость от F и от Δl', () => {
    const baseline = workFromForce(1, 1);
    expect(workFromForce(2, 1)).toBeCloseTo(baseline * 2, 6);
    expect(workFromForce(1, 2)).toBeCloseTo(baseline * 2, 6);
    expect(workFromForce(2, 2)).toBeCloseTo(baseline * 4, 6);
  });
});

// ─── Эквивалентность двух формул ───────────────────────────────────

describe('эквивалентность workFromStiffness ↔ workFromForce', () => {
  it('при F = k·Δl_m обе формулы дают одинаковый результат', () => {
    // k=50 Н/м, Δl=1.96 см → Δl_m=0.0196 м → F = 50·0.0196 = 0.98 Н
    const W_k = workFromStiffness(50, 1.96);
    const W_F = workFromForce(0.98, 1.96);
    expect(W_k).toBeCloseTo(W_F, 6);
  });

  it('эквивалентность для k=10, Δl=9.8 см (F=0.98 Н)', () => {
    const W_k = workFromStiffness(10, 9.8);
    const W_F = workFromForce(0.98, 9.8);
    expect(W_k).toBeCloseTo(W_F, 6);
  });

  it('эквивалентность для серии масс 100/200/300 г при k=50', () => {
    const cases = [
      { m_g: 100, F: 0.98, dl_cm: 1.96 },
      { m_g: 200, F: 1.96, dl_cm: 3.92 },
      { m_g: 300, F: 2.94, dl_cm: 5.88 },
    ];
    for (const c of cases) {
      expect(workFromStiffness(50, c.dl_cm)).toBeCloseTo(
        workFromForce(c.F, c.dl_cm),
        5,
      );
    }
  });
});

// ─── workOfGravity: A = m·g·Δl ─────────────────────────────────────

describe('workOfGravity', () => {
  it('m=100 г, Δl=1.96 см → A ≈ 0.0192 Дж', () => {
    expect(workOfGravity(100, 1.96)).toBeCloseTo(0.019208, 5);
  });

  it('m=300 г, Δl=5.88 см → A ≈ 0.1729 Дж', () => {
    expect(workOfGravity(300, 5.88)).toBeCloseTo(0.172872, 4);
  });

  it('Δl=0 → A=0', () => {
    expect(workOfGravity(100, 0)).toBe(0);
  });

  it('m=0 → A=0', () => {
    expect(workOfGravity(0, 5)).toBe(0);
  });

  it('кастомное g (например 9.81 для уточнённых расчётов)', () => {
    expect(workOfGravity(100, 1, 9.81)).toBeCloseTo(0.00981, 5);
  });

  it('A_грав = 2·W_упр при балансе сил m·g = k·Δl_m', () => {
    // Статический подвес: m=100 г, k=50 → Δl=0.0196 м=1.96 см
    const A = workOfGravity(100, 1.96);
    const W_упр = workFromStiffness(50, 1.96);
    expect(A / W_упр).toBeCloseTo(2, 4);
  });

  it('закон 2× работает для разных масс/пружин', () => {
    // m=300 г, k=50 → Δl=5.88 см
    expect(workOfGravity(300, 5.88) / workFromStiffness(50, 5.88)).toBeCloseTo(2, 4);
    // m=100 г, k=10 → Δl=9.8 см
    expect(workOfGravity(100, 9.8) / workFromStiffness(10, 9.8)).toBeCloseTo(2, 4);
  });
});

// ─── isElasticWorkConsistent ───────────────────────────────────────

describe('isElasticWorkConsistent', () => {
  it('идентичные значения → consistent', () => {
    expect(isElasticWorkConsistent(0.01, 0.01)).toBe(true);
  });

  it('разница 4% → consistent (порог 5%)', () => {
    expect(isElasticWorkConsistent(0.01, 0.0104)).toBe(true);
  });

  it('разница 6% → not consistent', () => {
    expect(isElasticWorkConsistent(0.01, 0.0106)).toBe(false);
  });

  it('оба нулевые → consistent', () => {
    expect(isElasticWorkConsistent(0, 0)).toBe(true);
  });

  it('один ноль, другой ненулевой → not consistent', () => {
    expect(isElasticWorkConsistent(0, 0.001)).toBe(false);
  });

  it('кастомный tolerance', () => {
    expect(isElasticWorkConsistent(0.01, 0.012, 0.25)).toBe(true);
    expect(isElasticWorkConsistent(0.01, 0.012, 0.05)).toBe(false);
  });
});

// ─── formatWork (отображение) ──────────────────────────────────────

describe('formatWork', () => {
  it('значение 0.0096 → "0.0096"', () => {
    expect(formatWork(0.0096)).toBe('0.0096');
  });

  it('значение 0.038416 → "0.0384"', () => {
    expect(formatWork(0.038416)).toBe('0.0384');
  });

  it('значение около нуля → "0.0000"', () => {
    expect(formatWork(0.00001)).toBe('0.0000');
    expect(formatWork(0)).toBe('0.0000');
  });
});

// ─── ФИПИ — эталонная серия для k=50 Н/м ──────────────────────────

describe('ФИПИ ОГЭ-2026: эталонная серия (k=50 Н/м)', () => {
  // Допуск ФИПИ 5% от ожидаемого значения
  const cases = [
    { m_g: 100, dl_cm: 1.96, W_expected: 0.0096 },
    { m_g: 200, dl_cm: 3.92, W_expected: 0.0384 },
    { m_g: 300, dl_cm: 5.88, W_expected: 0.0864 },
    { m_g: 400, dl_cm: 7.84, W_expected: 0.1537 },
  ];

  it.each(cases)(
    'm=$m_g г, Δl=$dl_cm см → W_упр ≈ $W_expected Дж',
    ({ dl_cm, W_expected }) => {
      const W = workFromStiffness(50, dl_cm);
      const tol = W_expected * 0.05;
      expect(W).toBeGreaterThanOrEqual(W_expected - tol);
      expect(W).toBeLessThanOrEqual(W_expected + tol);
    },
  );
});
