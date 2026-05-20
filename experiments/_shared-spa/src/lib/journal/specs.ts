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

import type { JournalSpec } from './types';

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

export const ALL_SPECS: ReadonlyArray<JournalSpec> = [
  DENSITY_SPEC,
  ARCHIMEDES_SPEC,
  ARCHIMEDES_VOLUME_SPEC,
  SPRING_SPEC,
  FRICTION_SPEC,
];

export function getSpecByExperimentId(experimentId: string): JournalSpec | null {
  return ALL_SPECS.find((s) => s.experimentId === experimentId) ?? null;
}
