import { describe, it, expect, beforeEach } from 'vitest';
import '../lab-protractor-disc';

function mount(): HTMLElement & {
  getSlotRect(id: string): DOMRect;
  setSlotHover(id: string, active: boolean): void;
  setPlaced(kind: string, on: boolean): void;
  setDragging(on: boolean): void;
  refractiveIndex: number;
} {
  const el = document.createElement('lab-protractor-disc') as any;
  document.body.appendChild(el);
  return el;
}

describe('lab-protractor-disc — статический каркас', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('монтируется с shadowRoot и SVG', () => {
    const el = mount();
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot!.querySelector('svg')).not.toBeNull();
  });

  it('рисует нормаль, плоскую грань, тело стекла', () => {
    const el = mount();
    const sr = el.shadowRoot!;
    expect(sr.querySelector('.normal-line')).not.toBeNull();
    expect(sr.querySelector('.flat-face')).not.toBeNull();
    expect(sr.querySelector('.glass-body')).not.toBeNull();
  });

  it('рисует градусные подписи транспортира (мажорные каждые 10°, >= 9 шт. в одном квадранте)', () => {
    const el = mount();
    const labels = el.shadowRoot!.querySelectorAll('.tick-label');
    expect(labels.length).toBeGreaterThanOrEqual(9); // 0..90 в одном квадранте минимум
  });

  it('рисует минорные штрихи транспортира (.tick)', () => {
    const el = mount();
    const ticks = el.shadowRoot!.querySelectorAll('.tick');
    // ≥ 360 штрихов (1° по всему ободу) или хотя бы ≥ 36 (каждые 10°)
    expect(ticks.length).toBeGreaterThanOrEqual(36);
  });

  it('2 гнезда (.slot-rect) с data-slot semicylinder и emitter', () => {
    const el = mount();
    const slots = Array.from(el.shadowRoot!.querySelectorAll('[data-slot]')).map(
      (s) => s.getAttribute('data-slot'),
    );
    expect(slots).toContain('semicylinder');
    expect(slots).toContain('emitter');
  });

  it('каждое гнездо содержит .slot-rect', () => {
    const el = mount();
    const sr = el.shadowRoot!;
    const cylSlot = sr.querySelector('[data-slot="semicylinder"]');
    const emSlot = sr.querySelector('[data-slot="emitter"]');
    expect(cylSlot).not.toBeNull();
    expect(emSlot).not.toBeNull();
    expect(cylSlot!.querySelector('.slot-rect')).not.toBeNull();
    expect(emSlot!.querySelector('.slot-rect')).not.toBeNull();
  });

  it('setDragging(true) ставит класс dragging-active на host, setDragging(false) снимает', () => {
    const el = mount();
    el.setDragging(true);
    expect(el.classList.contains('dragging-active')).toBe(true);
    el.setDragging(false);
    expect(el.classList.contains('dragging-active')).toBe(false);
  });

  it('по умолчанию host НЕ имеет класса dragging-active (REST-state)', () => {
    const el = mount();
    expect(el.classList.contains('dragging-active')).toBe(false);
  });

  it('setPlaced(semicylinder,false) ставит hidden на .glass-body', () => {
    const el = mount();
    const glass = el.shadowRoot!.querySelector('.glass-body') as SVGElement;
    expect(glass).not.toBeNull();
    el.setPlaced('semicylinder', false);
    expect(glass.hasAttribute('hidden')).toBe(true);
  });

  it('setPlaced(semicylinder,true) снимает hidden с .glass-body', () => {
    const el = mount();
    const glass = el.shadowRoot!.querySelector('.glass-body') as SVGElement;
    el.setPlaced('semicylinder', false);
    expect(glass.hasAttribute('hidden')).toBe(true);
    el.setPlaced('semicylinder', true);
    expect(glass.hasAttribute('hidden')).toBe(false);
  });

  it('setPlaced(emitter,false) ставит hidden на .emitter-group', () => {
    const el = mount();
    const emitterGroup = el.shadowRoot!.querySelector('.emitter-group') as SVGElement;
    expect(emitterGroup).not.toBeNull();
    el.setPlaced('emitter', false);
    expect(emitterGroup.hasAttribute('hidden')).toBe(true);
  });

  it('setPlaced(emitter,true) снимает hidden с .emitter-group', () => {
    const el = mount();
    const emitterGroup = el.shadowRoot!.querySelector('.emitter-group') as SVGElement;
    el.setPlaced('emitter', false);
    expect(emitterGroup.hasAttribute('hidden')).toBe(true);
    el.setPlaced('emitter', true);
    expect(emitterGroup.hasAttribute('hidden')).toBe(false);
  });

  it('setSlotHover(semicylinder,true) ставит класс drop-zone--active на гнездо', () => {
    const el = mount();
    el.setSlotHover('semicylinder', true);
    const slot = el.shadowRoot!.querySelector('[data-slot="semicylinder"]');
    expect(slot).not.toBeNull();
    expect(slot!.classList.contains('drop-zone--active')).toBe(true);
  });

  it('setSlotHover(semicylinder,false) снимает drop-zone--active', () => {
    const el = mount();
    el.setSlotHover('semicylinder', true);
    el.setSlotHover('semicylinder', false);
    const slot = el.shadowRoot!.querySelector('[data-slot="semicylinder"]');
    expect(slot!.classList.contains('drop-zone--active')).toBe(false);
  });

  it('setSlotHover(emitter,true) ставит drop-zone--active на гнездо осветителя', () => {
    const el = mount();
    el.setSlotHover('emitter', true);
    const slot = el.shadowRoot!.querySelector('[data-slot="emitter"]');
    expect(slot).not.toBeNull();
    expect(slot!.classList.contains('drop-zone--active')).toBe(true);
  });

  it('getSlotRect возвращает DOMRect для semicylinder', () => {
    const el = mount();
    const r = el.getSlotRect('semicylinder');
    expect(r).toBeInstanceOf(DOMRect);
  });

  it('getSlotRect возвращает DOMRect для emitter', () => {
    const el = mount();
    const r = el.getSlotRect('emitter');
    expect(r).toBeInstanceOf(DOMRect);
  });

  it('getSlotRect для несуществующего id возвращает пустой DOMRect (width=0)', () => {
    const el = mount();
    const r = el.getSlotRect('__nonexistent__');
    expect(r.width).toBe(0);
    expect(r.height).toBe(0);
  });

  it('host имеет role="group" (НЕ role="img")', () => {
    const el = mount();
    expect(el.getAttribute('role')).toBe('group');
  });

  it('host имеет aria-label', () => {
    const el = mount();
    expect(el.hasAttribute('aria-label')).toBe(true);
    expect(el.getAttribute('aria-label')!.length).toBeGreaterThan(0);
  });

  it('SVG содержит <title> (описание для a11y)', () => {
    const el = mount();
    const title = el.shadowRoot!.querySelector('svg title');
    expect(title).not.toBeNull();
    expect(title!.textContent!.length).toBeGreaterThan(0);
  });

  it('свойство refractiveIndex по умолчанию 1.5', () => {
    const el = mount();
    expect(el.refractiveIndex).toBe(1.5);
  });

  it('свойство refractiveIndex можно установить', () => {
    const el = mount();
    el.refractiveIndex = 1.7;
    expect(el.refractiveIndex).toBe(1.7);
  });

  it('по умолчанию .glass-body имеет атрибут hidden', () => {
    // В happy-dom атрибут hidden работает через [hidden]{display:none} в Shadow DOM CSS.
    // Проверяем через атрибут (CSS-computed не работает в happy-dom).
    const el = mount();
    const glass = el.shadowRoot!.querySelector('.glass-body') as SVGElement;
    // По умолчанию стекло скрыто (до setPlaced)
    expect(glass.hasAttribute('hidden')).toBe(true);
  });

  it('по умолчанию .emitter-group скрыта (emitter не размещён)', () => {
    const el = mount();
    const emitterGroup = el.shadowRoot!.querySelector('.emitter-group') as SVGElement;
    expect(emitterGroup.hasAttribute('hidden')).toBe(true);
  });

  it('viewBox SVG = "0 0 420 420"', () => {
    const el = mount();
    const svg = el.shadowRoot!.querySelector('svg');
    expect(svg!.getAttribute('viewBox')).toBe('0 0 420 420');
  });

  it('.glass-body имеет sweep-flag=0 (нижняя дуга = стекло, y>210)', () => {
    // Гео-тест: sweep-flag=1 → верхняя дуга (воздух) — НЕВЕРНО.
    // sweep-flag=0 → нижняя дуга (стекло, y>210) — ВЕРНО по спеке.
    // Ассерт умеет краснеть: при sweep-flag=1 regex не совпадает.
    const el = mount();
    const glass = el.shadowRoot!.querySelector('.glass-body') as SVGPathElement;
    expect(glass).not.toBeNull();
    expect(glass.getAttribute('d')).toMatch(/A\s*180\s+180\s+0\s+0\s+0/);
  });

  it('по умолчанию .n-label скрыта (полуцилиндр в лотке)', () => {
    const el = mount();
    const nLabel = el.shadowRoot!.querySelector('.n-label') as SVGElement;
    expect(nLabel).not.toBeNull();
    expect(nLabel.hasAttribute('hidden')).toBe(true);
  });

  it('setPlaced(semicylinder,true) показывает .n-label', () => {
    const el = mount();
    const nLabel = el.shadowRoot!.querySelector('.n-label') as SVGElement;
    el.setPlaced('semicylinder', true);
    expect(nLabel.hasAttribute('hidden')).toBe(false);
  });

  it('setPlaced(semicylinder,false) скрывает .n-label', () => {
    const el = mount();
    const nLabel = el.shadowRoot!.querySelector('.n-label') as SVGElement;
    el.setPlaced('semicylinder', true);
    expect(nLabel.hasAttribute('hidden')).toBe(false);
    el.setPlaced('semicylinder', false);
    expect(nLabel.hasAttribute('hidden')).toBe(true);
  });
});
