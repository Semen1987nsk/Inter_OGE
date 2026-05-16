/**
 * lab-beaker — тесты геометрического API getWaterSurfaceY / getWaterColumnHeightPx.
 *
 * Контракт API: позиции в **viewport-space** (DOM px от верха окна), как у
 * lab-dynamometer/lab-metal-weight. Используется оркестратором ArchimedesExperiment
 * для расчёта `submersionFraction` цилиндра во время плавного drag-by-thread:
 *   depth = max(0, cyl_bottom_y - water_surface_y)
 *   effective_depth = min(depth, water_column_height_px)
 *   frac = clamp(0..1, effective_depth / cyl_height_px)
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

beforeAll(async () => {
  await import('../ui/components/lab-beaker');
});

afterEach(() => {
  document.body.innerHTML = '';
});

interface BeakerLike extends HTMLElement {
  getWaterSurfaceY(): number;
  getWaterBottomY(): number;
  getWaterColumnHeightPx(): number;
}

function mockRect(el: HTMLElement, top: number, height: number, width = 96): void {
  el.getBoundingClientRect = () =>
    ({
      x: 0,
      y: top,
      left: 0,
      top,
      right: width,
      bottom: top + height,
      width,
      height,
      toJSON: () => ({}),
    }) as DOMRect;
}

function mountBeaker(level = 0): BeakerLike {
  const el = document.createElement('lab-beaker') as BeakerLike;
  el.setAttribute('level', String(level));
  document.body.appendChild(el);
  return el;
}

describe('lab-beaker — geometry API для submersionFraction', () => {
  it('пустой стакан (level=0): water_surface_y = water_bottom_y (нет воды)', () => {
    const el = mountBeaker(0);
    mockRect(el, 100, 130); // viewBox высота 130 → scaleY=1
    const surface = el.getWaterSurfaceY();
    const bottom = el.getWaterBottomY();
    expect(surface).toBeCloseTo(bottom, 4);
    expect(el.getWaterColumnHeightPx()).toBeCloseTo(0, 4);
  });

  it('полстакана (level=125 мл): поверхность по середине столба', () => {
    const el = mountBeaker(125);
    mockRect(el, 100, 130);
    // Y_AT_0=116, Y_AT_FULL=30 → ΔY=86 для 250 мл; 125 мл → ΔY=43 → y=73.
    const surface = el.getWaterSurfaceY();
    expect(surface).toBeCloseTo(100 + 73, 1);
    const column = el.getWaterColumnHeightPx();
    // bottom y = 100 + 116 = 216; height = 216 - 173 = 43.
    expect(column).toBeCloseTo(43, 1);
  });

  it('полный стакан (level=250 мл): водный столб ≈ 86 px (Y_AT_0 - Y_AT_FULL)', () => {
    const el = mountBeaker(250);
    mockRect(el, 100, 130);
    const column = el.getWaterColumnHeightPx();
    expect(column).toBeCloseTo(86, 0);
  });

  it('water_bottom_y инвариантен от level (дно не двигается)', () => {
    const empty = mountBeaker(0);
    const half = mountBeaker(125);
    const full = mountBeaker(250);
    [empty, half, full].forEach((el) => mockRect(el, 100, 130));
    const b0 = empty.getWaterBottomY();
    const b1 = half.getWaterBottomY();
    const b2 = full.getWaterBottomY();
    expect(b0).toBeCloseTo(b1, 4);
    expect(b1).toBeCloseTo(b2, 4);
  });

  it('масштаб: при удвоенной высоте host’a поверхность пропорционально удваивается', () => {
    const small = mountBeaker(125);
    const big = mountBeaker(125);
    mockRect(small, 0, 130);
    mockRect(big, 0, 260);
    // y_attr тот же (73), scaleY у big в 2 раза больше → y_top_dom тоже × 2.
    expect(big.getWaterSurfaceY()).toBeCloseTo(2 * small.getWaterSurfaceY(), 1);
    expect(big.getWaterColumnHeightPx()).toBeCloseTo(
      2 * small.getWaterColumnHeightPx(),
      1,
    );
  });

  it('graceful degradation: rect 0×0 — getWaterSurfaceY возвращает rect.top без NaN', () => {
    const el = mountBeaker(125);
    el.getBoundingClientRect = () =>
      ({
        x: 50,
        y: 200,
        left: 50,
        top: 200,
        right: 50,
        bottom: 200,
        width: 0,
        height: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    expect(el.getWaterSurfaceY()).toBe(200);
    expect(el.getWaterBottomY()).toBe(200);
    expect(el.getWaterColumnHeightPx()).toBe(0);
  });

  it('водный столб монотонен по level (больше воды → выше столб)', () => {
    const levels = [0, 50, 100, 150, 200, 250];
    const cols: number[] = [];
    for (const l of levels) {
      const el = mountBeaker(l);
      mockRect(el, 0, 130);
      cols.push(el.getWaterColumnHeightPx());
    }
    for (let i = 1; i < cols.length; i++) {
      expect(cols[i]!).toBeGreaterThanOrEqual(cols[i - 1]!);
    }
    // 0 → 0; 250 → ~86
    expect(cols[0]!).toBeCloseTo(0, 4);
    expect(cols[cols.length - 1]!).toBeGreaterThan(80);
  });
});
