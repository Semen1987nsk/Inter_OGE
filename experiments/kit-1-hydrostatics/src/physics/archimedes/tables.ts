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

/** Идентификатор жидкости. 1.2 — вода; 1.4 — соляной раствор. */
export type LiquidId = 'water' | 'solution';

/** Спецификация жидкости. */
export interface LiquidSpec {
  readonly id: LiquidId;
  readonly rho_kg_m3: number;
  readonly name: string;
}

/** Плотность пресной воды (кг/м³). */
export const WATER_RHO_KG_M3 = 1000 as const;
/** Прирост плотности за одну порцию соли (кг/м³). */
export const SALT_PORTION_DELTA_RHO = 70 as const;
/** Плотность насыщенного раствора NaCl ~20°C (кг/м³) — потолок. */
export const SATURATED_RHO_KG_M3 = 1200 as const;

/** Жидкости: вода (1.2) + соляной раствор (1.4, при насыщении). */
export const LIQUIDS: { readonly water: LiquidSpec; readonly solution: LiquidSpec } = {
  water: {
    id: 'water',
    rho_kg_m3: WATER_RHO_KG_M3,
    name: 'Вода',
  },
  solution: {
    id: 'solution',
    rho_kg_m3: SATURATED_RHO_KG_M3,
    name: 'Солёный раствор',
  },
};

/**
 * Плотность раствора по числу добавленных порций соли (опыт 1.4).
 * 0 порций = вода (1000); каждая порция +70 кг/м³; потолок — насыщение 1200.
 * Симуляционная аппроксимация: ФИПИ точное ρ не задаёт (ученик готовит раствор сам).
 * Дробные порции округляются вниз (порция дискретна), мусорный ввод → вода.
 */
export function liquidRhoFromSaltPortions(portions: number): number {
  if (!Number.isFinite(portions) || portions <= 0) return WATER_RHO_KG_M3;
  const rho = WATER_RHO_KG_M3 + Math.floor(portions) * SALT_PORTION_DELTA_RHO;
  return Math.min(SATURATED_RHO_KG_M3, rho);
}

/** Раствор насыщен — дальнейшие порции соли не растворяются. */
export function isSaturated(portions: number): boolean {
  return liquidRhoFromSaltPortions(portions) >= SATURATED_RHO_KG_M3;
}
