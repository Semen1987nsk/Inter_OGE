import { describe, expect, it } from 'vitest';
import {
  dampedOscillation,
  forceToExtension,
  calculateStiffness,
  massToForce,
  oscillationDuration,
  roundTo,
  totalMass,
} from '../SpringModel';

describe('massToForce', () => {
  it('converts 100 g to ≈ 0.98 N', () => {
    expect(massToForce(100)).toBeCloseTo(0.98, 3);
  });

  it('converts 200 g to ≈ 1.96 N', () => {
    expect(massToForce(200)).toBeCloseTo(1.96, 3);
  });

  it('converts 0 g to 0 N', () => {
    expect(massToForce(0)).toBe(0);
  });

  it('handles fractional mass (10 g)', () => {
    expect(massToForce(10)).toBeCloseTo(0.098, 3);
  });
});

describe('forceToExtension', () => {
  it('100 g on k=50 N/m gives Δl ≈ 1.96 cm', () => {
    const F = massToForce(100);
    expect(forceToExtension(F, 50)).toBeCloseTo(1.96, 2);
  });

  it('300 g on k=50 N/m gives Δl ≈ 5.88 cm', () => {
    const F = massToForce(300);
    expect(forceToExtension(F, 50)).toBeCloseTo(5.88, 2);
  });

  it('100 g on k=10 N/m gives Δl ≈ 9.8 cm', () => {
    const F = massToForce(100);
    expect(forceToExtension(F, 10)).toBeCloseTo(9.8, 2);
  });

  it('returns 0 cm for 0 N force', () => {
    expect(forceToExtension(0, 50)).toBe(0);
  });

  it('throws RangeError for k=0', () => {
    expect(() => forceToExtension(1, 0)).toThrow(RangeError);
  });

  it('throws RangeError for negative k', () => {
    expect(() => forceToExtension(1, -10)).toThrow(RangeError);
  });
});

describe('calculateStiffness', () => {
  it('reverses forceToExtension correctly', () => {
    const F = 0.98;
    const x = 1.96; // cm
    expect(calculateStiffness(F, x)).toBeCloseTo(50, 1);
  });

  it('returns null for zero extension', () => {
    expect(calculateStiffness(1, 0)).toBeNull();
  });

  it('handles 1.96 N over 3.92 cm → 50 N/m', () => {
    expect(calculateStiffness(1.96, 3.92)).toBeCloseTo(50, 1);
  });
});

describe('dampedOscillation', () => {
  it('returns full amplitude at t=0', () => {
    const A = 5;
    expect(dampedOscillation(A, 50, 0.1, 0)).toBeCloseTo(A, 5);
  });

  it('decays toward 0 as t grows', () => {
    const t1 = dampedOscillation(5, 50, 0.1, 1);
    const t2 = dampedOscillation(5, 50, 0.1, 5);
    expect(Math.abs(t2)).toBeLessThan(Math.abs(t1));
  });

  it('throws on invalid k', () => {
    expect(() => dampedOscillation(5, 0, 0.1, 1)).toThrow(RangeError);
  });

  it('throws on invalid mass', () => {
    expect(() => dampedOscillation(5, 50, 0, 1)).toThrow(RangeError);
  });

  it('damping=0 → pure cosine, no decay', () => {
    const value = dampedOscillation(5, 50, 0.1, 0, 0);
    expect(value).toBeCloseTo(5, 5);
  });
});

describe('oscillationDuration', () => {
  it('default damping gives ~30s', () => {
    expect(oscillationDuration()).toBeCloseTo(30.7, 0);
  });

  it('higher damping gives shorter duration', () => {
    expect(oscillationDuration(0.5)).toBeLessThan(oscillationDuration(0.1));
  });
});

describe('totalMass', () => {
  it('sums weights array', () => {
    expect(totalMass([{ mass: 100 }, { mass: 200 }, { mass: 50 }])).toBe(350);
  });

  it('returns 0 for empty array', () => {
    expect(totalMass([])).toBe(0);
  });
});

describe('roundTo', () => {
  it('rounds to 2 decimals', () => {
    expect(roundTo(1.236, 2)).toBe(1.24);
  });

  it('rounds to 0 decimals', () => {
    expect(roundTo(1.6, 0)).toBe(2);
  });

  it('handles negative values', () => {
    expect(roundTo(-1.236, 2)).toBe(-1.24);
  });
});
