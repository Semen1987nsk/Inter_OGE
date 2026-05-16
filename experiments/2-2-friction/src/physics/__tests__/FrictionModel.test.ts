import { describe, expect, it } from 'vitest';
import {
  coefficientFromForces,
  frictionForce,
  leastSquaresThroughOrigin,
  massToForce,
  meanAndStdDev,
  normalForce,
  roundTo,
  slidingAcceleration,
  staticToKineticTransition,
  totalMass,
  workOfFriction,
} from '../FrictionModel';

describe('massToForce / normalForce', () => {
  it('m=0 → F=0', () => {
    expect(massToForce(0)).toBe(0);
    expect(normalForce(0)).toBe(0);
  });

  it('m=50г (брусок) → F = 0.49 Н (g=9.8)', () => {
    expect(massToForce(50)).toBeCloseTo(0.49, 3);
    expect(normalForce(50)).toBeCloseTo(0.49, 3);
  });

  it('m=150г (брусок + 100г) → F = 1.47 Н', () => {
    expect(normalForce(150)).toBeCloseTo(1.47, 3);
  });

  it('m=350г (брусок + 3×100г) → F = 3.43 Н', () => {
    expect(normalForce(350)).toBeCloseTo(3.43, 3);
  });
});

describe('frictionForce', () => {
  it('μ=0 → F_тр=0 при любом N', () => {
    expect(frictionForce(10, 0)).toBe(0);
  });

  it('N=0 → F_тр=0 при любом μ', () => {
    expect(frictionForce(0, 0.5)).toBe(0);
  });

  it('μ=0.2, N=0.49 (брусок 50г) → F_тр ≈ 0.098 Н', () => {
    expect(frictionForce(0.49, 0.2)).toBeCloseTo(0.098, 4);
  });

  it('μ=0.6 (поверхность Б), N=1.47 (150г) → F_тр ≈ 0.882 Н', () => {
    expect(frictionForce(1.47, 0.6)).toBeCloseTo(0.882, 3);
  });

  it('негативные значения → RangeError', () => {
    expect(() => frictionForce(-1, 0.2)).toThrow(RangeError);
    expect(() => frictionForce(1, -0.2)).toThrow(RangeError);
  });
});

describe('coefficientFromForces', () => {
  it('обратная функция к frictionForce: μ = F_тр / N', () => {
    const N = normalForce(150);
    const F = frictionForce(N, 0.2);
    expect(coefficientFromForces(F, N)).toBeCloseTo(0.2, 6);
  });

  it('N=0 → null (деление на ноль)', () => {
    expect(coefficientFromForces(0.5, 0)).toBeNull();
  });

  it('F_тр=0, N>0 → μ=0', () => {
    expect(coefficientFromForces(0, 1)).toBe(0);
  });

  it('негативные значения → RangeError', () => {
    expect(() => coefficientFromForces(-0.1, 1)).toThrow(RangeError);
    expect(() => coefficientFromForces(0.1, -1)).toThrow(RangeError);
  });
});

describe('workOfFriction', () => {
  it('S=0 → A=0', () => {
    expect(workOfFriction(1, 0)).toBe(0);
  });

  it('F=1Н, S=500мм → A = 0.5 Дж', () => {
    expect(workOfFriction(1, 500)).toBeCloseTo(0.5, 6);
  });

  it('F=0.294Н (μ=0.2, m=150г), S=300мм → A ≈ 0.0882 Дж', () => {
    const F = frictionForce(normalForce(150), 0.2);
    expect(workOfFriction(F, 300)).toBeCloseTo(0.0882, 4);
  });

  it('негативное расстояние → RangeError', () => {
    expect(() => workOfFriction(1, -1)).toThrow(RangeError);
  });
});

describe('staticToKineticTransition', () => {
  const N = 1.47; // брусок + 100г, поверхность А
  const muS = 0.22;
  const muK = 0.2;
  const maxStatic = muS * N; // ≈ 0.323
  const kinetic = muK * N; // ≈ 0.294

  it('applied < max static: брусок в покое, F = applied', () => {
    const r = staticToKineticTransition(0.1, N, muS, muK);
    expect(r.isSliding).toBe(false);
    expect(r.actualFrictionN).toBe(0.1);
    expect(r.excessForce).toBe(0);
  });

  it('applied = max static: брусок ещё в покое, F = max static', () => {
    const r = staticToKineticTransition(maxStatic, N, muS, muK);
    expect(r.isSliding).toBe(false);
    expect(r.actualFrictionN).toBeCloseTo(maxStatic, 6);
  });

  it('applied чуть больше max static: срыв! F = kinetic', () => {
    const r = staticToKineticTransition(maxStatic + 0.001, N, muS, muK);
    expect(r.isSliding).toBe(true);
    expect(r.actualFrictionN).toBeCloseTo(kinetic, 6);
    expect(r.excessForce).toBeGreaterThan(0);
  });

  it('applied >> max static: установившееся скольжение, F = kinetic, есть избыток', () => {
    const r = staticToKineticTransition(1.0, N, muS, muK);
    expect(r.isSliding).toBe(true);
    expect(r.actualFrictionN).toBeCloseTo(kinetic, 6);
    expect(r.excessForce).toBeCloseTo(1.0 - kinetic, 6);
  });

  it('PI-4: монотонность переходов (F покоя растёт линейно до max, потом срыв)', () => {
    const samples = [0, 0.1, 0.2, maxStatic, maxStatic + 0.0001, 0.5, 1.0];
    const results = samples.map((a) => staticToKineticTransition(a, N, muS, muK));
    // До max static F = applied (растёт)
    expect(results[0]!.actualFrictionN).toBe(0);
    expect(results[1]!.actualFrictionN).toBe(0.1);
    expect(results[2]!.actualFrictionN).toBe(0.2);
    expect(results[3]!.actualFrictionN).toBeCloseTo(maxStatic, 6);
    // После срыва F = kinetic (константа, меньше maxStatic)
    expect(results[4]!.actualFrictionN).toBeCloseTo(kinetic, 6);
    expect(results[5]!.actualFrictionN).toBeCloseTo(kinetic, 6);
    expect(results[6]!.actualFrictionN).toBeCloseTo(kinetic, 6);
  });
});

describe('slidingAcceleration', () => {
  it('excess=0 → a=0 (равномерное скольжение)', () => {
    expect(slidingAcceleration(0, 100)).toBe(0);
  });

  it('excess=0.1Н, m=100г → a = 1 м/с²', () => {
    expect(slidingAcceleration(0.1, 100)).toBeCloseTo(1, 6);
  });

  it('m≤0 → RangeError', () => {
    expect(() => slidingAcceleration(0.1, 0)).toThrow(RangeError);
    expect(() => slidingAcceleration(0.1, -10)).toThrow(RangeError);
  });
});

describe('totalMass', () => {
  it('пустой массив → 0', () => {
    expect(totalMass([])).toBe(0);
  });

  it('брусок + 3×100г = 350', () => {
    expect(totalMass([{ mass: 50 }, { mass: 100 }, { mass: 100 }, { mass: 100 }])).toBe(350);
  });

  it('наборный груз 60г = штанга 10 + диск 50', () => {
    expect(totalMass([{ mass: 10 }, { mass: 50 }])).toBe(60);
  });
});

describe('roundTo', () => {
  it('округление вверх и вниз', () => {
    expect(roundTo(0.123456, 2)).toBe(0.12);
    expect(roundTo(0.125, 2)).toBe(0.13);
  });

  it('целые остаются целыми', () => {
    expect(roundTo(5, 2)).toBe(5);
  });

  it('отрицательные', () => {
    expect(roundTo(-0.456, 1)).toBe(-0.5);
  });
});

describe('meanAndStdDev', () => {
  it('пустой → 0/0', () => {
    expect(meanAndStdDev([])).toEqual({ mean: 0, stdDev: 0 });
  });

  it('одно значение → mean=value, stdDev=0', () => {
    expect(meanAndStdDev([0.2])).toEqual({ mean: 0.2, stdDev: 0 });
  });

  it('идеальная серия μ=0.2 → mean=0.2, stdDev=0', () => {
    const r = meanAndStdDev([0.2, 0.2, 0.2]);
    expect(r.mean).toBeCloseTo(0.2, 6);
    expect(r.stdDev).toBeCloseTo(0, 6);
  });

  it('серия с разбросом', () => {
    const r = meanAndStdDev([0.18, 0.2, 0.22]);
    expect(r.mean).toBeCloseTo(0.2, 6);
    expect(r.stdDev).toBeGreaterThan(0);
  });
});

describe('leastSquaresThroughOrigin', () => {
  it('пустой → 0', () => {
    expect(leastSquaresThroughOrigin([])).toBe(0);
  });

  it('идеальная линейность: F = 0.2·N → восстанавливаем μ=0.2', () => {
    const points = [
      { x: 0.49, y: 0.098 }, // брусок 50г, μ=0.2
      { x: 1.47, y: 0.294 }, // 150г
      { x: 2.45, y: 0.49 }, // 250г
      { x: 3.43, y: 0.686 }, // 350г
    ];
    expect(leastSquaresThroughOrigin(points)).toBeCloseTo(0.2, 4);
  });

  it('с шумом: восстанавливает близко к среднему', () => {
    const points = [
      { x: 0.49, y: 0.10 },
      { x: 1.47, y: 0.30 },
      { x: 2.45, y: 0.48 },
    ];
    const k = leastSquaresThroughOrigin(points);
    expect(k).toBeGreaterThan(0.18);
    expect(k).toBeLessThan(0.22);
  });
});
