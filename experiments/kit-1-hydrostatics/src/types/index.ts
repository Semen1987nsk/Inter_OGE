/**
 * Общие типы и константы для kit-1-hydrostatics.
 *
 * Конвенции:
 *   - Координаты в SVG/scene в пикселях.
 *   - Физические величины — в СИ; для UI разрешены г и мл (с обязательным переводом перед расчётом).
 *   - PIXELS_PER_CM — единый scale для приборов сцены.
 */

export const G = 9.8;          // ускорение свободного падения, м/с²
export const PIXELS_PER_CM = 4;
export const RHO_WATER = 1.0;  // плотность воды, г/см³ (для расчёта Архимеда — 1000 кг/м³)

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Идентификатор материала груза (из ФИПИ-спеки кита №1).
 * Соответствует физическим цилиндрам в реальном комплекте.
 */
export type MaterialId = 'steel' | 'aluminum' | 'plastic';

/**
 * Спецификация цилиндра по ФИПИ-2026 (Приложение 2 СПЕЦ).
 * V в см³, m в граммах. Погрешности — диапазон по ФИПИ.
 */
export interface CylinderSpec {
  readonly id: string;            // '#1', '#2', '#3'
  readonly material: MaterialId;
  readonly mass_g: number;        // номинальная масса
  readonly mass_tolerance_g: number;
  readonly volume_cm3: number;
  readonly volume_tolerance_cm3: number;
  readonly label: string;         // короткое название («Сталь №1»)
  readonly density_g_cm3: number; // расчётная: m / V
  readonly density_kg_m3: number; // ×1000
}

/** Цилиндры комплекта №1 ФИПИ ОГЭ-2026 для опытов 1.1–1.4. */
export const CYLINDERS: ReadonlyArray<CylinderSpec> = [
  {
    id: '1',
    material: 'steel',
    mass_g: 195,
    mass_tolerance_g: 2,
    volume_cm3: 25.0,
    volume_tolerance_cm3: 0.3,
    label: 'Цилиндр № 1',
    density_g_cm3: 7.8,
    density_kg_m3: 7800,
  },
  {
    id: '2',
    material: 'aluminum',
    mass_g: 70,
    mass_tolerance_g: 2,
    volume_cm3: 25.0,
    volume_tolerance_cm3: 0.7,
    label: 'Цилиндр № 2',
    density_g_cm3: 2.8,
    density_kg_m3: 2800,
  },
  {
    id: '3',
    material: 'plastic',
    mass_g: 66,
    mass_tolerance_g: 2,
    volume_cm3: 56.0,
    volume_tolerance_cm3: 1.8,
    label: 'Цилиндр № 3',
    density_g_cm3: 1.179,
    density_kg_m3: 1179,
  },
  {
    id: '4',
    material: 'aluminum',
    mass_g: 95,
    mass_tolerance_g: 2,
    volume_cm3: 34.0,
    volume_tolerance_cm3: 0.7,
    label: 'Цилиндр № 4',
    density_g_cm3: 2.794,
    density_kg_m3: 2794,
  },
];

export const CYLINDER_BY_ID = new Map(CYLINDERS.map((c) => [c.id, c]));
