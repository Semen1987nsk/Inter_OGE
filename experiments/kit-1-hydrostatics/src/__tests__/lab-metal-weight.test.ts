/**
 * lab-metal-weight — тесты для геометрического API getThreadHookY/Position.
 *
 * Этап 3 спеки 2026-05-07: расширение существующего компонента под нужды
 * опыта 1.2 «Архимед» — оркестратору нужно знать, куда крепится нить
 * на верхнем крюке цилиндра, чтобы натянуть lab-thread mode="taut" между
 * этой точкой и нижним крюком динамометра.
 *
 * Контракт API повторяет lab-dynamometer.getWeightHookPosition() — точка
 * в host-space (CSS px host'а). Точка должна быть НАД корпусом цилиндра
 * (на крюке-петле, viewBox y < 22), но ВНУТРИ host-rect (y >= 0).
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

beforeAll(async () => {
  await import('../ui/components/lab-metal-weight');
});

afterEach(() => {
  document.body.innerHTML = '';
});

interface MetalWeightLike extends HTMLElement {
  getThreadHookPosition(): { x: number; y: number };
  getThreadHookY(): number;
  getBottomY(): number;
  getBodyTopY(): number;
  getBodyHeightPx(): number;
}

/**
 * Мокаем getBoundingClientRect: happy-dom не делает реальный layout, поэтому
 * без мока rect = 0×0 и геометрические расчёты теряют смысл. Подставляем
 * прямоугольник того размера, который реально отдал бы браузер при
 * --w-size = 64px (host width = 64, height = 64*1.65 = 105.6).
 */
function mockRect(el: HTMLElement, width: number, height: number): void {
  el.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      toJSON: () => ({}),
    }) as DOMRect;
}

function mountWeight(idNum = 2, material = 'aluminum'): MetalWeightLike {
  const el = document.createElement('lab-metal-weight') as MetalWeightLike;
  el.setAttribute('id-num', String(idNum));
  el.setAttribute('material', material);
  document.body.appendChild(el);
  return el;
}

describe('lab-metal-weight — getThreadHookPosition / getThreadHookY', () => {
  it('API существует: оба метода — функции и возвращают согласованные значения', () => {
    const el = mountWeight();
    mockRect(el, 64, 105.6);
    expect(typeof el.getThreadHookPosition).toBe('function');
    expect(typeof el.getThreadHookY).toBe('function');
    const pos = el.getThreadHookPosition();
    expect(pos).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
    expect(el.getThreadHookY()).toBe(pos.y);
  });

  it('точка крепления НАД корпусом цилиндра (y < 22/110 высоты host)', () => {
    // SVG viewBox 0 0 64 110, корпус цилиндра начинается на y=22.
    // Точка крепления нити должна быть ВЫШЕ корпуса (на крюке).
    const el = mountWeight();
    const hostHeight = 110;
    mockRect(el, 64, hostHeight);
    const { y } = el.getThreadHookPosition();
    const bodyTopHostY = (22 / 110) * hostHeight;
    expect(y).toBeLessThan(bodyTopHostY);
    // Но не выше верхнего края host (точка >= 0).
    expect(y).toBeGreaterThanOrEqual(0);
  });

  it('масштабируется со --w-size: при размере host 64×105.6 vs 128×211.2 — координаты пропорциональны', () => {
    const small = mountWeight(2);
    mockRect(small, 64, 105.6);
    const big = mountWeight(2);
    mockRect(big, 128, 211.2);
    const ps = small.getThreadHookPosition();
    const pb = big.getThreadHookPosition();
    // X удваивается ровно
    expect(pb.x).toBeCloseTo(ps.x * 2, 4);
    // Y тоже удваивается (host-height удваивается, viewBox-Y тот же).
    expect(pb.y).toBeCloseTo(ps.y * 2, 4);
  });

  it('точка совпадает с расчётом по viewBox 0..64 × 0..110, точка крепления (28, 4)', () => {
    const el = mountWeight();
    const w = 100;
    const h = 200;
    mockRect(el, w, h);
    const { x, y } = el.getThreadHookPosition();
    // Контракт документирован: HOOK_TIE = (28, 4) в SVG, viewBox 64×110.
    expect(x).toBeCloseTo((28 / 64) * w, 4);
    expect(y).toBeCloseTo((4 / 110) * h, 4);
  });

  it('точка одинакова для цилиндров одного объёма (№1 steel, №2 alu — V=25)', () => {
    // По ФИПИ-паспорту цилиндры №1 (steel) и №2 (alu) — одинаковый объём 25 см³,
    // равный диаметр → одинаковая высота тела → одинаковый viewBox →
    // getThreadHookPosition должна давать совпадающие значения.
    const steel = mountWeight(1, 'steel');
    const alu = mountWeight(2, 'aluminum');
    [steel, alu].forEach((el) => mockRect(el, 64, 110));
    const a = steel.getThreadHookPosition();
    const b = alu.getThreadHookPosition();
    expect(a).toEqual(b);
  });

  it('точка крепления нити (HOOK_TIE) одинакова для всех цилиндров (равная длина — крюк сверху на той же Y)', () => {
    // Реальный ФИПИ-комплект: цилиндры одинаковой длины, разный диаметр.
    // Поэтому viewBox 64×110 фиксирован, точка крепления нити (HOOK_TIE_X=28,
    // HOOK_TIE_Y=4) — общая для всех id.
    const ids = [1, 2, 3, 4];
    const positions = ids.map((id) => {
      const el = mountWeight(id, id === 3 ? 'plastic' : id === 1 ? 'steel' : 'aluminum');
      mockRect(el, 64, 110);
      return el.getThreadHookPosition();
    });
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toEqual(positions[0]);
    }
  });

  it('педагогически верно: №3 (V=56) толще чем №2 (V=25) — body width ratio = √(56/25) ≈ 1.50', () => {
    // По V_actual / V_BASE: r ∝ √V. Для №3 → ширина тела в SVG-юнитах должна
    // быть √(56/25)=1.497 раза больше, чем у №2.
    const alu = mountWeight(2, 'aluminum');
    const plastic = mountWeight(3, 'plastic');
    document.body.appendChild(alu);
    document.body.appendChild(plastic);
    const aluBody = alu.shadowRoot!.getElementById('body-rect') as unknown as SVGRectElement;
    const plasticBody = plastic.shadowRoot!.getElementById('body-rect') as unknown as SVGRectElement;
    const aluW = parseFloat(aluBody.getAttribute('width') ?? '0');
    const plasticW = parseFloat(plasticBody.getAttribute('width') ?? '0');
    expect(aluW).toBeCloseTo(36, 1);
    // 36 · √(56/25) ≈ 53.9
    expect(plasticW).toBeCloseTo(36 * Math.sqrt(56 / 25), 1);
    // И обязательно больше базы — иначе №3 неотличим визуально от №2.
    expect(plasticW).toBeGreaterThan(aluW);
    // Но влезает в host (width=64).
    expect(plasticW).toBeLessThan(64);
  });

  it('педагогически верно: №4 (V=34) толще №2 (V=25), но тоньше №3 (V=56)', () => {
    const alu2 = mountWeight(2, 'aluminum');
    const alu4 = mountWeight(4, 'aluminum');
    const plastic = mountWeight(3, 'plastic');
    document.body.appendChild(alu2);
    document.body.appendChild(alu4);
    document.body.appendChild(plastic);
    const w2 = parseFloat(
      (alu2.shadowRoot!.getElementById('body-rect') as unknown as SVGRectElement).getAttribute('width') ?? '0',
    );
    const w4 = parseFloat(
      (alu4.shadowRoot!.getElementById('body-rect') as unknown as SVGRectElement).getAttribute('width') ?? '0',
    );
    const w3 = parseFloat(
      (plastic.shadowRoot!.getElementById('body-rect') as unknown as SVGRectElement).getAttribute('width') ?? '0',
    );
    // V: 25 < 34 < 56 → w2 < w4 < w3
    expect(w2).toBeLessThan(w4);
    expect(w4).toBeLessThan(w3);
    // 36·√(34/25) ≈ 41.96
    expect(w4).toBeCloseTo(36 * Math.sqrt(34 / 25), 1);
  });

  it('getThreadHookY возвращает ровно ту же y, что и getThreadHookPosition', () => {
    const el = mountWeight();
    mockRect(el, 64, 110);
    expect(el.getThreadHookY()).toBe(el.getThreadHookPosition().y);
  });
});

describe('lab-metal-weight — geometry API для submersionFraction (опыт 1.2)', () => {
  it('getBottomY: y нижней кромки тела = top + (BODY_TOP+BODY_H)/SVG_H · height', () => {
    // Базовый цилиндр №2 (V=25): viewBox 64×110, body y=22..100.
    const el = mountWeight(2, 'aluminum');
    mockRect(el, 64, 110);
    // BODY_TOP=22, BODY_H=78 → bodyBottomSvgY=100 → scaleY=110/110=1 → 100.
    expect(el.getBottomY()).toBeCloseTo(100, 4);
  });

  it('getBottomY одинаков для всех цилиндров (равная длина в реальном ФИПИ-комплекте)', () => {
    // Все цилиндры в реальном ФИПИ-комплекте имеют одинаковую длину
    // (по фото слайд №24 спецификации), отличаются только диаметром.
    // Поэтому getBottomY возвращает одну и ту же координату для всех id
    // при одинаковом DOM-rect.
    const ids = [1, 2, 3, 4] as const;
    const bottoms = ids.map((id) => {
      const el = mountWeight(id, id === 3 ? 'plastic' : 'aluminum');
      mockRect(el, 64, 110);
      return el.getBottomY();
    });
    for (let i = 1; i < bottoms.length; i++) {
      expect(bottoms[i]).toBeCloseTo(bottoms[0]!, 4);
    }
    // Базовый y нижней кромки: BODY_TOP=22, BODY_H=78 → 100.
    expect(bottoms[0]).toBeCloseTo(100, 4);
  });

  it('getBodyHeightPx одинаков для всех цилиндров (равная длина)', () => {
    const ids = [1, 2, 3, 4] as const;
    const heights = ids.map((id) => {
      const el = mountWeight(id, id === 3 ? 'plastic' : 'aluminum');
      mockRect(el, 64, 110);
      return el.getBodyHeightPx();
    });
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i]).toBeCloseTo(heights[0]!, 4);
    }
    // 78 SVG units · scaleY=1 → 78 px.
    expect(heights[0]).toBeCloseTo(78, 4);
  });

  it('getBodyTopY возвращает Y верхней кромки тела (под крюком)', () => {
    const el = mountWeight(2, 'aluminum');
    mockRect(el, 64, 110);
    // BODY_TOP=22, scaleY=1 → bodyTopY = top + 22 = 22.
    expect(el.getBodyTopY()).toBeCloseTo(22, 4);
  });

  it('getBottomY = getBodyTopY + getBodyHeightPx (геометрический инвариант)', () => {
    for (const id of [1, 2, 3, 4]) {
      const el = mountWeight(id, 'aluminum');
      mockRect(el, 64, 110);
      const top = el.getBodyTopY();
      const h = el.getBodyHeightPx();
      const bot = el.getBottomY();
      expect(top + h).toBeCloseTo(bot, 4);
    }
  });

  it('getBodyHeightPx > 0 для всех 4 цилиндров', () => {
    for (const id of [1, 2, 3, 4]) {
      const el = mountWeight(id, 'aluminum');
      mockRect(el, 64, 110);
      expect(el.getBodyHeightPx()).toBeGreaterThan(0);
    }
  });

  it('graceful degradation: при rect 0×0 (детач, SSR) — возвращает rect.bottom/top без NaN', () => {
    const el = mountWeight(2, 'aluminum');
    el.getBoundingClientRect = () =>
      ({
        x: 50,
        y: 100,
        left: 50,
        top: 100,
        right: 50,
        bottom: 100,
        width: 0,
        height: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    expect(el.getBottomY()).toBe(100);
    expect(el.getBodyTopY()).toBe(100);
    expect(el.getBodyHeightPx()).toBe(0);
  });
});
