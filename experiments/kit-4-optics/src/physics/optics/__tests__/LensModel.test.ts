import { describe, expect, it } from 'vitest';
import {
  guard,
  imageDistance,
  magnification,
  focalFromDistances,
  opticalPower,
  combinedPower,
  combinedFocal,
  imageProperties,
  objectZone,
  zoneLabelRu,
} from '../LensModel';
import { IMAGE_PROPERTIES_SPEC } from '@labosfera/shared-spa/lib/journal/specs';

// ---------------------------------------------------------------------------
// guard
// ---------------------------------------------------------------------------
describe('guard — бросает RangeError на non-finite', () => {
  it('не бросает на конечных числах', () => {
    expect(() => guard(100, 200, 0.001)).not.toThrow();
  });
  it('бросает на NaN', () => {
    expect(() => guard(100, NaN)).toThrow(RangeError);
  });
  it('бросает на Infinity', () => {
    expect(() => guard(Infinity)).toThrow(RangeError);
  });
  it('бросает на -Infinity', () => {
    expect(() => guard(-Infinity, 100)).toThrow(RangeError);
  });
  it('бросает если хотя бы один невалидный', () => {
    expect(() => guard(100, 200, NaN)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// imageDistance  f = d·F/(d−F)
// ---------------------------------------------------------------------------
describe('imageDistance f = d·F/(d − F)', () => {
  it('d=2F → f=2F (предмет в двойном фокусе)', () => {
    expect(imageDistance(100, 200)).toBeCloseTo(200, 6);
  });
  it('d=150 F=100 → f=300 (F<d<2F: действительное, увеличенное)', () => {
    expect(imageDistance(100, 150)).toBeCloseTo(300, 6);
  });
  it('d=300 F=100 → f=150 (d>2F: действительное, уменьшенное)', () => {
    expect(imageDistance(100, 300)).toBeCloseTo(150, 6);
  });
  it('d<F → f<0 (мнимое изображение): d=50, F=100 → f=-100', () => {
    expect(imageDistance(100, 50)).toBeCloseTo(-100, 6);
  });
  it('d=F → f = Infinity (∞)', () => {
    expect(imageDistance(100, 100)).toBe(Infinity);
  });
  it('d=F=50 → f = Infinity', () => {
    expect(imageDistance(50, 50)).toBe(Infinity);
  });
  it('бросает на non-finite аргументах', () => {
    expect(() => imageDistance(NaN, 200)).toThrow(RangeError);
    expect(() => imageDistance(100, NaN)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// magnification  Γ = −f/d
// ---------------------------------------------------------------------------
describe('magnification Γ = −f/d', () => {
  it('d=2F=200 → Γ = −1 (равные размеры, перевёрнутое)', () => {
    expect(magnification(100, 200)).toBeCloseTo(-1, 6);
  });
  it('d=150, F=100 → Γ < −1 (увеличенное, перевёрнутое)', () => {
    expect(magnification(100, 150)).toBeLessThan(-1);
  });
  it('d=300, F=100 → −1 < Γ < 0 (уменьшенное, перевёрнутое)', () => {
    const g = magnification(100, 300);
    expect(g).toBeGreaterThan(-1);
    expect(g).toBeLessThan(0);
  });
  it('d<F → Γ > 1 (мнимое прямое увеличенное): d=50, F=100 → Γ=2', () => {
    expect(magnification(100, 50)).toBeCloseTo(2, 6);
  });
  it('d=F → Γ = ±Infinity', () => {
    expect(Math.abs(magnification(100, 100))).toBe(Infinity);
  });
  it('бросает на non-finite', () => {
    expect(() => magnification(NaN, 200)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// focalFromDistances  F = d·f/(d+f)
// ---------------------------------------------------------------------------
describe('focalFromDistances F = d·f/(d + f)', () => {
  it('d=200, f=200 → F=100', () => {
    expect(focalFromDistances(200, 200)).toBeCloseTo(100, 6);
  });
  it('d=150, f=300 → F=100', () => {
    expect(focalFromDistances(150, 300)).toBeCloseTo(100, 6);
  });
  it('d=300, f=150 → F=100', () => {
    expect(focalFromDistances(300, 150)).toBeCloseTo(100, 6);
  });
  it('round-trip: focalFromDistances(d, imageDistance(F,d)) ≈ F для d≠F', () => {
    for (const [F, d] of [[100, 200], [100, 300], [50, 150], [75, 100]]) {
      const f = imageDistance(F!, d!);
      if (Number.isFinite(f)) {
        expect(focalFromDistances(d!, f)).toBeCloseTo(F!, 5);
      }
    }
  });
  it('бросает на non-finite', () => {
    expect(() => focalFromDistances(NaN, 200)).toThrow(RangeError);
    expect(() => focalFromDistances(200, Infinity)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// opticalPower  D = 1/F_m  [дптр] — аргумент в МЕТРАХ
// ---------------------------------------------------------------------------
describe('opticalPower D = 1/F_m [дптр]', () => {
  it('F=0,1 м (100 мм) → D = +10 дптр', () => {
    expect(opticalPower(0.1)).toBeCloseTo(10, 6);
  });
  it('F=0,05 м (50 мм) → D = +20 дптр', () => {
    expect(opticalPower(0.05)).toBeCloseTo(20, 6);
  });
  it('F=−0,075 м (−75 мм) → D ≈ −13,33 дптр', () => {
    expect(opticalPower(-0.075)).toBeCloseTo(-13.333333, 4);
  });
  it('монотонно убывает: бо́льший F_m → меньший D (при F>0)', () => {
    expect(opticalPower(0.05)).toBeGreaterThan(opticalPower(0.1));
    expect(opticalPower(0.1)).toBeGreaterThan(opticalPower(0.2));
  });
  it('бросает на non-finite', () => {
    expect(() => opticalPower(NaN)).toThrow(RangeError);
    expect(() => opticalPower(Infinity)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// combinedPower  D = ΣDi
// ---------------------------------------------------------------------------
describe('combinedPower ΣD', () => {
  it('две собирающие: 10+20 = 30 дптр', () => {
    expect(combinedPower(10, 20)).toBeCloseTo(30, 6);
  });
  it('собирающая + рассеивающая: 10+(−13.33) ≈ −3.33 дптр', () => {
    expect(combinedPower(10, -13.333333)).toBeCloseTo(-3.333333, 4);
  });
  it('одна линза: passthrough', () => {
    expect(combinedPower(10)).toBeCloseTo(10, 6);
  });
  it('три линзы: 10+20+5 = 35 дптр', () => {
    expect(combinedPower(10, 20, 5)).toBeCloseTo(35, 6);
  });
  it('бросает на non-finite', () => {
    expect(() => combinedPower(10, NaN)).toThrow(RangeError);
  });
  it('бросает на пустом аргументе', () => {
    expect(() => combinedPower()).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// combinedFocal  1/F = Σ(1/Fi)
// ---------------------------------------------------------------------------
describe('combinedFocal 1/F = Σ(1/Fi)', () => {
  it('F1=100, F2=50 → F_комб ≈ 33,33 мм (две собирающие)', () => {
    expect(combinedFocal(100, 50)).toBeCloseTo(100 * 50 / (100 + 50), 5);
  });
  it('F1=100, F2=−75 → F_комб = 1/(1/100 + 1/(−75)) = −300 мм', () => {
    // соб.+рассеив.: D=+10−13.33=−3.33 дптр → F_комб=−300мм (система рассеивающая, F<0)
    expect(combinedFocal(100, -75)).toBeCloseTo(-300, 5);
  });
  it('одна линза: passthrough', () => {
    expect(combinedFocal(100)).toBeCloseTo(100, 6);
  });
  it('две одинаковые: F_комб = F/2', () => {
    expect(combinedFocal(100, 100)).toBeCloseTo(50, 6);
  });
  it('бросает на non-finite', () => {
    expect(() => combinedFocal(NaN, 100)).toThrow(RangeError);
  });
  it('бросает на пустом аргументе', () => {
    expect(() => combinedFocal()).toThrow(RangeError);
  });
  it('round-trip: combinedPower(D1,D2) ≈ opticalPower(combinedFocal(F1,F2)/1000)', () => {
    // combinedFocal in mm → /1000 to m
    const F1 = 100, F2 = 50;
    const Fcomb = combinedFocal(F1, F2); // mm
    const D1 = opticalPower(F1 / 1000);
    const D2 = opticalPower(F2 / 1000);
    expect(combinedPower(D1, D2)).toBeCloseTo(opticalPower(Fcomb / 1000), 5);
  });
});

// ---------------------------------------------------------------------------
// imageProperties
// ---------------------------------------------------------------------------
describe('imageProperties — классификация изображения', () => {
  it('d=2F → real, inverted, equal, Γ=−1', () => {
    const p = imageProperties(100, 200);
    expect(p.kind).toBe('real');
    expect(p.orientation).toBe('inverted');
    expect(p.size).toBe('equal');
    expect(p.gamma).toBeCloseTo(-1, 5);
  });
  it('d>2F (300) → real, inverted, reduced', () => {
    const p = imageProperties(100, 300);
    expect(p.kind).toBe('real');
    expect(p.orientation).toBe('inverted');
    expect(p.size).toBe('reduced');
    expect(p.gamma).toBeGreaterThan(-1);
    expect(p.gamma).toBeLessThan(0);
  });
  it('F<d<2F (150) → real, inverted, enlarged', () => {
    const p = imageProperties(100, 150);
    expect(p.kind).toBe('real');
    expect(p.orientation).toBe('inverted');
    expect(p.size).toBe('enlarged');
    expect(p.gamma).toBeLessThan(-1);
  });
  it('d<F (50) → virtual, upright, enlarged', () => {
    const p = imageProperties(100, 50);
    expect(p.kind).toBe('virtual');
    expect(p.orientation).toBe('upright');
    expect(p.size).toBe('enlarged');
    expect(p.gamma).toBeGreaterThan(1);
  });
  it('d=F → kind=virtual (f=Infinity охраняется)', () => {
    const p = imageProperties(100, 100);
    expect(p.kind).toBe('virtual');
    expect(p.gamma).toBe(Infinity);
  });
  it('d=F (изображение в бесконечности) — контракт: virtual/upright/enlarged/Γ=∞ (включая size)', () => {
    // Сознательный выбор поведения при f=∞ (см. JSDoc imageProperties). Любая правка случая d=F
    // ДОЛЖНА осознанно менять этот тест — он закрепляет ВСЕ четыре поля результата.
    for (const F of [50, 100, 250]) {
      const p = imageProperties(F, F);
      expect(p.kind).toBe('virtual');
      expect(p.orientation).toBe('upright');
      expect(p.size).toBe('enlarged');
      expect(p.gamma).toBe(Infinity);
    }
  });
  it('бросает на non-finite', () => {
    expect(() => imageProperties(NaN, 200)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// Property-based fuzzing — 12 инвариантных категорий (~50k итераций)
// NO Math.random — все значения детерминированы индексами петель
// ---------------------------------------------------------------------------
describe('property fuzzing — 12 инвариантных категорий (~50k итераций)', () => {
  const EPS = 1e-6;

  // Диапазоны:
  //   F: [10..500] шаг 5 → 99 значений
  //   d: [0.1..800] шаг 8 → 100 значений
  //   Итого 99×100 = 9900 пар за категорию; 12 кат ≈ 118 800 > 50k ✓

  function makeGrid(): Array<{ F: number; d: number }> {
    const pairs: Array<{ F: number; d: number }> = [];
    for (let iF = 0; iF < 99; iF++) {
      const F = 10 + iF * 5; // 10..500
      for (let id = 0; id < 100; id++) {
        const d = 0.1 + id * 8; // 0.1..792.1
        if (d > 0 && F > 0 && Math.abs(d - F) > 0.001) pairs.push({ F, d });
      }
    }
    return pairs;
  }
  const GRID = makeGrid();

  // Кат.1: imageDistance конечно везде кроме d≈F
  it('кат.1: imageDistance всегда конечно при d ≠ F', () => {
    for (const { F, d } of GRID) {
      const f = imageDistance(F, d);
      expect(Number.isFinite(f)).toBe(true);
    }
  });

  // Кат.2: знак f — действительное (f>0) ↔ d>F
  it('кат.2: f>0 ↔ d>F (действительное изображение)', () => {
    for (const { F, d } of GRID) {
      const f = imageDistance(F, d);
      if (d > F) expect(f).toBeGreaterThan(0);
      else expect(f).toBeLessThan(0);
    }
  });

  // Кат.3: magnification — знак Γ: <0 при d>F (перевёрнутое); >0 при d<F (прямое)
  it('кат.3: Γ<0 при d>F (перевёрнутое); Γ>0 при d<F (прямое)', () => {
    for (const { F, d } of GRID) {
      const g = magnification(F, d);
      if (!Number.isFinite(g)) continue;
      if (d > F) expect(g).toBeLessThan(0);
      else expect(g).toBeGreaterThan(0);
    }
  });

  // Кат.4: d=2F → Γ=−1, f=2F (предмет в двойном фокусе)
  it('кат.4: d=2F → f=2F и Γ=−1 для всех F∈[10..500]', () => {
    for (let iF = 0; iF < 99; iF++) {
      const F = 10 + iF * 5;
      const d = 2 * F;
      expect(imageDistance(F, d)).toBeCloseTo(d, 4);
      expect(magnification(F, d)).toBeCloseTo(-1, 5);
    }
  });

  // Кат.5: d>2F → |Γ|<1 (уменьшенное изображение)
  it('кат.5: d>2F → |Γ|<1 (уменьшенное)', () => {
    for (let iF = 0; iF < 50; iF++) {
      const F = 10 + iF * 5;
      for (let id = 1; id <= 50; id++) {
        const d = 2 * F + id * 5;
        const g = magnification(F, d);
        expect(Math.abs(g)).toBeLessThan(1 + EPS);
      }
    }
  });

  // Кат.6: F<d<2F → |Γ|>1 (увеличенное изображение) и f>0 (действительное)
  it('кат.6: F<d<2F → |Γ|>1 (увеличенное) и f>0 (действительное)', () => {
    for (let iF = 0; iF < 50; iF++) {
      const F = 20 + iF * 5; // F=20..265
      for (let id = 1; id <= 50; id++) {
        const d = F + id * (F / 60); // F < d < 2F
        if (d >= 2 * F) continue;
        const g = magnification(F, d);
        const f = imageDistance(F, d);
        expect(Math.abs(g)).toBeGreaterThan(1 - EPS);
        expect(f).toBeGreaterThan(0);
      }
    }
  });

  // Кат.7: d<F → мнимое прямое увеличенное (f<0, Γ>1)
  it('кат.7: d<F → f<0 (мнимое) и Γ>1 (прямое увеличенное)', () => {
    for (let iF = 0; iF < 50; iF++) {
      const F = 50 + iF * 5; // F=50..295
      for (let id = 1; id <= 50; id++) {
        const d = id * (F / 60); // 0 < d < F
        if (d <= 0 || d >= F) continue;
        const f = imageDistance(F, d);
        const g = magnification(F, d);
        expect(f).toBeLessThan(0);
        expect(g).toBeGreaterThan(1 - EPS);
      }
    }
  });

  // Кат.8: round-trip focalFromDistances(d, imageDistance(F,d)) ≈ F для d>F
  it('кат.8: round-trip focalFromDistances(d, imageDistance(F,d)) ≈ F при d>F', () => {
    for (let iF = 0; iF < 50; iF++) {
      const F = 10 + iF * 5; // 10..255
      for (let id = 1; id <= 50; id++) {
        const d = F + id * 5; // d > F
        const f = imageDistance(F, d);
        if (!Number.isFinite(f)) continue;
        expect(focalFromDistances(d, f)).toBeCloseTo(F, 4);
      }
    }
  });

  // Кат.9: opticalPower монотонно убывает при росте F>0 (D=1/F)
  it('кат.9: opticalPower монотонно убывает при F_m > 0', () => {
    for (let iF = 0; iF < 99; iF++) {
      const F1_m = (10 + iF * 5) / 1000;
      const F2_m = (10 + (iF + 1) * 5) / 1000;
      expect(opticalPower(F1_m)).toBeGreaterThan(opticalPower(F2_m));
    }
  });

  // Кат.10: combinedPower(D1,D2) = D1+D2 (прямое тождество)
  it('кат.10: combinedPower(D1,D2) = D1+D2 для всех пар дптр', () => {
    for (let i = 0; i < 100; i++) {
      const D1 = -20 + i * 0.5; // −20..29.5
      for (let j = 0; j < 100; j++) {
        const D2 = -10 + j * 0.3; // −10..19.7
        expect(combinedPower(D1, D2)).toBeCloseTo(D1 + D2, 9);
      }
    }
  });

  // Кат.11: combinedFocal — обратная сумма обратных, согласована с combinedPower
  it('кат.11: combinedFocal согласован с combinedPower через opticalPower', () => {
    for (let iF = 1; iF < 50; iF++) {
      const F1 = 10 + iF * 5;  // мм
      for (let jF = 1; jF < 50; jF++) {
        const F2 = 10 + jF * 5; // мм
        const Fcomb_mm = combinedFocal(F1, F2);
        const Dcomb_direct = combinedPower(opticalPower(F1 / 1000), opticalPower(F2 / 1000));
        expect(opticalPower(Fcomb_mm / 1000)).toBeCloseTo(Dcomb_direct, 5);
      }
    }
  });

  // Кат.12: imageProperties классификация согласована с imageDistance и magnification
  it('кат.12: imageProperties согласован с imageDistance и magnification', () => {
    for (const { F, d } of GRID.slice(0, 2000)) {
      const p = imageProperties(F, d);
      const f = imageDistance(F, d);
      const g = magnification(F, d);
      if (!Number.isFinite(f) || !Number.isFinite(g)) {
        expect(p.kind).toBe('virtual');
        continue;
      }
      // kind: f>0 → real, f<0 → virtual
      expect(p.kind).toBe(f > 0 ? 'real' : 'virtual');
      // orientation: g<0 → inverted, g>0 → upright
      expect(p.orientation).toBe(g < 0 ? 'inverted' : 'upright');
      // gamma agrees
      expect(p.gamma).toBeCloseTo(g, 5);
      // size: |g|>1+ε → enlarged; |g|<1−ε → reduced; else equal
      const absG = Math.abs(g);
      if (absG > 1 + 0.001) expect(p.size).toBe('enlarged');
      else if (absG < 1 - 0.001) expect(p.size).toBe('reduced');
      else expect(p.size).toBe('equal');
    }
  });
});

// ---------------------------------------------------------------------------
// objectZone (зона по положению предмета относительно F и 2F)
// ---------------------------------------------------------------------------
describe('objectZone (зона по положению предмета относительно F и 2F)', () => {
  const F = 100;
  it('d > 2F → gt2F (уменьшенное действительное)', () => {
    expect(objectZone(F, 300)).toBe('gt2F');
  });
  it('d = 2F → eq2F (равное)', () => {
    expect(objectZone(F, 200)).toBe('eq2F');
  });
  it('F < d < 2F → F_2F (увеличенное действительное)', () => {
    expect(objectZone(F, 150)).toBe('F_2F');
  });
  it('d = F → eqF (изображение в бесконечности)', () => {
    expect(objectZone(F, 100)).toBe('eqF');
  });
  it('d < F → ltF (мнимое прямое увеличенное)', () => {
    expect(objectZone(F, 60)).toBe('ltF');
  });
  it('zoneLabelRu — человекочитаемые подписи', () => {
    expect(zoneLabelRu('gt2F')).toBe('d > 2F');
    expect(zoneLabelRu('eq2F')).toBe('d = 2F');
    expect(zoneLabelRu('F_2F')).toBe('F < d < 2F');
    expect(zoneLabelRu('eqF')).toBe('d = F');
    expect(zoneLabelRu('ltF')).toBe('d < F');
  });

  // Кросс-чек: зона СОГЛАСОВАНА с imageProperties (нулевой трап рассинхрона).
  it('фаззинг: objectZone бийективен с imageProperties.{kind,size} (50k)', () => {
    for (let i = 0; i < 50000; i++) {
      const Ff = 30 + (i % 170);            // 30..199 мм
      const d = 10 + ((i * 7) % 400);       // 10..409 мм
      if (d === Ff) continue;               // вырожденную d=F проверяем отдельно
      const p = imageProperties(Ff, d);
      const z = objectZone(Ff, d);
      if (p.kind === 'virtual' && Number.isFinite(p.gamma)) {
        expect(z).toBe('ltF');
      } else if (p.kind === 'real') {
        if (p.size === 'reduced') expect(z).toBe('gt2F');
        else if (p.size === 'equal') expect(z).toBe('eq2F');
        else expect(z).toBe('F_2F');
      }
    }
  });
});

describe('IMAGE_PROPERTIES_SPEC инлайн ↔ LensModel.imageProperties (кросс-чек)', () => {
  const col = (k: string) => IMAGE_PROPERTIES_SPEC.columns.find((c) => c.key === k)!;
  it('фаззинг 50k: choice-эталоны спеки == imageProperties.{kind,orientation,size}', () => {
    for (let i = 0; i < 50000; i++) {
      const F = 30 + (i % 170);          // 30..199
      const d = 10 + ((i * 7) % 400);    // 10..409
      if (Math.abs(d - F) < 1e-9) continue;
      const ctx = { d_mm: d, F_mm: F };
      const p = imageProperties(F, d);
      expect(col('kind').expectedChoiceFromRow!(ctx)).toBe(p.kind);
      expect(col('orientation').expectedChoiceFromRow!(ctx)).toBe(p.orientation);
      expect(col('size').expectedChoiceFromRow!(ctx)).toBe(p.size);
    }
  });
});
