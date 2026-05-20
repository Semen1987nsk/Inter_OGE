import { describe, expect, it } from 'vitest';
import {
  CYL3_CROSS_SECTION_CM2,
  CYL3_FULL_VOLUME_CM3,
  CYL3_MASS_G,
  CYL3_SCALE_LENGTH_MM,
  CYL3_VOLUME_PER_MM_CM3,
  REFERENCE_LEVELS_MM,
  deltaPercent,
  measuredBuoyancyN,
  referenceTable,
  submergedVolumeCm3,
  theoreticalBuoyancyN,
  weightInAirN,
} from '../ArchimedesVolumeCalc';

describe('weightInAirN', () => {
  it('для цилиндра №3 (66 г) даёт ~0.647 Н', () => {
    const W = weightInAirN(CYL3_MASS_G);
    expect(W).toBeCloseTo(0.647, 3);
  });

  it('линейная функция от массы', () => {
    expect(weightInAirN(100)).toBeCloseTo(0.98, 3);
    expect(weightInAirN(200)).toBeCloseTo(1.96, 3);
  });

  it('по умолчанию использует CYL3_MASS_G', () => {
    expect(weightInAirN()).toBeCloseTo(weightInAirN(CYL3_MASS_G), 10);
  });
});

describe('submergedVolumeCm3', () => {
  it('h=0 → V=0', () => {
    expect(submergedVolumeCm3(0)).toBe(0);
  });

  it('эталонные уровни ФИПИ: h=20/40/60 → V=14/28/42 см³ (методичка §2.3.3)', () => {
    expect(submergedVolumeCm3(20)).toBeCloseTo(14, 6);
    expect(submergedVolumeCm3(40)).toBeCloseTo(28, 6);
    expect(submergedVolumeCm3(60)).toBeCloseTo(42, 6);
  });

  it('h=80 (полная длина шкалы) → V = 56 см³ (совпадает с ФИПИ-паспортом)', () => {
    // V = 80 мм × 0.7 см³/мм = 56 см³ = CYL3_FULL_VOLUME_CM3.
    expect(submergedVolumeCm3(CYL3_SCALE_LENGTH_MM)).toBeCloseTo(56, 6);
    expect(submergedVolumeCm3(CYL3_SCALE_LENGTH_MM)).toBeCloseTo(CYL3_FULL_VOLUME_CM3, 6);
  });

  it('клиппинг отрицательных значений в 0', () => {
    expect(submergedVolumeCm3(-10)).toBe(0);
    expect(submergedVolumeCm3(-Infinity)).toBe(0);
  });

  it('клиппинг превышения длины шкалы', () => {
    expect(submergedVolumeCm3(100)).toBe(submergedVolumeCm3(CYL3_SCALE_LENGTH_MM));
    expect(submergedVolumeCm3(1000)).toBe(submergedVolumeCm3(CYL3_SCALE_LENGTH_MM));
  });

  it('NaN/Infinity безопасны', () => {
    expect(submergedVolumeCm3(NaN)).toBe(0);
    // Infinity клиппится в CYL3_SCALE_LENGTH_MM ⇒ V полное.
    expect(submergedVolumeCm3(Infinity)).toBe(submergedVolumeCm3(CYL3_SCALE_LENGTH_MM));
    expect(submergedVolumeCm3(-Infinity)).toBe(0);
  });

  it('линейность: V(2h) = 2·V(h)', () => {
    for (const h of [10, 20, 30]) {
      expect(submergedVolumeCm3(2 * h)).toBeCloseTo(2 * submergedVolumeCm3(h), 6);
    }
  });
});

describe('theoreticalBuoyancyN', () => {
  it('эталоны ФИПИ при h=20/40/60: F_А_теор ≈ 0.137 / 0.274 / 0.412 Н', () => {
    // ρgV = 1000 × 9.8 × 14e-6 = 0.1372
    expect(theoreticalBuoyancyN(20)).toBeCloseTo(0.1372, 4);
    expect(theoreticalBuoyancyN(40)).toBeCloseTo(0.2744, 4);
    expect(theoreticalBuoyancyN(60)).toBeCloseTo(0.4116, 4);
  });

  it('h=0 → F=0', () => {
    expect(theoreticalBuoyancyN(0)).toBe(0);
  });

  it('линейность по h (V ∝ h ⇒ F ∝ h) — ключевое ФИПИ-открытие', () => {
    const F20 = theoreticalBuoyancyN(20);
    const F40 = theoreticalBuoyancyN(40);
    const F60 = theoreticalBuoyancyN(60);
    expect(F40 / F20).toBeCloseTo(2, 6);
    expect(F60 / F20).toBeCloseTo(3, 6);
  });

  it('зависимость от ρ_жидкости (для будущей 1.4): соляной 1100 ⇒ F·1.1', () => {
    const Fwater = theoreticalBuoyancyN(40, 1000);
    const Fsalt = theoreticalBuoyancyN(40, 1100);
    expect(Fsalt / Fwater).toBeCloseTo(1.1, 6);
  });
});

describe('measuredBuoyancyN', () => {
  it('P_возд − P_изм', () => {
    expect(measuredBuoyancyN(0.65, 0.51)).toBeCloseTo(0.14, 6);
    expect(measuredBuoyancyN(0.65, 0.37)).toBeCloseTo(0.28, 6);
  });

  it('допускает отрицательные значения (диагностика битых данных)', () => {
    expect(measuredBuoyancyN(0.3, 0.5)).toBeCloseTo(-0.2, 6);
  });
});

describe('deltaPercent', () => {
  it('идеальное совпадение → 0%', () => {
    const h = 40;
    const Pair = weightInAirN();
    const Fa = theoreticalBuoyancyN(h);
    const Pliq = Pair - Fa;
    expect(deltaPercent(Pair, Pliq, h)).toBeCloseTo(0, 4);
  });

  it('занижение F_изм на 10% → -10%', () => {
    const h = 40;
    const Pair = weightInAirN();
    const Ftrue = theoreticalBuoyancyN(h);
    const Fmeas = Ftrue * 0.9;
    expect(deltaPercent(Pair, Pair - Fmeas, h)).toBeCloseTo(-10, 4);
  });

  it('h=0 (нет погружения) → 0% (защита от 0/0)', () => {
    expect(deltaPercent(0.65, 0.65, 0)).toBe(0);
  });
});

describe('referenceTable (ФИПИ-инвариант)', () => {
  it('возвращает 3 точки по эталонным h', () => {
    const table = referenceTable();
    expect(table).toHaveLength(3);
    expect(table.map((p) => p.h_mm)).toEqual([...REFERENCE_LEVELS_MM]);
  });

  it('каждая точка имеет корректные V_cm3 и F_A_N', () => {
    const table = referenceTable();
    for (const point of table) {
      expect(point.V_cm3).toBeCloseTo(point.h_mm * CYL3_VOLUME_PER_MM_CM3, 6);
      expect(point.F_A_N).toBeCloseTo(1000 * 9.8 * point.V_cm3 * 1e-6, 6);
    }
  });

  it('последовательные точки — линейный рост F_A (ключевой ФИПИ-вывод)', () => {
    const [p1, p2, p3] = referenceTable();
    // F_A1 : F_A2 : F_A3 = 1 : 2 : 3
    expect(p2!.F_A_N / p1!.F_A_N).toBeCloseTo(2, 4);
    expect(p3!.F_A_N / p1!.F_A_N).toBeCloseTo(3, 4);
  });
});

describe('константы цилиндра №3 (ФИПИ Прил. 2 паспорт)', () => {
  it('CYL3_FULL_VOLUME_CM3 = 56 (паспорт)', () => {
    expect(CYL3_FULL_VOLUME_CM3).toBe(56);
  });

  it('CYL3_MASS_G = 66 (паспорт)', () => {
    expect(CYL3_MASS_G).toBe(66);
  });

  it('CYL3_CROSS_SECTION_CM2 = 7 (S=V/L = 56 см³ / 8 см)', () => {
    expect(CYL3_CROSS_SECTION_CM2).toBe(7);
  });

  it('CYL3_VOLUME_PER_MM_CM3 = 0.7 — коэффициент V_см³/h_мм', () => {
    expect(CYL3_VOLUME_PER_MM_CM3).toBe(0.7);
    // Согласованность с CYL3_CROSS_SECTION_CM2:
    // S × 1мм = 7 см² × 0.1 см = 0.7 см³.
    expect(CYL3_VOLUME_PER_MM_CM3).toBeCloseTo(CYL3_CROSS_SECTION_CM2 * 0.1, 10);
  });

  it('CYL3_SCALE_LENGTH_MM = 80 (ФИПИ паспорт «длина не менее 80 мм»)', () => {
    expect(CYL3_SCALE_LENGTH_MM).toBe(80);
  });

  it('самосогласованность: V_полн = L × V_per_mm', () => {
    expect(CYL3_SCALE_LENGTH_MM * CYL3_VOLUME_PER_MM_CM3).toBeCloseTo(CYL3_FULL_VOLUME_CM3, 6);
  });
});
