import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { nextIndex, GridKeyboardController } from '../grid-keyboard';

// 7 элементов, 3 колонки: ряды [0,1,2][3,4,5][6]
describe('nextIndex (7 элементов, 3 колонки)', () => {
  it('ArrowRight с переносом по рядам', () => {
    expect(nextIndex(2, 'ArrowRight', 7, 3)).toBe(3);
    expect(nextIndex(6, 'ArrowRight', 7, 3)).toBe(0); // wrap с конца на начало
  });
  it('ArrowLeft', () => {
    expect(nextIndex(3, 'ArrowLeft', 7, 3)).toBe(2);
    expect(nextIndex(0, 'ArrowLeft', 7, 3)).toBe(6);
  });
  it('ArrowDown по колонке', () => {
    expect(nextIndex(1, 'ArrowDown', 7, 3)).toBe(4);
    expect(nextIndex(6, 'ArrowDown', 7, 3)).toBe(6); // некуда — остаёмся
  });
  it('ArrowUp по колонке', () => {
    expect(nextIndex(4, 'ArrowUp', 7, 3)).toBe(1);
  });
  it('Home/End ряда, Ctrl+Home/End стены', () => {
    expect(nextIndex(4, 'Home', 7, 3)).toBe(3);
    expect(nextIndex(4, 'End', 7, 3)).toBe(5);
    expect(nextIndex(4, 'CtrlHome', 7, 3)).toBe(0);
    expect(nextIndex(4, 'CtrlEnd', 7, 3)).toBe(6);
  });
  it('1 колонка — Down/Up как линейный список', () => {
    expect(nextIndex(0, 'ArrowDown', 7, 1)).toBe(1);
    expect(nextIndex(6, 'ArrowDown', 7, 1)).toBe(6);
  });
});

// GridKeyboardController — roving tabindex (happy-dom)
describe('GridKeyboardController', () => {
  let container: HTMLElement;
  let items: HTMLElement[];
  let controller: GridKeyboardController;

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('role', 'grid');
    items = Array.from({ length: 7 }, (_, i) => {
      const el = document.createElement('div');
      el.setAttribute('tabindex', i === 0 ? '0' : '-1');
      el.textContent = `Item ${i}`;
      container.appendChild(el);
      return el;
    });
    document.body.appendChild(container);
    // cols=3, fixed for tests (bypass ResizeObserver)
    controller = new GridKeyboardController(container, items, 3);
  });

  afterEach(() => {
    controller.destroy();
    document.body.removeChild(container);
  });

  it('initial state: item 0 has tabindex=0, rest -1', () => {
    expect(items[0]!.getAttribute('tabindex')).toBe('0');
    expect(items[1]!.getAttribute('tabindex')).toBe('-1');
    expect(items[6]!.getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowRight moves active to next item and updates tabindex', () => {
    // focus item 0 and fire keydown
    items[0]!.focus();
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    container.dispatchEvent(event);
    expect(items[1]!.getAttribute('tabindex')).toBe('0');
    expect(items[0]!.getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowLeft from item 0 wraps to item 6', () => {
    items[0]!.focus();
    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
    container.dispatchEvent(event);
    expect(items[6]!.getAttribute('tabindex')).toBe('0');
    expect(items[0]!.getAttribute('tabindex')).toBe('-1');
  });

  it('setItems updates navigable set; roving tabindex resets to new first item', () => {
    // Simulate filtering: keep only items 0, 1, 2 (first 3)
    const subset = items.slice(0, 3);
    controller.setItems(subset);

    // First item of new set should have tabindex=0
    expect(subset[0]!.getAttribute('tabindex')).toBe('0');
    expect(subset[1]!.getAttribute('tabindex')).toBe('-1');
    expect(subset[2]!.getAttribute('tabindex')).toBe('-1');

    // Items outside new set keep whatever tabindex they had (not managed anymore)
    // — most important: navigation now wraps within new set only
    subset[0]!.focus();
    const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    container.dispatchEvent(rightEvent);
    expect(subset[1]!.getAttribute('tabindex')).toBe('0');
    expect(subset[0]!.getAttribute('tabindex')).toBe('-1');

    // ArrowLeft from first should wrap to last of new set (index 2)
    subset[0]!.focus();
    // Reset active to 0 via internal state (focus item[0] and move back via Left)
    // First move back to item 0 being "active"
    controller.setItems(subset);
    subset[0]!.focus();
    const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
    container.dispatchEvent(leftEvent);
    // With 3 items: index 0 ArrowLeft → wraps to index 2
    expect(subset[2]!.getAttribute('tabindex')).toBe('0');
    expect(subset[0]!.getAttribute('tabindex')).toBe('-1');
  });
});
