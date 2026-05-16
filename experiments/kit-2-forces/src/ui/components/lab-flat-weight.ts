/**
 * <lab-flat-weight mass="100">
 *
 * ПЛОСКИЙ груз для опыта 2.2 «Трение скольжения». В отличие от обычного
 * `<lab-weight>` (висит на крюке пружины), этот лежит ПЛОСКО:
 *   - Без петель сверху и снизу
 *   - Цилиндрическая шайба (вид сбоку)
 *   - Подпись массы по центру
 *   - Лёгкая тень снизу
 *
 * В сцене грузы кладутся в РЯД на брусок (не в стопку с цепочкой петель).
 * Если их много — стопка по высоте.
 *
 * Атрибуты:
 *   mass="100" | "60" | "70" | "80"  — масса в граммах
 *   interactive                       — включает grab-курсор
 *   attached                          — на сцене (отключает основной drag)
 */

const SVG_WIDTH = 64;
const SVG_HEIGHT = 28;

const BODY_X = 4;
const BODY_W = SVG_WIDTH - 8;
const BODY_TOP_Y = 4;
const BODY_H = 18;

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    --weight-w: ${SVG_WIDTH}px;
    --weight-h: ${SVG_HEIGHT}px;
    display: inline-block;
    width: var(--weight-w);
    height: var(--weight-h);
    position: relative;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  :host([interactive]:not([attached])) {
    cursor: grab;
  }

  :host([dragging]) {
    cursor: grabbing;
  }
</style>
<svg viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Хром-цилиндр (вид сбоку): тёмный сверху и снизу, светлый в центре -->
    <linearGradient id="flatw-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--equip-weight-edge, #4a5260)" />
      <stop offset="20%" stop-color="var(--equip-weight-dark, #6e7682)" />
      <stop offset="50%" stop-color="var(--equip-weight-light, #d6dce4)" />
      <stop offset="80%" stop-color="var(--equip-weight, #a8afb8)" />
      <stop offset="100%" stop-color="var(--equip-weight-edge, #4a5260)" />
    </linearGradient>

    <!-- Эллиптическая «крышка» сверху (создаёт ощущение цилиндра) -->
    <linearGradient id="flatw-top" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--equip-weight-light, #d6dce4)" />
      <stop offset="100%" stop-color="var(--equip-weight, #a8afb8)" />
    </linearGradient>

    <filter id="flatw-shadow" x="-10%" y="-10%" width="120%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Тень-«опора» под грузом (если он лежит) -->
  <ellipse class="floor-shadow" cx="${SVG_WIDTH / 2}" cy="${SVG_HEIGHT - 1}"
           rx="${BODY_W / 2 - 2}" ry="1.5" fill="rgb(0 0 0 / 0.35)" />

  <!-- Корпус-цилиндр (прямоугольник + овальная крышка сверху) -->
  <g filter="url(#flatw-shadow)">
    <rect x="${BODY_X}" y="${BODY_TOP_Y + 2}" width="${BODY_W}" height="${BODY_H - 2}"
          fill="url(#flatw-body)"
          stroke="var(--equip-weight-edge, #4a5260)" stroke-width="0.6" />
    <!-- Эллиптическая крышка сверху (создаёт перспективу) -->
    <ellipse cx="${SVG_WIDTH / 2}" cy="${BODY_TOP_Y + 2}"
             rx="${BODY_W / 2}" ry="2.5"
             fill="url(#flatw-top)"
             stroke="var(--equip-weight-edge, #4a5260)" stroke-width="0.6" />
    <!-- Эллиптический низ (повторяет верх для симметрии) -->
    <ellipse cx="${SVG_WIDTH / 2}" cy="${BODY_TOP_Y + BODY_H}"
             rx="${BODY_W / 2}" ry="2"
             fill="var(--equip-weight-dark, #6e7682)" />
  </g>

  <!-- Наклейка с массой (белая бумажная) -->
  <rect x="${BODY_X + 6}" y="${BODY_TOP_Y + 5}"
        width="${BODY_W - 12}" height="${BODY_H - 9}"
        rx="1.5"
        fill="var(--equip-weight-label-bg, #f8f8f4)"
        stroke="var(--equip-weight-edge, #4a5260)" stroke-width="0.3" />
  <text x="${SVG_WIDTH / 2}" y="${BODY_TOP_Y + BODY_H / 2 + 2}"
        text-anchor="middle"
        font-family="var(--font-display, sans-serif)"
        font-size="9" font-weight="700"
        fill="var(--equip-weight-label-text, #1a1b1f)"
        class="mass-label">100 г</text>
</svg>
`;

export class LabFlatWeight extends HTMLElement {
  static observedAttributes = ['mass', 'interactive', 'number'];

  #shadow: ShadowRoot;
  #massLabel: SVGTextElement;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.appendChild(template.content.cloneNode(true));
    this.#massLabel = this.#shadow.querySelector('.mass-label')!;
    this.#updateLabel();
  }

  connectedCallback(): void {
    if (this.tabIndex < 0 && this.hasAttribute('interactive')) this.tabIndex = 0;
  }

  attributeChangedCallback(name: string): void {
    if (name === 'mass' || name === 'number') this.#updateLabel();
    if (name === 'interactive') {
      this.tabIndex = this.hasAttribute('interactive') ? 0 : -1;
    }
  }

  get mass(): number {
    return Number(this.getAttribute('mass') ?? 100);
  }

  get number(): string | null {
    return this.getAttribute('number');
  }

  /** По ФИПИ на грузе НОМЕР, не масса (ученик взвешивает сам на динамометре). */
  #updateLabel(): void {
    if (this.number !== null) {
      this.#massLabel.textContent = this.number;
      this.setAttribute(
        'aria-label',
        `Плоский груз №${this.number} для бруска. Массу взвесьте на динамометре.`,
      );
    } else {
      this.#massLabel.textContent = '';
      this.setAttribute('aria-label', 'Плоский груз, кладётся на брусок.');
    }
  }
}

customElements.define('lab-flat-weight', LabFlatWeight);
