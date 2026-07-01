import { describe, it, expect } from 'vitest';
import { guard, refractionAngle, refractiveIndex } from '../RefractionModel';

const near = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe('refractionAngle (Снелл воздух→стекло, n=1.5)', () => {
  it('i=0 → r=0 (нормальное падение не преломляется)', () => near(refractionAngle(0, 1, 1.5), 0));
  it('i=30 → r≈19.471°', () => near(refractionAngle(30, 1, 1.5), 19.47122, 1e-4));
  it('i=45 → r≈28.126°', () => near(refractionAngle(45, 1, 1.5), 28.12551, 1e-4));
  it('i=60 → r≈35.264°', () => near(refractionAngle(60, 1, 1.5), 35.26439, 1e-4));
  it('r<i при i>0 для n2>n1 (преломление к нормали)', () => {
    for (let i = 1; i <= 85; i++) expect(refractionAngle(i, 1, 1.5)).toBeLessThan(i);
  });
  it('монотонность: i растёт → r растёт', () => {
    for (let i = 1; i <= 84; i++) {
      expect(refractionAngle(i + 1, 1, 1.5)).toBeGreaterThan(refractionAngle(i, 1, 1.5));
    }
  });
  it('ограничение сверху: r ≤ asin(1/1.5)=41.81° для всех i', () => {
    for (let i = 0; i <= 89; i++) expect(refractionAngle(i, 1, 1.5)).toBeLessThanOrEqual(41.811);
  });
});

describe('refractiveIndex (обратная задача)', () => {
  it('n = sin i / sin r', () => near(refractiveIndex(45, 28.12551), 1.5, 1e-4));
  it('взаимная обратность refractionAngle↔refractiveIndex (фаззинг)', () => {
    for (let ni = 12; ni <= 20; ni++) {          // n 1.2..2.0
      const n = ni / 10;
      for (let i = 1; i <= 85; i++) {
        const r = refractionAngle(i, 1, n);
        near(refractiveIndex(i, r), n, 1e-6);
      }
    }
  });
});

describe('guard / домен', () => {
  it('guard бросает на non-finite', () => {
    expect(() => guard(NaN)).toThrow(RangeError);
    expect(() => guard(1, Infinity)).toThrow(RangeError);
    expect(() => guard(1, 2, 3)).not.toThrow();
  });
  it('refractionAngle бросает при ПВО/вне домена (sin r>1)', () => {
    // стекло→воздух при большом i: n1=1.5,n2=1,i=60 → sin r=1.299>1
    expect(() => refractionAngle(60, 1.5, 1)).toThrow(RangeError);
  });
  it('refractiveIndex бросает при sin r≈0', () => {
    expect(() => refractiveIndex(30, 0)).toThrow(RangeError);
  });
  it('refractionAngle бросает на non-finite аргумент', () => {
    expect(() => refractionAngle(NaN, 1, 1.5)).toThrow(RangeError);
  });
});

// mustFix M5 — фаззинг ≥12 категорий / ≥50k итераций (образец LensModel.test.ts «12 инвариантов»).
describe('property fuzzing — ≥12 инвариантных категорий / ≥50k итераций', () => {
  const toDeg = (rad: number) => rad / (Math.PI / 180);
  it('инварианты на сетке i×n (≥50k итераций)', () => {
    let iters = 0;
    // сетка: i 0..85 (86) × n 1.00..2.00 шаг 0.01 (101) = 8686 базовых точек × 6 проверок ≈ 52k
    for (let iDeg = 0; iDeg <= 85; iDeg++) {
      for (let nk = 100; nk <= 200; nk++) {
        const n = nk / 100;
        if (iDeg === 0) near(refractionAngle(0, 1, n), 0);          // (1) i=0 → r=0
        const r = refractionAngle(iDeg, 1, n);
        expect(Number.isFinite(r)).toBe(true);                      // (2) r конечен
        expect(r).toBeGreaterThanOrEqual(0);                        // (3) r≥0
        expect(r).toBeLessThanOrEqual(iDeg + 1e-9);                 // (4) r≤i при n>1 (к нормали)
        expect(r).toBeLessThanOrEqual(toDeg(Math.asin(1 / n)) + 1e-6); // (5) r≤asin(1/n)
        if (iDeg > 0) near(refractiveIndex(iDeg, r), n, 1e-6);      // (6) round-trip
        iters += 6;
      }
    }
    for (let nk = 100; nk <= 200; nk += 5) {                        // (7) монотонность r(i)
      const n = nk / 100;
      for (let iDeg = 0; iDeg < 85; iDeg++) {
        expect(refractionAngle(iDeg + 1, 1, n)).toBeGreaterThan(refractionAngle(iDeg, 1, n));
        iters++;
      }
    }
    for (let iDeg = 1; iDeg <= 80; iDeg++) {                        // (8) обратимость хода: r,n,1 → i
      for (let nk = 105; nk <= 200; nk += 5) {
        const n = nk / 100;
        near(refractionAngle(refractionAngle(iDeg, 1, n), n, 1), iDeg, 1e-6);
        iters++;
      }
    }
    for (let iDeg = 45; iDeg <= 85; iDeg += 5) {                    // (9) ПВО стекло→воздух
      if (iDeg > toDeg(Math.asin(1 / 1.5))) expect(() => refractionAngle(iDeg, 1.5, 1)).toThrow(RangeError);
      iters++;
    }
    for (let iDeg = 1; iDeg <= 85; iDeg++) {                        // (10) n=sin i/sin r; (11) n>1; (12) детерминизм
      const r = refractionAngle(iDeg, 1, 1.5);
      near(Math.sin(iDeg * Math.PI / 180) / Math.sin(r * Math.PI / 180), 1.5, 1e-9);
      expect(refractiveIndex(iDeg, r)).toBeGreaterThan(1);
      expect(refractionAngle(iDeg, 1, 1.5)).toBe(r);
      iters += 3;
    }
    expect(iters).toBeGreaterThanOrEqual(50000);
  });
});
