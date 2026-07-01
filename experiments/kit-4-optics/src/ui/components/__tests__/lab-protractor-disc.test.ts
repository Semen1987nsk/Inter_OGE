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

describe('lab-protractor-disc — лучи и угол', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('setIncidenceAngle(45) → refractionAngleDeg≈28 (Снелл n=1.5)', () => {
    const el = mount() as any;
    el.setPlaced('semicylinder', true);
    el.setIncidenceAngle(45);
    expect(el.incidenceAngleDeg).toBe(45);
    expect(el.refractionAngleDeg).toBe(28); // round(28.126)
  });

  it('setIncidenceAngle клампит в [0,85]', () => {
    const el = mount() as any;
    el.setIncidenceAngle(120);
    expect(el.incidenceAngleDeg).toBe(85);
    el.setIncidenceAngle(-10);
    expect(el.incidenceAngleDeg).toBe(0);
  });

  it('эмитит angle-change с целыми i,r', () => {
    const el = mount() as any;
    let detail: any = null;
    el.addEventListener('angle-change', (e: CustomEvent) => {
      detail = e.detail;
    });
    el.setIncidenceAngle(60);
    expect(detail).toEqual({ i: 60, r: 35 }); // round(35.264)
  });

  it('рисует падающий, преломлённый и отражённый лучи', () => {
    const el = mount() as any;
    el.setPlaced('semicylinder', true);
    el.setIncidenceAngle(45);
    const sr = el.shadowRoot!;
    expect(sr.querySelector('.ray-incident')).not.toBeNull();
    expect(sr.querySelector('.ray-refracted')).not.toBeNull();
    expect(sr.querySelector('.ray-reflected')).not.toBeNull();
  });

  it('хэндл угла: role=slider, aria-valuenow синхронизирован', () => {
    const el = mount() as any;
    el.setIncidenceAngle(30);
    const handle = el.shadowRoot!.querySelector('.angle-handle')!;
    expect(handle.getAttribute('role')).toBe('slider');
    expect(handle.getAttribute('aria-valuenow')).toBe('30');
  });

  it('стрелка вправо на хэндле → +1°', () => {
    const el = mount() as any;
    el.setIncidenceAngle(30);
    const handle = el.shadowRoot!.querySelector('.angle-handle') as HTMLElement;
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(el.incidenceAngleDeg).toBe(31);
  });

  it('refractiveIndex по умолчанию 1.5', () => {
    const el = mount() as any;
    expect(el.refractiveIndex).toBe(1.5);
  });

  // ── Дополнительные регрессионные ассерты (каждый умеет краснеть) ────────────

  it('по умолчанию #i = 45 (эталонная точка Снелла)', () => {
    const el = mount() as any;
    expect(el.incidenceAngleDeg).toBe(45);
    expect(el.refractionAngleDeg).toBe(28);
  });

  it('хэндл имеет aria-valuemin=0, aria-valuemax=85, tabindex=0, aria-label', () => {
    const el = mount() as any;
    const handle = el.shadowRoot!.querySelector('.angle-handle')!;
    expect(handle.getAttribute('aria-valuemin')).toBe('0');
    expect(handle.getAttribute('aria-valuemax')).toBe('85');
    expect(handle.getAttribute('tabindex')).toBe('0');
    expect(handle.getAttribute('aria-label')).toBe('Угол падения, градусы');
  });

  it('стрелка влево на хэндле → −1°', () => {
    const el = mount() as any;
    el.setIncidenceAngle(30);
    const handle = el.shadowRoot!.querySelector('.angle-handle') as HTMLElement;
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(el.incidenceAngleDeg).toBe(29);
  });

  it('стрелка вниз = −1°, стрелка вверх = +1°', () => {
    const el = mount() as any;
    el.setIncidenceAngle(40);
    const handle = el.shadowRoot!.querySelector('.angle-handle') as HTMLElement;
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(el.incidenceAngleDeg).toBe(39);
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(el.incidenceAngleDeg).toBe(40);
  });

  it('стрелка не уводит угол за границы [0,85]', () => {
    const el = mount() as any;
    el.setIncidenceAngle(0);
    const handle = el.shadowRoot!.querySelector('.angle-handle') as HTMLElement;
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(el.incidenceAngleDeg).toBe(0);
    el.setIncidenceAngle(85);
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(el.incidenceAngleDeg).toBe(85);
  });

  it('лучи скрыты, пока полуцилиндр не размещён; setPlaced(semicylinder,true) показывает группу лучей', () => {
    const el = mount() as any;
    const rays = el.shadowRoot!.querySelector('.rays-group') as SVGElement;
    expect(rays).not.toBeNull();
    expect(rays.hasAttribute('hidden')).toBe(true);
    el.setPlaced('semicylinder', true);
    expect(rays.hasAttribute('hidden')).toBe(false);
    el.setPlaced('semicylinder', false);
    expect(rays.hasAttribute('hidden')).toBe(true);
  });

  it('ридауты i/r показывают текущие целые углы', () => {
    const el = mount() as any;
    el.setPlaced('semicylinder', true);
    el.setIncidenceAngle(45);
    const sr = el.shadowRoot!;
    expect(sr.querySelector('.angle-readout--i')!.textContent).toBe('i = 45°');
    expect(sr.querySelector('.angle-readout--r')!.textContent).toBe('r = 28°');
  });

  it('дуги i и r присутствуют', () => {
    const el = mount() as any;
    el.setPlaced('semicylinder', true);
    const sr = el.shadowRoot!;
    expect(sr.querySelector('.angle-arc--i')).not.toBeNull();
    expect(sr.querySelector('.angle-arc--r')).not.toBeNull();
  });

  it('падающий луч упирается в центр (210,210) — конец в центре', () => {
    const el = mount() as any;
    el.setIncidenceAngle(45);
    const inc = el.shadowRoot!.querySelector('.ray-incident') as SVGLineElement;
    // x2/y2 — конец падающего луча = центр диска
    expect(Number(inc.getAttribute('x2'))).toBeCloseTo(210, 1);
    expect(Number(inc.getAttribute('y2'))).toBeCloseTo(210, 1);
  });

  it('падающий луч выходит из ВЕРХНЕЙ половины (y1<210), преломлённый уходит в НИЖНюю (y2>210)', () => {
    const el = mount() as any;
    el.setIncidenceAngle(45);
    const sr = el.shadowRoot!;
    const inc = sr.querySelector('.ray-incident') as SVGLineElement;
    const ref = sr.querySelector('.ray-refracted') as SVGLineElement;
    expect(Number(inc.getAttribute('y1'))).toBeLessThan(210); // старт в воздухе
    expect(Number(ref.getAttribute('y2'))).toBeGreaterThan(210); // конец в стекле
  });

  it('падающий луч слева от нормали (x1<210), отражённый справа (x2>210)', () => {
    const el = mount() as any;
    el.setIncidenceAngle(45);
    const sr = el.shadowRoot!;
    const inc = sr.querySelector('.ray-incident') as SVGLineElement;
    const refl = sr.querySelector('.ray-reflected') as SVGLineElement;
    expect(Number(inc.getAttribute('x1'))).toBeLessThan(210);
    expect(Number(refl.getAttribute('x2'))).toBeGreaterThan(210);
  });

  it('преломлённый ближе к нормали, чем падающий (r<i): |x2 преломл| < |x1 падающ|', () => {
    const el = mount() as any;
    el.setIncidenceAngle(60);
    const sr = el.shadowRoot!;
    const inc = sr.querySelector('.ray-incident') as SVGLineElement;
    const ref = sr.querySelector('.ray-refracted') as SVGLineElement;
    const incDx = Math.abs(Number(inc.getAttribute('x1')) - 210);
    const refDx = Math.abs(Number(ref.getAttribute('x2')) - 210);
    expect(refDx).toBeLessThan(incDx);
  });

  it('хэндл угла лежит на конце падающего луча (совпадает с x1/y1)', () => {
    const el = mount() as any;
    el.setIncidenceAngle(50);
    const sr = el.shadowRoot!;
    const inc = sr.querySelector('.ray-incident') as SVGLineElement;
    const dot = sr.querySelector('.angle-handle .handle-dot') as SVGCircleElement;
    expect(Number(dot.getAttribute('cx'))).toBeCloseTo(Number(inc.getAttribute('x1')), 1);
    expect(Number(dot.getAttribute('cy'))).toBeCloseTo(Number(inc.getAttribute('y1')), 1);
  });

  it('при i=0 преломлённый идёт строго вниз по нормали (x2≈210, r=0)', () => {
    const el = mount() as any;
    el.setIncidenceAngle(0);
    expect(el.refractionAngleDeg).toBe(0);
    const ref = el.shadowRoot!.querySelector('.ray-refracted') as SVGLineElement;
    expect(Number(ref.getAttribute('x2'))).toBeCloseTo(210, 1);
    expect(Number(ref.getAttribute('y2'))).toBeGreaterThan(210);
  });

  it('изменение refractiveIndex пересчитывает r (n=2 → r меньше)', () => {
    const el = mount() as any;
    el.setIncidenceAngle(45);
    const rAt15 = el.refractionAngleDeg;
    el.refractiveIndex = 2;
    const rAt2 = el.refractionAngleDeg;
    expect(rAt2).toBeLessThan(rAt15);
  });

  it('setIncidenceAngle округляет дробный угол до целого', () => {
    const el = mount() as any;
    el.setIncidenceAngle(30.7);
    expect(el.incidenceAngleDeg).toBe(31);
  });

  it('host остаётся role="group" (слайдер-хэндл внутри достижим)', () => {
    const el = mount() as any;
    expect(el.getAttribute('role')).toBe('group');
    expect(el.shadowRoot!.querySelector('[role="slider"]')).not.toBeNull();
  });

  it('angle-change: bubbles и composed (пробивает Shadow DOM)', () => {
    const el = mount() as any;
    let ev: CustomEvent | null = null;
    el.addEventListener('angle-change', (e: CustomEvent) => {
      ev = e;
    });
    el.setIncidenceAngle(20);
    expect(ev).not.toBeNull();
    expect((ev as unknown as CustomEvent).bubbles).toBe(true);
    expect((ev as unknown as CustomEvent).composed).toBe(true);
  });
});
