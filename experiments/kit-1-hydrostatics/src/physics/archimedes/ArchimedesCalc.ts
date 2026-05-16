/**
 * ArchimedesCalc — pure-функции для опыта 1.2 «Измерение архимедовой силы».
 *
 * Метод косвенных измерений ФИПИ ОГЭ-2026, опыт 1.2:
 *   1. Подвесить цилиндр на крючок динамометра в воздухе → P_возд (Н).
 *   2. Полностью погрузить цилиндр в воду → P_жид (Н).
 *   3. Архимедова сила: F_A = P_возд − P_жид.
 *   4. Сверить с теорией: F_A_теор = ρ_жидк · g · V_тела.
 *
 * Все функции — детерминированные, без побочных эффектов и DOM.
 * Покрытие Vitest — 100% строк.
 *
 * Единицы внутри функций — СИ (кг, м³, Н). Конверсии г↔кг, см³↔м³ — на границе.
 */

/** Ускорение свободного падения по РФ-школе (Перышкин 9 кл.). Не 9.81. */
export const G = 9.8 as const;

/** Плотность пресной воды при ~20°C, кг/м³. */
export const RHO_WATER = 1000 as const;

/**
 * Архимедова сила: F_A = ρ · g · V.
 *
 * @param rho_kg_m3 плотность жидкости, кг/м³ (≥ 0)
 * @param V_m3      объём погружённой части тела, м³ (≥ 0)
 * @returns         сила в Ньютонах
 * @throws RangeError если входы отрицательны или не конечны
 */
export function archimedesForceN(rho_kg_m3: number, V_m3: number): number {
  if (!Number.isFinite(rho_kg_m3) || !Number.isFinite(V_m3)) {
    throw new RangeError(
      `ρ и V должны быть конечными числами; получено ρ=${rho_kg_m3}, V=${V_m3}`,
    );
  }
  if (rho_kg_m3 < 0 || V_m3 < 0) {
    throw new RangeError(
      `ρ и V должны быть ≥ 0; получено ρ=${rho_kg_m3}, V=${V_m3}`,
    );
  }
  return rho_kg_m3 * G * V_m3;
}

/**
 * Вес цилиндра в воздухе: P_возд = m · g.
 *
 * @param m_kg масса тела, кг (≥ 0)
 * @returns    вес в Ньютонах
 */
export function weightInAirN(m_kg: number): number {
  if (!Number.isFinite(m_kg)) {
    throw new RangeError(`m должна быть конечным числом; получено ${m_kg}`);
  }
  if (m_kg < 0) {
    throw new RangeError(`m должна быть ≥ 0; получено ${m_kg}`);
  }
  return m_kg * G;
}

/**
 * Показание динамометра при погружённом цилиндре: P_жид = max(0, P_возд − F_A).
 * Клампим в 0: если F_A ≥ P_возд, тело всплывает и нить провисает —
 * динамометр показывает 0 (а не отрицательное число).
 */
export function weightInLiquidN(P_air_N: number, F_A_N: number): number {
  if (!Number.isFinite(P_air_N) || !Number.isFinite(F_A_N)) {
    throw new RangeError(
      `P_air и F_A должны быть конечными; получено P_air=${P_air_N}, F_A=${F_A_N}`,
    );
  }
  return Math.max(0, P_air_N - F_A_N);
}

/**
 * Показание динамометра при ЧАСТИЧНОМ погружении цилиндра.
 * F_A_eff = F_A_full · submersionFraction (доля объёма цилиндра под водой,
 * 0 — в воздухе, 1 — полностью под водой). Используется во время плавного
 * drag-by-thread для непрерывного изменения силы по мере опускания цилиндра
 * в воду.
 *
 * Физика: F_A = ρ·g·V_displaced; при частичном погружении V_displaced =
 * V_cyl · fraction. Поэтому F_A_eff пропорциональна fraction.
 *
 * @param P_air_N         вес тела в воздухе, Н (≥ 0)
 * @param F_A_full_N      архимедова сила при полном погружении, Н (≥ 0)
 * @param submersionFraction доля объёма под водой ∈ [0..1]
 * @returns               показание динамометра, max(0, P_air - F_A_eff)
 */
export function weightInLiquidPartialN(
  P_air_N: number,
  F_A_full_N: number,
  submersionFraction: number,
): number {
  if (
    !Number.isFinite(P_air_N) ||
    !Number.isFinite(F_A_full_N) ||
    !Number.isFinite(submersionFraction)
  ) {
    throw new RangeError(
      `P_air, F_A_full и submersionFraction должны быть конечными; получено ` +
        `P_air=${P_air_N}, F_A_full=${F_A_full_N}, frac=${submersionFraction}`,
    );
  }
  if (P_air_N < 0 || F_A_full_N < 0) {
    throw new RangeError(
      `P_air и F_A_full должны быть ≥ 0; получено P_air=${P_air_N}, F_A_full=${F_A_full_N}`,
    );
  }
  const frac = Math.max(0, Math.min(1, submersionFraction));
  return Math.max(0, P_air_N - F_A_full_N * frac);
}

/**
 * Главная формула опыта: F_A_изм = P_возд − P_жид.
 * Это то, что считает ученик в журнале по двум показаниям динамометра.
 */
export function measuredArchimedesForceN(
  P_air_N: number,
  P_liquid_N: number,
): number {
  if (!Number.isFinite(P_air_N) || !Number.isFinite(P_liquid_N)) {
    throw new RangeError(
      `P_air и P_liquid должны быть конечными; получено P_air=${P_air_N}, P_liquid=${P_liquid_N}`,
    );
  }
  return P_air_N - P_liquid_N;
}

/** Перевод см³ → м³. 1 см³ = 1e-6 м³. */
export function cm3ToM3(V_cm3: number): number {
  if (!Number.isFinite(V_cm3)) {
    throw new RangeError(`V должно быть конечным; получено ${V_cm3}`);
  }
  return V_cm3 / 1_000_000;
}

/** Перевод г → кг. 1 г = 1e-3 кг. */
export function gToKg(m_g: number): number {
  if (!Number.isFinite(m_g)) {
    throw new RangeError(`m должно быть конечным; получено ${m_g}`);
  }
  return m_g / 1000;
}
