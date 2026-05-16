import { describe, expect, it } from 'vitest';
import { computeResults, createMeasurement, leastSquaresThroughOrigin } from '../Measurement';

describe('createMeasurement', () => {
  it('creates valid measurement for 100 g + 1.96 cm extension', () => {
    const m = createMeasurement(100, 1.96);
    expect(m).not.toBeNull();
    expect(m!.totalMass).toBe(100);
    expect(m!.force).toBeCloseTo(0.98, 2);
    expect(m!.extension).toBe(1.96);
    expect(m!.k).toBeCloseTo(50, 0);
  });

  it('returns null for zero mass', () => {
    expect(createMeasurement(0, 1)).toBeNull();
  });

  it('returns null for zero extension', () => {
    expect(createMeasurement(100, 0)).toBeNull();
  });

  it('produces unique IDs', () => {
    const m1 = createMeasurement(100, 1.96)!;
    const m2 = createMeasurement(100, 1.96)!;
    expect(m1.id).not.toBe(m2.id);
  });
});

describe('leastSquaresThroughOrigin', () => {
  it('returns 0 for empty input', () => {
    expect(leastSquaresThroughOrigin([])).toBe(0);
  });

  it('exactly recovers k=50 for noiseless data', () => {
    const measurements = [
      createMeasurement(100, 1.96)!,
      createMeasurement(200, 3.92)!,
      createMeasurement(300, 5.88)!,
    ];
    expect(leastSquaresThroughOrigin(measurements)).toBeCloseTo(50, 0);
  });

  it('handles single point', () => {
    const m = createMeasurement(100, 1.96)!;
    expect(leastSquaresThroughOrigin([m])).toBeCloseTo(50, 0);
  });

  it('robust to small noise', () => {
    // Идеальные точки + 0.5% шум на удлинении
    const measurements = [
      createMeasurement(100, 1.96 * 1.005)!,
      createMeasurement(200, 3.92 * 0.995)!,
      createMeasurement(300, 5.88 * 1.002)!,
    ];
    const k = leastSquaresThroughOrigin(measurements);
    expect(k).toBeGreaterThan(49);
    expect(k).toBeLessThan(51);
  });
});

describe('computeResults', () => {
  it('returns null for empty measurements', () => {
    expect(computeResults([])).toBeNull();
  });

  it('mean and stdDev = 0 for identical measurements', () => {
    const measurements = [
      createMeasurement(100, 1.96)!,
      createMeasurement(200, 3.92)!,
      createMeasurement(300, 5.88)!,
    ];
    const result = computeResults(measurements)!;
    expect(result.mean).toBeCloseTo(50, 0);
    expect(result.stdDev).toBeLessThan(0.5);
  });

  it('flags result as in valid range for ideal k=50', () => {
    const measurements = [
      createMeasurement(100, 1.96)!,
      createMeasurement(200, 3.92)!,
      createMeasurement(300, 5.88)!,
    ];
    const result = computeResults(measurements, 50)!;
    expect(result.isInValidRange).toBe(true);
  });

  it('flags out-of-range result', () => {
    // Симулируем кривую пружину: реальная k=80
    const measurements = [
      createMeasurement(100, 0.98 * 100 / 80 / 1)!, // даст k=80
      createMeasurement(200, (1.96 * 100) / 80 / 1)!,
    ].filter((m): m is NonNullable<typeof m> => m !== null);
    const result = computeResults(measurements, 50)!;
    expect(result.isInValidRange).toBe(false);
  });

  it('isInValidRange is null when expectedK is null', () => {
    const measurements = [createMeasurement(100, 1.96)!];
    const result = computeResults(measurements, null)!;
    expect(result.isInValidRange).toBeNull();
  });

  it('byLeastSquares matches mean for ideal data', () => {
    const measurements = [
      createMeasurement(100, 1.96)!,
      createMeasurement(200, 3.92)!,
      createMeasurement(300, 5.88)!,
    ];
    const result = computeResults(measurements)!;
    expect(result.byLeastSquares).toBeCloseTo(result.mean, 0);
  });
});
