import { describe, it, expect, beforeAll } from 'vitest';
import { ringGeometry } from '../progress-ring';

describe('ringGeometry', () => {
  it('offset = circumference при value 0', () => {
    const g = ringGeometry(0, 4, 52, 8);
    expect(g.offset).toBeCloseTo(g.circumference);
  });
  it('offset = 0 при value=max', () => {
    expect(ringGeometry(4, 4, 52, 8).offset).toBeCloseTo(0);
  });
  it('половина прогресса → половина окружности', () => {
    const g = ringGeometry(2, 4, 52, 8);
    expect(g.offset).toBeCloseTo(g.circumference / 2);
  });
  it('circumference = 2πr', () => {
    const g = ringGeometry(0, 4, 52, 8);
    expect(g.circumference).toBeCloseTo(2 * Math.PI * 52);
  });
  it('clamp value < 0 → treats as 0', () => {
    const g0 = ringGeometry(0, 4, 52, 8);
    const gNeg = ringGeometry(-1, 4, 52, 8);
    expect(gNeg.offset).toBeCloseTo(g0.offset);
  });
  it('clamp value > max → treats as max', () => {
    expect(ringGeometry(10, 4, 52, 8).offset).toBeCloseTo(0);
  });
  it('max=0 guard: returns circumference offset', () => {
    const g = ringGeometry(0, 0, 52, 8);
    expect(g.offset).toBeCloseTo(g.circumference);
  });
});

describe('<progress-ring>', () => {
  beforeAll(async () => {
    await import('../progress-ring');
  });

  it('рендерит SVG и aria-label с прогрессом', () => {
    const el = document.createElement('progress-ring');
    el.setAttribute('value', '3');
    el.setAttribute('max', '8');
    document.body.append(el);
    expect(el.shadowRoot!.querySelector('svg')).toBeTruthy();
    expect(el.getAttribute('aria-label')).toContain('3');
  });

  it('aria-label содержит max', () => {
    const el = document.createElement('progress-ring');
    el.setAttribute('value', '5');
    el.setAttribute('max', '10');
    document.body.append(el);
    expect(el.getAttribute('aria-label')).toContain('10');
  });

  it('SVG имеет два circle элемента (track + progress)', () => {
    const el = document.createElement('progress-ring');
    el.setAttribute('value', '2');
    el.setAttribute('max', '6');
    document.body.append(el);
    const circles = el.shadowRoot!.querySelectorAll('circle');
    expect(circles.length).toBe(2);
  });

  it('progress circle имеет stroke-linecap=round', () => {
    const el = document.createElement('progress-ring');
    el.setAttribute('value', '1');
    el.setAttribute('max', '4');
    document.body.append(el);
    const circles = el.shadowRoot!.querySelectorAll('circle');
    const progressCircle = circles[1];
    expect(progressCircle?.getAttribute('stroke-linecap')).toBe('round');
  });

  it('svg имеет role=img', () => {
    const el = document.createElement('progress-ring');
    el.setAttribute('value', '1');
    el.setAttribute('max', '4');
    document.body.append(el);
    const svg = el.shadowRoot!.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
  });

  it('реагирует на изменение атрибута value', () => {
    const el = document.createElement('progress-ring');
    el.setAttribute('value', '1');
    el.setAttribute('max', '4');
    document.body.append(el);
    const labelBefore = el.getAttribute('aria-label');
    el.setAttribute('value', '3');
    const labelAfter = el.getAttribute('aria-label');
    expect(labelBefore).toContain('1');
    expect(labelAfter).toContain('3');
  });
});
