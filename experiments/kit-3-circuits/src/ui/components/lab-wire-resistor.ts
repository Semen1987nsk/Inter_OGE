/**
 * <lab-wire-resistor material="нихром" length="1.0" area="0.25">
 *
 * Проволочный резистор — катушка проволоки на держателе.
 * Используется в опытах 3.5/3.6/3.7 «Сопротивление проводника».
 *
 * Паспортные параметры (отображаются):
 *   material — материал проволоки (нихром/константан/никелин)
 *   length   — длина (м)
 *   area     — площадь поперечного сечения (мм²)
 *
 * R НЕ показывается — ученик измеряет его сам (ФИПИ §10.4).
 *
 * Атрибуты:
 *   material="нихром"|"константан"|"никелин"  (дефолт: "нихром")
 *   length="1.0"   (м, дефолт: 1.0)
 *   area="0.25"    (мм², дефолт: 0.25)
 *
 * Геттеры (только чтение):
 *   material: string
 *   length:   number  (м)
 *   area:     number  (мм²)
 *
 * Геометрический API:
 *   getTerminalPositions(): {plus:{x,y}, minus:{x,y}}
 *   (левый клемм = «+», правый = «−» — для схемы)
 *
 * A11y:
 *   aria-label = «Проволочный резистор: нихром · l=1,0 м · S=0,25 мм²»
 *   (БЕЗ R/Ом — §10.4)
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (сноска 3) пп.5/6/7; КОДИФ §1.29.
 */

const SVG_W = 100;
const SVG_H = 60;

// Держатель (прямоугольная рамка-каркас катушки)
const HOLDER_X = 10;
const HOLDER_Y = 8;
const HOLDER_W = 80;
const HOLDER_H = 36;
const HOLDER_RX = 4;

// Клеммы (выводы — горизонтальные проволоки по бокам)
const TERMINAL_Y = HOLDER_Y + HOLDER_H / 2;
const TERM_LEFT_X1 = 2;
const TERM_LEFT_X2 = HOLDER_X;
const TERM_RIGHT_X1 = HOLDER_X + HOLDER_W;
const TERM_RIGHT_X2 = SVG_W - 2;

// Витки катушки (8 арок по горизонтали внутри держателя)
const COIL_COUNT = 8;
const COIL_INNER_X = HOLDER_X + 4;
const COIL_INNER_W = HOLDER_W - 8;
const COIL_TOP_Y = HOLDER_Y + 5;
const COIL_BOT_Y = HOLDER_Y + HOLDER_H - 5;
const COIL_STEP = COIL_INNER_W / COIL_COUNT;

// Подпись паспорта
const LABEL_Y = SVG_H - 3;

type MaterialId = 'нихром' | 'константан' | 'никелин';

// Цвета витка по материалу (канон: нихром=тёмно-серый, константан=медный, никелин=светло-серый)
const MATERIAL_COLOR: Readonly<Record<MaterialId, string>> = {
  нихром: '#555a60',
  константан: '#b5764a',
  никелин: '#9ca3a8',
} as const;

const VALID_MATERIALS: ReadonlySet<string> = new Set<MaterialId>(['нихром', 'константан', 'никелин']);

function normMaterial(v: string | null): MaterialId {
  return VALID_MATERIALS.has(v ?? '') ? (v as MaterialId) : 'нихром';
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
<svg viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg" role="img">
  <defs>
    <!-- Градиент каркаса держателя -->
    <linearGradient id="wr-holder" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d8dde2"/>
      <stop offset="40%" stop-color="#edf0f3"/>
      <stop offset="100%" stop-color="#b0b8c0"/>
    </linearGradient>
    <!-- Градиент клемм -->
    <linearGradient id="wr-lead" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d0d8e0"/>
      <stop offset="50%" stop-color="#f0f4f8"/>
      <stop offset="100%" stop-color="#a0a8b0"/>
    </linearGradient>
    <!-- Тень держателя -->
    <filter id="wr-shadow" x="-8%" y="-15%" width="116%" height="130%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-opacity="0.35"/>
    </filter>
    <!-- clipPath для витков (не выходят за держатель) -->
    <clipPath id="wr-coil-clip">
      <rect x="${COIL_INNER_X}" y="${COIL_TOP_Y}" width="${COIL_INNER_W}" height="${COIL_BOT_Y - COIL_TOP_Y}"/>
    </clipPath>
  </defs>

  <!-- КЛЕММЫ (под держателем) -->
  <line x1="${TERM_LEFT_X1}" y1="${TERMINAL_Y}" x2="${TERM_LEFT_X2}" y2="${TERMINAL_Y}"
        stroke="url(#wr-lead)" stroke-width="2" stroke-linecap="round"/>
  <line x1="${TERM_RIGHT_X1}" y1="${TERMINAL_Y}" x2="${TERM_RIGHT_X2}" y2="${TERMINAL_Y}"
        stroke="url(#wr-lead)" stroke-width="2" stroke-linecap="round"/>

  <!-- ДЕРЖАТЕЛЬ (каркас катушки) -->
  <g filter="url(#wr-shadow)">
    <rect x="${HOLDER_X}" y="${HOLDER_Y}" width="${HOLDER_W}" height="${HOLDER_H}" rx="${HOLDER_RX}"
          fill="url(#wr-holder)" stroke="#8a9aaa" stroke-width="0.8"/>
    <!-- Блик (3D-объём) -->
    <rect x="${HOLDER_X + HOLDER_RX}" y="${HOLDER_Y + 2}" width="${HOLDER_W - 2 * HOLDER_RX}" height="4"
          fill="rgb(255 255 255 / 0.30)" rx="1"/>
    <!-- Нижняя тень -->
    <rect x="${HOLDER_X + HOLDER_RX}" y="${HOLDER_Y + HOLDER_H - 5}" width="${HOLDER_W - 2 * HOLDER_RX}" height="4"
          fill="rgb(0 0 0 / 0.12)" rx="1"/>
  </g>

  <!-- ВИТКИ КАТУШКИ (группа; stroke устанавливается через #update) -->
  <g class="coil-group" clip-path="url(#wr-coil-clip)">
  </g>

  <!-- ПОДПИСЬ ПАСПОРТА -->
  <text class="passport-label"
        x="${SVG_W / 2}" y="${LABEL_Y}"
        font-family="var(--font-mono,monospace)" font-size="6"
        font-weight="600" fill="rgb(0 0 0 / 0.60)"
        text-anchor="middle"></text>

  <!-- Focus ring -->
  <rect class="focus-ring" x="1" y="1" width="${SVG_W - 2}" height="${SVG_H - 2}" rx="4"/>
</svg>
`;

export class LabWireResistor extends HTMLElement {
  static observedAttributes = ['material', 'length', 'area'];

  #coilGroup: SVGGElement;
  #passportLabel: SVGTextElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.#coilGroup = shadow.querySelector('.coil-group')!;
    this.#passportLabel = shadow.querySelector('.passport-label')!;
  }

  connectedCallback(): void {
    this.#update();
  }

  attributeChangedCallback(): void {
    this.#update();
  }

  /** Материал проволоки. */
  get material(): string {
    return normMaterial(this.getAttribute('material'));
  }

  /** Длина проволоки, м. */
  get length(): number {
    const v = parseFloat(this.getAttribute('length') ?? '1');
    return Number.isFinite(v) && v > 0 ? v : 1;
  }

  /** Площадь поперечного сечения, мм². */
  get area(): number {
    const v = parseFloat(this.getAttribute('area') ?? '0.25');
    return Number.isFinite(v) && v > 0 ? v : 0.25;
  }

  /**
   * Позиции клемм в координатах хост-элемента.
   * plus = левый клемм, minus = правый клемм (условно для схемы).
   */
  getTerminalPositions(): { plus: { x: number; y: number }; minus: { x: number; y: number } } {
    return {
      plus: this.#svgToHost(TERM_LEFT_X1, TERMINAL_Y),
      minus: this.#svgToHost(TERM_RIGHT_X2, TERMINAL_Y),
    };
  }

  #svgToHost(svgX: number, svgY: number): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return { x: (svgX / SVG_W) * rect.width, y: (svgY / SVG_H) * rect.height };
  }

  #update(): void {
    const mat = this.material as MaterialId;
    const len = this.length;
    const ar = this.area;
    const wireColor = MATERIAL_COLOR[mat] ?? MATERIAL_COLOR['нихром'];

    // Перестроить витки катушки
    this.#coilGroup.replaceChildren();
    this.#buildCoils(wireColor);

    // Паспортная подпись: «нихром · l=1,0 м · S=0,25 мм²» (без R)
    const lStr = len.toFixed(1).replace('.', ',');
    const sStr = ar.toFixed(2).replace('.', ',');
    const passport = `${mat} · l=${lStr} м · S=${sStr} мм²`;
    this.#passportLabel.textContent = passport;

    // aria-label = тот же паспорт (без R/Ом)
    this.setAttribute('aria-label', `Проволочный резистор: ${passport}`);
  }

  #buildCoils(wireColor: string): void {
    // Рисуем катушку как набор изогнутых арок (верхние и нижние дуги витков)
    // Каждый виток: верхняя дуга (convex вниз) + нижняя дуга (convex вверх)
    // Арки расположены горизонтально, имитируя намотку
    const midY = (COIL_TOP_Y + COIL_BOT_Y) / 2;

    for (let i = 0; i < COIL_COUNT; i++) {
      const x0 = COIL_INNER_X + i * COIL_STEP;
      const x1 = x0 + COIL_STEP;

      // Верхняя дуга (от x0,midY до x1,midY — выпуклость вверх)
      const topArc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const topD = `M ${x0} ${midY} Q ${(x0 + x1) / 2} ${COIL_TOP_Y - 1} ${x1} ${midY}`;
      topArc.setAttribute('d', topD);
      topArc.setAttribute('fill', 'none');
      topArc.setAttribute('stroke', wireColor);
      topArc.setAttribute('stroke-width', '2');
      topArc.setAttribute('stroke-linecap', 'round');
      topArc.classList.add('coil-wire');
      this.#coilGroup.appendChild(topArc);

      // Нижняя дуга (от x0,midY до x1,midY — выпуклость вниз)
      const botArc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const botD = `M ${x0} ${midY} Q ${(x0 + x1) / 2} ${COIL_BOT_Y + 1} ${x1} ${midY}`;
      botArc.setAttribute('d', botD);
      botArc.setAttribute('fill', 'none');
      botArc.setAttribute('stroke', wireColor);
      botArc.setAttribute('stroke-width', '2');
      botArc.setAttribute('stroke-linecap', 'round');
      botArc.setAttribute('opacity', '0.75');
      this.#coilGroup.appendChild(botArc);
    }

    // Вертикальные перемычки по краям (для замыкания катушки)
    const leftEdge = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    leftEdge.setAttribute('x1', String(COIL_INNER_X));
    leftEdge.setAttribute('y1', String(COIL_TOP_Y - 1));
    leftEdge.setAttribute('x2', String(COIL_INNER_X));
    leftEdge.setAttribute('y2', String(COIL_BOT_Y + 1));
    leftEdge.setAttribute('stroke', wireColor);
    leftEdge.setAttribute('stroke-width', '2');
    leftEdge.setAttribute('stroke-linecap', 'round');
    this.#coilGroup.appendChild(leftEdge);

    const rightEdge = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    rightEdge.setAttribute('x1', String(COIL_INNER_X + COIL_INNER_W));
    rightEdge.setAttribute('y1', String(COIL_TOP_Y - 1));
    rightEdge.setAttribute('x2', String(COIL_INNER_X + COIL_INNER_W));
    rightEdge.setAttribute('y2', String(COIL_BOT_Y + 1));
    rightEdge.setAttribute('stroke', wireColor);
    rightEdge.setAttribute('stroke-width', '2');
    rightEdge.setAttribute('stroke-linecap', 'round');
    this.#coilGroup.appendChild(rightEdge);
  }
}

customElements.define('lab-wire-resistor', LabWireResistor);
