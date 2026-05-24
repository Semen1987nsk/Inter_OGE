/**
 * Опыт 1.4 «F_арх(ρ жидкости)» — модель плотности раствора от количества соли.
 *
 * Ученик добавляет соль порциями → ρ растёт ступенями до насыщения (~1200 кг/м³).
 * Это симуляционная аппроксимация: ФИПИ точное ρ не задаёт (раствор готовит ученик).
 */
import { describe, expect, it } from 'vitest';
import {
  LIQUIDS,
  SALT_PORTION_DELTA_RHO,
  SATURATED_RHO_KG_M3,
  WATER_RHO_KG_M3,
  isSaturated,
  liquidRhoFromSaltPortions,
} from '../tables';
import { archimedesForceN } from '../ArchimedesCalc';

describe('1.4 — плотность раствора от порций соли', () => {
  it('константы: вода 1000, шаг 70, насыщение 1200', () => {
    expect(WATER_RHO_KG_M3).toBe(1000);
    expect(SALT_PORTION_DELTA_RHO).toBe(70);
    expect(SATURATED_RHO_KG_M3).toBe(1200);
  });

  it('ρ растёт ступенями: 0→1000, 1→1070, 2→1140, 3→1200 (cap)', () => {
    expect(liquidRhoFromSaltPortions(0)).toBe(1000);
    expect(liquidRhoFromSaltPortions(1)).toBe(1070);
    expect(liquidRhoFromSaltPortions(2)).toBe(1140);
    expect(liquidRhoFromSaltPortions(3)).toBe(1200); // 1210 → cap 1200
  });

  it('насыщение: выше cap не растёт', () => {
    expect(liquidRhoFromSaltPortions(4)).toBe(1200);
    expect(liquidRhoFromSaltPortions(10)).toBe(1200);
  });

  it('guard: некорректный ввод (отрицательные/NaN/Infinity) → вода', () => {
    expect(liquidRhoFromSaltPortions(-1)).toBe(1000);
    expect(liquidRhoFromSaltPortions(NaN)).toBe(1000);
    expect(liquidRhoFromSaltPortions(Infinity)).toBe(1000); // non-finite → безопасный дефолт
  });

  it('дробные порции округляются вниз (порция дискретна)', () => {
    expect(liquidRhoFromSaltPortions(1.9)).toBe(1070);
  });

  it('isSaturated: false до 1200, true на/после', () => {
    expect(isSaturated(0)).toBe(false);
    expect(isSaturated(2)).toBe(false);
    expect(isSaturated(3)).toBe(true);
    expect(isSaturated(5)).toBe(true);
  });

  it('LIQUIDS.solution существует (id/name/ρ насыщения)', () => {
    expect(LIQUIDS.solution).toBeDefined();
    expect(LIQUIDS.solution.id).toBe('solution');
    expect(LIQUIDS.solution.rho_kg_m3).toBe(1200);
    expect(typeof LIQUIDS.solution.name).toBe('string');
  });

  it('F_арх монотонно растёт с ρ (тот же объём)', () => {
    const V_m3 = 56e-6; // цилиндр №3, 56 см³
    const fWater = archimedesForceN(liquidRhoFromSaltPortions(0), V_m3);
    const fMid = archimedesForceN(liquidRhoFromSaltPortions(1), V_m3);
    const fSat = archimedesForceN(liquidRhoFromSaltPortions(3), V_m3);
    expect(fMid).toBeGreaterThan(fWater);
    expect(fSat).toBeGreaterThan(fMid);
    // F_арх(вода) = 1000·9.8·56e-6 ≈ 0.549 Н
    expect(fWater).toBeCloseTo(0.549, 3);
  });
});
