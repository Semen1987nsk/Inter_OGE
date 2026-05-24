/**
 * ARCHIMEDES_LIQUID_SPEC (опыт 1.4 «F_арх от плотности жидкости»).
 *
 * Отличие от 1.2 (ARCHIMEDES_SPEC): F_теор зависит от ρ ЖИДКОСТИ (row.rho_kg_m3),
 * а не хардкодит воду. Колонка ρ — meta (из salt-flow). SPEC выбирается по режиму.
 */
import { describe, expect, it } from 'vitest';
import {
  ALL_SPECS,
  ARCHIMEDES_LIQUID_SPEC,
  getSpecByExperimentId,
} from '@shared/lib/journal/specs';

const G = 9.8;

describe('ARCHIMEDES_LIQUID_SPEC — опыт 1.4', () => {
  it('идентификаторы: 1.4 / kit-1', () => {
    expect(ARCHIMEDES_LIQUID_SPEC.experimentId).toBe('1.4');
    expect(ARCHIMEDES_LIQUID_SPEC.kitId).toBe('kit-1');
  });

  it('колонки: idx, rho, V, P_air, P_liq, F_изм, F_теор', () => {
    expect(ARCHIMEDES_LIQUID_SPEC.columns.map((c) => c.key)).toEqual([
      'idx',
      'rho_kg_m3',
      'V_cm3',
      'P_air_N',
      'P_liq_N',
      'F_A_meas_N',
      'F_A_theor_N',
    ]);
  });

  it('ρ и V — meta; P возд/жид — direct; F изм/теор — derived', () => {
    const byKey = Object.fromEntries(ARCHIMEDES_LIQUID_SPEC.columns.map((c) => [c.key, c]));
    expect(byKey['rho_kg_m3']!.source).toBe('meta');
    expect(byKey['V_cm3']!.source).toBe('meta');
    expect(byKey['P_air_N']!.source).toBe('direct');
    expect(byKey['P_liq_N']!.source).toBe('direct');
    expect(byKey['F_A_meas_N']!.source).toBe('derived');
    expect(byKey['F_A_theor_N']!.source).toBe('derived');
  });

  it('F_изм = P_возд − P_жид', () => {
    const c = ARCHIMEDES_LIQUID_SPEC.columns.find((c) => c.key === 'F_A_meas_N')!;
    expect(c.expectedFromRow!({ P_air_N: 0.95, P_liq_N: 0.29 })).toBeCloseTo(0.66, 5);
  });

  it('F_теор = ρ·g·V (ρ из строки, НЕ вода!)', () => {
    const c = ARCHIMEDES_LIQUID_SPEC.columns.find((c) => c.key === 'F_A_theor_N')!;
    // ρ=1200, V=56 см³ → 1200·9.8·56e-6 = 0.65856 Н
    expect(c.expectedFromRow!({ rho_kg_m3: 1200, V_cm3: 56 })).toBeCloseTo(1200 * G * 56e-6, 6);
    // вода ρ=1000, V=56 → 0.54880 Н — F_теор зависит от ρ
    expect(c.expectedFromRow!({ rho_kg_m3: 1000, V_cm3: 56 })).toBeCloseTo(1000 * G * 56e-6, 6);
  });

  it('зарегистрирован в ALL_SPECS / по id 1.4', () => {
    expect(ALL_SPECS).toContain(ARCHIMEDES_LIQUID_SPEC);
    expect(getSpecByExperimentId('1.4')).toBe(ARCHIMEDES_LIQUID_SPEC);
  });
});
