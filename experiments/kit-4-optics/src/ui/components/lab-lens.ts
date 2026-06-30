/**
 * <lab-lens focal-mm="100">
 *
 * Линза для оптической скамьи. При focal-mm > 0 — двояковыпуклая собирающая
 * (biconvex converging); при focal-mm < 0 — двояковогнутая рассеивающая
 * (biconcave diverging). Форма линзы (толщина в центре/краях) меняется по
 * значению focal-mm через SVG-path.
 *
 * Атрибуты:
 *   focal-mm — фокусное расстояние в мм; дефолт 100.
 *              >0 → собирающая (biconvex), <0 → рассеивающая (biconcave).
 *
 * Свойства:
 *   focalMm — значение атрибута focal-mm (number, дефолт 100)
 *
 * A11y:
 *   aria-label содержит «F=<value> мм» (без «дптр» — SR не должен палить оптическую силу)
 *   role="img" на svg + <title id="lens-title">
 *   svg[hidden]{display:none}
 */

const SVG_W = 48;
const SVG_H = 80;

const CX = SVG_W / 2;
const CY = SVG_H / 2;

// Апертура линзы: ±28px по вертикали = 70% viewBox
const HALF_H = 28;
const MOUNT_TOP_Y = CY - HALF_H;
const MOUNT_BOT_Y = CY + HALF_H;

// bulge — ширина выпуклости в px; нормируем по |F|: 50→14, 100→9, 200→5
function lensProfile(focalMm: number): { bulge: number; convex: boolean } {
  const f = Math.abs(focalMm);
  const bulge = Math.min(14, Math.max(5, Math.round(700 / f)));
  return { bulge, convex: focalMm > 0 };
}

// Строит SVG-path для двояковыпуклой или двояковогнутой линзы
function buildLensPath(focalMm: number): string {
  const { bulge, convex } = lensProfile(focalMm);
  const top = MOUNT_TOP_Y;
  const bot = MOUNT_BOT_Y;
  const sign = convex ? 1 : -1;

  // Левая поверхность: от (CX,top) кубическим Безье до (CX,bot)
  const leftBulge = CX - sign * bulge;
  // Правая поверхность: от (CX,bot) кубическим Безье до (CX,top)
  const rightBulge = CX + sign * bulge;

  return [
    `M ${CX} ${top}`,
    `C ${leftBulge} ${top} ${leftBulge} ${bot} ${CX} ${bot}`,
    `C ${rightBulge} ${bot} ${rightBulge} ${top} ${CX} ${top}`,
    'Z',
  ].join(' ');
}

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
<svg viewBox="0 0 ${SVG_W} ${SVG_H}"
     xmlns="http://www.w3.org/2000/svg"
     role="img"
     aria-labelledby="lens-title">
  <title id="lens-title">Собирающая линза</title>
  <defs>
    <linearGradient id="lens-glass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#a8d8f0" stop-opacity="0.55"/>
      <stop offset="35%"  stop-color="#d4eeff" stop-opacity="0.85"/>
      <stop offset="55%"  stop-color="#e8f4ff" stop-opacity="0.95"/>
      <stop offset="80%"  stop-color="#c0dcf0" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#90b8d8" stop-opacity="0.5"/>
    </linearGradient>
    <filter id="lens-shadow" x="-20%" y="-5%" width="140%" height="110%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Оправа (тонкие горизонтальные планки сверху и снизу) -->
  <line x1="${CX - 12}" y1="${MOUNT_TOP_Y}" x2="${CX + 12}" y2="${MOUNT_TOP_Y}"
        stroke="#5a6a7a" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="${CX - 12}" y1="${MOUNT_BOT_Y}" x2="${CX + 12}" y2="${MOUNT_BOT_Y}"
        stroke="#5a6a7a" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Тело линзы (glass) -->
  <g filter="url(#lens-shadow)">
    <path class="lens-body" d=""
          fill="url(#lens-glass)"
          stroke="#6ab0d8" stroke-width="1"
          data-shape="convex"/>
  </g>

  <!-- Подпись F= (метаинформация для лаборанта, не SR-ответ) -->
  <text class="focal-label"
        x="${CX}" y="${SVG_H - 4}"
        font-family="var(--font-mono, monospace)" font-size="7"
        font-weight="700" fill="rgb(255 255 255 / 0.65)"
        text-anchor="middle">F=100</text>

  <!-- Focus ring -->
  <rect class="focus-ring" x="1" y="1" width="${SVG_W - 2}" height="${SVG_H - 2}" rx="4"/>
</svg>
`;

export class LabLens extends HTMLElement {
  static observedAttributes = ['focal-mm'] as const;

  readonly #bodyEl: SVGPathElement;
  readonly #titleEl: Element;
  readonly #labelEl: SVGTextElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.#bodyEl = shadow.querySelector('.lens-body')!;
    this.#titleEl = shadow.querySelector('title')!;
    this.#labelEl = shadow.querySelector('.focal-label')!;
  }

  connectedCallback(): void {
    this.#update();
  }

  attributeChangedCallback(): void {
    this.#update();
  }

  /** Фокусное расстояние в мм (из атрибута focal-mm, дефолт 100). */
  get focalMm(): number {
    const v = parseFloat(this.getAttribute('focal-mm') ?? '100');
    return Number.isFinite(v) && v !== 0 ? v : 100;
  }

  #update(): void {
    const f = this.focalMm;
    const absF = Math.abs(f);
    const isConverging = f > 0;
    const shape = isConverging ? 'convex' : 'concave';

    this.#bodyEl.setAttribute('d', buildLensPath(f));
    this.#bodyEl.setAttribute('data-shape', shape);

    const kind = isConverging ? 'Собирающая линза' : 'Рассеивающая линза';
    this.#titleEl.textContent = `${kind}, F=${f} мм`;
    this.#labelEl.textContent = `F=${absF}`;

    // aria-label: содержит «F=<value> мм», НЕ содержит «дптр»
    this.setAttribute('aria-label', `${kind} F=${f} мм`);
  }
}

customElements.define('lab-lens', LabLens);
