import { describe, expect, it } from 'vitest';
import { current, resistance, power, workOfCurrent, lampCurrent, lampResistance, LAMP_RATED_U, LAMP_RATED_I, wireResistance, RESISTIVITY, seriesResistance, parallelResistance } from '../CircuitModel';

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

describe('lampCurrent — нелинейная ВАХ лампы', () => {
  it('номинал: U=4,8 В → I≈0,5 А', () => {
    expect(lampCurrent(4.8)).toBeCloseTo(0.5, 2);
    expect(lampCurrent(LAMP_RATED_U)).toBeCloseTo(LAMP_RATED_I, 2);
  });
  it('I(0)=0', () => { expect(lampCurrent(0)).toBe(0); });
  it('монотонно возрастает', () => {
    expect(lampCurrent(3)).toBeGreaterThan(lampCurrent(2));
    expect(lampCurrent(6)).toBeGreaterThan(lampCurrent(4));
  });
  it('вогнута: прирост I падает при росте U (нелинейность)', () => {
    const d1 = lampCurrent(2) - lampCurrent(1);
    const d2 = lampCurrent(6) - lampCurrent(5);
    expect(d2).toBeLessThan(d1);
  });
  it('сопротивление лампы растёт с напряжением (нагрев)', () => {
    expect(lampResistance(5)).toBeGreaterThan(lampResistance(1));
  });
  it('lampResistance(0) = R_cold (холодная нить)', () => {
    expect(lampResistance(0)).toBeCloseTo(2.4, 3);
  });
  it('бросает на невалидных входах', () => {
    expect(() => lampCurrent(NaN)).toThrow(RangeError);
    expect(() => lampCurrent(-1)).toThrow(RangeError);
  });
});

describe('lampCurrent — property фаззинг', () => {
  const Us: number[] = [];
  for (let u = 0; u <= 7.5; u = +(u + 0.05).toFixed(2)) Us.push(u);
  it('всегда конечно и >=0', () => {
    for (const u of Us) { const i = lampCurrent(u); expect(Number.isFinite(i)).toBe(true); expect(i).toBeGreaterThanOrEqual(0); }
  });
  it('строго монотонна при U>0', () => {
    for (let n = 1; n < Us.length; n++) if (Us[n]! > 0) expect(lampCurrent(Us[n]!)).toBeGreaterThan(lampCurrent(Us[n - 1]!));
  });
  it('вогнута: вторая разность <= 0', () => {
    for (let n = 2; n < Us.length; n++) {
      const d2 = lampCurrent(Us[n]!) - 2 * lampCurrent(Us[n - 1]!) + lampCurrent(Us[n - 2]!);
      expect(d2).toBeLessThanOrEqual(1e-9);
    }
  });
  it('лампа ниже линейной экстраполяции из 0 (нелинейность вниз)', () => {
    // касательная в 0 имеет наклон 1/R_cold; реальная кривая ниже неё при U>0
    for (const u of Us) if (u > 0) expect(lampCurrent(u)).toBeLessThanOrEqual(u / 2.4 + 1e-9);
  });
  it('R лампы монотонно растёт с U', () => {
    for (let n = 1; n < Us.length; n++) if (Us[n]! > 0 && Us[n - 1]! > 0) expect(lampResistance(Us[n]!)).toBeGreaterThanOrEqual(lampResistance(Us[n - 1]!) - 1e-9);
  });
  it('R лампы в диапазоне [R_cold, рабочая] для рабочих U', () => {
    for (const u of Us) if (u > 0 && u <= 4.8) { const r = lampResistance(u); expect(r).toBeGreaterThanOrEqual(2.4 - 1e-9); expect(r).toBeLessThanOrEqual(9.6 + 1e-9); }
  });
});

describe('wireResistance R=ρl/S', () => {
  it('номинал набора: нихром l=1,0 S=0,25мм² → 4,4 Ом', () => {
    expect(wireResistance(RESISTIVITY.нихром, 1.0, 0.25e-6)).toBeCloseTo(4.4, 5);
  });
  it('R ∝ l: удвоение длины удваивает R', () => {
    const r1 = wireResistance(RESISTIVITY.нихром, 1.0, 0.25e-6);
    const r2 = wireResistance(RESISTIVITY.нихром, 2.0, 0.25e-6);
    expect(r2 / r1).toBeCloseTo(2, 6);
  });
  it('R ∝ 1/S: удвоение сечения вдвое уменьшает R', () => {
    const r1 = wireResistance(RESISTIVITY.нихром, 2.0, 0.25e-6);
    const r2 = wireResistance(RESISTIVITY.нихром, 2.0, 0.5e-6);
    expect(r1 / r2).toBeCloseTo(2, 6);
  });
  it('R ∝ ρ: абсолютные значения набора (l=2,0 S=0,25мм²) и отношение', () => {
    const rNi = wireResistance(RESISTIVITY.нихром, 2.0, 0.25e-6);
    const rKo = wireResistance(RESISTIVITY.константан, 2.0, 0.25e-6);
    expect(rNi).toBeCloseTo(8.8, 5); // нихром → 8,8 Ом (эталон набора)
    expect(rKo).toBeCloseTo(4.0, 5); // константан → 4,0 Ом
    expect(rNi / rKo).toBeCloseTo(1.1 / 0.5, 6); // хардкод-эталон, не из RESISTIVITY
  });
  it.each([[0, 1, 1e-6], [1e-6, 0, 1e-6], [1e-6, 1, 0], [-1e-6, 1, 1e-6], [NaN, 1, 1e-6]])(
    'RangeError на невалидных (%p,%p,%p)', (rho, l, s) => {
      expect(() => wireResistance(rho, l, s)).toThrow(RangeError);
    });
  it('фаззинг: R>0 и монотонно растёт по l при фикс ρ,S', () => {
    for (let i = 0; i < 200; i++) {
      const l1 = 0.1 + i * 0.01, l2 = l1 + 0.05;
      const r1 = wireResistance(RESISTIVITY.нихром, l1, 0.5e-6);
      const r2 = wireResistance(RESISTIVITY.нихром, l2, 0.5e-6);
      expect(r1).toBeGreaterThan(0);
      expect(r2).toBeGreaterThan(r1);
    }
  });
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

describe('seriesResistance R = ΣR', () => {
  it('два резистора: R1=4,7 R2=5,7 → 10,4 Ом', () => {
    expect(seriesResistance(4.7, 5.7)).toBeCloseTo(10.4, 5);
  });
  it('один резистор: passthrough', () => {
    expect(seriesResistance(4.7)).toBeCloseTo(4.7, 6);
  });
  it('три резистора: 1+2+3=6', () => {
    expect(seriesResistance(1, 2, 3)).toBeCloseTo(6, 6);
  });
  it('R_послед ≥ max(Ri)', () => {
    const r = seriesResistance(4.7, 5.7, 2.0);
    expect(r).toBeGreaterThanOrEqual(Math.max(4.7, 5.7, 2.0));
  });
  it('RangeError на пустом аргументе', () => {
    expect(() => seriesResistance()).toThrow(RangeError);
  });
  it('RangeError на нечисловом', () => {
    expect(() => seriesResistance(NaN, 5.7)).toThrow(RangeError);
  });
  it('RangeError на нуле', () => {
    expect(() => seriesResistance(0, 5.7)).toThrow(RangeError);
  });
  it('RangeError на отрицательном', () => {
    expect(() => seriesResistance(-1, 5.7)).toThrow(RangeError);
  });
  it('фаззинг: seriesResistance ≥ max(Ri) для случайных положительных', () => {
    for (let i = 0; i < 300; i++) {
      const a = 0.5 + i * 0.03;
      const b = 0.3 + i * 0.02;
      const r = seriesResistance(a, b);
      expect(r).toBeGreaterThanOrEqual(Math.max(a, b) - 1e-9);
      expect(r).toBeCloseTo(a + b, 9);
    }
  });
});

describe('parallelResistance R = 1/Σ(1/R)', () => {
  it('R1=4,7 R2=5,7 → ≈2,575 Ом', () => {
    expect(parallelResistance(4.7, 5.7)).toBeCloseTo((4.7 * 5.7) / (4.7 + 5.7), 5);
  });
  it('один резистор: passthrough', () => {
    expect(parallelResistance(4.7)).toBeCloseTo(4.7, 6);
  });
  it('два равных R: R_пар = R/2', () => {
    expect(parallelResistance(6.0, 6.0)).toBeCloseTo(3.0, 6);
  });
  it('R_пар ≤ min(Ri)', () => {
    const r = parallelResistance(4.7, 5.7);
    expect(r).toBeLessThanOrEqual(Math.min(4.7, 5.7) + 1e-9);
  });
  it('RangeError на пустом аргументе', () => {
    expect(() => parallelResistance()).toThrow(RangeError);
  });
  it('RangeError на нечисловом', () => {
    expect(() => parallelResistance(NaN, 5.7)).toThrow(RangeError);
  });
  it('RangeError на нуле', () => {
    expect(() => parallelResistance(0, 5.7)).toThrow(RangeError);
  });
  it('RangeError на отрицательном', () => {
    expect(() => parallelResistance(-1, 5.7)).toThrow(RangeError);
  });
  it('фаззинг: parallelResistance ≤ min(Ri)', () => {
    for (let i = 0; i < 300; i++) {
      const a = 0.5 + i * 0.03;
      const b = 0.3 + i * 0.02;
      const r = parallelResistance(a, b);
      expect(r).toBeLessThanOrEqual(Math.min(a, b) + 1e-9);
      expect(r).toBeGreaterThan(0);
    }
  });
  it('фаззинг: серия ≥ параллель для тех же резисторов', () => {
    for (let i = 1; i <= 200; i++) {
      const a = i * 0.05;
      const b = i * 0.07;
      expect(seriesResistance(a, b)).toBeGreaterThan(parallelResistance(a, b));
    }
  });
});

describe('серия/параллель — физические инварианты R1=4,7 R2=5,7', () => {
  const R1 = 4.7;
  const R2 = 5.7;
  const U = 4.5;

  it('серия: U1 + U2 = U_источника', () => {
    const R_ser = seriesResistance(R1, R2);
    const I_ser = current(U, R_ser);
    const U1 = I_ser * R1;
    const U2 = I_ser * R2;
    expect(U1 + U2).toBeCloseTo(U, 6);
  });

  it('параллель: I1 + I2 = I_общ', () => {
    const I1 = current(U, R1);
    const I2 = current(U, R2);
    const R_par = parallelResistance(R1, R2);
    const I_total = current(U, R_par);
    expect(I1 + I2).toBeCloseTo(I_total, 6);
  });

  it('серия: U1 < U_общ, U2 < U_общ (ни одно не всё напряжение)', () => {
    const R_ser = seriesResistance(R1, R2);
    const I_ser = current(U, R_ser);
    const U1 = I_ser * R1;
    const U2 = I_ser * R2;
    expect(U1).toBeLessThan(U);
    expect(U2).toBeLessThan(U);
  });

  it('параллель: I1 + I2 > max(I1, I2) (сумма больше каждой ветви)', () => {
    const I1 = current(U, R1);
    const I2 = current(U, R2);
    expect(I1 + I2).toBeGreaterThan(Math.max(I1, I2));
  });
});
