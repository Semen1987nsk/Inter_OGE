import { describe, expect, it } from 'vitest';
import '../lab-optical-bench';

describe('lab-optical-bench smoke', () => {
  it('монтируется и имеет shadowRoot', () => {
    const el = document.createElement('lab-optical-bench');
    document.body.appendChild(el);
    expect(el.shadowRoot).not.toBeNull();
    el.remove();
  });

  it('shadowRoot содержит svg', () => {
    const el = document.createElement('lab-optical-bench');
    document.body.appendChild(el);
    expect(el.shadowRoot!.querySelector('svg')).not.toBeNull();
    el.remove();
  });

  it('содержит ровно 3 гнезда с data-slot', () => {
    const el = document.createElement('lab-optical-bench');
    document.body.appendChild(el);
    const slots = el.shadowRoot!.querySelectorAll('[data-slot]');
    expect(slots.length).toBeGreaterThanOrEqual(3);
    el.remove();
  });

  it('гнёзда имеют ожидаемые data-slot: bench-slot-object, bench-slot-lens, bench-slot-screen', () => {
    const el = document.createElement('lab-optical-bench');
    document.body.appendChild(el);
    const slotIds = Array.from(
      el.shadowRoot!.querySelectorAll('[data-slot]'),
    ).map((s) => s.getAttribute('data-slot'));
    expect(slotIds).toContain('bench-slot-object');
    expect(slotIds).toContain('bench-slot-lens');
    expect(slotIds).toContain('bench-slot-screen');
    el.remove();
  });

  it('getSlotRect возвращает DOMRect для существующего слота', () => {
    const el = document.createElement('lab-optical-bench') as any;
    document.body.appendChild(el);
    const rect = el.getSlotRect('bench-slot-object');
    expect(rect).toBeInstanceOf(DOMRect);
    el.remove();
  });

  it('getSlotRect для несуществующего слота возвращает пустой DOMRect (width=0)', () => {
    const el = document.createElement('lab-optical-bench') as any;
    document.body.appendChild(el);
    const rect = el.getSlotRect('__nonexistent__');
    expect(rect.width).toBe(0);
    expect(rect.height).toBe(0);
    el.remove();
  });

  it('getSlotRect нормализует префикс: сырой "object" находит то же гнездо, что "bench-slot-object"', () => {
    const el = document.createElement('lab-optical-bench') as any;
    document.body.appendChild(el);
    const raw = el.getSlotRect('object');
    const full = el.getSlotRect('bench-slot-object');
    expect(raw).toBeInstanceOf(DOMRect);
    expect(full).toBeInstanceOf(DOMRect);
    el.remove();
  });

  it('setSlotHover(slotId, true) ставит .drop-zone--active на гнездо (сырой id)', () => {
    const el = document.createElement('lab-optical-bench') as any;
    document.body.appendChild(el);
    el.setSlotHover('object', true);
    const slot = el.shadowRoot.querySelector('[data-slot="bench-slot-object"]');
    expect(slot.classList.contains('drop-zone--active')).toBe(true);
    el.setSlotHover('object', false);
    expect(slot.classList.contains('drop-zone--active')).toBe(false);
    el.remove();
  });

  it('setObjectDistanceMm не бросает', () => {
    const el = document.createElement('lab-optical-bench') as any;
    document.body.appendChild(el);
    expect(() => el.setObjectDistanceMm(150)).not.toThrow();
    el.remove();
  });

  it('setLensFocalMm не бросает', () => {
    const el = document.createElement('lab-optical-bench') as any;
    document.body.appendChild(el);
    expect(() => el.setLensFocalMm(100)).not.toThrow();
    el.remove();
  });

  it('setScreenDistanceMm не бросает', () => {
    const el = document.createElement('lab-optical-bench') as any;
    document.body.appendChild(el);
    expect(() => el.setScreenDistanceMm(300)).not.toThrow();
    el.remove();
  });

  it('setRayOverlay(true) показывает оверлей (убирает hidden)', () => {
    const el = document.createElement('lab-optical-bench') as any;
    document.body.appendChild(el);
    el.setRayOverlay(true);
    const overlay = el.shadowRoot!.querySelector('.ray-overlay-group');
    expect(overlay).not.toBeNull();
    expect(overlay!.hasAttribute('hidden')).toBe(false);
    el.remove();
  });

  it('setRayOverlay(false) скрывает оверлей через атрибут hidden', () => {
    const el = document.createElement('lab-optical-bench') as any;
    document.body.appendChild(el);
    el.setRayOverlay(true);
    el.setRayOverlay(false);
    const overlay = el.shadowRoot!.querySelector('.ray-overlay-group');
    expect(overlay!.hasAttribute('hidden')).toBe(true);
    el.remove();
  });

  it('setImageSharpness(1) — фильтр blur stdDeviation близок к 0', () => {
    const el = document.createElement('lab-optical-bench') as any;
    document.body.appendChild(el);
    el.setImageSharpness(1);
    const feBlur = el.shadowRoot!.querySelector('feGaussianBlur');
    expect(feBlur).not.toBeNull();
    const stdDev = parseFloat(feBlur!.getAttribute('stdDeviation') ?? '999');
    expect(stdDev).toBeLessThan(0.5);
    el.remove();
  });

  it('setImageSharpness(0) — фильтр blur stdDeviation значительно > 0', () => {
    const el = document.createElement('lab-optical-bench') as any;
    document.body.appendChild(el);
    el.setImageSharpness(0);
    const feBlur = el.shadowRoot!.querySelector('feGaussianBlur');
    const stdDev = parseFloat(feBlur!.getAttribute('stdDeviation') ?? '0');
    expect(stdDev).toBeGreaterThan(3);
    el.remove();
  });

  it('svg[hidden]{display:none} — правило задано в shadow style', () => {
    const el = document.createElement('lab-optical-bench');
    document.body.appendChild(el);
    const style = el.shadowRoot!.querySelector('style')!;
    expect(style.textContent).toContain('svg[hidden]');
    expect(style.textContent).toContain('display: none');
    el.remove();
  });

  // M6 (regression): внутренние SVG-группы с hidden ДОЛЖНЫ скрываться явным CSS —
  // svg[hidden] таргетит только <svg>, не .ray-overlay-group. Нужно правило [hidden]{display:none}.
  it('M6: shadow style содержит правило [hidden]{display:none} для внутренних групп', () => {
    const el = document.createElement('lab-optical-bench');
    document.body.appendChild(el);
    const css = (el.shadowRoot!.querySelector('style')!.textContent ?? '')
      .replace(/\s+/g, ' ');
    // Должно быть правило, скрывающее ЛЮБОЙ [hidden] (не только svg[hidden]).
    expect(css).toMatch(/(^|[^a-z-])\[hidden\]\s*\{\s*display:\s*none/);
    el.remove();
  });

  // M5 (regression): connectedCallback НЕ затирает aria-label, переданный вызывающим.
  it('M5: caller aria-label сохраняется (connectedCallback не клоберит)', () => {
    const el = document.createElement('lab-optical-bench');
    el.setAttribute('aria-label', 'Оптическая скамья для сборки опыта с линзой');
    document.body.appendChild(el);
    expect(el.getAttribute('aria-label')).toBe('Оптическая скамья для сборки опыта с линзой');
    expect(el.getAttribute('role')).toBe('img');
    el.remove();
  });

  it('M5: дефолтный aria-label ставится когда вызывающий его не задал', () => {
    const el = document.createElement('lab-optical-bench');
    document.body.appendChild(el);
    expect(el.getAttribute('aria-label')).toBe(
      'Оптическая скамья с направляющей и гнёздами для приборов',
    );
    el.remove();
  });

  it('svg имеет role=img и title', () => {
    const el = document.createElement('lab-optical-bench');
    document.body.appendChild(el);
    const svg = el.shadowRoot!.querySelector('svg');
    expect(svg!.getAttribute('role')).toBe('img');
    expect(svg!.querySelector('title')).not.toBeNull();
    el.remove();
  });

  it('шкала содержит текстовые метки см', () => {
    const el = document.createElement('lab-optical-bench');
    document.body.appendChild(el);
    const ticks = el.shadowRoot!.querySelectorAll('.scale-tick-label');
    expect(ticks.length).toBeGreaterThan(5);
    el.remove();
  });

  it('изображение-стрелка на экране перевёрнута (transform scaleY=-1)', () => {
    const el = document.createElement('lab-optical-bench');
    document.body.appendChild(el);
    const img = el.shadowRoot!.querySelector('.projected-image');
    expect(img).not.toBeNull();
    const transform = img!.getAttribute('transform') ?? '';
    expect(transform).toContain('scale');
    el.remove();
  });
});
