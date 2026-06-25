/**
 * <lab-key closed>
 *
 * Ключ-рубильник — нож-переключатель с двумя контактными стойками.
 * Состояния: открыт (нож поднят 45°) / замкнут (нож горизонтален).
 * Клик по SVG — переключение состояния + событие toggle.
 *
 * Реалистичный вид: металлическая рамка на тёмном основании,
 * медный нож, латунные шарниры и контакты.
 *
 * Атрибуты:
 *   closed    — ключ замкнут (bool attr)
 *
 * События:
 *   toggle {detail:{closed:boolean}} — пользователь нажал
 *
 * Геометрический API:
 *   getTerminalPositions(): {plus:{x,y}, minus:{x,y}}
 *   (левая клемма = «plus», правая = «minus» условно)
 */

const SVG_W = 100;
const SVG_H = 60;

// Основание
const BASE_X = 8;
const BASE_Y = 28;
const BASE_W = 84;
const BASE_H = 20;

// Контактные стойки (левая и правая)
const POST_W = 8;
const POST_H = 18;
const POST_L_X = BASE_X + 10;
const POST_R_X = BASE_X + BASE_W - POST_W - 10;
const POST_Y = BASE_Y - POST_H + 4;

// Шарнир ножа (левый пост)
const HINGE_X = POST_L_X + POST_W / 2;
const HINGE_Y = POST_Y + 4;

// Правый контакт (точка касания)
const CONTACT_X = POST_R_X + POST_W / 2;

// Нож — длина от шарнира до конца
const BLADE_LEN = CONTACT_X - HINGE_X + 4;

// Клеммы (нижние болтики на основании)
const TERM_Y = BASE_Y + BASE_H - 4;
const TERM_L_X = POST_L_X + POST_W / 2;
const TERM_R_X = POST_R_X + POST_W / 2;

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: inline-block;
    width: ${SVG_W}px;
    height: ${SVG_H}px;
    cursor: pointer;
  }
  svg { display: block; width: 100%; height: 100%; overflow: visible; }
  svg[hidden] { display: none; }
  .key-body { cursor: pointer; }
  :host(:focus-visible) .focus-ring { opacity: 1; }
  .focus-ring { opacity: 0; fill: none; stroke: var(--color-brand-orange,#ffbe0b); stroke-width: 2.5; stroke-dasharray: 4 3; }
</style>
<svg viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg"
     role="button" tabindex="0" aria-label="Ключ, разомкнут">
  <defs>
    <linearGradient id="key-base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2a2a3a"/>
      <stop offset="100%" stop-color="#111118"/>
    </linearGradient>
    <linearGradient id="key-post" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8a7040"/>
      <stop offset="40%" stop-color="#d4a830"/>
      <stop offset="60%" stop-color="#d4a830"/>
      <stop offset="100%" stop-color="#8a7040"/>
    </linearGradient>
    <linearGradient id="key-blade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c07820"/>
      <stop offset="35%" stop-color="#e8a840"/>
      <stop offset="65%" stop-color="#e8a840"/>
      <stop offset="100%" stop-color="#9a6010"/>
    </linearGradient>
    <linearGradient id="key-contact" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffe066"/>
      <stop offset="50%" stop-color="#ffd700"/>
      <stop offset="100%" stop-color="#b8860b"/>
    </linearGradient>
    <filter id="key-shadow" x="-10%" y="-15%" width="120%" height="130%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- ОСНОВАНИЕ -->
  <g filter="url(#key-shadow)">
    <rect x="${BASE_X}" y="${BASE_Y}" width="${BASE_W}" height="${BASE_H}" rx="3"
          fill="url(#key-base)" stroke="#050508" stroke-width="0.7"/>
    <!-- Блик -->
    <rect x="${BASE_X+2}" y="${BASE_Y+1}" width="${BASE_W-4}" height="3" rx="1.5"
          fill="rgb(255 255 255 / 0.06)"/>
    <!-- Рельсовые желобки -->
    <line x1="${BASE_X+6}" y1="${BASE_Y+10}" x2="${BASE_X+BASE_W-6}" y2="${BASE_Y+10}"
          stroke="rgb(255 255 255 / 0.05)" stroke-width="1"/>
  </g>

  <!-- СТОЙКА ЛЕВАЯ (шарнирная) -->
  <rect x="${POST_L_X}" y="${POST_Y}" width="${POST_W}" height="${POST_H}" rx="1.5"
        fill="url(#key-post)" stroke="#5a4010" stroke-width="0.5"/>
  <!-- Шарнирный болтик -->
  <circle cx="${HINGE_X}" cy="${HINGE_Y}" r="3.5"
          fill="url(#key-contact)" stroke="#8a6010" stroke-width="0.5"/>
  <circle cx="${HINGE_X}" cy="${HINGE_Y}" r="1.2" fill="#5a3a00"/>

  <!-- СТОЙКА ПРАВАЯ (контактная) -->
  <rect x="${POST_R_X}" y="${POST_Y}" width="${POST_W}" height="${POST_H}" rx="1.5"
        fill="url(#key-post)" stroke="#5a4010" stroke-width="0.5"/>
  <!-- Контактная пластина (верх правой стойки) -->
  <rect x="${POST_R_X - 2}" y="${POST_Y}" width="${POST_W + 4}" height="6" rx="1"
        fill="url(#key-contact)" stroke="#8a6010" stroke-width="0.5"/>

  <!-- НОЖ (поворачивается; начало в шарнире) -->
  <g class="blade-group">
    <!-- Нож (прямоугольник по длинной оси) -->
    <rect class="blade"
          x="${HINGE_X}" y="${HINGE_Y - 3}"
          width="${BLADE_LEN}" height="6"
          rx="2" fill="url(#key-blade)" stroke="#7a5010" stroke-width="0.6"/>
    <!-- Блик на ноже -->
    <rect class="blade-shine"
          x="${HINGE_X + 4}" y="${HINGE_Y - 1.5}"
          width="${BLADE_LEN - 12}" height="2"
          rx="1" fill="rgb(255 255 255 / 0.2)"/>
  </g>

  <!-- Клеммы (болтики снизу основания) -->
  <circle cx="${TERM_L_X}" cy="${TERM_Y}" r="4"
          fill="url(#key-contact)" stroke="#8a6010" stroke-width="0.5"/>
  <circle cx="${TERM_L_X}" cy="${TERM_Y}" r="1.5" fill="#5a3a00"/>
  <circle cx="${TERM_R_X}" cy="${TERM_Y}" r="4"
          fill="#555e70" stroke="#333" stroke-width="0.5"/>
  <circle cx="${TERM_R_X}" cy="${TERM_Y}" r="1.5" fill="#222"/>

  <!-- Подпись -->
  <text x="${SVG_W/2}" y="${SVG_H - 1}"
        font-family="var(--font-mono,monospace)" font-size="5"
        fill="rgb(255 255 255 / 0.3)" text-anchor="middle">К</text>

  <!-- Невидимый клик-слой на весь SVG -->
  <rect class="key-body" x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="transparent"/>

  <!-- Focus ring -->
  <rect class="focus-ring" x="2" y="2" width="${SVG_W-4}" height="${SVG_H-4}" rx="5"/>
</svg>
`;

export class LabKey extends HTMLElement {
  static observedAttributes = ['closed'];

  #bladeGroup: SVGGElement;
  #svg: SVGElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.#bladeGroup = shadow.querySelector('.blade-group')!;
    this.#svg = shadow.querySelector('svg')!;

    this.#svg.addEventListener('click', this.#onClick);
    this.#svg.addEventListener('keydown', this.#onKeydown);
  }

  connectedCallback(): void {
    this.#update();
  }

  attributeChangedCallback(): void {
    this.#update();
  }

  get closed(): boolean {
    return this.hasAttribute('closed');
  }

  getTerminalPositions(): { plus: { x: number; y: number }; minus: { x: number; y: number } } {
    return {
      plus: this.#svgToHost(TERM_L_X, TERM_Y),
      minus: this.#svgToHost(TERM_R_X, TERM_Y),
    };
  }

  #svgToHost(svgX: number, svgY: number): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return { x: (svgX / SVG_W) * rect.width, y: (svgY / SVG_H) * rect.height };
  }

  #onClick = (): void => {
    const next = !this.closed;
    if (next) {
      this.setAttribute('closed', '');
    } else {
      this.removeAttribute('closed');
    }
    this.dispatchEvent(new CustomEvent('toggle', {
      detail: { closed: next },
      bubbles: true,
      composed: true,
    }));
  };

  #onKeydown = (ev: KeyboardEvent): void => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.#onClick();
    }
  };

  #update(): void {
    if (this.closed) {
      // Замкнут: нож горизонтально (0°) — transform по умолчанию (нет rotate)
      this.#bladeGroup.setAttribute('transform', `rotate(0, ${HINGE_X}, ${HINGE_Y})`);
      this.#svg.setAttribute('aria-label', 'Ключ, замкнут');
    } else {
      // Разомкнут: нож поднят на 45° вверх
      this.#bladeGroup.setAttribute('transform', `rotate(-45, ${HINGE_X}, ${HINGE_Y})`);
      this.#svg.setAttribute('aria-label', 'Ключ, разомкнут');
    }
  }
}

customElements.define('lab-key', LabKey);
