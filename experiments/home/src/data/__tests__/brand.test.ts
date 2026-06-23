import { describe, it, expect } from 'vitest';
import { BRAND } from '../brand';

describe('BRAND', () => {
  it('содержит новое продуктовое имя без «виртуальная лаборатория»', () => {
    expect(BRAND.productFull).toBe('Комплект виртуального оборудования для ОГЭ по физике');
    expect(BRAND.company).toBe('ЛАБОСФЕРА');
    expect(BRAND.productShort).toBe('Виртуальное оборудование · ОГЭ Физика');
    expect(BRAND.productFull.toLowerCase()).not.toContain('виртуальная лаборатория');
  });
});
