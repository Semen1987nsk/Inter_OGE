import { describe, expect, it } from 'vitest';
import { current, resistance, power, workOfCurrent } from '../CircuitModel';

describe('resistance R=U/I', () => {
  it('R1: U=1.5, I=0.32 → ≈4.69 Ом', () => {
    expect(resistance(1.5, 0.32)).toBeCloseTo(4.6875, 3);
  });
  it('бросает при I<=0 / NaN', () => {
    expect(() => resistance(1.5, 0)).toThrow(RangeError);
    expect(() => resistance(1.5, -1)).toThrow(RangeError);
    expect(() => resistance(NaN, 0.3)).toThrow(RangeError);
  });
});
describe('current I=U/R', () => {
  it('U=3, R=4.7 → ≈0.638 А', () => { expect(current(3, 4.7)).toBeCloseTo(0.6383, 3); });
  it('бросает при R<=0', () => { expect(() => current(3, 0)).toThrow(RangeError); });
});
describe('power P=U*I', () => {
  it('U=5.7, I=0.70 → ≈3.99 Вт', () => { expect(power(5.7, 0.70)).toBeCloseTo(3.99, 2); });
  it('бросает при отрицательных', () => { expect(() => power(-1, 0.5)).toThrow(RangeError); });
});
describe('workOfCurrent A=U*I*t', () => {
  it('U=2.9, I=0.51, t=60 → ≈88.7 Дж', () => { expect(workOfCurrent(2.9, 0.51, 60)).toBeCloseTo(88.74, 2); });
  it('бросает при t<=0', () => { expect(() => workOfCurrent(3, 0.5, 0)).toThrow(RangeError); });
});

// ---------------------------------------------------------------------------
// Property-based fuzzing: детерминированные вложенные циклы (~50k итераций)
// NO Math.random / Date — все значения определены индексами петель
// ---------------------------------------------------------------------------
describe('property fuzzing — 12 инвариантных категорий (~50k итераций)', () => {
  // Диапазоны: U [0.1..9.0] шаг 0.1 → 90 значений
  //            R [0.1..100] шаг 1   → 100 значений
  //            I [0.01..3] шаг 0.03 → 100 значений
  //            t [1..300]  шаг 3    → 100 значений
  // 90×100 = 9000; 100×100 = 10000; итого 4 пары ≈ 40k+ покрывают ~50k

  const EPS = 1e-9;

  // Категория 1: resistance(U, I) > 0 для всех U, I > 0
  it('кат.1: resistance(U,I) > 0 для всех U>=0, I>0', () => {
    for (let iu = 0; iu < 90; iu++) {
      const U = (iu + 1) * 0.1;          // 0.1 .. 9.0
      for (let ii = 0; ii < 100; ii++) {
        const I = 0.01 + ii * 0.03;      // 0.01 .. 3.0
        expect(resistance(U, I)).toBeGreaterThan(0);
      }
    }
  });

  // Категория 2: resistance(U, I) = U / I (арифметическое тождество)
  it('кат.2: resistance(U,I) === U/I точно', () => {
    for (let iu = 0; iu < 90; iu++) {
      const U = (iu + 1) * 0.1;
      for (let ii = 0; ii < 100; ii++) {
        const I = 0.01 + ii * 0.03;
        expect(resistance(U, I)).toBeCloseTo(U / I, 10);
      }
    }
  });

  // Категория 3: current(U, R) > 0 для всех U>=0, R>0
  it('кат.3: current(U,R) > 0 для U>=0.1, R>0', () => {
    for (let iu = 0; iu < 90; iu++) {
      const U = (iu + 1) * 0.1;
      for (let ir = 0; ir < 100; ir++) {
        const R = 0.1 + ir * 1;          // 0.1 .. 100.1
        expect(current(U, R)).toBeGreaterThan(0);
      }
    }
  });

  // Категория 4: current(U, R) = U / R (арифметическое тождество)
  it('кат.4: current(U,R) === U/R точно', () => {
    for (let iu = 0; iu < 90; iu++) {
      const U = (iu + 1) * 0.1;
      for (let ir = 0; ir < 100; ir++) {
        const R = 0.1 + ir * 1;
        expect(current(U, R)).toBeCloseTo(U / R, 10);
      }
    }
  });

  // Категория 5: монотонность I↑ при U↑ (фиксированный R)
  it('кат.5: монотонность I↑ при U↑ (R фиксирован)', () => {
    const Rs = [1, 4.7, 8.2, 20, 100];
    for (const R of Rs) {
      let prev = current(0.1, R);
      for (let iu = 1; iu < 90; iu++) {
        const U = (iu + 1) * 0.1;
        const cur = current(U, R);
        expect(cur).toBeGreaterThan(prev - EPS);
        prev = cur;
      }
    }
  });

  // Категория 6: монотонность I↓ при R↑ (фиксированное U)
  it('кат.6: монотонность I↓ при R↑ (U фиксировано)', () => {
    const Us = [1.5, 3, 6, 9];
    for (const U of Us) {
      let prev = current(U, 0.1);
      for (let ir = 1; ir < 100; ir++) {
        const R = 0.1 + ir * 1;
        const cur = current(U, R);
        expect(cur).toBeLessThan(prev + EPS);
        prev = cur;
      }
    }
  });

  // Категория 7: round-trip resistance(U, current(U, R)) ≈ R
  it('кат.7: round-trip resistance(U, current(U,R)) ≈ R', () => {
    for (let iu = 0; iu < 50; iu++) {
      const U = (iu + 1) * 0.18;
      for (let ir = 0; ir < 100; ir++) {
        const R = 0.1 + ir * 1;
        expect(resistance(U, current(U, R))).toBeCloseTo(R, 8);
      }
    }
  });

  // Категория 8: power(U,I) >= 0 для всех U>=0, I>=0
  it('кат.8: power(U,I) >= 0 для всех U,I>=0', () => {
    for (let iu = 0; iu < 90; iu++) {
      const U = iu * 0.1;               // 0 .. 8.9
      for (let ii = 0; ii < 100; ii++) {
        const I = ii * 0.03;            // 0 .. 2.97
        expect(power(U, I)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  // Категория 9: power = U * I (прямое тождество)
  it('кат.9: power(U,I) === U*I точно', () => {
    for (let iu = 0; iu < 90; iu++) {
      const U = iu * 0.1;
      for (let ii = 0; ii < 100; ii++) {
        const I = ii * 0.03;
        expect(power(U, I)).toBeCloseTo(U * I, 10);
      }
    }
  });

  // Категория 10: workOfCurrent = power(U,I) * t
  it('кат.10: workOfCurrent(U,I,t) === power(U,I) * t', () => {
    for (let iu = 0; iu < 50; iu++) {
      const U = (iu + 1) * 0.18;
      for (let ii = 0; ii < 100; ii++) {
        const I = 0.01 + ii * 0.03;
        const t = 1 + ii * 3;           // 1..298
        expect(workOfCurrent(U, I, t)).toBeCloseTo(power(U, I) * t, 8);
      }
    }
  });

  // Категория 11: workOfCurrent монотонно растёт по t при U, I фиксированных
  it('кат.11: workOfCurrent монотонна по t', () => {
    const cases = [{ U: 1.5, I: 0.32 }, { U: 6, I: 0.75 }, { U: 9, I: 3 }];
    for (const { U, I } of cases) {
      let prev = workOfCurrent(U, I, 1);
      for (let it2 = 1; it2 < 100; it2++) {
        const t = 1 + it2 * 3;
        const cur = workOfCurrent(U, I, t);
        expect(cur).toBeGreaterThan(prev - EPS);
        prev = cur;
      }
    }
  });

  // Категория 12: RangeError-граница — resistance, current, power, workOfCurrent
  it('кат.12: RangeError на граничных невалидных значениях (Inf, -Inf, NaN, ≤0 знаменатели)', () => {
    const invalids = [0, -0.001, -1, -100];
    for (const v of invalids) {
      expect(() => resistance(1, v)).toThrow(RangeError);   // I <= 0
      expect(() => current(1, v)).toThrow(RangeError);      // R <= 0
    }
    expect(() => power(-0.001, 1)).toThrow(RangeError);     // U < 0
    expect(() => power(1, -0.001)).toThrow(RangeError);     // I < 0
    for (const v of invalids) {
      expect(() => workOfCurrent(1, 0.5, v)).toThrow(RangeError); // t <= 0
    }
    // non-finite
    for (const v of [NaN, Infinity, -Infinity]) {
      expect(() => resistance(v, 1)).toThrow(RangeError);
      expect(() => current(v, 1)).toThrow(RangeError);
      expect(() => power(v, 1)).toThrow(RangeError);
      expect(() => workOfCurrent(v, 1, 1)).toThrow(RangeError);
    }
  });
});
