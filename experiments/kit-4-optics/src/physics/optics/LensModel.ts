/**
 * Кит-4 «Оптика» — pure-физика линз (ЗАГЛУШКА Task 1).
 *
 * ВНИМАНИЕ: это throwaway-заглушка. Реальная реализация всех функций + их тесты —
 * в Task 2 (Task 2 перезаписывает этот файл). Здесь только сигнатуры для типчека.
 *
 * Все расстояния в мм, если не указано иное; opticalPower принимает F в метрах.
 */

const NI = (): never => {
  throw new Error('NotImplemented — Task 2');
};

/** Бросает RangeError если любой аргумент не является конечным числом. */
export function guard(..._xs: number[]): void {
  NI();
}

/** Расстояние до изображения: f = d·F/(d − F). */
export function imageDistance(_F_mm: number, _d_mm: number): number {
  return NI();
}

/** Линейное увеличение Γ = −f/d. */
export function magnification(_F_mm: number, _d_mm: number): number {
  return NI();
}

/** Фокусное расстояние по измеренным d и f: F = d·f/(d + f). */
export function focalFromDistances(_d_mm: number, _f_mm: number): number {
  return NI();
}

/** Оптическая сила линзы D = 1/F_m [дптр] (F_m в МЕТРАХ). */
export function opticalPower(_F_m: number): number {
  return NI();
}

/** Суммарная оптическая сила системы тонких линз: D = ΣD_i. */
export function combinedPower(..._D: number[]): number {
  return NI();
}

/** Общее фокусное расстояние системы линз: 1/F = Σ(1/F_i). */
export function combinedFocal(..._F_mm: number[]): number {
  return NI();
}

/** Свойства изображения собирающей линзы. */
export function imageProperties(
  _F_mm: number,
  _d_mm: number,
): {
  kind: 'real' | 'virtual';
  orientation: 'inverted' | 'upright';
  size: 'enlarged' | 'reduced' | 'equal';
  gamma: number;
} {
  return NI();
}
