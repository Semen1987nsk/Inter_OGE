/**
 * <lab-power-source voltage="4.5" on>
 *
 * Батарейный блок/источник питания — прямоугольный корпус с ручкой
 * регулировки напряжения (диск-ручка с риской), «+»/«−» клеммами
 * сверху и маркировкой диапазона. Стиль — реальное учебное оборудование
 * (Химлабо/Лабосфера): синий/тёмный корпус, жёлтые клеммы, белая
 * подпись «В» на шкале.
 *
 * Атрибуты:
 *   voltage="4.5"   — текущее напряжение (1.5–7.5 В)
 *   on              — источник включён (bool attr)
 *
 * События:
 *   voltage-change {detail:{voltage:number}} — пользователь повернул ручку
 *
 * Геометрический API:
 *   getTerminalPositions(): {plus:{x,y}, minus:{x,y}}
 */

const SVG_W = 110;
const SVG_H = 130;

// Корпус
const BODY_X = 8;
const BODY_Y = 20;
const BODY_W = 94;
const BODY_H = 90;

// Клеммы
const TERM_Y = BODY_Y - 4;           // клеммы торчат над корпусом
const TERM_PLUS_X = BODY_X + 22;
const TERM_MINUS_X = BODY_X + BODY_W - 22;
const TERM_R = 5;

// Ручка регулятора
const KNOB_CX = SVG_W / 2;
const KNOB_CY = BODY_Y + BODY_H - 22;
const KNOB_R = 16;

const V_MIN = 1.5;
const V_MAX = 7.5;

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: inline-block;
    width: ${SVG_W}px;
    height: ${SVG_H}px;
  }
  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  svg[hidden] { display: none; }
  .knob-area {
    cursor: pointer;
  }
  :host(:focus-visible) .focus-ring { opacity: 1; }
  .focus-ring { opacity: 0; fill: none; stroke: var(--color-brand-orange,#ffbe0b); stroke-width: 2.5; stroke-dasharray: 4 3; }
</style>
<svg viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg"
     role="img">
  <defs>
    <linearGradient id="ps-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a3a6b"/>
      <stop offset="40%" stop-color="#0d2145"/>
      <stop offset="100%" stop-color="#081528"/>
    </linearGradient>
    <linearGradient id="ps-body-h" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0a1b45"/>
      <stop offset="8%" stop-color="#1a3a6b"/>
      <stop offset="92%" stop-color="#1a3a6b"/>
      <stop offset="100%" stop-color="#0a1b45"/>
    </linearGradient>
    <linearGradient id="ps-term-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffe066"/>
      <stop offset="45%" stop-color="#ffd700"/>
      <stop offset="100%" stop-color="#b8860b"/>
    </linearGradient>
    <linearGradient id="ps-knob" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#555e70"/>
      <stop offset="50%" stop-color="#2c3445"/>
      <stop offset="100%" stop-color="#1a2030"/>
    </linearGradient>
    <filter id="ps-shadow" x="-10%" y="-5%" width="120%" height="115%">
      <feDropShadow dx="1" dy="3" stdDeviation="3" flood-opacity="0.55"/>
    </filter>
    <filter id="ps-glow-on" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- КОРПУС -->
  <g filter="url(#ps-shadow)">
    <rect x="${BODY_X}" y="${BODY_Y}" width="${BODY_W}" height="${BODY_H}" rx="5"
          fill="url(#ps-body-h)" stroke="#0a1528" stroke-width="0.8"/>
    <!-- Блик верхней грани -->
    <rect x="${BODY_X+1}" y="${BODY_Y+1}" width="${BODY_W-2}" height="3" rx="2.5"
          fill="rgb(255 255 255 / 0.07)"/>
  </g>

  <!-- Полоска «ON» индикатор -->
  <rect class="on-indicator" x="${BODY_X+6}" y="${BODY_Y+8}" width="8" height="4" rx="2"
        fill="#10b981" opacity="0"/>

  <!-- Надпись ЛАБОСФЕРА / тип -->
  <text x="${SVG_W/2}" y="${BODY_Y+16}"
        font-family="var(--font-display,sans-serif)" font-size="5.5"
        font-weight="700" fill="rgb(255 255 255 / 0.45)"
        text-anchor="middle" letter-spacing="0.12em">ЛАБОСФЕРА</text>

  <!-- Шкала напряжения вдоль корпуса (горизонтальная, над ручкой) -->
  <g class="volt-scale" font-family="var(--font-mono,monospace)" font-size="5.5"
     fill="rgb(255 255 255 / 0.6)">
  </g>

  <!-- LCD-плашка с текущим напряжением -->
  <g class="lcd">
    <rect x="${BODY_X+10}" y="${BODY_Y+24}" width="${BODY_W-20}" height="18" rx="3"
          fill="#050c18" stroke="#1a2540" stroke-width="0.6"/>
    <text class="lcd-text"
          x="${BODY_X + 10 + (BODY_W - 20) / 2}" y="${BODY_Y+36}"
          font-family="var(--font-mono,monospace)" font-size="11"
          font-weight="800" fill="var(--color-brand-orange,#ffbe0b)"
          text-anchor="middle">4,5 В</text>
  </g>

  <!-- РУЧКА РЕГУЛЯТОРА -->
  <g class="knob-area" tabindex="0" role="slider"
     aria-label="Ручка регулировки напряжения">
    <!-- Тень ручки -->
    <circle cx="${KNOB_CX}" cy="${KNOB_CY+2}" r="${KNOB_R}" fill="rgb(0 0 0 / 0.35)"/>
    <!-- Основание ручки -->
    <circle cx="${KNOB_CX}" cy="${KNOB_CY}" r="${KNOB_R+2}" fill="#1c2540" stroke="#0a1228" stroke-width="0.6"/>
    <circle cx="${KNOB_CX}" cy="${KNOB_CY}" r="${KNOB_R}" fill="url(#ps-knob)" stroke="#3a4560" stroke-width="0.7"/>
    <!-- Блик -->
    <ellipse cx="${KNOB_CX-4}" cy="${KNOB_CY-5}" rx="4" ry="2.5" fill="rgb(255 255 255 / 0.12)" transform="rotate(-30,${KNOB_CX-4},${KNOB_CY-5})"/>
    <!-- Риска-указатель (вращается) -->
    <line class="knob-mark" x1="${KNOB_CX}" y1="${KNOB_CY}" x2="${KNOB_CX}" y2="${KNOB_CY - KNOB_R + 3}"
          stroke="#ffbe0b" stroke-width="1.8" stroke-linecap="round"/>
  </g>

  <!-- КЛЕММА «+» -->
  <g class="term-plus">
    <circle cx="${TERM_PLUS_X}" cy="${TERM_Y}" r="${TERM_R}" fill="url(#ps-term-gold)" stroke="#8b6500" stroke-width="0.7"/>
    <text x="${TERM_PLUS_X}" y="${TERM_Y + 1.8}"
          font-family="var(--font-display,sans-serif)" font-size="6" font-weight="900"
          fill="#1a0a00" text-anchor="middle" dominant-baseline="middle">+</text>
  </g>

  <!-- КЛЕММА «−» -->
  <g class="term-minus">
    <circle cx="${TERM_MINUS_X}" cy="${TERM_Y}" r="${TERM_R}" fill="#555e70" stroke="#333" stroke-width="0.7"/>
    <text x="${TERM_MINUS_X}" y="${TERM_Y + 1.8}"
          font-family="var(--font-display,sans-serif)" font-size="6" font-weight="900"
          fill="#fff" text-anchor="middle" dominant-baseline="middle">−</text>
  </g>

  <!-- Метки клемм -->
  <text x="${TERM_PLUS_X}" y="${TERM_Y - TERM_R - 2}"
        font-family="var(--font-mono,monospace)" font-size="5" fill="#38bdaf"
        text-anchor="middle" font-weight="700">+</text>
  <text x="${TERM_MINUS_X}" y="${TERM_Y - TERM_R - 2}"
        font-family="var(--font-mono,monospace)" font-size="5" fill="#38bdaf"
        text-anchor="middle" font-weight="700">−</text>

  <!-- Провода к клеммам (визуальная связь с корпусом) -->
  <line x1="${TERM_PLUS_X}" y1="${TERM_Y + TERM_R}" x2="${TERM_PLUS_X}" y2="${BODY_Y}"
        stroke="#ffd700" stroke-width="1.5"/>
  <line x1="${TERM_MINUS_X}" y1="${TERM_Y + TERM_R}" x2="${TERM_MINUS_X}" y2="${BODY_Y}"
        stroke="#888" stroke-width="1.5"/>

  <!-- Подпись «U» диапазон -->
  <text x="${SVG_W/2}" y="${SVG_H - 4}"
        font-family="var(--font-mono,monospace)" font-size="5"
        fill="rgb(255 255 255 / 0.35)" text-anchor="middle">1,5–7,5 В</text>

  <!-- Focus ring -->
  <rect class="focus-ring" x="2" y="2" width="${SVG_W-4}" height="${SVG_H-4}" rx="6"/>
</svg>
`;

export class LabPowerSource extends HTMLElement {
  static observedAttributes = ['voltage', 'on'];

  #lcdText: SVGTextElement;
  #knobMark: SVGLineElement;
  #onIndicator: SVGRectElement;
  #knobArea: SVGGElement;
  #voltScale: SVGGElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.#lcdText = shadow.querySelector('.lcd-text')!;
    this.#knobMark = shadow.querySelector('.knob-mark')!;
    this.#onIndicator = shadow.querySelector('.on-indicator')!;
    this.#knobArea = shadow.querySelector('.knob-area')!;
    this.#voltScale = shadow.querySelector('.volt-scale')!;

    this.#knobArea.addEventListener('click', this.#onKnobClick);
    shadow.querySelector('svg')!.addEventListener('keydown', this.#onKeydown);
  }

  connectedCallback(): void {
    this.#renderScale();
    this.#update();
  }

  attributeChangedCallback(): void {
    this.#renderScale();
    this.#update();
  }

  get voltage(): number {
    return Math.min(V_MAX, Math.max(V_MIN, Number(this.getAttribute('voltage') ?? 4.5)));
  }

  get on(): boolean {
    return this.hasAttribute('on');
  }

  /** Позиции клемм в host-пикселях. */
  getTerminalPositions(): { plus: { x: number; y: number }; minus: { x: number; y: number } } {
    return {
      plus: this.#svgToHost(TERM_PLUS_X, TERM_Y),
      minus: this.#svgToHost(TERM_MINUS_X, TERM_Y),
    };
  }

  #onKnobClick = (): void => {
    // Инкремент по 0.5 В по кругу
    const next = this.voltage >= V_MAX ? V_MIN : this.voltage + 0.5;
    this.setAttribute('voltage', String(next));
    this.dispatchEvent(new CustomEvent('voltage-change', {
      detail: { voltage: next },
      bubbles: true,
      composed: true,
    }));
  };

  #onKeydown = (ev: KeyboardEvent): void => {
    if (ev.key === 'ArrowUp' || ev.key === 'ArrowRight') {
      const next = Math.min(V_MAX, this.voltage + 0.5);
      this.setAttribute('voltage', String(next));
      this.dispatchEvent(new CustomEvent('voltage-change', { detail: { voltage: next }, bubbles: true, composed: true }));
      ev.preventDefault();
    } else if (ev.key === 'ArrowDown' || ev.key === 'ArrowLeft') {
      const next = Math.max(V_MIN, this.voltage - 0.5);
      this.setAttribute('voltage', String(next));
      this.dispatchEvent(new CustomEvent('voltage-change', { detail: { voltage: next }, bubbles: true, composed: true }));
      ev.preventDefault();
    }
  };

  #svgToHost(svgX: number, svgY: number): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return {
      x: (svgX / SVG_W) * rect.width,
      y: (svgY / SVG_H) * rect.height,
    };
  }

  #update(): void {
    const v = this.voltage;
    const text = v.toFixed(1).replace('.', ',') + ' В';
    this.#lcdText.textContent = text;

    // Риска ручки — угол от 220° (V_MIN) до -40° (V_MAX) по дуге 260°
    const ratio = (v - V_MIN) / (V_MAX - V_MIN);
    const angleRad = ((-130 + ratio * 260) * Math.PI) / 180;
    const r = KNOB_R - 3;
    const ex = KNOB_CX + Math.sin(angleRad) * r;
    const ey = KNOB_CY - Math.cos(angleRad) * r;
    this.#knobMark.setAttribute('x2', String(ex));
    this.#knobMark.setAttribute('y2', String(ey));

    // Индикатор ON
    this.#onIndicator.style.opacity = this.on ? '1' : '0';

    // ARIA (не палим ответ — просто диапазон прибора)
    this.setAttribute('aria-label', `Источник питания 1,5–7,5 В`);
  }

  #renderScale(): void {
    this.#voltScale.replaceChildren();
    const steps = [1.5, 3, 4.5, 6, 7.5];
    const scaleY = KNOB_CY - KNOB_R - 10;
    const scaleX0 = BODY_X + 14;
    const scaleW = BODY_W - 28;
    for (const v of steps) {
      const ratio = (v - V_MIN) / (V_MAX - V_MIN);
      const x = scaleX0 + ratio * scaleW;
      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tick.setAttribute('x1', String(x)); tick.setAttribute('y1', String(scaleY - 3));
      tick.setAttribute('x2', String(x)); tick.setAttribute('y2', String(scaleY + 3));
      tick.setAttribute('stroke', 'rgb(255 255 255 / 0.5)');
      tick.setAttribute('stroke-width', '0.8');
      this.#voltScale.appendChild(tick);
      const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl.setAttribute('x', String(x)); lbl.setAttribute('y', String(scaleY - 5));
      lbl.setAttribute('text-anchor', 'middle');
      lbl.textContent = String(v);
      this.#voltScale.appendChild(lbl);
    }
  }
}

customElements.define('lab-power-source', LabPowerSource);
