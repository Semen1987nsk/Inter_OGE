/**
 * <lab-light-object>
 *
 * Осветитель-предмет для оптической скамьи: корпус прибора (housing) со
 * светящейся стрелкой-предметом (upright luminous arrow). Стрелка симулирует
 * реальный осветитель из набора ФИПИ КД №4: точечный источник через щель
 * даёт изображение стрелки на экране.
 *
 * Атрибуты: нет (перетаскивается через D&D; equipmentId='light-object').
 *
 * A11y:
 *   aria-label = «Осветитель» (без числа — §10.4)
 *   role="img" на svg + <title>
 *   svg[hidden]{display:none} — стандарт §27/§28
 */

const SVG_W = 60;
const SVG_H = 100;

// Корпус (housing) — прямоугольный блок внизу
const HSG_X = 10;
const HSG_Y = 62;
const HSG_W = 40;
const HSG_H = 32;
const HSG_RX = 4;

// Стрелка-предмет (upright arrow) — над корпусом, светящаяся
const ARROW_BASE_X = SVG_W / 2;   // центр по x
const ARROW_BASE_Y = HSG_Y - 2;   // основание стрелки у корпуса
const ARROW_TIP_Y = 8;            // кончик стрелки (≥15% viewBox height ≈ 15px)
const ARROW_HEAD_SIZE = 7;        // размер наконечника

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
     aria-labelledby="lo-title">
  <title id="lo-title">Осветитель-предмет</title>
  <defs>
    <radialGradient id="lo-glow" cx="50%" cy="100%" r="60%">
      <stop offset="0%" stop-color="#fff7a0" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#ffd700" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#ffa500" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="lo-housing" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4a5568"/>
      <stop offset="40%" stop-color="#2d3748"/>
      <stop offset="100%" stop-color="#1a202c"/>
    </linearGradient>
    <filter id="lo-arrow-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="lo-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Ореол свечения за стрелкой -->
  <ellipse cx="${ARROW_BASE_X}" cy="${(ARROW_BASE_Y + ARROW_TIP_Y) / 2}"
           rx="14" ry="${(ARROW_BASE_Y - ARROW_TIP_Y) / 2 + 4}"
           fill="url(#lo-glow)" style="pointer-events:none"/>

  <!-- Стрелка-предмет (светящаяся) — upright, luminous -->
  <g class="arrow-object" filter="url(#lo-arrow-glow)">
    <!-- Тело стрелки (вертикальная линия) -->
    <line
      x1="${ARROW_BASE_X}" y1="${ARROW_BASE_Y}"
      x2="${ARROW_BASE_X}" y2="${ARROW_TIP_Y + ARROW_HEAD_SIZE}"
      stroke="#ffd700" stroke-width="3" stroke-linecap="round"/>
    <!-- Наконечник стрелки (треугольник вверх) -->
    <polygon
      points="${ARROW_BASE_X},${ARROW_TIP_Y} ${ARROW_BASE_X - ARROW_HEAD_SIZE / 2},${ARROW_TIP_Y + ARROW_HEAD_SIZE} ${ARROW_BASE_X + ARROW_HEAD_SIZE / 2},${ARROW_TIP_Y + ARROW_HEAD_SIZE}"
      fill="#ffd700" stroke="#ffb800" stroke-width="0.5"/>
    <!-- Основание стрелки (горизонтальная засечка) -->
    <line
      x1="${ARROW_BASE_X - 8}" y1="${ARROW_BASE_Y}"
      x2="${ARROW_BASE_X + 8}" y2="${ARROW_BASE_Y}"
      stroke="#ffd700" stroke-width="2.5" stroke-linecap="round"/>
  </g>

  <!-- Корпус прибора (housing) -->
  <g filter="url(#lo-shadow)">
    <rect x="${HSG_X}" y="${HSG_Y}" width="${HSG_W}" height="${HSG_H}" rx="${HSG_RX}"
          fill="url(#lo-housing)" stroke="#718096" stroke-width="0.8"/>
    <!-- Блик верхней грани -->
    <rect x="${HSG_X + HSG_RX}" y="${HSG_Y + 2}"
          width="${HSG_W - 2 * HSG_RX}" height="4"
          fill="rgb(255 255 255 / 0.12)" rx="1"/>
    <!-- Щель/апертура по центру -->
    <rect x="${SVG_W / 2 - 2}" y="${HSG_Y - 3}"
          width="4" height="8"
          fill="#ffd700" opacity="0.8" rx="1"/>
    <!-- Кнопки/индикаторы корпуса -->
    <circle cx="${HSG_X + 10}" cy="${HSG_Y + HSG_H - 8}" r="3"
            fill="#38bdaf" opacity="0.7"/>
    <circle cx="${HSG_X + 20}" cy="${HSG_Y + HSG_H - 8}" r="3"
            fill="#e53e3e" opacity="0.7"/>
    <!-- Подпись -->
    <text x="${SVG_W / 2}" y="${HSG_Y + 16}"
          font-family="var(--font-mono, monospace)" font-size="7"
          font-weight="700" fill="rgb(255 255 255 / 0.6)"
          text-anchor="middle">ОСВ</text>
  </g>

  <!-- Focus ring -->
  <rect class="focus-ring" x="1" y="1" width="${SVG_W - 2}" height="${SVG_H - 2}" rx="4"/>
</svg>
`;

export class LabLightObject extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.setAttribute('aria-label', 'Осветитель');
  }
}

customElements.define('lab-light-object', LabLightObject);
