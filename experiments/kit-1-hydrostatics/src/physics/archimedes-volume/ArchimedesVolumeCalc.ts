/**
 * Pure-физика опыта 1.3 «Исследование зависимости F_А от объёма
 * погружённой части тела».
 *
 * ФИПИ-2026, Спецификация КИМ, Приложение 2, стр. 16, Комплект №1:
 * «исследование зависимости архимедовой силы от объёма погружённой части
 *  тела (цилиндр № 3)».
 *
 * КОДИФ §1.29 (стр. 14) — практическая работа из канонического перечня.
 *
 * Методичка §2.3.3 (`04-research.md`):
 *   Цилиндр №3 (пластик): V = (56,0 ± 1,8) см³, L = 80 мм = 8 см.
 *   Площадь сечения S = V/L = 56 см³ / 8 см = 7 см² = 7·10⁻⁴ м².
 *   (В методичке опечатка «0,7 см²» — на самом деле 7 см²; проверка:
 *    при S=7 см² и h=2 см получаем V=14 см³, что совпадает с её же
 *    эталоном.)
 *   3 контрольных уровня h: 20 / 40 / 60 мм.
 *   ⇒ V_погр: 14 / 28 / 42 см³.
 *   ⇒ F_А_теор (ρ_воды=1000, g=9.8): 0,137 / 0,274 / 0,412 Н.
 *
 * Эти функции — единственный источник правды по физике 1.3. Любое
 * вычисление V_погр и F_А_теор в Experiment, Render и тестах обязано
 * импортировать отсюда.
 */

/** Площадь поперечного сечения цилиндра №3, см². */
export const CYL3_CROSS_SECTION_CM2 = 7;

/**
 * Коэффициент «объём на 1 мм погружения», см³/мм.
 * V_погр(см³) = h(мм) × CYL3_VOLUME_PER_MM_CM3.
 * При S=7 см² = 7 см²×0.1см/мм = 0.7 см³/мм.
 */
export const CYL3_VOLUME_PER_MM_CM3 = 0.7;

/** Длина шкалы цилиндра №3, мм. */
export const CYL3_SCALE_LENGTH_MM = 80;

/** Полный объём цилиндра №3, см³ (S × L = 0.7 × 8 = 5.6, но
 *  паспорт ФИПИ V = 56±1.8 см³ — это с учётом крышек/торцов).
 *  Используем 56 для F_А при полном погружении. */
export const CYL3_FULL_VOLUME_CM3 = 56;

/** Масса цилиндра №3, г. */
export const CYL3_MASS_G = 66;

/** Плотность воды, кг/м³. */
export const RHO_WATER_KG_M3 = 1000;

/** Ускорение свободного падения, м/с² (ОГЭ-стандарт). */
export const G = 9.8;

/** Контрольные уровни погружения по методичке, мм. */
export const REFERENCE_LEVELS_MM: ReadonlyArray<number> = [20, 40, 60];

/**
 * Вес цилиндра в воздухе. Используется как baseline-показание динамометра
 * перед погружением (фиксируется один раз за опыт).
 *
 * @returns Вес в ньютонах. Для №3 ≈ 0.647 Н.
 */
export function weightInAirN(massGrams: number = CYL3_MASS_G): number {
  return (massGrams * G) / 1000;
}

/**
 * Объём погружённой части цилиндра по высоте погружения.
 *
 * V_погр (см³) = h (мм) × CYL3_VOLUME_PER_MM_CM3
 *              = h (мм) × 0.7 см³/мм.
 *
 * (Эквивалентно: V_погр = h_см × S = (h_мм / 10) × 7 см² = h_мм × 0.7.)
 *
 * @param heightMm высота погружения, мм. Клиппится в [0, CYL3_SCALE_LENGTH_MM].
 *                 Отрицательные → 0, >80 → 80 (полное погружение).
 *                 NaN → 0; Infinity → V при полном погружении.
 * @returns Объём погружённой части в см³.
 */
export function submergedVolumeCm3(heightMm: number): number {
  if (Number.isNaN(heightMm)) return 0;
  if (heightMm <= 0) return 0;
  const clamped = Math.min(heightMm, CYL3_SCALE_LENGTH_MM);
  return clamped * CYL3_VOLUME_PER_MM_CM3;
}

/**
 * Теоретическая архимедова сила по объёму погружения.
 *
 * F_А = ρ × g × V (V в м³).
 * V_м³ = V_см³ × 1e-6.
 *
 * @param heightMm высота погружения, мм.
 * @param rhoLiquidKgM3 плотность жидкости (для 1.3 всегда вода = 1000).
 * @returns F_А в ньютонах.
 */
export function theoreticalBuoyancyN(
  heightMm: number,
  rhoLiquidKgM3: number = RHO_WATER_KG_M3,
): number {
  const V_cm3 = submergedVolumeCm3(heightMm);
  return rhoLiquidKgM3 * G * V_cm3 * 1e-6;
}

/**
 * Измеренная архимедова сила (по разности показаний динамометра).
 *
 * F_А_изм = P_возд − P_изм.
 *
 * @returns Разность в ньютонах. Может быть отрицательной, если данные
 *          битые — клиппинг до 0 НЕ делаем (диагностика).
 */
export function measuredBuoyancyN(pAirN: number, pLiquidN: number): number {
  return pAirN - pLiquidN;
}

/**
 * Относительное отклонение измерения от теории.
 *
 * δ = (F_изм − F_теор) / F_теор × 100  [%]
 *
 * @returns Процент отклонения. 0 если теоретическое значение нуль (избегаем 0/0).
 */
export function deltaPercent(pAirN: number, pLiquidN: number, heightMm: number): number {
  const Fmeas = measuredBuoyancyN(pAirN, pLiquidN);
  const Ftheor = theoreticalBuoyancyN(heightMm);
  if (Math.abs(Ftheor) < 1e-9) return 0;
  return ((Fmeas - Ftheor) / Ftheor) * 100;
}

/**
 * Проверка ФИПИ-инварианта для эталонных уровней.
 *
 * Возвращает массив проверок для h ∈ {20, 40, 60} с предвычисленными
 * ожидаемыми V_погр и F_А_теор. Используется в self-check для assert'а
 * что физика не уехала.
 */
export interface ReferencePoint {
  readonly h_mm: number;
  readonly V_cm3: number;
  readonly F_A_N: number;
}

export function referenceTable(): ReadonlyArray<ReferencePoint> {
  return REFERENCE_LEVELS_MM.map((h_mm) => ({
    h_mm,
    V_cm3: submergedVolumeCm3(h_mm),
    F_A_N: theoreticalBuoyancyN(h_mm),
  }));
}
