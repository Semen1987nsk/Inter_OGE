/**
 * lab-thread — render-тесты для двух режимов:
 *   - coil (default): иконка-моток в kit-панели (опыт 1.1, обратная совместимость).
 *   - taut: натянутая нить между двумя точками (опыт 1.2 «Архимед»).
 *
 * Этап 3 спеки 2026-05-07: расширение существующего компонента под подвес
 * цилиндра на динамометр в опыте 1.2.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

beforeAll(async () => {
  await import('../ui/components/lab-thread');
});

afterEach(() => {
  document.body.innerHTML = '';
});

function mount(attrs: Record<string, string | number> = {}): HTMLElement {
  const el = document.createElement('lab-thread');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  document.body.appendChild(el);
  return el;
}

describe('lab-thread — coil mode (default)', () => {
  it('без атрибута mode → рендерит моток (circle + ellipses), интерактивен', () => {
    const el = mount();
    const root = el.shadowRoot!;
    // Моток-круг присутствует
    expect(root.querySelector('circle')).not.toBeNull();
    // Колец обмотки три
    expect(root.querySelectorAll('ellipse').length).toBeGreaterThanOrEqual(3);
    // Натянутой нити нет
    expect(root.querySelector('.taut-line')).toBeNull();
    // Интерактивен
    expect(el.tabIndex).toBe(0);
    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('aria-label')).toMatch(/нит[ьи]/i);
    expect(el.hasAttribute('aria-hidden')).toBe(false);
  });

  it('явный mode="coil" эквивалентен дефолту', () => {
    const el = mount({ mode: 'coil' });
    expect(el.shadowRoot!.querySelector('circle')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.taut-line')).toBeNull();
    expect(el.tabIndex).toBe(0);
  });
});

describe('lab-thread — taut mode', () => {
  it('mode="taut" + 4 координаты → рендерит ОДНУ линию, иконку-моток скрывает', () => {
    const el = mount({
      mode: 'taut',
      'taut-from-x': 100,
      'taut-from-y': 50,
      'taut-to-x': 100,
      'taut-to-y': 200,
    });
    const root = el.shadowRoot!;
    // Никакого мотка
    expect(root.querySelector('circle')).toBeNull();
    // Есть одна path-линия
    const lines = root.querySelectorAll('.taut-line');
    expect(lines.length).toBe(1);
    // path содержит обе крайних точки as M..L или M..Q..
    const d = lines[0]!.getAttribute('d')!;
    expect(d).toMatch(/^M[\d.\s,-]+/);
  });

  it('taut: pointer-events отключены, tabindex=-1, aria-hidden=true', () => {
    const el = mount({
      mode: 'taut',
      'taut-from-x': 0,
      'taut-from-y': 0,
      'taut-to-x': 50,
      'taut-to-y': 50,
    });
    const styleSheet = el.shadowRoot!.querySelector('style')!;
    expect(styleSheet.textContent).toMatch(/pointer-events:\s*none/);
    expect(el.tabIndex).toBe(-1);
    expect(el.getAttribute('aria-hidden')).toBe('true');
    // role/aria-label кита не должно быть в taut
    expect(el.hasAttribute('role')).toBe(false);
    expect(el.hasAttribute('aria-label')).toBe(false);
  });

  it('смена координат → линия перерисовывается с новыми концами', () => {
    const el = mount({
      mode: 'taut',
      'taut-from-x': 0,
      'taut-from-y': 0,
      'taut-to-x': 100,
      'taut-to-y': 0,
    });
    const before = el.shadowRoot!.querySelector('.taut-line')!.getAttribute('d');
    el.setAttribute('taut-to-x', '200');
    el.setAttribute('taut-to-y', '100');
    const after = el.shadowRoot!.querySelector('.taut-line')!.getAttribute('d');
    expect(after).not.toBe(before);
  });

  it('переключение coil→taut и обратно перерисовывает Shadow DOM', () => {
    const el = mount();
    expect(el.shadowRoot!.querySelector('circle')).not.toBeNull();
    el.setAttribute('mode', 'taut');
    el.setAttribute('taut-from-x', '0');
    el.setAttribute('taut-from-y', '0');
    el.setAttribute('taut-to-x', '50');
    el.setAttribute('taut-to-y', '50');
    expect(el.shadowRoot!.querySelector('circle')).toBeNull();
    expect(el.shadowRoot!.querySelector('.taut-line')).not.toBeNull();
    // tabindex и role восстанавливаются к coil-варианту
    el.setAttribute('mode', 'coil');
    expect(el.shadowRoot!.querySelector('circle')).not.toBeNull();
    expect(el.tabIndex).toBe(0);
    expect(el.getAttribute('role')).toBe('button');
    expect(el.hasAttribute('aria-hidden')).toBe(false);
  });

  it('геометрия: горизонтальная нить (одинаковый Y у концов) — path начинается в from, заканчивается в to', () => {
    // Берём конкретные точки и проверяем, что d-строка содержит координаты,
    // соответствующие смещению (relative to bbox-origin).
    const el = mount({
      mode: 'taut',
      'taut-from-x': 100,
      'taut-from-y': 200,
      'taut-to-x': 300,
      'taut-to-y': 200,
    });
    const d = el.shadowRoot!.querySelector('.taut-line')!.getAttribute('d')!;
    // Длина = 200, sag = clamp(200*0.025=5) → таки квадратичная кривая.
    // path должен начинаться с M и содержать Q (квадратичную) для horizontal.
    expect(d.startsWith('M')).toBe(true);
    expect(d).toContain('Q');
    // Извлекаем все числа из path
    const nums = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    // Первые два — стартовая точка (relative). Они должны быть >= 0 и
    // соответствовать смещению от bbox.
    expect(nums.length).toBeGreaterThanOrEqual(6);
    const startX = nums[0] as number;
    const startY = nums[1] as number;
    const endX = nums[nums.length - 2] as number;
    const endY = nums[nums.length - 1] as number;
    expect(startX).toBeGreaterThanOrEqual(0);
    expect(startY).toBeGreaterThanOrEqual(0);
    // Та же Y (горизонталь), X увеличился на 200.
    expect(endY).toBeCloseTo(startY, 1);
    expect(endX - startX).toBeCloseTo(200, 1);
  });

  it('очень короткий отрезок (length < 0.5) → рендерит прямую линию, не падает', () => {
    const el = mount({
      mode: 'taut',
      'taut-from-x': 50,
      'taut-from-y': 50,
      'taut-to-x': 50,
      'taut-to-y': 50,
    });
    const d = el.shadowRoot!.querySelector('.taut-line')!.getAttribute('d')!;
    // path должен использовать L (прямую) для совпадающих точек
    expect(d).toContain('L');
  });

  it('диагональная нить — sag-точка смещена ВНИЗ от середины (положительное Y)', () => {
    const el = mount({
      mode: 'taut',
      'taut-from-x': 0,
      'taut-from-y': 0,
      'taut-to-x': 100,
      'taut-to-y': 100,
    });
    const d = el.shadowRoot!.querySelector('.taut-line')!.getAttribute('d')!;
    // Извлекаем числа: M sx sy Q cx cy ex ey
    const nums = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    expect(nums.length).toBeGreaterThanOrEqual(6);
    const sy = nums[1] as number;
    const cy = nums[3] as number;
    const ey = nums[5] as number;
    // Контрольная точка по Y должна быть ниже среднего (т.к. sag положителен).
    const midY = (sy + ey) / 2;
    expect(cy).toBeGreaterThan(midY);
  });
});
