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
});
