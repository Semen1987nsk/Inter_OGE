/**
 * DensityCalc — pure-функции для расчёта плотности твёрдого тела.
 *
 * Метод косвенных измерений ФИПИ ОГЭ-2026, опыт 1.1:
 *   1. Масса m измеряется на электронных весах (г).
 *   2. Объём V находится по вытесненной воде в мензурке: V = V₂ − V₁ (мл = см³).
 *   3. Плотность: ρ = m / V (г/см³); далее перевод в СИ: ×1000 → кг/м³.
 *
 * Все функции — детерминированные, без побочных эффектов. Покрытие Vitest ≥ 95%.
 */

import { CYLINDERS, type CylinderSpec, type MaterialId } from '../../types';

/**
 * Объём твёрдого тела по вытесненной воде, см³ (= мл).
 * V₂ должно быть строго больше V₁.
 */
export function volumeFromDisplacement(V1_ml: number, V2_ml: number): number {
  if (!Number.isFinite(V1_ml) || !Number.isFinite(V2_ml)) {
    throw new RangeError(`V1, V2 должны быть конечными числами; получено V1=${V1_ml}, V2=${V2_ml}`);
  }
  if (V1_ml < 0 || V2_ml < 0) {
    throw new RangeError(`V1, V2 не могут быть отрицательными; получено V1=${V1_ml}, V2=${V2_ml}`);
  }
  if (V2_ml <= V1_ml) {
    throw new RangeError(`V₂ должно быть > V₁; получено V₁=${V1_ml}, V₂=${V2_ml}`);
  }
  return V2_ml - V1_ml;
}

/**
 * Плотность ρ = m / V (г/см³).
 * m, V должны быть строго положительны.
 */
export function densityFromMassVolume(m_g: number, V_cm3: number): number {
  if (!Number.isFinite(m_g) || !Number.isFinite(V_cm3)) {
    throw new RangeError(`m, V должны быть конечными числами; получено m=${m_g}, V=${V_cm3}`);
  }
  if (m_g <= 0) {
    throw new RangeError(`Масса должна быть > 0; получено m=${m_g}`);
  }
  if (V_cm3 <= 0) {
    throw new RangeError(`Объём должен быть > 0; получено V=${V_cm3}`);
  }
  return m_g / V_cm3;
}

/** Перевод г/см³ → кг/м³. Идентично ×1000. */
export function gPerCm3ToKgPerM3(rho: number): number {
  if (!Number.isFinite(rho)) {
    throw new RangeError(`ρ должно быть конечным; получено ${rho}`);
  }
  return rho * 1000;
}

/** Перевод кг/м³ → г/см³. */
export function kgPerM3ToGPerCm3(rho: number): number {
  if (!Number.isFinite(rho)) {
    throw new RangeError(`ρ должно быть конечным; получено ${rho}`);
  }
  return rho / 1000;
}

/**
 * Идентификация материала по плотности (с допуском).
 * Возвращает MaterialId если ρ попадает в окно ± tolerancePct% относительно
 * табличной плотности; иначе null.
 *
 * По умолчанию 10% — соответствует погрешности измерения мензурки 250 мл (C=2 мл)
 * и весов (предел 200 г).
 */
export function identifyMaterial(
  rho_kg_m3: number,
  tolerancePct = 10,
): MaterialId | null {
  if (!Number.isFinite(rho_kg_m3) || rho_kg_m3 <= 0) return null;
  if (tolerancePct < 0) {
    throw new RangeError(`tolerancePct должен быть ≥ 0; получено ${tolerancePct}`);
  }
  let bestMatch: { material: MaterialId; deviation: number } | null = null;
  for (const cyl of CYLINDERS) {
    const dev = Math.abs(rho_kg_m3 - cyl.density_kg_m3) / cyl.density_kg_m3;
    if (dev * 100 <= tolerancePct) {
      if (!bestMatch || dev < bestMatch.deviation) {
        bestMatch = { material: cyl.material, deviation: dev };
      }
    }
  }
  return bestMatch?.material ?? null;
}

/**
 * Полный расчёт плотности по входным измерениям.
 * Возвращает структуру для отображения в журнале.
 */
export interface DensityResult {
  readonly V_cm3: number;
  readonly rho_g_cm3: number;
  readonly rho_kg_m3: number;
  readonly identified: MaterialId | null;
}

export function calculateDensity(
  m_g: number,
  V1_ml: number,
  V2_ml: number,
  tolerancePct = 10,
): DensityResult {
  const V_cm3 = volumeFromDisplacement(V1_ml, V2_ml);
  const rho_g_cm3 = densityFromMassVolume(m_g, V_cm3);
  const rho_kg_m3 = gPerCm3ToKgPerM3(rho_g_cm3);
  const identified = identifyMaterial(rho_kg_m3, tolerancePct);
  return { V_cm3, rho_g_cm3, rho_kg_m3, identified };
}

/**
 * Проверка попадания результата в ФИПИ-критерий для конкретного цилиндра.
 * ФИПИ принимает ответ если ρ в окне (ρ_табл ± Δρ), где Δρ выводится из
 * точности m и V (rule-of-thumb 10%).
 */
export function isInFipiInterval(
  rho_kg_m3: number,
  spec: CylinderSpec,
  tolerancePct = 10,
): boolean {
  if (!Number.isFinite(rho_kg_m3) || rho_kg_m3 <= 0) return false;
  const margin = (spec.density_kg_m3 * tolerancePct) / 100;
  return Math.abs(rho_kg_m3 - spec.density_kg_m3) <= margin;
}
