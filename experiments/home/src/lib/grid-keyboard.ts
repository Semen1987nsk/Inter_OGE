/**
 * grid-keyboard.ts — клавиатурная навигация WAI-ARIA grid pattern.
 *
 * Экспортирует:
 *  - nextIndex(): чистая функция раскладки стрелок (no DOM)
 *  - GridKeyboardController: DOM-обёртка с roving tabindex и ResizeObserver
 */

/**
 * Вычисляет следующий активный индекс на основе нажатой клавиши.
 *
 * @param current  текущий активный индекс (0-based)
 * @param key      одно из: ArrowRight | ArrowLeft | ArrowDown | ArrowUp | Home | End | CtrlHome | CtrlEnd
 * @param count    общее число элементов
 * @param cols     число колонок в сетке
 * @returns новый индекс
 */
export function nextIndex(current: number, key: string, count: number, cols: number): number {
  if (count === 0) return 0;

  const rowOf = (i: number) => Math.floor(i / cols);

  switch (key) {
    case 'ArrowRight':
      // linear wrap across whole list
      return (current + 1) % count;

    case 'ArrowLeft':
      // linear wrap backwards
      return (current - 1 + count) % count;

    case 'ArrowDown': {
      if (cols === 1) {
        // linear list: clamp at last
        return Math.min(current + 1, count - 1);
      }
      const candidate = current + cols;
      // stay put if no cell exists below
      return candidate < count ? candidate : current;
    }

    case 'ArrowUp': {
      if (cols === 1) {
        return Math.max(current - 1, 0);
      }
      const candidate = current - cols;
      return candidate >= 0 ? candidate : current;
    }

    case 'Home': {
      // first cell of current row
      return rowOf(current) * cols;
    }

    case 'End': {
      // last cell of current row (clamped to count-1)
      const rowStart = rowOf(current) * cols;
      const rowEnd = rowStart + cols - 1;
      return Math.min(rowEnd, count - 1);
    }

    case 'CtrlHome':
      return 0;

    case 'CtrlEnd':
      return count - 1;

    default:
      return current;
  }
}

/**
 * GridKeyboardController
 *
 * Wires roving tabindex + arrow/Home/End navigation onto a flat list of DOM elements.
 * cols is auto-computed from ResizeObserver on the container, but can be overridden
 * via the constructor's third argument (useful for tests and SSR).
 *
 * WAI-ARIA grid pattern: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
 */
export class GridKeyboardController {
  private _items: readonly HTMLElement[];
  private _cols: number;
  private _active: number = 0;
  private _observer: ResizeObserver | null = null;
  private _container: HTMLElement;

  constructor(container: HTMLElement, items: HTMLElement[], fixedCols?: number) {
    this._container = container;
    this._items = items;

    if (fixedCols !== undefined) {
      this._cols = fixedCols;
    } else {
      this._cols = this._computeCols();
      this._observer = new ResizeObserver(() => {
        this._cols = this._computeCols();
      });
      this._observer.observe(container);
    }

    // Find currently active item (tabindex=0), default to 0
    const initialActive = items.findIndex(el => el.getAttribute('tabindex') === '0');
    this._active = initialActive >= 0 ? initialActive : 0;

    // Ensure consistent initial state
    this._applyTabindex(this._active);

    container.addEventListener('keydown', this._onKeydown);
  }

  destroy(): void {
    this._observer?.disconnect();
    this._container.removeEventListener('keydown', this._onKeydown);
  }

  private _computeCols(): number {
    const first = this._items[0];
    if (!first) return 1;
    const containerWidth = this._container.getBoundingClientRect().width;
    const itemWidth = first.getBoundingClientRect().width;
    if (itemWidth === 0) return 1;
    return Math.max(1, Math.round(containerWidth / itemWidth));
  }

  private _applyTabindex(activeIdx: number): void {
    this._items.forEach((el, i) => {
      el.setAttribute('tabindex', i === activeIdx ? '0' : '-1');
    });
  }

  private _onKeydown = (e: KeyboardEvent): void => {
    const handled = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
    let key = e.key;

    // Map Ctrl+Home / Ctrl+End to synthetic keys
    if (e.ctrlKey && e.key === 'Home') key = 'CtrlHome';
    if (e.ctrlKey && e.key === 'End') key = 'CtrlEnd';

    if (!handled.includes(e.key) && key !== 'CtrlHome' && key !== 'CtrlEnd') return;

    // Determine which item is currently focused
    const focusedIdx = this._items.findIndex(el => el === document.activeElement);
    const current = focusedIdx >= 0 ? focusedIdx : this._active;

    const next = nextIndex(current, key, this._items.length, this._cols);
    if (next === current && key !== 'Home' && key !== 'End' && key !== 'CtrlHome' && key !== 'CtrlEnd') return;

    e.preventDefault();
    this._active = next;
    this._applyTabindex(next);

    const target = this._items[next];
    if (target) {
      target.focus();
      target.scrollIntoView({ block: 'nearest' });
    }
  };
}
