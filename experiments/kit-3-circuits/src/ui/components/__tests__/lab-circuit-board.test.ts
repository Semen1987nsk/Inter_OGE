import { describe, expect, it } from 'vitest';
import '../lab-circuit-board';

describe('lab-circuit-board smoke', () => {
  it('монтируется и имеет shadowRoot', () => {
    const el = document.createElement('lab-circuit-board');
    document.body.appendChild(el);
    expect(el.shadowRoot).not.toBeNull();
    el.remove();
  });

  it('shadowRoot содержит svg', () => {
    const el = document.createElement('lab-circuit-board');
    document.body.appendChild(el);
    expect(el.shadowRoot!.querySelector('svg')).not.toBeNull();
    el.remove();
  });

  it('содержит >=5 гнёзд с data-slot', () => {
    const el = document.createElement('lab-circuit-board');
    document.body.appendChild(el);
    const slots = el.shadowRoot!.querySelectorAll('[data-slot]');
    expect(slots.length).toBeGreaterThanOrEqual(5);
    el.remove();
  });

  it('гнёзда имеют ожидаемые id: source, key, ammeter, resistor, voltmeter', () => {
    const el = document.createElement('lab-circuit-board');
    document.body.appendChild(el);
    const slotIds = Array.from(
      el.shadowRoot!.querySelectorAll('[data-slot]'),
    ).map((s) => s.getAttribute('data-slot'));
    expect(slotIds).toContain('source');
    expect(slotIds).toContain('key');
    expect(slotIds).toContain('ammeter');
    expect(slotIds).toContain('resistor');
    expect(slotIds).toContain('voltmeter');
    el.remove();
  });

  it('setCurrentAnimating(true) ставит атрибут current-animating', () => {
    const el = document.createElement('lab-circuit-board') as any;
    document.body.appendChild(el);
    el.setCurrentAnimating(true);
    expect(el.hasAttribute('current-animating')).toBe(true);
    el.remove();
  });

  it('setCurrentAnimating(false) снимает атрибут current-animating', () => {
    const el = document.createElement('lab-circuit-board') as any;
    document.body.appendChild(el);
    el.setCurrentAnimating(true);
    el.setCurrentAnimating(false);
    expect(el.hasAttribute('current-animating')).toBe(false);
    el.remove();
  });

  it('getSlotRect возвращает DOMRect для существующего слота', () => {
    const el = document.createElement('lab-circuit-board') as any;
    document.body.appendChild(el);
    const rect = el.getSlotRect('source');
    expect(rect).toBeInstanceOf(DOMRect);
    el.remove();
  });

  it('getSlotRect для несуществующего слота возвращает пустой DOMRect', () => {
    const el = document.createElement('lab-circuit-board') as any;
    document.body.appendChild(el);
    const rect = el.getSlotRect('__nonexistent__');
    expect(rect.width).toBe(0);
    expect(rect.height).toBe(0);
    el.remove();
  });

  it('svg[hidden]{display:none} — правило задано в shadow style', () => {
    const el = document.createElement('lab-circuit-board');
    document.body.appendChild(el);
    // Проверяем что стиль задан в шаблоне (svg[hidden] { display: none })
    const style = el.shadowRoot!.querySelector('style')!;
    expect(style.textContent).toContain('svg[hidden]');
    expect(style.textContent).toContain('display: none');
    el.remove();
  });
});
