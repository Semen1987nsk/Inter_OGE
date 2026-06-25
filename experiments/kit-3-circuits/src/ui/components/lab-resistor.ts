/**
 * <lab-resistor variant="R1">
 *
 * Резистор — цилиндрический корпус с цветовыми кольцами (IEC 60062)
 * и двумя выводами-проволоками. Реалистичный вид реальных резисторов
 * из набора ФИПИ: три номинала R1=4.7 Ом, R2=5.7 Ом, R3=8.2 Ом.
 *
 * Цветовые кольца по стандарту (4-полосный):
 *   R1 4.7 Ом: жёлтый/фиолетовый/золотой/золотой
 *   R2 5.7 Ом: зелёный/фиолетовый/золотой/золотой
 *   R3 8.2 Ом: серый/красный/золотой/золотой
 *
 * Атрибуты:
 *   variant="R1"|"R2"|"R3"
 *
 * Свойства (только чтение):
 *   resistance — сопротивление в Ом
 *
 * Геометрический API:
 *   getTerminalPositions(): {plus:{x,y}, minus:{x,y}}
 *   (левый вывод = «+», правый = «−» условно — для схемы)
 */

const SVG_W = 100;
const SVG_H = 50;

// Корпус резистора (цилиндр в проекции сбоку)
const BODY_X = 22;
const BODY_Y = 12;
const BODY_W = 56;
const BODY_H = 26;
const BODY_RX = 8;      // скругление торцов цилиндра

// Выводы (проволоки)
const LEAD_Y = BODY_Y + BODY_H / 2;
const LEAD_LEFT_X1 = 2;
const LEAD_LEFT_X2 = BODY_X;
const LEAD_RIGHT_X1 = BODY_X + BODY_W;
const LEAD_RIGHT_X2 = SVG_W - 2;

// Цветовые кольца (x-координаты относительно начала тела)
const BAND_W = 4;
const BAND_POSITIONS = [8, 15, 22, BODY_W - 10] as const;   // 4 кольца

type VariantId = 'R1' | 'R2' | 'R3';

const RESISTANCE_MAP: Readonly<Record<VariantId, number>> = {
  R1: 4.7,
  R2: 5.7,
  R3: 8.2,
} as const;

// IEC-цвета колец для каждого варианта [band1, band2, band3-multiplier, band4-tolerance]
const BAND_COLORS: Readonly<Record<VariantId, [string, string, string, string]>> = {
  R1: ['#f5c400', '#8b00ff', '#ffd700', '#ffd700'],  // жёлтый/фиолетовый/золотой/золотой
  R2: ['#2db050', '#8b00ff', '#ffd700', '#ffd700'],  // зелёный/фиолетовый/золотой/золотой
  R3: ['#888888', '#c0392b', '#ffd700', '#ffd700'],  // серый/красный/золотой/золотой
} as const;

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
  .focus-ring { opacity: 0; fill: none; stroke: var(--color-brand-orange,#ffbe0b); stroke-width: 2; stroke-dasharray: 4 3; }
  :host(:focus-visible) .focus-ring { opacity: 1; }
</style>
<svg viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg" role="img">
  <defs>
    <linearGradient id="res-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e8c090"/>
      <stop offset="25%" stop-color="#f5d5a8"/>
      <stop offset="50%" stop-color="#fde8c8"/>
      <stop offset="75%" stop-color="#e8c090"/>
      <stop offset="100%" stop-color="#c49060"/>
    </linearGradient>
    <linearGradient id="res-lead" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d0d8e0"/>
      <stop offset="50%" stop-color="#f0f4f8"/>
      <stop offset="100%" stop-color="#a0a8b0"/>
    </linearGradient>
    <!-- Торец левый (эллипс) -->
    <radialGradient id="res-end-l" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f5d5a8"/>
      <stop offset="100%" stop-color="#b07840"/>
    </radialGradient>
    <radialGradient id="res-end-r" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f5d5a8"/>
      <stop offset="100%" stop-color="#b07840"/>
    </radialGradient>
    <filter id="res-shadow" x="-10%" y="-20%" width="120%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/>
    </filter>
    <!-- clipPath чтобы кольца не выходили за торцы -->
    <clipPath id="res-body-clip">
      <rect x="${BODY_X}" y="${BODY_Y}" width="${BODY_W}" height="${BODY_H}" rx="${BODY_RX}"/>
    </clipPath>
  </defs>

  <!-- ВЫВОДЫ (проволоки) — рисуем ПОД корпусом -->
  <line x1="${LEAD_LEFT_X1}" y1="${LEAD_Y}" x2="${LEAD_LEFT_X2}" y2="${LEAD_Y}"
        stroke="url(#res-lead)" stroke-width="2" stroke-linecap="round"/>
  <line x1="${LEAD_RIGHT_X1}" y1="${LEAD_Y}" x2="${LEAD_RIGHT_X2}" y2="${LEAD_Y}"
        stroke="url(#res-lead)" stroke-width="2" stroke-linecap="round"/>

  <!-- КОРПУС (тело цилиндра) -->
  <g filter="url(#res-shadow)">
    <rect x="${BODY_X}" y="${BODY_Y}" width="${BODY_W}" height="${BODY_H}" rx="${BODY_RX}"
          fill="url(#res-body)" stroke="#8a6040" stroke-width="0.6"/>
    <!-- Блик верхней части (3D-объём) -->
    <rect x="${BODY_X + BODY_RX}" y="${BODY_Y + 2}" width="${BODY_W - 2*BODY_RX}" height="5"
          fill="rgb(255 255 255 / 0.22)"/>
    <!-- Нижняя тень (3D-объём) -->
    <rect x="${BODY_X + BODY_RX}" y="${BODY_Y + BODY_H - 5}" width="${BODY_W - 2*BODY_RX}" height="4"
          fill="rgb(0 0 0 / 0.18)"/>
  </g>

  <!-- ТОРЦЫ (эллипсы для 3D-вида) -->
  <ellipse cx="${BODY_X}" cy="${LEAD_Y}" rx="4" ry="${BODY_H/2 - 1}"
           fill="url(#res-end-l)" stroke="#8a6040" stroke-width="0.5"/>
  <ellipse cx="${BODY_X + BODY_W}" cy="${LEAD_Y}" rx="4" ry="${BODY_H/2 - 1}"
           fill="url(#res-end-r)" stroke="#8a6040" stroke-width="0.5"/>

  <!-- ЦВЕТОВЫЕ КОЛЬЦА (клипируются по корпусу) -->
  <g class="color-bands" clip-path="url(#res-body-clip)">
  </g>

  <!-- Подпись номинала (R1/R2/R3) -->
  <text class="variant-label"
        x="${SVG_W/2}" y="${SVG_H - 2}"
        font-family="var(--font-mono,monospace)" font-size="6.5"
        font-weight="800" fill="rgb(0 0 0 / 0.55)"
        text-anchor="middle">R1</text>

  <!-- Focus ring -->
  <rect class="focus-ring" x="1" y="1" width="${SVG_W-2}" height="${SVG_H-2}" rx="4"/>
</svg>
`;

export class LabResistor extends HTMLElement {
  static observedAttributes = ['variant'];

  #colorBands: SVGGElement;
  #variantLabel: SVGTextElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.#colorBands = shadow.querySelector('.color-bands')!;
    this.#variantLabel = shadow.querySelector('.variant-label')!;
  }

  connectedCallback(): void {
    this.#update();
  }

  attributeChangedCallback(): void {
    this.#update();
  }

  get variant(): VariantId {
    const v = this.getAttribute('variant');
    return (v === 'R2' || v === 'R3') ? v : 'R1';
  }

  /** Сопротивление в Ом (из variant). */
  get resistance(): number {
    return RESISTANCE_MAP[this.variant];
  }

  getTerminalPositions(): { plus: { x: number; y: number }; minus: { x: number; y: number } } {
    return {
      plus: this.#svgToHost(LEAD_LEFT_X1, LEAD_Y),
      minus: this.#svgToHost(LEAD_RIGHT_X2, LEAD_Y),
    };
  }

  #svgToHost(svgX: number, svgY: number): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return { x: (svgX / SVG_W) * rect.width, y: (svgY / SVG_H) * rect.height };
  }

  #update(): void {
    const v = this.variant;
    const colors = BAND_COLORS[v];

    this.#colorBands.replaceChildren();
    for (let i = 0; i < BAND_POSITIONS.length; i++) {
      const bx = BODY_X + (BAND_POSITIONS[i] ?? 0) - BAND_W / 2;
      const color = colors[i as 0 | 1 | 2 | 3] ?? '#888';
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(bx));
      rect.setAttribute('y', String(BODY_Y));
      rect.setAttribute('width', String(BAND_W));
      rect.setAttribute('height', String(BODY_H));
      rect.setAttribute('fill', color);
      rect.setAttribute('opacity', '0.88');
      this.#colorBands.appendChild(rect);

      // Тёмная обводка кольца для контраста
      const edge = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      edge.setAttribute('x', String(bx));
      edge.setAttribute('y', String(BODY_Y));
      edge.setAttribute('width', String(BAND_W));
      edge.setAttribute('height', String(BODY_H));
      edge.setAttribute('fill', 'none');
      edge.setAttribute('stroke', 'rgb(0 0 0 / 0.25)');
      edge.setAttribute('stroke-width', '0.5');
      this.#colorBands.appendChild(edge);
    }

    this.#variantLabel.textContent = v;
    this.setAttribute('aria-label', `Резистор ${v}`);
  }
}

customElements.define('lab-resistor', LabResistor);
