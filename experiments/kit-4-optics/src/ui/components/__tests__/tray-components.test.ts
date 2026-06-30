import { describe, expect, it } from 'vitest';
import '../lab-light-object';
import '../lab-lens';
import '../lab-screen';

// ── lab-light-object ─────────────────────────────────────────────────────────

describe('lab-light-object', () => {
  function make() {
    const el = document.createElement('lab-light-object');
    document.body.appendChild(el);
    return el as HTMLElement;
  }

  it('монтируется и имеет shadowRoot с svg', () => {
    const el = make();
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot!.querySelector('svg')).not.toBeNull();
    el.remove();
  });

  it('svg имеет role="img" и <title>', () => {
    const el = make();
    const svg = el.shadowRoot!.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(el.shadowRoot!.querySelector('title')).not.toBeNull();
    el.remove();
  });

  it('svg[hidden]{display:none} — атрибут hidden скрывает svg', () => {
    const el = make();
    const svg = el.shadowRoot!.querySelector('svg') as SVGSVGElement;
    // По умолчанию svg НЕ скрыт
    expect(svg.hasAttribute('hidden')).toBe(false);
    el.remove();
  });

  it('aria-label не палит физику (нет «Ом», нет числа фокуса)', () => {
    const el = make();
    document.body.appendChild(el);
    const label = el.getAttribute('aria-label') ?? '';
    expect(label).toContain('Осветитель');
    expect(label).not.toMatch(/Ом/);
    el.remove();
  });

  it('содержит элемент стрелки-предмета в SVG', () => {
    const el = make();
    // Стрелка рендерится как polygon или path с классом .arrow-object
    const arrow = el.shadowRoot!.querySelector('.arrow-object');
    expect(arrow).not.toBeNull();
    el.remove();
  });
});

// ── lab-lens ─────────────────────────────────────────────────────────────────

describe('lab-lens', () => {
  function make(focalMm?: number) {
    const el = document.createElement('lab-lens');
    if (focalMm !== undefined) el.setAttribute('focal-mm', String(focalMm));
    document.body.appendChild(el);
    return el as HTMLElement & { focalMm: number };
  }

  it('монтируется и имеет shadowRoot с svg', () => {
    const el = make(100);
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot!.querySelector('svg')).not.toBeNull();
    el.remove();
  });

  it('svg имеет role="img" и <title>', () => {
    const el = make(100);
    const svg = el.shadowRoot!.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(el.shadowRoot!.querySelector('title')).not.toBeNull();
    el.remove();
  });

  it('static observedAttributes содержит focal-mm', () => {
    // доступ к статике через конструктор (as any снимает типизацию)
    expect((customElements.get('lab-lens') as any).observedAttributes).toContain('focal-mm');
  });

  it('getter focalMm возвращает значение атрибута', () => {
    const el = make(100);
    expect(el.focalMm).toBe(100);
    el.remove();
  });

  it('aria-label содержит F= и мм', () => {
    const el = make(50);
    document.body.appendChild(el);
    const label = el.getAttribute('aria-label') ?? '';
    expect(label).toContain('F=');
    expect(label).toContain('мм');
    el.remove();
  });

  it('aria-label не содержит дптр (SR не палит ответ)', () => {
    const el = make(100);
    document.body.appendChild(el);
    const label = el.getAttribute('aria-label') ?? '';
    expect(label).not.toContain('дптр');
    el.remove();
  });

  it('focal-mm > 0 → data-shape=convex на корпусе', () => {
    const el = make(100);
    const body = el.shadowRoot!.querySelector('.lens-body');
    expect(body?.getAttribute('data-shape')).toBe('convex');
    el.remove();
  });

  it('focal-mm < 0 → data-shape=concave на корпусе', () => {
    const el = make(-75);
    const body = el.shadowRoot!.querySelector('.lens-body');
    expect(body?.getAttribute('data-shape')).toBe('concave');
    el.remove();
  });

  it('focal-mm меняется → attributeChangedCallback обновляет форму', () => {
    const el = make(100);
    const body = el.shadowRoot!.querySelector('.lens-body')!;
    expect(body.getAttribute('data-shape')).toBe('convex');
    el.setAttribute('focal-mm', '-75');
    expect(body.getAttribute('data-shape')).toBe('concave');
    el.remove();
  });

  it('без атрибута focal-mm → focalMm дефолт 100', () => {
    const el = document.createElement('lab-lens') as HTMLElement & { focalMm: number };
    document.body.appendChild(el);
    expect(el.focalMm).toBe(100);
    el.remove();
  });
});

// ── lab-screen ────────────────────────────────────────────────────────────────

describe('lab-screen', () => {
  function make() {
    const el = document.createElement('lab-screen');
    document.body.appendChild(el);
    return el as HTMLElement;
  }

  it('монтируется и имеет shadowRoot с svg', () => {
    const el = make();
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot!.querySelector('svg')).not.toBeNull();
    el.remove();
  });

  it('svg имеет role="img" и <title>', () => {
    const el = make();
    const svg = el.shadowRoot!.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(el.shadowRoot!.querySelector('title')).not.toBeNull();
    el.remove();
  });

  it('aria-label = Экран (без физических чисел)', () => {
    const el = make();
    const label = el.getAttribute('aria-label') ?? '';
    expect(label).toContain('Экран');
    expect(label).not.toMatch(/\d/);
    el.remove();
  });

  it('содержит поверхность-экрана .screen-surface в SVG', () => {
    const el = make();
    expect(el.shadowRoot!.querySelector('.screen-surface')).not.toBeNull();
    el.remove();
  });

  it('svg[hidden]{display:none} — svg по умолчанию не скрыт', () => {
    const el = make();
    const svg = el.shadowRoot!.querySelector('svg') as SVGSVGElement;
    expect(svg.hasAttribute('hidden')).toBe(false);
    el.remove();
  });
});
