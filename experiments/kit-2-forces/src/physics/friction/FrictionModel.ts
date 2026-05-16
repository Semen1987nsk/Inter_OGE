/**
 * Чистая модель физики трения скольжения.
 *
 * Никаких зависимостей от DOM, Canvas или какого-либо runtime.
 * Все функции — детерминированные, тривиально юнит-тестируемые.
 *
 * Закон Амонтона-Кулона: F_тр = μ · N
 *   F_тр — сила трения скольжения [Н]
 *   μ    — коэффициент трения [безразмерный]
 *   N    — нормальная сила (сила нормального давления) [Н]
 *
 * На горизонтальной поверхности: N = m·g.
 */

import { G } from '@/types/friction';

/**
 * Преобразует массу в силу тяжести (вес).
 *
 * @param massGrams - масса в граммах
 * @returns сила в ньютонах
 *
 * @example
 * massToForce(50)  // 0.49 Н (брусок без груза)
 * massToForce(150) // 1.47 Н (брусок + 100 г)
 */
export function massToForce(massGrams: number): number {
  return (massGrams / 1000) * G;
}

/**
 * Сила нормального давления N для тела на горизонтальной поверхности.
 * Совпадает по модулю с силой тяжести (m·g).
 *
 * @param totalMassGrams - суммарная масса (брусок + грузы), г
 * @returns N в ньютонах
 */
export function normalForce(totalMassGrams: number): number {
  return massToForce(totalMassGrams);
}

/**
 * Сила трения скольжения по закону Амонтона-Кулона.
 *
 * @param N - нормальная сила (Н)
 * @param mu - коэффициент трения (безразмерный)
 * @returns F_тр в ньютонах
 *
 * @throws {RangeError} если mu < 0 или N < 0
 */
export function frictionForce(N: number, mu: number): number {
  if (N < 0) throw new RangeError(`Нормальная сила должна быть >= 0, получено: ${N}`);
  if (mu < 0) throw new RangeError(`Коэффициент трения должен быть >= 0, получено: ${mu}`);
  return mu * N;
}

/**
 * Обратное вычисление: коэффициент трения из замеренных F_тр и N.
 *
 * @param frictionN - сила трения (Н), замерена динамометром в момент равномерного скольжения
 * @param normalN - нормальная сила (Н), вычисляется из массы
 * @returns μ (безразмерный) или null если N = 0 (деление на ноль)
 *
 * @throws {RangeError} если frictionN < 0 или normalN < 0
 */
export function coefficientFromForces(frictionN: number, normalN: number): number | null {
  if (frictionN < 0)
    throw new RangeError(`Сила трения должна быть >= 0, получено: ${frictionN}`);
  if (normalN < 0)
    throw new RangeError(`Нормальная сила должна быть >= 0, получено: ${normalN}`);
  if (normalN === 0) return null;
  return frictionN / normalN;
}

/**
 * Работа силы трения (отрицательная — трение всегда направлено против движения).
 * В школьной физике обычно записывают как |A| = F·S, поэтому возвращаем
 * положительное значение «работа против сил трения», совпадающее по модулю
 * с работой внешней силы тяги при равномерном движении.
 *
 * @param frictionN - сила трения (Н)
 * @param distanceMm - пройденный путь (мм)
 * @returns A в джоулях
 *
 * @throws {RangeError} если distanceMm < 0
 */
export function workOfFriction(frictionN: number, distanceMm: number): number {
  if (distanceMm < 0)
    throw new RangeError(`Расстояние должно быть >= 0, получено: ${distanceMm}`);
  const distanceMeters = distanceMm / 1000;
  return frictionN * distanceMeters;
}

/**
 * Решает: брусок продолжает покоиться или начал скользить?
 *
 * Ученик прикладывает силу `appliedN`. Брусок остаётся в покое, пока
 * `applied` ≤ `μ_static · N`. В этой зоне сила трения покоя равна силе тяги
 * (третий закон Ньютона). При превышении — срыв в скольжение, сила трения
 * скольжения становится равной `μ_kinetic · N`.
 *
 * @returns
 *   - actualFrictionN — текущая сила трения (что показывает динамометр в равновесии)
 *   - isSliding — началось ли скольжение
 *   - excessForce — избыток силы тяги над трением (даёт ускорение бруску)
 */
export function staticToKineticTransition(
  appliedN: number,
  normalN: number,
  muStatic: number,
  muKinetic: number,
): {
  actualFrictionN: number;
  isSliding: boolean;
  excessForce: number;
} {
  const maxStaticFriction = muStatic * normalN;
  if (appliedN <= maxStaticFriction) {
    return {
      actualFrictionN: appliedN, // трение покоя равно приложенной силе
      isSliding: false,
      excessForce: 0,
    };
  }
  const kineticFriction = muKinetic * normalN;
  return {
    actualFrictionN: kineticFriction,
    isSliding: true,
    excessForce: appliedN - kineticFriction,
  };
}

/**
 * Ускорение скользящего бруска по второму закону Ньютона.
 *
 * @param excessForceN - избыток силы тяги над трением (Н)
 * @param totalMassGrams - суммарная масса (брусок + грузы), г
 * @returns ускорение в м/с²
 */
export function slidingAcceleration(excessForceN: number, totalMassGrams: number): number {
  if (totalMassGrams <= 0)
    throw new RangeError(`Масса должна быть > 0, получено: ${totalMassGrams}`);
  const massKg = totalMassGrams / 1000;
  return excessForceN / massKg;
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

/**
 * Среднее арифметическое и стандартное отклонение значений (например, серии μ).
 */
export function meanAndStdDev(values: ReadonlyArray<number>): {
  mean: number;
  stdDev: number;
} {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

/**
 * Метод наименьших квадратов через начало координат для линейной зависимости F_тр(N).
 * y = a·x, где a = Σxy / Σx² → ожидаемое значение μ при идеальной линейности.
 *
 * Применяется в задаче C (исследование F_тр от нормальной силы).
 */
export function leastSquaresThroughOrigin(
  points: ReadonlyArray<{ x: number; y: number }>,
): number {
  if (points.length === 0) return 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const p of points) {
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  return sumXX > 0 ? sumXY / sumXX : 0;
}
