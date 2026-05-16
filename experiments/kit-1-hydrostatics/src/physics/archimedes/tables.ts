/**
 * Табличные данные для опыта 1.2 «Архимедова сила».
 *
 * Источник: ФИПИ ОГЭ-2026, СПЕЦ Приложение 2, Комплект №1, паспорт цилиндров.
 * Цилиндры №1–4. Параметры цитируются дословно из спеки 2026-05-07-кит-1-опыт-1-2,
 * §1, которая в свою очередь цитирует ФИПИ-СПЕЦ-2026.
 *
 * ВАЖНО: цилиндр №1 (стальной, m=195 г) ФИПИ исключает из опыта 1.2 — его вес
 * 1.91 Н перегружает динамометр №1 (предел 1 Н). В UI он остаётся на полке для
 * обучающего soft-warning «не подходит для этого опыта». Поэтому в таблице ниже
 * он присутствует — мы должны уметь корректно посчитать его F_A для тестов и
 * показать перегрузку.
 *
 * Только пресная вода — для опыта 1.2. Соляной раствор появится в опыте 1.4.
 */

/** Идентификатор цилиндра в ФИПИ-комплекте №1: 1, 2, 3 или 4. */
export type ArchimedesCylinderId = 1 | 2 | 3 | 4;

/** Материал цилиндра по паспорту ФИПИ. */
export type ArchimedesCylinderMaterial = 'steel' | 'aluminum' | 'plastic';

/**
 * Спецификация цилиндра для расчётов архимедовой силы.
 * Толерансы — диапазоны допусков ФИПИ для реального оборудования.
 */
export interface ArchimedesCylinderSpec {
  readonly id: ArchimedesCylinderId;
  readonly material: ArchimedesCylinderMaterial;
  readonly V_cm3: number;
  readonly V_tolerance_cm3: number;
  readonly m_g: number;
  readonly m_tolerance_g: number;
}

/**
 * Цилиндры комплекта №1 ФИПИ ОГЭ-2026 (Приложение 2, паспорт).
 *
 * - №1 — стальной, ρ ≈ 7800 кг/м³, ИСКЛЮЧЁН из 1.2 (перегрузка динамометра).
 * - №2 — алюминиевый, рекомендован для 1.2.
 * - №3 — пластиковый со шкалой 1 мм, рекомендован для 1.2/1.3.
 * - №4 — алюминиевый, рекомендован для 1.2/1.5.
 */
export const ARCHIMEDES_CYLINDERS: ReadonlyArray<ArchimedesCylinderSpec> = [
  {
    id: 1,
    material: 'steel',
    V_cm3: 25.0,
    V_tolerance_cm3: 0.3,
    m_g: 195,
    m_tolerance_g: 2,
  },
  {
    id: 2,
    material: 'aluminum',
    V_cm3: 25.0,
    V_tolerance_cm3: 0.7,
    m_g: 70,
    m_tolerance_g: 2,
  },
  {
    id: 3,
    material: 'plastic',
    V_cm3: 56.0,
    V_tolerance_cm3: 1.8,
    m_g: 66,
    m_tolerance_g: 2,
  },
  {
    id: 4,
    material: 'aluminum',
    V_cm3: 34.0,
    V_tolerance_cm3: 0.7,
    m_g: 95,
    m_tolerance_g: 2,
  },
];

/** Быстрый доступ по id. */
export const ARCHIMEDES_CYLINDER_BY_ID: ReadonlyMap<
  ArchimedesCylinderId,
  ArchimedesCylinderSpec
> = new Map(ARCHIMEDES_CYLINDERS.map((c) => [c.id, c]));

/** Идентификатор жидкости. В 1.2 доступна только вода. */
export type LiquidId = 'water';

/** Спецификация жидкости. */
export interface LiquidSpec {
  readonly id: LiquidId;
  readonly rho_kg_m3: number;
  readonly name: string;
}

/** Жидкости опыта 1.2 — только пресная вода. */
export const LIQUIDS: { readonly water: LiquidSpec } = {
  water: {
    id: 'water',
    rho_kg_m3: 1000,
    name: 'Вода',
  },
};
