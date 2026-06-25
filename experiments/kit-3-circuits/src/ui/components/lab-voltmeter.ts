/**
 * <lab-voltmeter range="3" value="0">
 *
 * Школьный вольтметр — прямоугольный корпус, круглый циферблат
 * с двойной шкалой (0–3 В / 0–6 В), стрелка-указатель, LCD-плашка,
 * две клеммы «+»/«−» снизу. Стиль — реальное учебное оборудование
 * (комплект №3 ФИПИ): светло-серый корпус, тёмный циферблат.
 *
 * Атрибуты:
 *   range="3"|"6"     — предел измерения
 *   value="<V>"       — текущее показание (0..range)
 *
 * Геометрический API:
 *   getTerminalPositions(): {plus:{x,y}, minus:{x,y}}
 */

const SVG_W = 100;
const SVG_H = 120;

// Корпус
const BODY_X = 5;
const BODY_Y = 5;
const BODY_W = 90;
const BODY_H = 100;

// Циферблат (круглый)
const DIAL_CX = SVG_W / 2;
const DIAL_CY = BODY_Y + 46;
const DIAL_R = 34;

// Клеммы внизу корпуса
const TERM_Y = BODY_Y + BODY_H - 6;
const TERM_PLUS_X = SVG_W / 2 - 18;
const TERM_MINUS_X = SVG_W / 2 + 18;
const TERM_R = 5;

// Стрелка — ось вращения в центре циферблата, вращается от -120° до +120°
const NEEDLE_LEN = DIAL_R - 6;    // длина стрелки
const NEEDLE_TAIL = 6;            // хвост

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
  .focus-ring { opacity: 0; fill: none; stroke: var(--color-brand-orange,#ffbe0b); stroke-width: 2.5; stroke-dasharray: 4 3; }
  :host(:focus-visible) .focus-ring { opacity: 1; }
</style>
<svg viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg" role="img">
  <defs>
    <linearGradient id="vm-body" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8a9ab0"/>
      <stop offset="8%" stop-color="#b8c4d2"/>
      <stop offset="50%" stop-color="#dde5ef"/>
      <stop offset="92%" stop-color="#b8c4d2"/>
      <stop offset="100%" stop-color="#8a9ab0"/>
    </linearGradient>
    <linearGradient id="vm-dial" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a1020"/>
      <stop offset="100%" stop-color="#1a2440"/>
    </linearGradient>
    <linearGradient id="vm-term" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffe066"/>
      <stop offset="50%" stop-color="#ffd700"/>
      <stop offset="100%" stop-color="#b8860b"/>
    </linearGradient>
    <filter id="vm-shadow" x="-10%" y="-5%" width="120%" height="115%">
      <feDropShadow dx="1" dy="3" stdDeviation="3" flood-opacity="0.45"/>
    </filter>
    <clipPath id="vm-dial-clip">
      <circle cx="${DIAL_CX}" cy="${DIAL_CY}" r="${DIAL_R}"/>
    </clipPath>
  </defs>

  <!-- КОРПУС -->
  <g filter="url(#vm-shadow)">
    <rect x="${BODY_X}" y="${BODY_Y}" width="${BODY_W}" height="${BODY_H}" rx="5"
          fill="url(#vm-body)" stroke="#4a5568" stroke-width="0.7"/>
    <rect x="${BODY_X+1}" y="${BODY_Y+1}" width="${BODY_W-2}" height="4" rx="4"
          fill="rgb(255 255 255 / 0.2)"/>
  </g>

  <!-- Подпись -->
  <text x="${SVG_W/2}" y="${BODY_Y+11}"
        font-family="var(--font-display,sans-serif)" font-size="5.5"
        font-weight="800" fill="#1a2540" text-anchor="middle"
        letter-spacing="0.1em">ВОЛЬТМЕТР</text>

  <!-- ЦИФЕРБЛАТ -->
  <circle cx="${DIAL_CX}" cy="${DIAL_CY}" r="${DIAL_R+2}" fill="#3a4560" stroke="#1a2040" stroke-width="0.5"/>
  <circle cx="${DIAL_CX}" cy="${DIAL_CY}" r="${DIAL_R}" fill="url(#vm-dial)"/>
  <!-- Белая полоса шкалы -->
  <path class="scale-bg"
        d="M ${DIAL_CX - DIAL_R*0.95} ${DIAL_CY}
           A ${DIAL_R*0.95} ${DIAL_R*0.95} 0 1 1 ${DIAL_CX + DIAL_R*0.95} ${DIAL_CY}"
        fill="none" stroke="rgb(255 255 255 / 0.08)" stroke-width="10"
        clip-path="url(#vm-dial-clip)"/>

  <!-- Шкала (деления генерируются JS) -->
  <g class="scale-ticks"></g>
  <g class="scale-labels" font-family="var(--font-mono,monospace)" font-size="5"
     fill="rgb(255 255 255 / 0.85)"></g>
  <!-- Вторая шкала (другой диапазон) -->
  <g class="scale-labels2" font-family="var(--font-mono,monospace)" font-size="4.5"
     fill="#38bdaf" opacity="0.75"></g>

  <!-- Ось стрелки (точка вращения) -->
  <circle cx="${DIAL_CX}" cy="${DIAL_CY}" r="3" fill="#e0e8f5" stroke="#8a9ab0" stroke-width="0.5"/>

  <!-- СТРЕЛКА (вращается трансформом) -->
  <g class="needle-group">
    <line class="needle"
          x1="${DIAL_CX}" y1="${DIAL_CY + NEEDLE_TAIL}"
          x2="${DIAL_CX}" y2="${DIAL_CY - NEEDLE_LEN}"
          stroke="#e63946" stroke-width="1.4" stroke-linecap="round"/>
    <!-- Хвост стрелки -->
    <circle cx="${DIAL_CX}" cy="${DIAL_CY}" r="2.5" fill="#e63946"/>
  </g>

  <!-- LCD-плашка -->
  <g class="lcd">
    <rect x="${BODY_X+12}" y="${BODY_Y+BODY_H-28}" width="${BODY_W-24}" height="14" rx="2.5"
          fill="#050c18" stroke="#1a2540" stroke-width="0.5"/>
    <text class="lcd-text"
          x="${BODY_X + BODY_W/2}" y="${BODY_Y+BODY_H-18}"
          font-family="var(--font-mono,monospace)" font-size="9" font-weight="800"
          fill="var(--color-brand-orange,#ffbe0b)"
          text-anchor="middle">0,00 В</text>
  </g>

  <!-- КЛЕММА «+» -->
  <g class="term-plus">
    <circle cx="${TERM_PLUS_X}" cy="${TERM_Y}" r="${TERM_R}" fill="url(#vm-term)" stroke="#8b6500" stroke-width="0.7"/>
    <text x="${TERM_PLUS_X}" y="${TERM_Y+1.8}"
          font-family="var(--font-display,sans-serif)" font-size="6" font-weight="900"
          fill="#1a0a00" text-anchor="middle" dominant-baseline="middle">+</text>
  </g>
  <!-- КЛЕММА «−» -->
  <g class="term-minus">
    <circle cx="${TERM_MINUS_X}" cy="${TERM_Y}" r="${TERM_R}" fill="#555e70" stroke="#333" stroke-width="0.7"/>
    <text x="${TERM_MINUS_X}" y="${TERM_Y+1.8}"
          font-family="var(--font-display,sans-serif)" font-size="6" font-weight="900"
          fill="#fff" text-anchor="middle" dominant-baseline="middle">−</text>
  </g>

  <!-- Метки клемм -->
  <text x="${TERM_PLUS_X}" y="${TERM_Y-TERM_R-2}"
        font-family="var(--font-mono,monospace)" font-size="4.5" fill="#ffd700"
        text-anchor="middle" font-weight="700">+</text>
  <text x="${TERM_MINUS_X}" y="${TERM_Y-TERM_R-2}"
        font-family="var(--font-mono,monospace)" font-size="4.5" fill="#aaa"
        text-anchor="middle" font-weight="700">−</text>

  <!-- Focus ring -->
  <rect class="focus-ring" x="2" y="2" width="${SVG_W-4}" height="${SVG_H-4}" rx="5"/>
</svg>
`;

export class LabVoltmeter extends HTMLElement {
  static observedAttributes = ['range', 'value'];

  #needle: SVGLineElement;
  #lcdText: SVGTextElement;
  #scaleTicks: SVGGElement;
  #scaleLabels: SVGGElement;
  #scaleLabels2: SVGGElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.#needle = shadow.querySelector('.needle')!;
    this.#lcdText = shadow.querySelector('.lcd-text')!;
    this.#scaleTicks = shadow.querySelector('.scale-ticks')!;
    this.#scaleLabels = shadow.querySelector('.scale-labels')!;
    this.#scaleLabels2 = shadow.querySelector('.scale-labels2')!;
  }

  connectedCallback(): void {
    this.#renderScale();
    this.#update();
  }

  attributeChangedCallback(): void {
    this.#renderScale();
    this.#update();
  }

  get range(): number {
    const r = this.getAttribute('range');
    return r === '6' ? 6 : 3;
  }

  get value(): number {
    return Math.min(this.range, Math.max(0, Number(this.getAttribute('value') ?? 0)));
  }

  getTerminalPositions(): { plus: { x: number; y: number }; minus: { x: number; y: number } } {
    return {
      plus: this.#svgToHost(TERM_PLUS_X, TERM_Y),
      minus: this.#svgToHost(TERM_MINUS_X, TERM_Y),
    };
  }

  #svgToHost(svgX: number, svgY: number): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return { x: (svgX / SVG_W) * rect.width, y: (svgY / SVG_H) * rect.height };
  }

  #angleForValue(v: number): number {
    // Стрелка: 0 → -120°, range → +120°
    const ratio = Math.max(0, Math.min(1, v / this.range));
    return -120 + ratio * 240;
  }

  #update(): void {
    const v = this.value;
    const angle = this.#angleForValue(v);
    const angleRad = (angle * Math.PI) / 180;
    const nx = DIAL_CX + Math.sin(angleRad) * NEEDLE_LEN;
    const ny = DIAL_CY - Math.cos(angleRad) * NEEDLE_LEN;
    this.#needle.setAttribute('x2', String(nx));
    this.#needle.setAttribute('y2', String(ny));

    const decimals = this.range === 3 ? 2 : 1;
    const text = v.toFixed(decimals).replace('.', ',') + ' В';
    this.#lcdText.textContent = text;

    this.setAttribute('aria-label', `Вольтметр 0–${this.range} В`);
  }

  #renderScale(): void {
    this.#scaleTicks.replaceChildren();
    this.#scaleLabels.replaceChildren();
    this.#scaleLabels2.replaceChildren();

    const range = this.range;
    const altRange = range === 3 ? 6 : 3;
    const majorCount = range === 3 ? 6 : 6;   // 0,1,2,3 или 0,2,4,6

    for (let i = 0; i <= majorCount; i++) {
      const ratio = i / majorCount;
      const angle = -120 + ratio * 240;
      const angleRad = (angle * Math.PI) / 180;

      // Основное деление
      const outerR = DIAL_R - 4;
      const innerR = DIAL_R - 9;
      const ox = DIAL_CX + Math.sin(angleRad) * outerR;
      const oy = DIAL_CY - Math.cos(angleRad) * outerR;
      const ix = DIAL_CX + Math.sin(angleRad) * innerR;
      const iy = DIAL_CY - Math.cos(angleRad) * innerR;

      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', String(ox)); ln.setAttribute('y1', String(oy));
      ln.setAttribute('x2', String(ix)); ln.setAttribute('y2', String(iy));
      ln.setAttribute('stroke', 'rgb(255 255 255 / 0.8)');
      ln.setAttribute('stroke-width', '0.9');
      this.#scaleTicks.appendChild(ln);

      // Цифры основной шкалы (внутри, чуть ближе к центру)
      const labelR = DIAL_R - 15;
      const lx = DIAL_CX + Math.sin(angleRad) * labelR;
      const ly = DIAL_CY - Math.cos(angleRad) * labelR;
      const labelVal = (i * range) / majorCount;
      const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl.setAttribute('x', String(lx)); lbl.setAttribute('y', String(ly + 1.5));
      lbl.setAttribute('text-anchor', 'middle'); lbl.setAttribute('dominant-baseline', 'middle');
      lbl.textContent = labelVal === 0 ? '0' : labelVal.toFixed(range === 3 ? 0 : 0);
      this.#scaleLabels.appendChild(lbl);

      // Вторая шкала (меньше, бирюзовая, ближе к ободу)
      const label2R = DIAL_R - 8;
      const l2x = DIAL_CX + Math.sin(angleRad) * label2R;
      const l2y = DIAL_CY - Math.cos(angleRad) * label2R;
      const altVal = (i * altRange) / majorCount;
      const lbl2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl2.setAttribute('x', String(l2x)); lbl2.setAttribute('y', String(l2y + 1.2));
      lbl2.setAttribute('text-anchor', 'middle'); lbl2.setAttribute('dominant-baseline', 'middle');
      lbl2.setAttribute('font-size', '3.5');
      lbl2.textContent = altVal === 0 ? '' : altVal.toFixed(0);
      this.#scaleLabels2.appendChild(lbl2);
    }

    // Минорные деления
    const minorCount = majorCount * 2;
    for (let i = 0; i < minorCount; i++) {
      const ratio = (i + 0.5) / minorCount;
      const angle = -120 + ratio * 240;
      const angleRad = (angle * Math.PI) / 180;
      const outerR = DIAL_R - 4;
      const innerR = DIAL_R - 7;
      const ox = DIAL_CX + Math.sin(angleRad) * outerR;
      const oy = DIAL_CY - Math.cos(angleRad) * outerR;
      const ix = DIAL_CX + Math.sin(angleRad) * innerR;
      const iy = DIAL_CY - Math.cos(angleRad) * innerR;
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', String(ox)); ln.setAttribute('y1', String(oy));
      ln.setAttribute('x2', String(ix)); ln.setAttribute('y2', String(iy));
      ln.setAttribute('stroke', 'rgb(255 255 255 / 0.45)');
      ln.setAttribute('stroke-width', '0.5');
      this.#scaleTicks.appendChild(ln);
    }
  }
}

customElements.define('lab-voltmeter', LabVoltmeter);
