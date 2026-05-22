import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DragDropController } from '../DragDropController';

function makeDraggable(host: HTMLElement): HTMLElement {
  const card = document.createElement('div');
  card.setAttribute('data-draggable', 'beaker');
  host.appendChild(card);
  card.getBoundingClientRect = () => ({ left: 100, top: 100, width: 80, height: 80, right: 180, bottom: 180, x: 100, y: 100, toJSON() {} } as DOMRect);
  return card;
}
function pointer(type: string, x: number, y: number): PointerEvent {
  return new PointerEvent(type, { pointerId: 1, clientX: x, clientY: y, button: 0, bubbles: true });
}

describe('DragDropController — drag-feel', () => {
  let host: HTMLElement;
  let onDrop: ReturnType<typeof vi.fn>;
  let ctrl: DragDropController;
  let card: HTMLElement;
  beforeEach(() => {
    // happy-dom не реализует elementsFromPoint; контроллер зовёт его на каждый
    // pointermove (#findDropzoneAt). Без полифилла тест падает раньше assert'а.
    if (typeof document.elementsFromPoint !== 'function') {
      document.elementsFromPoint = () => [];
    }
    host = document.createElement('div');
    document.body.appendChild(host);
    onDrop = vi.fn();
    ctrl = new DragDropController(host, onDrop);
    card = makeDraggable(host);
  });
  afterEach(() => { ctrl.destroy(); host.remove(); });

  it('inline-transform ghost содержит scale и rotate при движении вправо', () => {
    card.dispatchEvent(pointer('pointerdown', 140, 140));
    window.dispatchEvent(pointer('pointermove', 160, 140));
    window.dispatchEvent(pointer('pointermove', 200, 140));
    const ghost = document.querySelector('.density-drag-ghost') as HTMLElement;
    expect(ghost).not.toBeNull();
    expect(ghost.style.transform).toContain('scale(1.04)');
    expect(ghost.style.transform).toMatch(/rotate\(/);
  });

  it('наклон ограничен ±4°', () => {
    card.dispatchEvent(pointer('pointerdown', 140, 140));
    window.dispatchEvent(pointer('pointermove', 160, 140));
    window.dispatchEvent(pointer('pointermove', 900, 140));
    const ghost = document.querySelector('.density-drag-ghost') as HTMLElement;
    const m = ghost.style.transform.match(/rotate\((-?[\d.]+)deg\)/);
    expect(m).not.toBeNull();
    expect(Math.abs(parseFloat(m?.[1] ?? 'NaN'))).toBeLessThanOrEqual(4);
  });

  it('reduce-motion: ghost без scale и rotate', () => {
    const orig = window.matchMedia;
    window.matchMedia = (q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent() { return false; } }) as any;
    try {
      card.dispatchEvent(pointer('pointerdown', 140, 140));
      window.dispatchEvent(pointer('pointermove', 160, 140));
      window.dispatchEvent(pointer('pointermove', 220, 140));
      const ghost = document.querySelector('.density-drag-ghost') as HTMLElement;
      expect(ghost).not.toBeNull();
      expect(ghost.style.transform).not.toContain('scale');
      expect(ghost.style.transform).not.toContain('rotate');
    } finally {
      window.matchMedia = orig;
    }
  });

  it('onDrop вызывается СИНХРОННО на pointerup (mount не задерживается)', () => {
    const zone = document.createElement('div');
    zone.setAttribute('data-dropzone', 'beaker');
    zone.setAttribute('data-dropzone-id', 'zone-1');
    document.body.appendChild(zone);
    zone.getBoundingClientRect = () => ({ left: 300, top: 300, width: 100, height: 100, right: 400, bottom: 400, x: 300, y: 300, toJSON() {} } as DOMRect);
    document.elementsFromPoint = () => [zone];

    card.dispatchEvent(pointer('pointerdown', 140, 140));
    window.dispatchEvent(pointer('pointermove', 350, 350)); // ghost + hover zone
    window.dispatchEvent(pointer('pointerup', 350, 350));
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith({ eqId: 'beaker', dropzoneId: 'zone-1' });
    zone.remove();
  });
});
