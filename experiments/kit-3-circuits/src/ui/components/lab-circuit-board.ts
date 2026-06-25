/**
 * <lab-circuit-board>
 *
 * Монтажная панель (макетная плата) для сборки электрической цепи.
 * Отображает скелет цепи: рельсы-провода + подписанные гнёзда (slots).
 *
 * Топология опыта 3.1 «Сопротивление резистора»:
 *   source → key → ammeter → resistor → (return rail)
 *                                         ↕  (параллельно резистору)
 *                                      voltmeter
 *
 * Атрибуты: нет (конфигурация задаётся через слоты в DOM разметке).
 *
 * API:
 *   getSlotRect(id): DOMRect   — viewport-координаты гнезда (для snap-зоны DragController)
 *   setCurrentAnimating(on)    — включить/выключить анимацию стрелок тока по рельсам
 *                                (отключается при prefers-reduced-motion)
 *
 * A11y:
 *   aria-label на host; role="img" + <title> на SVG; svg[hidden]{display:none}.
 *
 * Гнёзда (data-slot + data-dropzone):
 *   source, key, ammeter, resistor, voltmeter
 */

// ─── Геометрия (SVG-единицы) ──────────────────────────────────────────────────

const SVG_W = 520;
const SVG_H = 340;

// Горизонтальные рельсы (верхний и нижний провод цепи)
const RAIL_TOP_Y = 60;
const RAIL_BOT_Y = 280;
const RAIL_R_X = 480;

// Вертикальные соединения (左-правый ствол)
const BRANCH_L_X = 40;   // левый столб (источник)
const BRANCH_R_X = 480;  // правый столб (возврат)

// Позиции гнёзд (center X, Y) на верхнем рельсе (слева→право в цепи)
const SLOT_SOURCE_X = 80;
const SLOT_KEY_X = 180;
const SLOT_AMMETER_X = 280;
const SLOT_RESISTOR_X = 380;

// Вольтметр — параллельно резистору (ниже, между верхним и нижним рельсом)
const SLOT_VOLTMETER_X = (SLOT_RESISTOR_X + RAIL_R_X) / 2; // ~430
const SLOT_VOLTMETER_Y = (RAIL_TOP_Y + RAIL_BOT_Y) / 2;     // ~170

// Размер гнёзд
const SLOT_W = 72;
const SLOT_H = 48;

// Провода параллельной ветви вольтметра
const VM_BOT_Y = RAIL_BOT_Y;
const VM_L_X = SLOT_RESISTOR_X - 2;   // левее резистора
const VM_R_X = RAIL_R_X;              // правый столб

// ─── Шаблон ───────────────────────────────────────────────────────────────────

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    width: 100%;
    max-width: ${SVG_W}px;
    user-select: none;
  }
  svg { display: block; width: 100%; height: auto; overflow: visible; }
  svg[hidden] { display: none; }

  /* Рельсы */
  .rail { stroke: #4a90c4; stroke-width: 3; fill: none; stroke-linecap: round; }
  .rail-parallel { stroke: #4a90c4; stroke-width: 2; fill: none; stroke-dasharray: 6 3; stroke-linecap: round; }

  /* Гнёзда (slots) */
  .slot-rect {
    fill: #1a2a3a;
    stroke: #38bdaf;
    stroke-width: 1.5;
    rx: 6;
    stroke-dasharray: 5 3;
    cursor: pointer;
    transition: fill 0.15s, stroke 0.15s;
  }
  .slot-rect:hover,
  [data-slot].drop-zone--active .slot-rect {
    fill: #0d3545;
    stroke: #f2c94c;
    stroke-dasharray: none;
    filter: drop-shadow(0 0 6px #f2c94c88);
  }
  .slot-label {
    font-family: var(--font-body, 'Inter', system-ui);
    font-size: 9px;
    fill: rgb(255 255 255 / 0.55);
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
  }
  .slot-label-top {
    font-size: 8px;
    fill: rgb(255 255 255 / 0.35);
  }

  /* Анимация тока — стрелки */
  .current-arrow {
    fill: #38bdaf;
    opacity: 0;
    transition: opacity 0.3s;
  }
  :host([current-animating]) .current-arrow {
    opacity: 1;
    animation: current-flow 1.2s linear infinite;
  }
  @keyframes current-flow {
    0%   { transform: translateX(0); opacity: 0.9; }
    80%  { opacity: 0.9; }
    100% { transform: translateX(40px); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    :host([current-animating]) .current-arrow {
      animation: none;
      opacity: 0.6;
    }
  }

  /* Точки узлов */
  .node-dot { fill: #4a90c4; }

  :host(:focus-visible) {
    outline: 2px solid var(--color-brand-orange, #ffbe0b);
    outline-offset: 4px;
    border-radius: 8px;
  }
</style>

<svg viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-labelledby="board-title" tabindex="-1">
  <title id="board-title">Монтажная панель — схема электрической цепи опыта 3.1</title>

  <defs>
    <!-- Маркер стрелки для рельсов -->
    <marker id="arrow-rail" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#4a90c4"/>
    </marker>
    <marker id="arrow-current" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#38bdaf"/>
    </marker>
  </defs>

  <!-- ════ РЕЛЬСЫ (провода цепи) ════ -->

  <!-- Верхний рельс: левый столб → source → key → ammeter → resistor → правый столб -->
  <!-- Левый вертикальный столб -->
  <line class="rail" x1="${BRANCH_L_X}" y1="${RAIL_TOP_Y}" x2="${BRANCH_L_X}" y2="${RAIL_BOT_Y}"/>
  <!-- Верхний горизонтальный рельс (основная цепь) -->
  <line class="rail" x1="${BRANCH_L_X}" y1="${RAIL_TOP_Y}" x2="${RAIL_R_X}" y2="${RAIL_TOP_Y}"/>
  <!-- Нижний горизонтальный рельс (обратный провод) -->
  <line class="rail" x1="${BRANCH_L_X}" y1="${RAIL_BOT_Y}" x2="${RAIL_R_X}" y2="${RAIL_BOT_Y}"/>
  <!-- Правый вертикальный столб -->
  <line class="rail" x1="${BRANCH_R_X}" y1="${RAIL_TOP_Y}" x2="${BRANCH_R_X}" y2="${RAIL_BOT_Y}"/>

  <!-- Параллельная ветвь вольтметра (пунктир) -->
  <!-- Левая вертикаль параллельной ветви -->
  <line class="rail-parallel" x1="${VM_L_X}" y1="${RAIL_TOP_Y}" x2="${VM_L_X}" y2="${VM_BOT_Y}"/>
  <!-- Вертикаль справа (параллельная ветвь замыкается на правый столб) -->
  <!-- (уже использует правый столб) -->

  <!-- ════ АНИМАЦИЯ ТОКА (стрелки по рельсам) ════ -->
  <!-- Стрелка 1: верхний рельс, левая часть -->
  <polygon class="current-arrow" style="animation-delay:0s"
           points="${BRANCH_L_X + 10},${RAIL_TOP_Y - 5} ${BRANCH_L_X + 20},${RAIL_TOP_Y} ${BRANCH_L_X + 10},${RAIL_TOP_Y + 5}"/>
  <!-- Стрелка 2: верхний рельс, середина -->
  <polygon class="current-arrow" style="animation-delay:0.4s"
           points="${SLOT_AMMETER_X + 10},${RAIL_TOP_Y - 5} ${SLOT_AMMETER_X + 20},${RAIL_TOP_Y} ${SLOT_AMMETER_X + 10},${RAIL_TOP_Y + 5}"/>
  <!-- Стрелка 3: верхний рельс, правая часть -->
  <polygon class="current-arrow" style="animation-delay:0.8s"
           points="${SLOT_RESISTOR_X + 20},${RAIL_TOP_Y - 5} ${SLOT_RESISTOR_X + 30},${RAIL_TOP_Y} ${SLOT_RESISTOR_X + 20},${RAIL_TOP_Y + 5}"/>
  <!-- Стрелка 4: нижний рельс (обратный ток, стрелка влево) -->
  <polygon class="current-arrow" style="animation-delay:0.6s"
           points="${SLOT_AMMETER_X + 20},${RAIL_BOT_Y - 5} ${SLOT_AMMETER_X + 10},${RAIL_BOT_Y} ${SLOT_AMMETER_X + 20},${RAIL_BOT_Y + 5}"/>

  <!-- ════ ГНЁЗДА (slots) ════ -->

  <!-- Источник питания (source) -->
  <g data-slot="source" data-dropzone="source" class="circuit-slot"
     transform="translate(${SLOT_SOURCE_X - SLOT_W/2}, ${RAIL_TOP_Y - SLOT_H/2})">
    <rect class="slot-rect" x="0" y="0" width="${SLOT_W}" height="${SLOT_H}" rx="6"/>
    <text class="slot-label slot-label-top" x="${SLOT_W/2}" y="10">Источник</text>
    <text class="slot-label" x="${SLOT_W/2}" y="${SLOT_H/2 + 4}" font-size="11" fill="rgb(255 255 255 / 0.15)">+ −</text>
    <text class="slot-label" x="${SLOT_W/2}" y="${SLOT_H - 8}" font-size="7" fill="rgb(255 255 255 / 0.2)">power-source</text>
  </g>

  <!-- Ключ (key) -->
  <g data-slot="key" data-dropzone="key" class="circuit-slot"
     transform="translate(${SLOT_KEY_X - SLOT_W/2}, ${RAIL_TOP_Y - SLOT_H/2})">
    <rect class="slot-rect" x="0" y="0" width="${SLOT_W}" height="${SLOT_H}" rx="6"/>
    <text class="slot-label slot-label-top" x="${SLOT_W/2}" y="10">Ключ</text>
    <text class="slot-label" x="${SLOT_W/2}" y="${SLOT_H/2 + 4}" font-size="11" fill="rgb(255 255 255 / 0.15)">SW</text>
    <text class="slot-label" x="${SLOT_W/2}" y="${SLOT_H - 8}" font-size="7" fill="rgb(255 255 255 / 0.2)">key</text>
  </g>

  <!-- Амперметр (ammeter — series) -->
  <g data-slot="ammeter" data-dropzone="ammeter" class="circuit-slot"
     transform="translate(${SLOT_AMMETER_X - SLOT_W/2}, ${RAIL_TOP_Y - SLOT_H/2})">
    <rect class="slot-rect" x="0" y="0" width="${SLOT_W}" height="${SLOT_H}" rx="6"/>
    <text class="slot-label slot-label-top" x="${SLOT_W/2}" y="10">Амперметр</text>
    <text class="slot-label" x="${SLOT_W/2}" y="${SLOT_H/2 + 2}" font-size="13"
          font-family="var(--font-mono,monospace)" font-weight="bold"
          fill="rgb(255 255 255 / 0.2)">А</text>
    <text class="slot-label" x="${SLOT_W/2}" y="${SLOT_H - 8}" font-size="7" fill="rgb(255 255 255 / 0.2)">ammeter</text>
  </g>

  <!-- Резистор (resistor — series) -->
  <g data-slot="resistor" data-dropzone="resistor" class="circuit-slot"
     transform="translate(${SLOT_RESISTOR_X - SLOT_W/2}, ${RAIL_TOP_Y - SLOT_H/2})">
    <rect class="slot-rect" x="0" y="0" width="${SLOT_W}" height="${SLOT_H}" rx="6"/>
    <text class="slot-label slot-label-top" x="${SLOT_W/2}" y="10">Резистор</text>
    <text class="slot-label" x="${SLOT_W/2}" y="${SLOT_H/2 + 2}" font-size="12"
          font-family="var(--font-mono,monospace)"
          fill="rgb(255 255 255 / 0.2)">R Ω</text>
    <text class="slot-label" x="${SLOT_W/2}" y="${SLOT_H - 8}" font-size="7" fill="rgb(255 255 255 / 0.2)">resistor</text>
  </g>

  <!-- Вольтметр (voltmeter — parallel, ниже) -->
  <g data-slot="voltmeter" data-dropzone="voltmeter" class="circuit-slot"
     transform="translate(${SLOT_VOLTMETER_X - SLOT_W/2}, ${SLOT_VOLTMETER_Y - SLOT_H/2})">
    <rect class="slot-rect" x="0" y="0" width="${SLOT_W}" height="${SLOT_H}" rx="6"/>
    <text class="slot-label slot-label-top" x="${SLOT_W/2}" y="10">Вольтметр</text>
    <text class="slot-label" x="${SLOT_W/2}" y="${SLOT_H/2 + 2}" font-size="13"
          font-family="var(--font-mono,monospace)" font-weight="bold"
          fill="rgb(255 255 255 / 0.2)">В</text>
    <text class="slot-label" x="${SLOT_W/2}" y="${SLOT_H - 8}" font-size="7" fill="rgb(255 255 255 / 0.2)">voltmeter</text>
  </g>

  <!-- Параллельные вертикальные подводы к вольтметру -->
  <line class="rail-parallel"
        x1="${VM_L_X}" y1="${RAIL_TOP_Y}"
        x2="${VM_L_X}" y2="${SLOT_VOLTMETER_Y - SLOT_H/2 - 2}"/>
  <line class="rail-parallel"
        x1="${VM_L_X}" y1="${SLOT_VOLTMETER_Y + SLOT_H/2 + 2}"
        x2="${VM_L_X}" y2="${RAIL_BOT_Y}"/>
  <line class="rail-parallel"
        x1="${VM_R_X}" y1="${RAIL_TOP_Y}"
        x2="${VM_R_X}" y2="${SLOT_VOLTMETER_Y - SLOT_H/2 - 2}"/>
  <line class="rail-parallel"
        x1="${VM_R_X}" y1="${SLOT_VOLTMETER_Y + SLOT_H/2 + 2}"
        x2="${VM_R_X}" y2="${RAIL_BOT_Y}"/>

  <!-- Горизонтальные подводы к вольтметру -->
  <line class="rail-parallel"
        x1="${VM_L_X}" y1="${SLOT_VOLTMETER_Y}"
        x2="${SLOT_VOLTMETER_X - SLOT_W/2 - 2}" y2="${SLOT_VOLTMETER_Y}"/>
  <line class="rail-parallel"
        x1="${SLOT_VOLTMETER_X + SLOT_W/2 + 2}" y1="${SLOT_VOLTMETER_Y}"
        x2="${VM_R_X}" y2="${SLOT_VOLTMETER_Y}"/>

  <!-- Узловые точки -->
  <circle class="node-dot" cx="${BRANCH_L_X}" cy="${RAIL_TOP_Y}" r="4"/>
  <circle class="node-dot" cx="${BRANCH_L_X}" cy="${RAIL_BOT_Y}" r="4"/>
  <circle class="node-dot" cx="${BRANCH_R_X}" cy="${RAIL_TOP_Y}" r="4"/>
  <circle class="node-dot" cx="${BRANCH_R_X}" cy="${RAIL_BOT_Y}" r="4"/>
  <circle class="node-dot" cx="${VM_L_X}" cy="${RAIL_TOP_Y}" r="3"/>
  <circle class="node-dot" cx="${VM_L_X}" cy="${RAIL_BOT_Y}" r="3"/>

  <!-- Подписи полюсов источника -->
  <text x="${BRANCH_L_X - 14}" y="${RAIL_TOP_Y + 4}"
        font-family="var(--font-mono,monospace)" font-size="12" font-weight="bold"
        fill="#e63946" text-anchor="middle">+</text>
  <text x="${BRANCH_L_X - 14}" y="${RAIL_BOT_Y + 4}"
        font-family="var(--font-mono,monospace)" font-size="12" font-weight="bold"
        fill="#4a90c4" text-anchor="middle">−</text>

  <!-- Подписи ветвей -->
  <text x="${BRANCH_L_X + 65}" y="${RAIL_TOP_Y - 12}"
        font-family="var(--font-body, 'Inter', system-ui)" font-size="8"
        fill="rgb(255 255 255 / 0.3)" text-anchor="middle">→ последовательная ветвь →</text>
  <text x="${SLOT_VOLTMETER_X}" y="${SLOT_VOLTMETER_Y - SLOT_H/2 - 8}"
        font-family="var(--font-body, 'Inter', system-ui)" font-size="8"
        fill="rgb(255 255 255 / 0.25)" text-anchor="middle">параллельная ветвь</text>
</svg>
`;

// ─── Компонент ────────────────────────────────────────────────────────────────

export class LabCircuitBoard extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', 'Монтажная панель электрической цепи');
  }

  /**
   * Возвращает viewport DOMRect гнезда по его id.
   * Использует теневой DOM-элемент [data-slot=id].
   */
  getSlotRect(id: string): DOMRect {
    const slotEl = this.shadowRoot?.querySelector<SVGGElement>(`[data-slot="${id}"]`);
    if (slotEl) {
      return slotEl.getBoundingClientRect();
    }
    // Если гнездо не найдено — вернуть пустой DOMRect
    return new DOMRect(0, 0, 0, 0);
  }

  /**
   * Включить/выключить анимацию стрелок тока по рельсам.
   * При prefers-reduced-motion — показывает статичные стрелки без анимации.
   */
  setCurrentAnimating(on: boolean): void {
    if (on) {
      this.setAttribute('current-animating', '');
    } else {
      this.removeAttribute('current-animating');
    }
  }
}

customElements.define('lab-circuit-board', LabCircuitBoard);
