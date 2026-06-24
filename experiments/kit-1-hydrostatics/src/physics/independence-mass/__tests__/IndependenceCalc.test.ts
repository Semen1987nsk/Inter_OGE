import { describe, expect, it } from 'vitest';
import { buoyantForceForCylinder, forcesAreEqual } from '../IndependenceCalc';

describe('buoyantForceForCylinder', () => {
  it('F_арх одинакова для стали(№1) и алюминия(№2) при V=25 см³', () => {
    const f1 = buoyantForceForCylinder(25.0); // см³
    const f2 = buoyantForceForCylinder(25.0);
    expect(f1).toBeCloseTo(0.245, 3);          // 1000·9.8·25e-6
    expect(f2).toBeCloseTo(0.245, 3);
  });
  it('бросает RangeError при V ≤ 0 / NaN', () => {
    expect(() => buoyantForceForCylinder(0)).toThrow(RangeError);
    expect(() => buoyantForceForCylinder(-5)).toThrow(RangeError);
    expect(() => buoyantForceForCylinder(NaN)).toThrow(RangeError);
  });
});
describe('forcesAreEqual', () => {
  it('равны в пределах допуска несмотря на разную массу', () => {
    expect(forcesAreEqual(0.245, 0.246)).toBe(true);   // |Δ| мал
    expect(forcesAreEqual(0.245, 0.30)).toBe(false);
  });
  it('NaN → false', () => {
    expect(forcesAreEqual(NaN, 0.245)).toBe(false);
  });
});
