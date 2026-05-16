/**
 * lab-graduated-cylinder — render-тесты компонента (катет, который мы
 * пропустили: проверка SVG-output при разных level/submerged).
 *
 * Регрессионный кейс: ученик жаловался, что цилиндр в ПУСТОЙ мензурке
 * показывал воду. State.level_ml=0 был корректным, а вот компонент
 * рендерил `level + submerged = 25 мл` голубой воды — баг физики.
 *
 * Урок: проверять не только store-state, но и реальный output компонентов
 * (атрибуты SVG-rect, opacity мениска, aria-label).
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

const SVG_BOTTOM_Y = 230; // см. lab-graduated-cylinder.ts
const SVG_TOP_Y = 36;
const PIXELS_PER_ML = (SVG_BOTTOM_Y - SVG_TOP_Y) / 250;

beforeAll(async () => {
  await import('../ui/components/lab-graduated-cylinder');
});

afterEach(() => {
  document.body.innerHTML = '';
});

function mount(level: number, submerged: number): HTMLElement {
  const el = document.createElement('lab-graduated-cylinder');
  el.setAttribute('level', String(level));
  el.setAttribute('submerged', String(submerged));
  document.body.appendChild(el);
  return el;
}

function getWaterRect(el: HTMLElement): { y: number; height: number } {
  const water = el.shadowRoot!.getElementById('cyl-water') as unknown as SVGRectElement;
  return {
    y: parseFloat(water.getAttribute('y') ?? '0'),
    height: parseFloat(water.getAttribute('height') ?? '0'),
  };
}

function getMeniscusOpacity(el: HTMLElement): number {
  const m = el.shadowRoot!.getElementById('cyl-meniscus') as unknown as SVGEllipseElement;
  return parseFloat(m.style.opacity || '0');
}

describe('lab-graduated-cylinder — visual rendering', () => {
  it('пустая мензурка (level=0, sub=0) → water height = 0, мениск невидим', () => {
    const el = mount(0, 0);
    const { height } = getWaterRect(el);
    expect(height).toBe(0);
    expect(getMeniscusOpacity(el)).toBe(0);
  });

  it('REGRESSION: цилиндр в пустую мензурку (level=0, sub=25) → ВОДЫ НЕТ', () => {
    // Это тот самый баг: пустая мензурка + цилиндр на дне ⇒ воды быть НЕ должно.
    const el = mount(0, 25);
    const { height } = getWaterRect(el);
    expect(
      height,
      'Воды не должно быть, пока её не налили — даже если погружён цилиндр',
    ).toBe(0);
    expect(getMeniscusOpacity(el)).toBe(0);
  });

  it('налита вода (level=100, sub=0) → height = 100·PPM', () => {
    const el = mount(100, 0);
    const { height } = getWaterRect(el);
    expect(height).toBeCloseTo(100 * PIXELS_PER_ML, 1);
    expect(getMeniscusOpacity(el)).toBeGreaterThan(0);
  });

  it('налита вода + цилиндр в воде (level=100, sub=25) → height = 125·PPM', () => {
    const el = mount(100, 25);
    const { height } = getWaterRect(el);
    expect(height).toBeCloseTo(125 * PIXELS_PER_ML, 1);
  });

  it('кламп: level=200 + sub=80 (>250) → height ≤ 250·PPM', () => {
    const el = mount(200, 80);
    const { height } = getWaterRect(el);
    expect(height).toBeLessThanOrEqual(250 * PIXELS_PER_ML + 0.5);
  });

  it('reactive: меняем атрибуты — rect перерисовывается', () => {
    const el = mount(100, 0);
    const beforeH = getWaterRect(el).height;
    el.setAttribute('level', '200');
    const afterH = getWaterRect(el).height;
    expect(afterH).toBeGreaterThan(beforeH);
  });

  it('aria-label отражает фактический «видимый» уровень (а не сумму)', () => {
    const el = mount(0, 25);
    expect(el.getAttribute('aria-label')).toContain('0 мл');
    el.setAttribute('level', '100');
    expect(el.getAttribute('aria-label')).toContain('125 мл');
  });

  it('property: water height МОНОТОННО растёт с level (при фикс sub=0)', () => {
    let prev = -1;
    for (let lvl = 0; lvl <= 250; lvl += 10) {
      const el = mount(lvl, 0);
      const h = getWaterRect(el).height;
      expect(h).toBeGreaterThanOrEqual(prev);
      prev = h;
      el.remove();
    }
  });

  it('property: при level>0, submerged строго увеличивает height (вытеснение)', () => {
    const a = mount(50, 0);
    const b = mount(50, 25);
    expect(getWaterRect(b).height).toBeGreaterThan(getWaterRect(a).height);
  });

  it('property: при level=0, submerged НЕ влияет на height (ничего не вытеснено)', () => {
    const a = mount(0, 0);
    const b = mount(0, 25);
    const c = mount(0, 60);
    expect(getWaterRect(a).height).toBe(0);
    expect(getWaterRect(b).height).toBe(0);
    expect(getWaterRect(c).height).toBe(0);
  });
});
