/**
 * <lab-lamp current="0.3">
 *
 * Лампа накаливания — стеклянная колба с нитью накала и двумя выводами.
 * Используется в опыте 3.4 «ВАХ лампы» как нелинейный элемент.
 *
 * Свечение ∝ min(1, current / 0.5):
 *   current = 0   → лампа тёмная (glow-opacity = 0)
 *   current = 0.5 → полное свечение (glow-opacity = 1)
 *
 * Атрибуты:
 *   current — ток в амперах (≥0, дефолт 0)
 *
 * Геометрический API:
 *   getTerminalPositions(): {a:{x,y}, b:{x,y}}   — выводы (левый=a, правый=b)
 *
 * A11y:
 *   aria-label = «Лампа накаливания» (БЕЗ числа тока — §10.4)
 */

const SVG_W = 80;
const SVG_H = 80;

// Центр колбы
const BULB_CX = SVG_W / 2;
const BULB_CY = 30;
const BULB_RX = 20;
const BULB_RY = 22;

// Цоколь (прямоугольник под колбой)
const BASE_X = BULB_CX - 10;
const BASE_Y = BULB_CY + BULB_RY - 4;
const BASE_W = 20;
const BASE_H = 14;

// Выводы (провода из цоколя)
const LEAD_Y_TOP = BASE_Y + BASE_H;
const LEAD_Y_BOT = SVG_H - 2;
const LEAD_LEFT_X = BULB_CX - 8;
const LEAD_RIGHT_X = BULB_CX + 8;

// Нить накала (W-форма внутри колбы)
const FIL_Y = BULB_CY + 4;
const FIL_X1 = BULB_CX - 8;
const FIL_X2 = BULB_CX + 8;

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: inline-block;
    width: ${SVG_W}px;
    height: ${SVG_H}px;
  }
  svg { display: block; width: 100%; height: 100%; overflow: visible; }
  svg[hidden] { display: none; }
  .focus-ring {
    opacity: 0; fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 2; stroke-dasharray: 4 3;
  }
  :host(:focus-visible) .focus-ring { opacity: 1; }
</style>
<svg viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg" role="img">
  <title>Лампа накаливания</title>
  <defs>
    <!-- Градиент стекла колбы -->
    <radialGradient id="lamp-glass" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#e8f4ff" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#b8d8f0" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#7ab0d8" stop-opacity="0.3"/>
    </radialGradient>
    <!-- Ореол свечения (радиальный градиент, оранжево-жёлтый) -->
    <radialGradient id="lamp-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffd700" stop-opacity="0.9"/>
      <stop offset="40%" stop-color="#ff8c00" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#ff4500" stop-opacity="0"/>
    </radialGradient>
    <!-- Фильтр для нити при свечении -->
    <filter id="lamp-filament-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <!-- Тень колбы -->
    <filter id="lamp-shadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- ОРЕОЛ (за колбой, анимируется opacity) -->
  <ellipse class="glow"
    cx="${BULB_CX}" cy="${BULB_CY}" rx="${BULB_RX + 12}" ry="${BULB_RY + 12}"
    fill="url(#lamp-glow)" opacity="0"
    style="pointer-events:none"/>

  <!-- ВЫВОДЫ (проволоки) -->
  <line x1="${LEAD_LEFT_X}" y1="${LEAD_Y_TOP}" x2="${LEAD_LEFT_X}" y2="${LEAD_Y_BOT}"
        stroke="#c0c8d0" stroke-width="2" stroke-linecap="round"/>
  <line x1="${LEAD_RIGHT_X}" y1="${LEAD_Y_TOP}" x2="${LEAD_RIGHT_X}" y2="${LEAD_Y_BOT}"
        stroke="#c0c8d0" stroke-width="2" stroke-linecap="round"/>

  <!-- ЦОКОЛЬ -->
  <rect x="${BASE_X}" y="${BASE_Y}" width="${BASE_W}" height="${BASE_H}" rx="2"
        fill="#5a6a7a" stroke="#3a4a5a" stroke-width="0.8"/>
  <!-- Бороздки цоколя -->
  <line x1="${BASE_X}" y1="${BASE_Y + 4}" x2="${BASE_X + BASE_W}" y2="${BASE_Y + 4}"
        stroke="#3a4a5a" stroke-width="0.5" opacity="0.6"/>
  <line x1="${BASE_X}" y1="${BASE_Y + 8}" x2="${BASE_X + BASE_W}" y2="${BASE_Y + 8}"
        stroke="#3a4a5a" stroke-width="0.5" opacity="0.6"/>

  <!-- СТЕКЛО КОЛБЫ -->
  <ellipse cx="${BULB_CX}" cy="${BULB_CY}" rx="${BULB_RX}" ry="${BULB_RY}"
    fill="url(#lamp-glass)" stroke="#7ab0d8" stroke-width="1"
    filter="url(#lamp-shadow)"/>

  <!-- Блик на колбе (3D-объём) -->
  <ellipse cx="${BULB_CX - 6}" cy="${BULB_CY - 8}" rx="5" ry="7"
    fill="white" opacity="0.25" transform="rotate(-20, ${BULB_CX - 6}, ${BULB_CY - 8})"/>

  <!-- НИТЬ НАКАЛА (W-форма) -->
  <polyline class="filament"
    points="
      ${FIL_X1},${FIL_Y + 8}
      ${FIL_X1 + 3},${FIL_Y + 2}
      ${FIL_X1 + 6},${FIL_Y + 8}
      ${FIL_X1 + 9},${FIL_Y + 2}
      ${FIL_X1 + 12},${FIL_Y + 8}
      ${FIL_X1 + 15},${FIL_Y + 2}
      ${FIL_X2},${FIL_Y + 8}
    "
    fill="none" stroke="#c87820" stroke-width="1.8" stroke-linecap="round"
    stroke-linejoin="round"/>

  <!-- Focus ring -->
  <rect class="focus-ring" x="1" y="1" width="${SVG_W - 2}" height="${SVG_H - 2}" rx="4"/>
</svg>
`;

export class LabLamp extends HTMLElement {
  static observedAttributes = ['current'];

  #glowEl: SVGEllipseElement;
  #filamentEl: SVGPolylineElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.#glowEl = shadow.querySelector('.glow')!;
    this.#filamentEl = shadow.querySelector('.filament')!;
  }

  connectedCallback(): void {
    this.setAttribute('aria-label', 'Лампа накаливания');
    this.#update();
  }

  attributeChangedCallback(): void {
    this.#update();
  }

  /** Ток через лампу, А (≥0). */
  get current(): number {
    const v = parseFloat(this.getAttribute('current') ?? '0');
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }

  /**
   * Позиции выводов в координатах хост-элемента.
   * a = левый вывод, b = правый вывод.
   */
  getTerminalPositions(): { a: { x: number; y: number }; b: { x: number; y: number } } {
    return {
      a: this.#svgToHost(LEAD_LEFT_X, LEAD_Y_BOT),
      b: this.#svgToHost(LEAD_RIGHT_X, LEAD_Y_BOT),
    };
  }

  #svgToHost(svgX: number, svgY: number): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return { x: (svgX / SVG_W) * rect.width, y: (svgY / SVG_H) * rect.height };
  }

  #update(): void {
    const i = this.current;
    const intensity = Math.min(1, i / 0.5);

    // Ореол: opacity пропорциональна интенсивности
    this.#glowEl.setAttribute('opacity', String(intensity));

    // Нить меняет цвет: тёмная → оранжевая → белая
    if (intensity === 0) {
      this.#filamentEl.setAttribute('stroke', '#c87820');
      this.#filamentEl.setAttribute('filter', '');
    } else {
      // Интерполируем цвет нити от оранжевого к белому
      const r = Math.round(200 + 55 * intensity);
      const g = Math.round(120 + 135 * intensity);
      const b = Math.round(32 + 223 * intensity);
      this.#filamentEl.setAttribute('stroke', `rgb(${r},${g},${b})`);
      this.#filamentEl.setAttribute('filter', intensity > 0.3 ? 'url(#lamp-filament-glow)' : '');
    }
  }
}

customElements.define('lab-lamp', LabLamp);
