/**
 * progress-ring.ts — SVG-кольцо прогресса опытов.
 *
 * Экспортирует чистую функцию `ringGeometry` и регистрирует
 * кастом-элемент <progress-ring value max>.
 *
 * CSS var: --ring-color (янтарь по умолчанию).
 * data-neutral — нейтральный серый режим (запланировано).
 * Анимация stroke-dashoffset 700мс при первом маунте;
 * отключается при prefers-reduced-motion.
 */

export interface RingGeometry {
  circumference: number;
  offset: number;
}

/**
 * Вычисляет геометрию кольца прогресса.
 * @param value  текущее значение (clamp в [0, max])
 * @param max    максимум (0 → offset=circumference, без деления на 0)
 * @param radius радиус кольца
 * @param stroke толщина обода (не влияет на формулу; принимается для полноты сигнатуры)
 */
export function ringGeometry(
  value: number,
  max: number,
  radius: number,
  stroke: number,
): RingGeometry {
  void stroke; // геометрически stroke не участвует в расчёте offset
  const circumference = 2 * Math.PI * radius;
  if (max <= 0) {
    return { circumference, offset: circumference };
  }
  const clamped = Math.min(Math.max(value, 0), max);
  const ratio = clamped / max;
  const offset = circumference * (1 - ratio);
  return { circumference, offset };
}

// ──────────────────────────────────────────────────────────────────────────────

const TAG = 'progress-ring';

const AMBER = '#f59e0b';
const NEUTRAL = '#6b7280';
const TRACK = '#e5e7eb';

class ProgressRing extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['value', 'max'];
  }

  private _root: ShadowRoot;
  private _progressCircle: SVGCircleElement | null = null;
  private _mounted = false;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this._render();
    // Анимация при первом маунте: начать с полного offset → плавно к целевому.
    // Откладываем один кадр, чтобы transition уже применилась к элементу.
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReduced && this._progressCircle) {
      const { circumference } = this._geometry();
      // Быстро задать начальное значение без transition.
      this._progressCircle.style.transition = 'none';
      this._progressCircle.style.strokeDashoffset = String(circumference);
      // Следующий кадр — включить transition и задать целевое.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (this._progressCircle) {
            this._progressCircle.style.transition =
              'stroke-dashoffset 700ms cubic-bezier(0.4, 0, 0.2, 1)';
            this._progressCircle.style.strokeDashoffset = String(this._geometry().offset);
          }
        });
      });
    }
    this._mounted = true;
  }

  attributeChangedCallback(_name: string, _old: string | null, _next: string | null): void {
    if (this._mounted) {
      this._update();
    }
  }

  private _geometry(): RingGeometry {
    const value = Number(this.getAttribute('value') ?? 0);
    const max = Number(this.getAttribute('max') ?? 1);
    const radius = 44;
    const stroke = Math.round(radius * 2 * 0.08); // 8% диаметра
    return ringGeometry(value, max, radius, stroke);
  }

  private _strokeWidth(): number {
    const radius = 44;
    return Math.round(radius * 2 * 0.08);
  }

  private _color(): string {
    return this.dataset['neutral'] !== undefined ? NEUTRAL : AMBER;
  }

  private _render(): void {
    const value = Number(this.getAttribute('value') ?? 0);
    const max = Number(this.getAttribute('max') ?? 1);
    const { circumference, offset } = this._geometry();
    const sw = this._strokeWidth();
    const radius = 44;
    const size = (radius + sw) * 2;
    const cx = size / 2;
    const cy = size / 2;

    // Установить aria-label на host.
    this.setAttribute('role', 'img');
    this.setAttribute(
      'aria-label',
      `Прогресс: ${value} из ${max} опытов`,
    );

    // SVG через createElementNS для корректного namespace.
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg') as SVGSVGElement;
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-hidden', 'true'); // aria на host, SVG декоративен
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));

    // Стили через <style> в shadow DOM.
    const style = document.createElement('style');
    style.textContent = `
      :host { display: inline-block; }
      svg { overflow: visible; display: block; }
    `;

    // Track circle (фон).
    const track = document.createElementNS(ns, 'circle') as SVGCircleElement;
    track.setAttribute('cx', String(cx));
    track.setAttribute('cy', String(cy));
    track.setAttribute('r', String(radius));
    track.setAttribute('fill', 'none');
    track.setAttribute('stroke', `var(--ring-track, ${TRACK})`);
    track.setAttribute('stroke-width', String(sw));

    // Progress circle.
    const progress = document.createElementNS(ns, 'circle') as SVGCircleElement;
    progress.setAttribute('cx', String(cx));
    progress.setAttribute('cy', String(cy));
    progress.setAttribute('r', String(radius));
    progress.setAttribute('fill', 'none');
    progress.setAttribute('stroke', `var(--ring-color, ${this._color()})`);
    progress.setAttribute('stroke-width', String(sw));
    progress.setAttribute('stroke-linecap', 'round');
    progress.setAttribute('stroke-dasharray', String(circumference));
    progress.setAttribute('stroke-dashoffset', String(offset));
    // Начало кольца сверху (12 o'clock).
    progress.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);

    svg.append(track, progress);
    this._root.innerHTML = '';
    this._root.append(style, svg);

    this._progressCircle = progress;
  }

  private _update(): void {
    const value = Number(this.getAttribute('value') ?? 0);
    const max = Number(this.getAttribute('max') ?? 1);
    const { offset, circumference } = this._geometry();

    // Обновить aria-label.
    this.setAttribute('aria-label', `Прогресс: ${value} из ${max} опытов`);

    // Обновить только числовые атрибуты SVG-кольца без полного ре-рендера.
    if (this._progressCircle) {
      this._progressCircle.setAttribute('stroke', `var(--ring-color, ${this._color()})`);
      this._progressCircle.setAttribute('stroke-dasharray', String(circumference));
      this._progressCircle.style.strokeDashoffset = String(offset);
    }
  }
}

if (!customElements.get(TAG)) {
  customElements.define(TAG, ProgressRing);
}
