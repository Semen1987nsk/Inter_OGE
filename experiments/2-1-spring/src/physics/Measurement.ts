/**
 * Работа с записанными измерениями: создание, агрегация, статистика.
 */

import type { ComputedResults, Measurement } from '@/types';
import { VALID_K_RANGE } from '@/types';
import { calculateStiffness, massToForce, roundTo } from './SpringModel';

/**
 * Создаёт новое измерение из суммарной массы и текущего удлинения пружины.
 *
 * @param totalMassGrams - суммарная масса подвешенных грузов в граммах
 * @param extensionCm - удлинение пружины в сантиметрах
 * @param overrideForceN - если задано (например, ученик считал F с динамометра) —
 *                        используется вместо авто-расчёта m·g.
 * @returns свежее измерение или null, если данные некорректны
 */
export function createMeasurement(
  totalMassGrams: number,
  extensionCm: number,
  overrideForceN?: number,
): Measurement | null {
  if (totalMassGrams <= 0) return null;

  const force = overrideForceN !== undefined ? overrideForceN : massToForce(totalMassGrams);
  const k = calculateStiffness(force, extensionCm);
  if (k === null) return null;

  return {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
    totalMass: totalMassGrams,
    force: roundTo(force, 3),
    extension: roundTo(extensionCm, 2),
    k: roundTo(k, 1),
  };
}

/**
 * Метод наименьших квадратов через начало координат: y = ax,  a = Σxy / Σx²
 *
 * Применяется к парам (x = удлинение в м, y = сила в Н), даёт оценку k.
 * Через начало координат — потому что закон Гука F=kx предполагает y(0)=0.
 *
 * @param measurements - не пустой массив измерений
 * @returns оценка k в Н/м, или 0 если данных нет
 */
export function leastSquaresThroughOrigin(measurements: ReadonlyArray<Measurement>): number {
  if (measurements.length === 0) return 0;

  let sumXY = 0;
  let sumXX = 0;
  for (const m of measurements) {
    const xMeters = m.extension / 100;
    sumXY += xMeters * m.force;
    sumXX += xMeters * xMeters;
  }

  return sumXX > 0 ? sumXY / sumXX : 0;
}

/**
 * Среднее арифметическое и стандартное отклонение жёсткостей k_i.
 */
function meanAndStdDev(values: ReadonlyArray<number>): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

/**
 * Полная агрегация по измерениям: среднее, отклонение, МНК, попадание в интервал.
 *
 * @param measurements - записанные измерения
 * @param expectedK - ожидаемая жёсткость пружины (для проверки попадания в интервал).
 *                   Если null — проверка не проводится.
 */
export function computeResults(
  measurements: ReadonlyArray<Measurement>,
  expectedK: number | null = 50,
): ComputedResults | null {
  if (measurements.length === 0) return null;

  const ks = measurements.map((m) => m.k);
  const { mean, stdDev } = meanAndStdDev(ks);
  const byLeastSquares = leastSquaresThroughOrigin(measurements);

  let isInValidRange: boolean | null = null;
  if (expectedK !== null && expectedK === 50) {
    isInValidRange = mean >= VALID_K_RANGE.min && mean <= VALID_K_RANGE.max;
  }

  return {
    mean: roundTo(mean, 1),
    stdDev: roundTo(stdDev, 2),
    byLeastSquares: roundTo(byLeastSquares, 1),
    isInValidRange,
  };
}
