/**
 * Чистая модель физики пружины.
 *
 * Никаких зависимостей от DOM, Canvas или какого-либо runtime.
 * Все функции — детерминированные, тривиально юнит-тестируемые.
 *
 * Закон Гука: F = k · Δl
 *   F  — сила упругости [Н]
 *   k  — жёсткость пружины [Н/м]
 *   Δl — удлинение пружины [м]
 */

import { G } from '@/types';

/**
 * Преобразует массу в силу тяжести (вес).
 *
 * @param massGrams - масса в граммах
 * @returns сила в ньютонах
 *
 * @example
 * massToForce(100) // ≈ 0.98 Н
 * massToForce(1000) // ≈ 9.8 Н
 */
export function massToForce(massGrams: number): number {
  return (massGrams / 1000) * G;
}

/**
 * Вычисляет удлинение пружины при заданной силе.
 *
 * @param force - сила в ньютонах
 * @param k - жёсткость пружины в Н/м
 * @returns удлинение в сантиметрах
 *
 * @throws {RangeError} если жёсткость <= 0
 *
 * @example
 * forceToExtension(0.98, 50) // ≈ 1.96 см
 * forceToExtension(1.96, 50) // ≈ 3.92 см
 */
export function forceToExtension(force: number, k: number): number {
  if (k <= 0) {
    throw new RangeError(`Жёсткость пружины должна быть > 0, получено: ${k}`);
  }
  return (force / k) * 100; // м → см
}

/**
 * Обратное вычисление: жёсткость из силы и удлинения.
 *
 * @param force - сила в ньютонах
 * @param extensionCm - удлинение в сантиметрах
 * @returns жёсткость в Н/м, или null если удлинение нулевое
 */
export function calculateStiffness(force: number, extensionCm: number): number | null {
  if (extensionCm === 0) return null;
  return force / (extensionCm / 100);
}

/**
 * Затухающие колебания пружины.
 *
 * Используется для анимации после подвеса груза:
 * пружина не сразу останавливается на новом равновесии,
 * а проходит несколько колебаний с экспоненциальным затуханием.
 *
 * @param amplitude - амплитуда (отклонение от равновесия) в см
 * @param k - жёсткость пружины в Н/м
 * @param totalMassKg - суммарная масса всех подвешенных грузов в кг
 * @param timeSeconds - время с начала колебаний в секундах
 * @param damping - коэффициент затухания (0..1, по умолчанию 0.15)
 * @returns смещение от равновесия в см
 *
 * @throws {RangeError} если k или masseyKg <= 0
 */
export function dampedOscillation(
  amplitude: number,
  k: number,
  totalMassKg: number,
  timeSeconds: number,
  damping = 0.15,
): number {
  if (k <= 0) {
    throw new RangeError(`Жёсткость пружины должна быть > 0, получено: ${k}`);
  }
  if (totalMassKg <= 0) {
    throw new RangeError(`Суммарная масса должна быть > 0, получено: ${totalMassKg}`);
  }
  const omega = Math.sqrt(k / totalMassKg);
  return amplitude * Math.exp(-damping * timeSeconds) * Math.cos(omega * timeSeconds);
}

/**
 * Сколько примерно секунд длятся колебания (до затухания ниже 1% от амплитуды).
 *
 * @param damping - коэффициент затухания
 * @returns время в секундах
 */
export function oscillationDuration(damping = 0.15): number {
  // exp(-damping·t) < 0.01  ⇒  t > -ln(0.01)/damping ≈ 4.6/damping
  return -Math.log(0.01) / damping;
}

/**
 * Сумма масс всех грузов в граммах.
 */
export function totalMass(weights: ReadonlyArray<{ mass: number }>): number {
  return weights.reduce((sum, w) => sum + w.mass, 0);
}

/**
 * Округление до заданного числа знаков после запятой.
 * Используется для отображения и сравнения значений.
 */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
