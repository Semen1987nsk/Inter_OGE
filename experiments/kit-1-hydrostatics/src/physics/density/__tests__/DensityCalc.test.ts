/**
 * DensityCalc — unit-тесты pure-функций физики плотности.
 * Минимум 30 кейсов — happy path + boundary + invalid inputs.
 */

import { describe, expect, it } from 'vitest';
import {
  calculateDensity,
  densityFromMassVolume,
  gPerCm3ToKgPerM3,
  identifyMaterial,
  isInFipiInterval,
  kgPerM3ToGPerCm3,
  volumeFromDisplacement,
} from '../DensityCalc';
import { CYLINDERS } from '../../../types';

describe('volumeFromDisplacement', () => {
  it('возвращает разность V₂ − V₁', () => {
    expect(volumeFromDisplacement(100, 125)).toBe(25);
    expect(volumeFromDisplacement(50, 56)).toBe(6);
    expect(volumeFromDisplacement(0, 1)).toBe(1);
  });

  it('бросает RangeError при V₂ ≤ V₁', () => {
    expect(() => volumeFromDisplacement(100, 100)).toThrow(RangeError);
    expect(() => volumeFromDisplacement(100, 99)).toThrow(RangeError);
    expect(() => volumeFromDisplacement(100, 0)).toThrow(RangeError);
  });

  it('бросает при отрицательных значениях', () => {
    expect(() => volumeFromDisplacement(-1, 100)).toThrow(RangeError);
    expect(() => volumeFromDisplacement(100, -50)).toThrow(RangeError);
  });

  it('бросает при NaN/Infinity', () => {
    expect(() => volumeFromDisplacement(NaN, 100)).toThrow(RangeError);
    expect(() => volumeFromDisplacement(100, Infinity)).toThrow(RangeError);
    expect(() => volumeFromDisplacement(-Infinity, 100)).toThrow(RangeError);
  });
});

describe('densityFromMassVolume', () => {
  it('вычисляет ρ = m/V корректно', () => {
    expect(densityFromMassVolume(195, 25)).toBeCloseTo(7.8);   // сталь
    expect(densityFromMassVolume(70, 25)).toBeCloseTo(2.8);    // алюминий
    expect(densityFromMassVolume(66, 56)).toBeCloseTo(1.179, 2); // пластик
  });

  it('бросает при m ≤ 0', () => {
    expect(() => densityFromMassVolume(0, 10)).toThrow(RangeError);
    expect(() => densityFromMassVolume(-5, 10)).toThrow(RangeError);
  });

  it('бросает при V ≤ 0', () => {
    expect(() => densityFromMassVolume(10, 0)).toThrow(RangeError);
    expect(() => densityFromMassVolume(10, -1)).toThrow(RangeError);
  });

  it('бросает при NaN/Infinity', () => {
    expect(() => densityFromMassVolume(NaN, 10)).toThrow(RangeError);
    expect(() => densityFromMassVolume(10, Infinity)).toThrow(RangeError);
  });
});

describe('единицы', () => {
  it('gPerCm3ToKgPerM3 = ×1000', () => {
    expect(gPerCm3ToKgPerM3(7.8)).toBe(7800);
    expect(gPerCm3ToKgPerM3(1.0)).toBe(1000);
    expect(gPerCm3ToKgPerM3(0)).toBe(0);
  });

  it('kgPerM3ToGPerCm3 = ÷1000', () => {
    expect(kgPerM3ToGPerCm3(7800)).toBe(7.8);
    expect(kgPerM3ToGPerCm3(1000)).toBe(1.0);
  });

  it('round-trip g→kg→g сохраняет значение', () => {
    for (const x of [0.5, 1.0, 2.8, 7.8, 11.34, 0.001]) {
      expect(kgPerM3ToGPerCm3(gPerCm3ToKgPerM3(x))).toBeCloseTo(x, 9);
    }
  });

  it('бросает при NaN/Infinity', () => {
    expect(() => gPerCm3ToKgPerM3(NaN)).toThrow(RangeError);
    expect(() => kgPerM3ToGPerCm3(Infinity)).toThrow(RangeError);
  });
});

describe('identifyMaterial', () => {
  it('правильно опознаёт сталь', () => {
    expect(identifyMaterial(7800)).toBe('steel');
    expect(identifyMaterial(7700)).toBe('steel');
    expect(identifyMaterial(8200)).toBe('steel');
  });

  it('правильно опознаёт алюминий', () => {
    expect(identifyMaterial(2800)).toBe('aluminum');
    expect(identifyMaterial(2750)).toBe('aluminum');
  });

  it('правильно опознаёт пластик', () => {
    expect(identifyMaterial(1180)).toBe('plastic');
    expect(identifyMaterial(1100)).toBe('plastic');
  });

  it('возвращает null для плотности вне всех окон', () => {
    expect(identifyMaterial(5000)).toBeNull();   // между алюминием и сталью
    expect(identifyMaterial(15000)).toBeNull();
    expect(identifyMaterial(500)).toBeNull();
  });

  it('null для невалидных входов', () => {
    expect(identifyMaterial(0)).toBeNull();
    expect(identifyMaterial(-100)).toBeNull();
    expect(identifyMaterial(NaN)).toBeNull();
    expect(identifyMaterial(Infinity)).toBeNull();
  });

  it('выбирает ближайший материал при перекрытии окон', () => {
    // на 10% от 1180 (пластик) и 10% от 2800 (алюминий) — окна не пересекаются
    // но при 50% они пересекаются на ~1700-1800
    expect(identifyMaterial(1300, 50)).toBe('plastic');  // ближе к пластику
    expect(identifyMaterial(2400, 50)).toBe('aluminum'); // ближе к алюминию
  });
});

describe('calculateDensity (полный workflow)', () => {
  it('опыт со сталью №1 — попадает в ФИПИ-окно', () => {
    const r = calculateDensity(195, 100, 125);
    expect(r.V_cm3).toBe(25);
    expect(r.rho_g_cm3).toBeCloseTo(7.8);
    expect(r.rho_kg_m3).toBeCloseTo(7800);
    expect(r.identified).toBe('steel');
  });

  it('опыт с алюминием №2', () => {
    const r = calculateDensity(70, 100, 125);
    expect(r.V_cm3).toBe(25);
    expect(r.rho_g_cm3).toBeCloseTo(2.8);
    expect(r.identified).toBe('aluminum');
  });

  it('опыт с пластиком №3', () => {
    const r = calculateDensity(66, 100, 156);
    expect(r.V_cm3).toBe(56);
    expect(r.rho_g_cm3).toBeCloseTo(1.179, 2);
    expect(r.identified).toBe('plastic');
  });

  it('опыт с погрешностями ±2 г и ±0.3 см³ — стальной №1', () => {
    // Худший случай: m=193, V=25.3 → ρ=7.628
    const r = calculateDensity(193, 100, 125.3);
    expect(r.identified).toBe('steel');
  });
});

describe('isInFipiInterval', () => {
  const steel = CYLINDERS.find((c) => c.material === 'steel')!;
  const aluminum = CYLINDERS.find((c) => c.material === 'aluminum')!;

  it('принимает ρ в окне 10%', () => {
    expect(isInFipiInterval(7800, steel)).toBe(true);
    expect(isInFipiInterval(7200, steel)).toBe(true);
    expect(isInFipiInterval(8500, steel)).toBe(true);
  });

  it('отвергает ρ вне окна', () => {
    expect(isInFipiInterval(6900, steel)).toBe(false);
    expect(isInFipiInterval(8800, steel)).toBe(false);
  });

  it('принимает алюминий в его окне', () => {
    expect(isInFipiInterval(2800, aluminum)).toBe(true);
    expect(isInFipiInterval(2600, aluminum)).toBe(true);
  });

  it('отвергает невалидные входы', () => {
    expect(isInFipiInterval(0, steel)).toBe(false);
    expect(isInFipiInterval(-100, steel)).toBe(false);
    expect(isInFipiInterval(NaN, steel)).toBe(false);
  });
});
