/**
 * Спецификации журнала для всех опытов Inter_OGE.
 * Single source of truth — никакого hardcode'а колонок в оркестраторах.
 *
 * См. §21.A.4 REFERENCE.md — обоснование маппинга колонок.
 *
 * Физика и эталоны:
 *   g = 9.8 м/с² (ОГЭ-стандарт; берём 9.8, не 10).
 *   ρ воды = 1000 кг/м³.
 *
 * V в см³ = V₂ − V₁ (мл; 1 мл = 1 см³).
 * ρ в кг/м³ = m(г) / V(см³) × 1000.
 * F_A_изм = P_возд − P_жид (Н).
 * F_A_теор = ρ_воды × g × V_цил_м³ = 1000 × 9.8 × V_см³ × 1e-6 (Н).
 * Δ% = (F_A_изм − F_A_теор) / F_A_теор × 100.
 * F = m·g/1000 (Н, m в граммах).
 * k = F / ΔL_метров = F × 1000 / ΔL_мм (Н/м).
 * N = m·g/1000 (Н).
 * μ = F_тр / N.
 */

import type { ColumnSpec, JournalSpec } from './types';

const G = 9.8;
const RHO_WATER = 1000;

export const DENSITY_SPEC: JournalSpec = {
  experimentId: '1.1',
  kitId: 'kit-1',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'cylinder', label: 'Цилиндр', source: 'meta' },
    { key: 'm_g', label: 'm, г', source: 'direct', unit: 'г', format: 'int' },
    { key: 'V1_ml', label: 'V₁, мл', source: 'direct', unit: 'мл', format: 'int' },
    { key: 'V2_ml', label: 'V₂, мл', source: 'direct', unit: 'мл', format: 'int' },
    {
      key: 'V_cm3',
      label: 'V, см³',
      source: 'derived',
      unit: 'см³',
      format: 'int',
      tolerance: 0.10, // ±10% — погрешность V₁/V₂ при малых V (см R5)
      expectedFromRow: (row) => (row.V2_ml ?? 0) - (row.V1_ml ?? 0),
    },
    {
      key: 'rho_kg_m3',
      label: 'ρ, кг/м³',
      source: 'derived',
      unit: 'кг/м³',
      format: 'int',
      tolerance: 0.10,
      expectedFromRow: (row) => {
        const V = (row.V2_ml ?? 0) - (row.V1_ml ?? 0);
        if (V <= 0) return 0;
        return ((row.m_g ?? 0) / V) * 1000;
      },
    },
  ],
};

export const ARCHIMEDES_SPEC: JournalSpec = {
  experimentId: '1.2',
  kitId: 'kit-1',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'cylinder', label: 'Цилиндр', source: 'meta' },
    { key: 'V_cm3', label: 'V, см³', source: 'meta', unit: 'см³', format: 'int' },
    { key: 'P_air_N', label: 'P возд, Н', source: 'direct', unit: 'Н', format: 'fixed2' },
    { key: 'P_liq_N', label: 'P жид, Н', source: 'direct', unit: 'Н', format: 'fixed2' },
    {
      key: 'F_A_meas_N',
      label: 'F_A изм, Н',
      source: 'derived',
      unit: 'Н',
      format: 'fixed2',
      tolerance: 0.05,
      expectedFromRow: (row) => (row.P_air_N ?? 0) - (row.P_liq_N ?? 0),
    },
    {
      key: 'F_A_theor_N',
      label: 'F_A теор, Н',
      source: 'derived',
      unit: 'Н',
      format: 'fixed2',
      tolerance: 0.05,
      expectedFromRow: (row) => RHO_WATER * G * (row.V_cm3 ?? 0) * 1e-6,
    },
    {
      key: 'delta_pct',
      label: 'Δ, %',
      source: 'derived',
      unit: '%',
      format: 'percent',
      tolerance: 0.20, // ±20% от эталонной Δ — широко (Δ сама малая)
      expectedFromRow: (row) => {
        const Fmeas = (row.P_air_N ?? 0) - (row.P_liq_N ?? 0);
        const Ftheor = RHO_WATER * G * (row.V_cm3 ?? 0) * 1e-6;
        if (Math.abs(Ftheor) < 1e-9) return 0;
        return ((Fmeas - Ftheor) / Ftheor) * 100;
      },
    },
  ],
};

/**
 * Опыт 1.4 «Исследование зависимости F_A от плотности жидкости».
 *
 * ФИПИ-2026, Прил. 2, стр. 16: «исследование зависимости архимедовой силы …
 * от плотности жидкости» (вода ↔ соляной раствор). Ученик готовит раствор солью.
 *
 * Отличие от ARCHIMEDES_SPEC (1.2): F_теор = ρ_ЖИДКОСТИ·g·V (НЕ хардкод воды) —
 * ρ берётся из строки (meta, из salt-flow). Цель — показать F_арх ∝ ρ.
 */
export const ARCHIMEDES_LIQUID_SPEC: JournalSpec = {
  experimentId: '1.4',
  kitId: 'kit-1',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'rho_kg_m3', label: 'ρ, кг/м³', source: 'meta', unit: 'кг/м³', format: 'int' },
    { key: 'V_cm3', label: 'V, см³', source: 'meta', unit: 'см³', format: 'int' },
    { key: 'P_air_N', label: 'P возд, Н', source: 'direct', unit: 'Н', format: 'fixed2' },
    { key: 'P_liq_N', label: 'P жид, Н', source: 'direct', unit: 'Н', format: 'fixed2' },
    {
      key: 'F_A_meas_N',
      label: 'F_A изм, Н',
      source: 'derived',
      unit: 'Н',
      format: 'fixed2',
      tolerance: 0.05,
      expectedFromRow: (row) => (row.P_air_N ?? 0) - (row.P_liq_N ?? 0),
    },
    {
      key: 'F_A_theor_N',
      label: 'F_A теор, Н',
      source: 'derived',
      unit: 'Н',
      format: 'fixed2',
      tolerance: 0.05,
      // F_теор = ρ_жидкости · g · V; ρ из строки (meta), не хардкод воды.
      expectedFromRow: (row) => (row.rho_kg_m3 ?? 0) * G * (row.V_cm3 ?? 0) * 1e-6,
    },
  ],
};

/**
 * Опыт 1.3 «Исследование зависимости F_A от объёма погружённой части тела».
 *
 * ФИПИ-2026, Спецификация КИМ, Приложение 2, стр. 16, Комплект №1:
 * «исследование зависимости архимедовой силы от объёма погружённой части
 *  тела (цилиндр № 3)».
 *
 * КОДИФ §1.29 (стр. 14) — практическая работа из канонического перечня.
 *
 * Методичка ЛАБОСФЕРА §2.3.3:
 *   Цилиндр №3 (пластик), V=56 см³, L=80 мм, S=V/L=0.7 см² = 0.7e-4 м².
 *   3 контрольных уровня: 20/40/60 мм → V_погр 14/28/42 см³ →
 *   F_А_теор 0.137/0.274/0.412 Н (g=9.8, ρ_воды=1000).
 *   Допуск ΔF = ±0.02 Н, допуск отношения F_A/V между измерениями ≤15%.
 *
 * Cross-check: REFERENCE §30 (статус 1.3 ✅ после внедрения этого SPEC).
 */
export const ARCHIMEDES_VOLUME_SPEC: JournalSpec = {
  experimentId: '1.3',
  kitId: 'kit-1',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'h_mm', label: 'h, мм', source: 'direct', unit: 'мм', format: 'int' },
    {
      key: 'V_cm3',
      label: 'V погр, см³',
      source: 'derived',
      unit: 'см³',
      format: 'int',
      tolerance: 0.10,
      // V_погр(см³) = h(мм) × 0.7 см³/мм.
      // Где 0.7 = S × 0.1 = 7 см² × 0.1 см/мм (S = V_цил/L = 56/8 = 7).
      // (В методичке §2.3.3 опечатка «S=0,7 см²» — фактически 7 см².)
      expectedFromRow: (row) => (row.h_mm ?? 0) * 0.7,
    },
    { key: 'P_air_N', label: 'P возд, Н', source: 'direct', unit: 'Н', format: 'fixed2' },
    { key: 'P_liq_N', label: 'P изм, Н', source: 'direct', unit: 'Н', format: 'fixed2' },
    {
      key: 'F_A_meas_N',
      label: 'F_A изм, Н',
      source: 'derived',
      unit: 'Н',
      format: 'fixed2',
      tolerance: 0.05,
      expectedFromRow: (row) => (row.P_air_N ?? 0) - (row.P_liq_N ?? 0),
    },
    {
      key: 'F_A_theor_N',
      label: 'F_A теор, Н',
      source: 'derived',
      unit: 'Н',
      format: 'fixed2',
      tolerance: 0.05,
      expectedFromRow: (row) => {
        const V_cm3 = (row.h_mm ?? 0) * 0.7;
        return RHO_WATER * G * V_cm3 * 1e-6;
      },
    },
    {
      key: 'delta_pct',
      label: 'Δ, %',
      source: 'derived',
      unit: '%',
      format: 'percent',
      tolerance: 0.20,
      expectedFromRow: (row) => {
        const Fmeas = (row.P_air_N ?? 0) - (row.P_liq_N ?? 0);
        const V_cm3 = (row.h_mm ?? 0) * 0.7;
        const Ftheor = RHO_WATER * G * V_cm3 * 1e-6;
        if (Math.abs(Ftheor) < 1e-9) return 0;
        return ((Fmeas - Ftheor) / Ftheor) * 100;
      },
    },
  ],
};

export const SPRING_SPEC: JournalSpec = {
  experimentId: '2.1',
  kitId: 'kit-2',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'm_g', label: 'm, г', source: 'direct', unit: 'г', format: 'int' },
    { key: 'l0_mm', label: 'l₀, мм', source: 'direct', unit: 'мм', format: 'int' },
    { key: 'l1_mm', label: 'l₁, мм', source: 'direct', unit: 'мм', format: 'int' },
    {
      key: 'dL_mm',
      label: 'ΔL, мм',
      source: 'derived',
      unit: 'мм',
      format: 'int',
      tolerance: 0.05,
      expectedFromRow: (row) => (row.l1_mm ?? 0) - (row.l0_mm ?? 0),
    },
    {
      key: 'F_N',
      label: 'F, Н',
      source: 'derived',
      unit: 'Н',
      format: 'fixed2',
      tolerance: 0.05,
      expectedFromRow: (row) => ((row.m_g ?? 0) * G) / 1000,
    },
    {
      key: 'k_N_m',
      label: 'k, Н/м',
      source: 'derived',
      unit: 'Н/м',
      format: 'int',
      tolerance: 0.10,
      expectedFromRow: (row) => {
        const F = ((row.m_g ?? 0) * G) / 1000;
        const dL = ((row.l1_mm ?? 0) - (row.l0_mm ?? 0)) / 1000; // в метрах
        if (dL <= 0) return 0;
        return F / dL;
      },
    },
  ],
};

export const FRICTION_SPEC: JournalSpec = {
  experimentId: '2.2',
  kitId: 'kit-2',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'surface', label: 'Поверхность', source: 'meta' },
    { key: 'm_g', label: 'm, г', source: 'direct', unit: 'г', format: 'int' },
    {
      key: 'F_friction_N',
      label: 'F тр, Н',
      source: 'direct',
      unit: 'Н',
      format: 'fixed2',
    },
    {
      key: 'N_N',
      label: 'N, Н',
      source: 'derived',
      unit: 'Н',
      format: 'fixed2',
      tolerance: 0.05,
      expectedFromRow: (row) => ((row.m_g ?? 0) * G) / 1000,
    },
    {
      key: 'mu',
      label: 'μ',
      source: 'derived',
      format: 'fixed2',
      tolerance: 0.10,
      expectedFromRow: (row) => {
        const N = ((row.m_g ?? 0) * G) / 1000;
        if (N <= 0) return 0;
        return (row.F_friction_N ?? 0) / N;
      },
    },
  ],
};

/**
 * Опыт 2.3 «Работа силы трения» — A = F_тр · s.
 * Отдельный SPEC, т.к. форма журнала другая, чем у 2.2 (μ): нужны путь s и работа A.
 * Друг друга не подменяют — оркестратор выбирает SPEC по активной задаче (B → этот).
 */
export const FRICTION_WORK_SPEC: JournalSpec = {
  experimentId: '2.3',
  kitId: 'kit-2',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'surface', label: 'Поверхность', source: 'meta' },
    {
      key: 'F_friction_N',
      label: 'F тр, Н',
      source: 'direct',
      unit: 'Н',
      format: 'fixed2',
    },
    { key: 's_cm', label: 's, см', source: 'direct', unit: 'см', format: 'fixed1' },
    {
      key: 'work_J',
      label: 'A, Дж',
      source: 'derived',
      unit: 'Дж',
      format: 'fixed3',
      tolerance: 0.1,
      // A = F_тр · s; s переводим из см в метры (÷100). Результат в Дж.
      expectedFromRow: (row) => (row.F_friction_N ?? 0) * ((row.s_cm ?? 0) / 100),
    },
  ],
};

/**
 * Опыт 1.5 «Независимость выталкивающей силы от массы тела».
 *
 * ФИПИ-2026, Прил. 2, компл. №1: «исследование … независимости выталкивающей
 * силы от массы тела (цилиндры №1 и 2)».
 *
 * Физика: при равном объёме V=25 см³ F_арх = ρ_воды·g·V одинакова для
 * стального (m=195 г) и алюминиевого (m=70 г) цилиндров. Ученик измеряет
 * P_возд и P_жид для каждого цилиндра, считает F_A = P_возд − P_жид и
 * убеждается, что F_A_1 ≈ F_A_2 несмотря на разную массу.
 */
export const INDEPENDENCE_MASS_SPEC: JournalSpec = {
  experimentId: '1.5',
  kitId: 'kit-1',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'cylinder', label: 'Цилиндр', source: 'meta' },
    { key: 'm_g', label: 'm, г', source: 'meta', unit: 'г', format: 'int' },
    { key: 'V_cm3', label: 'V, см³', source: 'meta', unit: 'см³', format: 'int' },
    { key: 'P_air_N', label: 'P возд, Н', source: 'direct', unit: 'Н', format: 'fixed2' },
    { key: 'P_liq_N', label: 'P жид, Н', source: 'direct', unit: 'Н', format: 'fixed2' },
    {
      key: 'F_A_N', label: 'F_A, Н', source: 'derived', unit: 'Н', format: 'fixed2',
      tolerance: 0.05,
      expectedFromRow: (row) => (row.P_air_N ?? 0) - (row.P_liq_N ?? 0),
    },
  ],
};

/**
 * Опыт 2.4 «Измерение силы упругости пружины одной точкой».
 *
 * ФИПИ-2026, КОДИФ §1.29 п.6: «…силы упругости…» (измерение через динамометр).
 * Прил. 2 компл. №2: «измерение … силы упругости».
 *
 * При равновесии пружины под грузом массой m:
 *   F_упр = m · g  (в Ньютонах; g = 9.8 м/с²; m в кг = m_г / 1000).
 *
 * Модель «одной точкой»: один груз → одна строка в журнале {m_г, F_упр}.
 * Ученик вводит F_упр из показаний динамометра; программа проверяет через expectedFromRow.
 */
export const ELASTIC_FORCE_SPEC: JournalSpec = {
  experimentId: '2.4',
  kitId: 'kit-2',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'm_g', label: 'm, г', source: 'direct', unit: 'г', format: 'int' },
    {
      key: 'F_N', label: 'F_упр, Н', source: 'derived', unit: 'Н', format: 'fixed2',
      tolerance: 0.05,
      // При равновесии F_упр = m·g.
      expectedFromRow: (row) => ((row.m_g ?? 0) / 1000) * G,
    },
  ],
};

/**
 * Опыт «Работа силы упругости» — БОНУС ЛАБОСФЕРЫ.
 *
 * ⚠️ БОНУС ЛАБОСФЕРА — НЕ ВХОДИТ В ФИПИ.
 * Причина: работа упругости в ФИПИ только для kit-6 (блоки). КОДИФ §1.29.
 *
 * Установка: пружина + грузы (как 2.1). Цель — показать квадратичный рост W(Δl)
 * и проверить баланс энергии A_грав = 2 · W_упр.
 *
 * Колонки журнала:
 *   m_g    — масса груза [г]            (meta, из суммы грузов)
 *   dl_cm  — удлинение [см]             (direct, ученик читает со шкалы)
 *   k_N_m  — жёсткость пружины [Н/м]   (meta, из паспорта пружины)
 *   F_N    — сила упругости [Н]         (derived, F = k·Δl)
 *   W_k_J  — работа через жёсткость [Дж] (derived, W = k·Δl²/2)
 *   W_F_J  — работа через силу [Дж]    (derived, W = F·Δl/2; должна ≈ W_k)
 *   A_grav_J — работа силы тяжести [Дж] (derived, A = m·g·Δl ≈ 2·W)
 */
export const SPRING_WORK_SPEC: JournalSpec = {
  experimentId: 'bonus-spring-work',
  kitId: 'kit-2',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'm_g', label: 'm, г', source: 'meta', unit: 'г', format: 'int' },
    { key: 'dl_cm', label: 'Δl, см', source: 'direct', unit: 'см', format: 'fixed2' },
    { key: 'k_N_m', label: 'k, Н/м', source: 'meta', unit: 'Н/м', format: 'int' },
    {
      key: 'F_N',
      label: 'F, Н',
      source: 'derived',
      unit: 'Н',
      format: 'fixed2',
      tolerance: 0.05,
      // F_упр = k · Δl (Δl в метрах).
      expectedFromRow: (row) => (row.k_N_m ?? 0) * ((row.dl_cm ?? 0) / 100),
    },
    {
      key: 'W_k_J',
      label: 'W = k·Δl²/2, Дж',
      source: 'derived',
      unit: 'Дж',
      format: 'fixed3',
      tolerance: 0.05,
      // W_упр = k · Δl² / 2 (Δl в метрах).
      expectedFromRow: (row) => {
        const dl_m = (row.dl_cm ?? 0) / 100;
        return 0.5 * (row.k_N_m ?? 0) * dl_m * dl_m;
      },
    },
    {
      key: 'W_F_J',
      label: 'W = F·Δl/2, Дж',
      source: 'derived',
      unit: 'Дж',
      format: 'fixed3',
      tolerance: 0.05,
      // W_упр = F · Δl / 2 (площадь треугольника под F(Δl)).
      expectedFromRow: (row) => {
        const dl_m = (row.dl_cm ?? 0) / 100;
        return ((row.F_N ?? 0) * dl_m) / 2;
      },
    },
    {
      key: 'A_grav_J',
      label: 'A_грав, Дж',
      source: 'derived',
      unit: 'Дж',
      format: 'fixed3',
      tolerance: 0.05,
      // A_грав = m · g · Δl; при статическом подвесе A_грав = 2 · W_упр.
      expectedFromRow: (row) => {
        const m_kg = (row.m_g ?? 0) / 1000;
        const dl_m = (row.dl_cm ?? 0) / 100;
        return m_kg * G * dl_m;
      },
    },
  ],
};

export const RESISTANCE_SPEC: JournalSpec = {
  experimentId: '3.1',
  kitId: 'kit-3',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'resistor', label: 'Резистор', source: 'meta' },
    { key: 'U_V', label: 'U, В', source: 'direct', unit: 'В', format: 'fixed2' },
    { key: 'I_A', label: 'I, А', source: 'direct', unit: 'А', format: 'fixed2' },
    {
      key: 'R_Ohm', label: 'R, Ом', source: 'derived', unit: 'Ом', format: 'fixed2',
      tolerance: 0.10, // допуск на арифметику ученика: R vs U/I (10%); это НЕ интервал приёмки ФИПИ
      expectedFromRow: (row) => { const I = row.I_A ?? 0; return I > 0 ? (row.U_V ?? 0) / I : 0; },
    },
  ],
};

/**
 * Опыт 3.2 «Измерение мощности электрического тока» — P = U·I.
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (сноска 3), п.2 «измерение мощности
 * электрического тока»; КОДИФ §1.29. Метод амперметра-вольтметра.
 * Эталон (методичка §2.2.7): R3, U=5,7 В, I=0,70 А → P=4,0 Вт (интервал 3,5–4,5).
 */
export const POWER_SPEC: JournalSpec = {
  experimentId: '3.2',
  kitId: 'kit-3',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'resistor', label: 'Резистор', source: 'meta' },
    { key: 'U_V', label: 'U, В', source: 'direct', unit: 'В', format: 'fixed2' },
    { key: 'I_A', label: 'I, А', source: 'direct', unit: 'А', format: 'fixed2' },
    {
      key: 'P_W', label: 'P, Вт', source: 'derived', unit: 'Вт', format: 'fixed2',
      tolerance: 0.10, // допуск на арифметику ученика: P vs U·I (10%); это НЕ интервал приёмки ФИПИ (3,5–4,5)
      expectedFromRow: (row) => (row.U_V ?? 0) * (row.I_A ?? 0),
    },
  ],
};

/**
 * Опыт 3.3 «Измерение работы электрического тока» — A = U·I·t.
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (сноска 3), п.3 «измерение работы
 * электрического тока»; КОДИФ §1.29.
 * Эталон (методичка §2.2.7): R2, U=2,9 В, I=0,51 А, t=60 с → A=88,7 Дж (интервал 75–100).
 * t — direct (ученик задаёт секундомером, авто-заполняется); A — derived (ученик считает).
 */
export const WORK_CURRENT_SPEC: JournalSpec = {
  experimentId: '3.3',
  kitId: 'kit-3',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'resistor', label: 'Резистор', source: 'meta' },
    { key: 'U_V', label: 'U, В', source: 'direct', unit: 'В', format: 'fixed2' },
    { key: 'I_A', label: 'I, А', source: 'direct', unit: 'А', format: 'fixed2' },
    { key: 't_s', label: 't, с', source: 'direct', unit: 'с', format: 'int' },
    {
      key: 'A_J', label: 'A, Дж', source: 'derived', unit: 'Дж', format: 'fixed1',
      tolerance: 0.10, // допуск на арифметику ученика: A vs U·I·t (10%); это НЕ интервал приёмки ФИПИ (75–100)
      expectedFromRow: (row) => (row.U_V ?? 0) * (row.I_A ?? 0) * (row.t_s ?? 0),
    },
  ],
};

/**
 * Опыт 3.4 «Исследование зависимости силы тока от напряжения (ВАХ)» — I(U).
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (сноска 3), п.4 «исследование зависимости
 * силы тока в проводнике (резисторы, лампочка) от напряжения»; КОДИФ §1.29.
 * Резистор: I=U/R (R=const). Лампочка: R растёт с нагревом (R=U/I растёт с U).
 * R_Ohm — derived (ученик считает U/I); для лампы R по точкам РАЗНОЕ — это и показывает нелинейность.
 */
export const IV_CURVE_SPEC: JournalSpec = {
  experimentId: '3.4',
  kitId: 'kit-3',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'element', label: 'Элемент', source: 'meta' },
    { key: 'U_V', label: 'U, В', source: 'direct', unit: 'В', format: 'fixed2' },
    { key: 'I_A', label: 'I, А', source: 'direct', unit: 'А', format: 'fixed2' },
    {
      key: 'R_Ohm', label: 'R, Ом', source: 'derived', unit: 'Ом', format: 'fixed2',
      tolerance: 0.10, // допуск на арифметику ученика: R vs U/I (10%); НЕ интервал приёмки ФИПИ
      expectedFromRow: (row) => { const I = row.I_A ?? 0; return I > 0 ? (row.U_V ?? 0) / I : 0; },
    },
  ],
};

// Общие колонки 3.5–3.7: метод R=U/I, варьируемый параметр виден в паспортных колонках.
const WIRE_COLUMNS: ColumnSpec[] = [
  { key: 'idx', label: '№', source: 'meta', format: 'int' },
  { key: 'material', label: 'Материал', source: 'meta' },
  { key: 'l_m', label: 'l, м', source: 'meta', unit: 'м', format: 'fixed1' },
  { key: 'S_mm2', label: 'S, мм²', source: 'meta', unit: 'мм²', format: 'fixed2' },
  { key: 'U_V', label: 'U, В', source: 'direct', unit: 'В', format: 'fixed2' },
  { key: 'I_A', label: 'I, А', source: 'direct', unit: 'А', format: 'fixed2' },
  {
    key: 'R_Ohm', label: 'R, Ом', source: 'derived', unit: 'Ом', format: 'fixed2',
    tolerance: 0.10, // допуск на арифметику ученика: R vs U/I (10%); НЕ интервал приёмки ФИПИ
    expectedFromRow: (row) => { const I = row.I_A ?? 0; return I > 0 ? (row.U_V ?? 0) / I : 0; },
  },
];

/**
 * Опыт 3.5 «Зависимость R проводника от длины» — R(l), метод R=U/I.
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (сноска 3) п.5; КОДИФ §1.29.
 * Набор: нихром S=0,25 мм², l=0,5/1,0/2,0 м → R=2,2/4,4/8,8 Ом (R∝l).
 */
export const R_LENGTH_SPEC: JournalSpec = { experimentId: '3.5', kitId: 'kit-3', columns: WIRE_COLUMNS };

/**
 * Опыт 3.6 «Зависимость R проводника от площади сечения» — R(S), метод R=U/I.
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (сноска 3) п.6; КОДИФ §1.29.
 * Набор: нихром l=2,0 м, S=0,25/0,5/1,0 мм² → R=8,8/4,4/2,2 Ом (R∝1/S).
 */
export const R_AREA_SPEC: JournalSpec = { experimentId: '3.6', kitId: 'kit-3', columns: WIRE_COLUMNS };

/**
 * Опыт 3.7 «Зависимость R проводника от удельного сопротивления» — R(ρ), метод R=U/I.
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (сноска 3) п.7; КОДИФ §1.29.
 * Набор: l=2,0 м S=0,25 мм², нихром/константан/никелин → R=8,8/4,0/3,2 Ом (R∝ρ).
 */
export const R_RHO_SPEC: JournalSpec = { experimentId: '3.7', kitId: 'kit-3', columns: WIRE_COLUMNS };

/**
 * Опыт 3.8 «Правило напряжений для последовательного соединения» — U = U1 + U2.
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (сноска 3) п.8
 * «последовательное соединение проводников: U = U1 + U2»; КОДИФ §1.29.
 * Методика: ученик снимает U1 (across R1), U2 (across R2), U_общ (across R1+R2)
 * вольтметром в 3 позициях; правило U1+U2=U_общ — в result-panel.
 * Нет derived-колонок (правило — не построчная проверка, а итоговый вывод).
 */
export const SERIES_VOLTAGE_SPEC: JournalSpec = {
  experimentId: '3.8',
  kitId: 'kit-3',
  columns: [
    { key: 'idx',   label: '№',     source: 'meta', format: 'int' },
    { key: 'point', label: 'Точка', source: 'meta' },
    { key: 'U_V',   label: 'U, В',  source: 'direct', unit: 'В', format: 'fixed2' },
  ],
};

/**
 * Опыт 3.9 «Правило токов для параллельного соединения» — I = I1 + I2.
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (сноска 3) п.9
 * «параллельное соединение проводников: I = I1 + I2»; КОДИФ §1.29.
 * Методика: ученик снимает I1 (ветвь R1), I2 (ветвь R2), I_общ (главная линия)
 * амперметром в 3 позициях; правило I1+I2=I_общ — в result-panel.
 */
export const PARALLEL_CURRENT_SPEC: JournalSpec = {
  experimentId: '3.9',
  kitId: 'kit-3',
  columns: [
    { key: 'idx',   label: '№',     source: 'meta', format: 'int' },
    { key: 'point', label: 'Точка', source: 'meta' },
    { key: 'I_A',   label: 'I, А',  source: 'direct', unit: 'А', format: 'fixed2' },
  ],
};

/**
 * Опыт 4.1 «Измерение оптической силы собирающей линзы».
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№4 (стр. 19), сноска (4):
 * «измерение оптической силы собирающей линзы, фокусного расстояния собирающей линзы».
 * КОДИФ §1.29 (раздел оптика).
 *
 * Метод: навести резкость → снять d (предмет→линза) и f (линза→экран) в мм →
 *   F = d·f/(d+f) [мм];  D = 1/F [дптр] = 1000/F_мм.
 *
 * Физика инлайнится (не импортируется из kit-4), по канону specs.ts (§21.A.4).
 */
export const LENS_POWER_SPEC: JournalSpec = {
  experimentId: '4.1',
  kitId: 'kit-4',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'd_mm', label: 'd', source: 'direct', unit: 'мм', format: 'int' },
    { key: 'f_mm', label: 'f', source: 'direct', unit: 'мм', format: 'int' },
    {
      key: 'F_mm',
      label: 'F',
      source: 'derived',
      unit: 'мм',
      format: 'int',
      tolerance: 0.05,
      // F = d·f / (d+f)  [формула тонкой линзы; считаем ТОЛЬКО из прямых d_mm,f_mm]
      expectedFromRow: (r) => {
        const d = r.d_mm ?? 0;
        const f = r.f_mm ?? 0;
        const s = d + f;
        return s > 0 ? (d * f) / s : 0;
      },
    },
    {
      key: 'D_dptr',
      label: 'D',
      source: 'derived',
      unit: 'дптр',
      format: 'fixed1',
      tolerance: 0.08,
      // D = 1000 / F_мм  [=1/F_м, дптр]; F вычисляется ИЗ ПРЯМЫХ d_mm,f_mm (НЕ из row['F_mm'])
      expectedFromRow: (r) => {
        const d = r.d_mm ?? 0;
        const f = r.f_mm ?? 0;
        const s = d + f;
        const F = s > 0 ? (d * f) / s : 0;
        return F > 0 ? 1000 / F : 0;
      },
    },
  ],
};

/**
 * Опыт 4.2 «Измерение фокусного расстояния собирающей линзы по равенству размеров».
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№4 (стр.19), сноска (4):
 * «...фокусного расстояния собирающей линзы (по свойству равенства размеров предмета
 *  и изображения, когда предмет расположен в двойном фокусе)...». КОДИФ §1.29.
 *
 * Метод: добиться резкого изображения, равного предмету по размеру (Γ=−1) → предмет в 2F.
 *   Снять расстояние предмет→линза при равенстве (= 2F) [мм]; F = 2F / 2 [мм].
 * Физика инлайнится (не импортируется из kit-4), по канону specs.ts (§21.A.4).
 */
export const FOCAL_2F_SPEC: JournalSpec = {
  experimentId: '4.2',
  kitId: 'kit-4',
  columns: [
    { key: 'idx', label: '№', source: 'meta', format: 'int' },
    { key: 'twoF_mm', label: '2F', source: 'direct', unit: 'мм', format: 'int' },
    {
      key: 'F_mm',
      label: 'F',
      source: 'derived',
      unit: 'мм',
      format: 'int',
      tolerance: 0.05,
      // F = 2F / 2  [фокус по двойному фокусу; считаем ТОЛЬКО из прямого twoF_mm]
      expectedFromRow: (r) => (r.twoF_mm ?? 0) / 2,
    },
  ],
};

export const ALL_SPECS: ReadonlyArray<JournalSpec> = [
  DENSITY_SPEC,
  ARCHIMEDES_SPEC,
  ARCHIMEDES_LIQUID_SPEC,
  ARCHIMEDES_VOLUME_SPEC,
  INDEPENDENCE_MASS_SPEC,
  SPRING_SPEC,
  FRICTION_SPEC,
  FRICTION_WORK_SPEC,
  ELASTIC_FORCE_SPEC,
  SPRING_WORK_SPEC,
  RESISTANCE_SPEC,
  POWER_SPEC,
  WORK_CURRENT_SPEC,
  IV_CURVE_SPEC,
  R_LENGTH_SPEC,
  R_AREA_SPEC,
  R_RHO_SPEC,
  SERIES_VOLTAGE_SPEC,
  PARALLEL_CURRENT_SPEC,
  LENS_POWER_SPEC,
  FOCAL_2F_SPEC,
];

export function getSpecByExperimentId(experimentId: string): JournalSpec | null {
  return ALL_SPECS.find((s) => s.experimentId === experimentId) ?? null;
}
