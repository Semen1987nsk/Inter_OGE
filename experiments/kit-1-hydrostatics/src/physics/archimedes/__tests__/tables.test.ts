/**
 * tables — проверка соответствия табличных данных ФИПИ-СПЕЦ-2026 (Прил. 2).
 * Любая правка чисел в tables.ts должна провалить эти тесты.
 */

import { describe, expect, it } from 'vitest';
import {
  ARCHIMEDES_CYLINDERS,
  ARCHIMEDES_CYLINDER_BY_ID,
  LIQUIDS,
  type ArchimedesCylinderId,
  type ArchimedesCylinderMaterial,
} from '../tables';

describe('ARCHIMEDES_CYLINDERS — состав комплекта', () => {
  it('ровно 4 цилиндра — №1..№4', () => {
    expect(ARCHIMEDES_CYLINDERS).toHaveLength(4);
    const ids = ARCHIMEDES_CYLINDERS.map((c) => c.id).sort();
    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it('id уникальны', () => {
    const set = new Set(ARCHIMEDES_CYLINDERS.map((c) => c.id));
    expect(set.size).toBe(ARCHIMEDES_CYLINDERS.length);
  });

  it('материалы только из {steel, aluminum, plastic}', () => {
    const allowed: ArchimedesCylinderMaterial[] = ['steel', 'aluminum', 'plastic'];
    for (const cyl of ARCHIMEDES_CYLINDERS) {
      expect(allowed).toContain(cyl.material);
    }
  });
});

describe('номиналы — дословно из ФИПИ-СПЕЦ-2026, Прил. 2', () => {
  const expected: Array<{
    id: ArchimedesCylinderId;
    material: ArchimedesCylinderMaterial;
    V_cm3: number;
    V_tolerance_cm3: number;
    m_g: number;
    m_tolerance_g: number;
  }> = [
    { id: 1, material: 'steel', V_cm3: 25.0, V_tolerance_cm3: 0.3, m_g: 195, m_tolerance_g: 2 },
    { id: 2, material: 'aluminum', V_cm3: 25.0, V_tolerance_cm3: 0.7, m_g: 70, m_tolerance_g: 2 },
    { id: 3, material: 'plastic', V_cm3: 56.0, V_tolerance_cm3: 1.8, m_g: 66, m_tolerance_g: 2 },
    { id: 4, material: 'aluminum', V_cm3: 34.0, V_tolerance_cm3: 0.7, m_g: 95, m_tolerance_g: 2 },
  ];

  for (const exp of expected) {
    it(`цилиндр №${exp.id} (${exp.material}): V=${exp.V_cm3}±${exp.V_tolerance_cm3} см³, m=${exp.m_g}±${exp.m_tolerance_g} г`, () => {
      const cyl = ARCHIMEDES_CYLINDER_BY_ID.get(exp.id);
      expect(cyl).toBeDefined();
      expect(cyl!.material).toBe(exp.material);
      expect(cyl!.V_cm3).toBe(exp.V_cm3);
      expect(cyl!.V_tolerance_cm3).toBe(exp.V_tolerance_cm3);
      expect(cyl!.m_g).toBe(exp.m_g);
      expect(cyl!.m_tolerance_g).toBe(exp.m_tolerance_g);
    });
  }
});

describe('значения в физически разумных коридорах', () => {
  it('все объёмы > 0, в коридоре 1..1000 см³', () => {
    for (const cyl of ARCHIMEDES_CYLINDERS) {
      expect(cyl.V_cm3).toBeGreaterThan(0);
      expect(cyl.V_cm3).toBeLessThanOrEqual(1000);
    }
  });

  it('все массы > 0, в коридоре 1..1000 г', () => {
    for (const cyl of ARCHIMEDES_CYLINDERS) {
      expect(cyl.m_g).toBeGreaterThan(0);
      expect(cyl.m_g).toBeLessThanOrEqual(1000);
    }
  });

  it('толерансы неотрицательны и < 10% номинала', () => {
    for (const cyl of ARCHIMEDES_CYLINDERS) {
      expect(cyl.V_tolerance_cm3).toBeGreaterThanOrEqual(0);
      expect(cyl.m_tolerance_g).toBeGreaterThanOrEqual(0);
      expect(cyl.V_tolerance_cm3 / cyl.V_cm3).toBeLessThan(0.1);
      expect(cyl.m_tolerance_g / cyl.m_g).toBeLessThan(0.1);
    }
  });

  it('расчётные плотности в школьных коридорах (сталь ~7.8, алюм ~2.7-2.8, пластик ~1.0-1.4)', () => {
    const ranges: Record<ArchimedesCylinderMaterial, [number, number]> = {
      steel: [7.0, 8.5],
      aluminum: [2.5, 3.0],
      plastic: [0.9, 1.5],
    };
    for (const cyl of ARCHIMEDES_CYLINDERS) {
      const rho = cyl.m_g / cyl.V_cm3;
      const [lo, hi] = ranges[cyl.material];
      expect(rho).toBeGreaterThanOrEqual(lo);
      expect(rho).toBeLessThanOrEqual(hi);
    }
  });
});

describe('ARCHIMEDES_CYLINDER_BY_ID — карта быстрого доступа', () => {
  it('содержит все 4 id', () => {
    expect(ARCHIMEDES_CYLINDER_BY_ID.size).toBe(4);
    for (const id of [1, 2, 3, 4] as const) {
      expect(ARCHIMEDES_CYLINDER_BY_ID.has(id)).toBe(true);
    }
  });

  it('значения из карты ссылаются на те же объекты, что в массиве', () => {
    for (const cyl of ARCHIMEDES_CYLINDERS) {
      expect(ARCHIMEDES_CYLINDER_BY_ID.get(cyl.id)).toBe(cyl);
    }
  });
});

describe('LIQUIDS — жидкости опыта 1.2', () => {
  it('содержит только воду', () => {
    expect(Object.keys(LIQUIDS)).toEqual(['water']);
  });

  it('вода: id=water, ρ=1000 кг/м³', () => {
    expect(LIQUIDS.water.id).toBe('water');
    expect(LIQUIDS.water.rho_kg_m3).toBe(1000);
    expect(LIQUIDS.water.name).toBe('Вода');
  });
});
