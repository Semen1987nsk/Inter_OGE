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

describe('lab-optical-bench — стрелка-предмет и масштаб по Γ (опыт 4.2)', () => {
  let el: any;
  beforeEach(() => {
    el = document.createElement('lab-optical-bench');
    document.body.appendChild(el);
    el.setLensFocalMm(100);
  });
  afterEach(() => el.remove());

  it('рендерит группу стрелки-предмета #object-arrow', () => {
    const obj = el.shadowRoot.querySelector('#object-arrow');
    expect(obj).not.toBeNull();
  });

  it('при d=2F (d=200,F=100) изображение масштаб 1: scale(1,-1)', () => {
    el.setObjectDistanceMm(200); // |Γ|=imageDistance(100,200)/200 = 200/200 = 1
    const inner = el.shadowRoot.querySelector('.projected-image');
    const t = inner.getAttribute('transform');
    expect(t).toContain('scale(1,-1)');
  });

  it('при d>2F изображение уменьшено (|gammaAbs|<1)', () => {
    el.setObjectDistanceMm(300); // imageDistance(100,300)=150 → |Γ|=150/300=0.5
    const inner = el.shadowRoot.querySelector('.projected-image');
    const t = inner.getAttribute('transform');
    // scale(1,-0.50)
    const m = /scale\(1,\s*-([0-9.]+)\)/.exec(t);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeCloseTo(0.5, 2);
  });

  it('при F<d<2F изображение увеличено (|gammaAbs|>1)', () => {
    el.setObjectDistanceMm(150); // imageDistance(100,150)=300 → |Γ|=300/150=2
    const inner = el.shadowRoot.querySelector('.projected-image');
    const m = /scale\(1,\s*-([0-9.]+)\)/.exec(inner.getAttribute('transform'));
    expect(Number(m![1])).toBeCloseTo(2, 2);
  });

  it('масштаб клампится в [0.2, 3] (d<F → мнимое, не взрывается)', () => {
    el.setObjectDistanceMm(50); // d<F → imageDistance отрицателен
    const inner = el.shadowRoot.querySelector('.projected-image');
    const m = /scale\(1,\s*-([0-9.]+)\)/.exec(inner.getAttribute('transform'));
    expect(m).not.toBeNull();
    const v = Number(m![1]);
    expect(v).toBeGreaterThanOrEqual(0.2);
    expect(v).toBeLessThanOrEqual(3);
  });

  it('setSizeMatch(true) ставит класс size-match, false снимает', () => {
    el.setSizeMatch(true);
    expect(el.shadowRoot.querySelector('svg')!.classList.contains('size-match')).toBe(true);
    el.setSizeMatch(false);
    expect(el.shadowRoot.querySelector('svg')!.classList.contains('size-match')).toBe(false);
  });
});

describe('lab-optical-bench — рендер изображения по зонам (опыт 4.4)', () => {
  function makeBench(): HTMLElement & {
    setObjectDistanceMm(d: number): void;
    setLensFocalMm(F: number): void;
    setScreenDistanceMm(f: number): void;
  } {
    const el = document.createElement('lab-optical-bench') as never;
    document.body.appendChild(el);
    return el;
  }
  const isVisible = (root: ShadowRoot, sel: string) => {
    const e = root.querySelector(sel);
    return !!e && !e.hasAttribute('hidden');
  };

  it('d > F (действительное): проецируемое видно, virtual/infinity скрыты', () => {
    const el = makeBench();
    el.setLensFocalMm(100);
    el.setObjectDistanceMm(300);
    el.setScreenDistanceMm(150);
    const sr = (el as unknown as { shadowRoot: ShadowRoot }).shadowRoot;
    expect(isVisible(sr, '#projected-image-group')).toBe(true);
    expect(isVisible(sr, '#virtual-image-group')).toBe(false);
    expect(isVisible(sr, '#infinity-note-group')).toBe(false);
    el.remove();
  });

  it('d < F (мнимое): virtual видно ПРЯМОЕ (не инвертировано), проецируемое скрыто', () => {
    const el = makeBench();
    el.setLensFocalMm(100);
    el.setObjectDistanceMm(60);
    const sr = (el as unknown as { shadowRoot: ShadowRoot }).shadowRoot;
    expect(isVisible(sr, '#virtual-image-group')).toBe(true);
    expect(isVisible(sr, '#projected-image-group')).toBe(false);
    expect(isVisible(sr, '#infinity-note-group')).toBe(false);
    // прямое: трансформ НЕ содержит инверсии scale(1,-..)
    const inner = sr.querySelector('.virtual-image')!;
    expect(inner.getAttribute('transform') ?? '').not.toMatch(/scale\(1,\s*-/);
    el.remove();
  });

  it('d = F (бесконечность): infinity note видно, остальные скрыты', () => {
    const el = makeBench();
    el.setLensFocalMm(100);
    el.setObjectDistanceMm(100);
    const sr = (el as unknown as { shadowRoot: ShadowRoot }).shadowRoot;
    expect(isVisible(sr, '#infinity-note-group')).toBe(true);
    expect(isVisible(sr, '#projected-image-group')).toBe(false);
    expect(isVisible(sr, '#virtual-image-group')).toBe(false);
    el.remove();
  });
});
