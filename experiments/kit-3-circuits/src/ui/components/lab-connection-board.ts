/**
 * <lab-connection-board>
 *
 * Монтажная панель для опытов 3.8 (последовательное соединение) и 3.9
 * (параллельное соединение). Переключается атрибутом topology="series"|"parallel".
 *
 * Два SVG-элемента (#svg-series / #svg-parallel) всегда присутствуют в shadow-root.
 * Активный SVG показан (hidden=false), неактивный — скрыт (hidden=true) И очищен
 * от дочерних узлов (кроме <title>). Это гарантирует:
 *   - «смена topology переключает hidden» — оба SVG видны через querySelector по id.
 *   - «v-pos-* не видны в parallel» — слоты series удалены из DOM неактивного SVG.
 *
 * API (идентичен lab-circuit-board):
 *   getSlotRect(id): DOMRect     — viewport-координаты гнезда активного SVG
 *   setCurrentAnimating(on)      — атрибут current-animating на host
 *
 * A11y: role="img" на host, aria-label по топологии, svg[hidden]{display:none},
 *       <title> в каждом SVG.
 *
 * Слот-контракт series:   source, key, ammeter, r1, r2,
 *                          v-pos-r1, v-pos-r2, v-pos-total
 * Слот-контракт parallel: source, key, voltmeter, r1, r2,
 *                          a-pos-r1, a-pos-r2, a-pos-main
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.3 (сноска 3) п.8, п.9; КОДИФ §1.29.
 */

// ─── Геометрия (SVG-единицы) ─────────────────────────────────────────────────

const SVG_W = 520;
const SVG_H = 340;
const SLOT_W = 72;
const SLOT_H = 48;

// ── Последовательная схема (series) ──────────────────────────────────────────

const SER_RAIL_TOP_Y = 70;
const SER_RAIL_BOT_Y = 270;
const SER_L_X = 30;
const SER_R_X = 490;

const SER_SOURCE_CX  = 80;
const SER_KEY_CX     = 160;
const SER_AMMETER_CX = 245;
const SER_R1_CX      = 330;
const SER_R2_CX      = 415;

const SER_VMID_Y        = (SER_RAIL_TOP_Y + SER_RAIL_BOT_Y) / 2;
const SER_VPOS_R1_CX    = SER_R1_CX;
const SER_VPOS_R2_CX    = SER_R2_CX;
const SER_VPOS_TOTAL_CX = (SER_R1_CX + SER_R2_CX) / 2;

const SER_R1_L_X = SER_R1_CX - SLOT_W / 2;
const SER_R1_R_X = SER_R1_CX + SLOT_W / 2;
const SER_R2_L_X = SER_R2_CX - SLOT_W / 2;
const SER_R2_R_X = SER_R2_CX + SLOT_W / 2;

// ── Параллельная схема (parallel) ────────────────────────────────────────────

const PAR_RAIL_TOP_Y   = 30;
const PAR_RAIL_BOT_Y   = 310;
const PAR_L_NODE_X     = 130;
const PAR_R_NODE_X     = 440;
const PAR_FAR_L_X      = 30;
const PAR_BRANCH_TOP_Y = (PAR_RAIL_TOP_Y + PAR_RAIL_BOT_Y) / 2 - 65;
const PAR_BRANCH_BOT_Y = (PAR_RAIL_TOP_Y + PAR_RAIL_BOT_Y) / 2 + 65;

const PAR_SOURCE_CX    = 50;
const PAR_SOURCE_CY    = 80;
const PAR_KEY_CX       = 50;
const PAR_KEY_CY       = 170;
const PAR_APOS_MAIN_CX = 50;
const PAR_APOS_MAIN_CY = 255;
const PAR_APOS_R1_CX   = (PAR_L_NODE_X + PAR_R_NODE_X) / 2 - 60;
const PAR_APOS_R2_CX   = PAR_APOS_R1_CX;
const PAR_R1_CX        = (PAR_L_NODE_X + PAR_R_NODE_X) / 2 + 60;
const PAR_R2_CX        = PAR_R1_CX;
const PAR_VM_CX        = 490;
const PAR_VM_CY        = (PAR_RAIL_TOP_Y + PAR_RAIL_BOT_Y) / 2;

// ─── Хелпер: строка SVG-гнезда ────────────────────────────────────────────────

function slotG(id: string, cx: number, cy: number, label: string, icon: string, hint = ''): string {
  const x = cx - SLOT_W / 2;
  const y = cy - SLOT_H / 2;
  const hintLine = hint
    ? `<text class="slot-label" x="${SLOT_W / 2}" y="${SLOT_H - 6}" font-size="7" fill="rgb(255 255 255 / 0.25)">${hint}</text>`
    : '';
  return (
    `<g data-slot="${id}" class="circuit-slot" transform="translate(${x}, ${y})">` +
    `<rect class="slot-rect" x="0" y="0" width="${SLOT_W}" height="${SLOT_H}" rx="6"/>` +
    `<text class="slot-label slot-label-top" x="${SLOT_W / 2}" y="11">${label}</text>` +
    `<text class="slot-label" x="${SLOT_W / 2}" y="${SLOT_H / 2 + 4}" font-size="11" fill="rgb(255 255 255 / 0.2)">${icon}</text>` +
    hintLine +
    `</g>`
  );
}

// ─── Внутреннее содержимое SVG (без корневого тега — вставляем innerHTML) ────

function seriesInnerHtml(): string {
  return (
    `<title id="ser-title">Монтажная панель — последовательное соединение R1 и R2 (опыт 3.8)</title>` +
    `<line class="rail" x1="${SER_L_X}" y1="${SER_RAIL_TOP_Y}" x2="${SER_L_X}" y2="${SER_RAIL_BOT_Y}"/>` +
    `<line class="rail" x1="${SER_L_X}" y1="${SER_RAIL_TOP_Y}" x2="${SER_R_X}" y2="${SER_RAIL_TOP_Y}"/>` +
    `<line class="rail" x1="${SER_L_X}" y1="${SER_RAIL_BOT_Y}" x2="${SER_R_X}" y2="${SER_RAIL_BOT_Y}"/>` +
    `<line class="rail" x1="${SER_R_X}" y1="${SER_RAIL_TOP_Y}" x2="${SER_R_X}" y2="${SER_RAIL_BOT_Y}"/>` +
    `<polygon class="current-arrow" style="animation-delay:0s"` +
    ` points="${SER_L_X + 10},${SER_RAIL_TOP_Y - 5} ${SER_L_X + 22},${SER_RAIL_TOP_Y} ${SER_L_X + 10},${SER_RAIL_TOP_Y + 5}"/>` +
    `<polygon class="current-arrow" style="animation-delay:0.4s"` +
    ` points="${SER_R1_CX},${SER_RAIL_TOP_Y - 5} ${SER_R1_CX + 12},${SER_RAIL_TOP_Y} ${SER_R1_CX},${SER_RAIL_TOP_Y + 5}"/>` +
    `<polygon class="current-arrow" style="animation-delay:0.7s"` +
    ` points="${SER_R2_CX + 10},${SER_RAIL_BOT_Y - 5} ${SER_R2_CX - 2},${SER_RAIL_BOT_Y} ${SER_R2_CX + 10},${SER_RAIL_BOT_Y + 5}"/>` +
    slotG('source',  SER_SOURCE_CX,  SER_RAIL_TOP_Y, 'Источник',    '+ -') +
    slotG('key',     SER_KEY_CX,     SER_RAIL_TOP_Y, 'Ключ',        'SW') +
    slotG('ammeter', SER_AMMETER_CX, SER_RAIL_TOP_Y, 'Амперметр',   'A') +
    slotG('r1',      SER_R1_CX,      SER_RAIL_TOP_Y, 'Резистор R1', 'R1') +
    slotG('r2',      SER_R2_CX,      SER_RAIL_TOP_Y, 'Резистор R2', 'R2') +
    `<line class="rail-parallel" x1="${SER_R1_L_X}" y1="${SER_RAIL_TOP_Y}" x2="${SER_R1_L_X}" y2="${SER_VMID_Y - SLOT_H / 2}"/>` +
    `<line class="rail-parallel" x1="${SER_R1_R_X}" y1="${SER_RAIL_TOP_Y}" x2="${SER_R1_R_X}" y2="${SER_VMID_Y - SLOT_H / 2}"/>` +
    `<line class="rail-parallel" x1="${SER_R1_L_X}" y1="${SER_VMID_Y + SLOT_H / 2}" x2="${SER_R1_L_X}" y2="${SER_RAIL_BOT_Y}"/>` +
    `<line class="rail-parallel" x1="${SER_R1_R_X}" y1="${SER_VMID_Y + SLOT_H / 2}" x2="${SER_R1_R_X}" y2="${SER_RAIL_BOT_Y}"/>` +
    `<line class="rail-parallel" x1="${SER_R1_L_X}" y1="${SER_VMID_Y}" x2="${SER_VPOS_R1_CX - SLOT_W / 2}" y2="${SER_VMID_Y}"/>` +
    `<line class="rail-parallel" x1="${SER_VPOS_R1_CX + SLOT_W / 2}" y1="${SER_VMID_Y}" x2="${SER_R1_R_X}" y2="${SER_VMID_Y}"/>` +
    `<line class="rail-parallel" x1="${SER_R2_L_X}" y1="${SER_RAIL_TOP_Y}" x2="${SER_R2_L_X}" y2="${SER_VMID_Y - SLOT_H / 2}"/>` +
    `<line class="rail-parallel" x1="${SER_R2_R_X}" y1="${SER_RAIL_TOP_Y}" x2="${SER_R2_R_X}" y2="${SER_VMID_Y - SLOT_H / 2}"/>` +
    `<line class="rail-parallel" x1="${SER_R2_L_X}" y1="${SER_VMID_Y + SLOT_H / 2}" x2="${SER_R2_L_X}" y2="${SER_RAIL_BOT_Y}"/>` +
    `<line class="rail-parallel" x1="${SER_R2_R_X}" y1="${SER_VMID_Y + SLOT_H / 2}" x2="${SER_R2_R_X}" y2="${SER_RAIL_BOT_Y}"/>` +
    `<line class="rail-parallel" x1="${SER_R2_L_X}" y1="${SER_VMID_Y}" x2="${SER_VPOS_R2_CX - SLOT_W / 2}" y2="${SER_VMID_Y}"/>` +
    `<line class="rail-parallel" x1="${SER_VPOS_R2_CX + SLOT_W / 2}" y1="${SER_VMID_Y}" x2="${SER_R2_R_X}" y2="${SER_VMID_Y}"/>` +
    slotG('v-pos-r1',    SER_VPOS_R1_CX,    SER_VMID_Y, 'across R1',    'V', 'на R1') +
    slotG('v-pos-r2',    SER_VPOS_R2_CX,    SER_VMID_Y, 'across R2',    'V', 'на R2') +
    slotG('v-pos-total', SER_VPOS_TOTAL_CX, SER_VMID_Y, 'across total', 'V', 'на всю цепь') +
    `<circle class="node-dot" cx="${SER_L_X}" cy="${SER_RAIL_TOP_Y}" r="4"/>` +
    `<circle class="node-dot" cx="${SER_L_X}" cy="${SER_RAIL_BOT_Y}" r="4"/>` +
    `<circle class="node-dot" cx="${SER_R_X}" cy="${SER_RAIL_TOP_Y}" r="4"/>` +
    `<circle class="node-dot" cx="${SER_R_X}" cy="${SER_RAIL_BOT_Y}" r="4"/>` +
    `<circle class="node-dot" cx="${SER_R1_L_X}" cy="${SER_RAIL_TOP_Y}" r="3"/>` +
    `<circle class="node-dot" cx="${SER_R1_L_X}" cy="${SER_RAIL_BOT_Y}" r="3"/>` +
    `<circle class="node-dot" cx="${SER_R2_R_X}" cy="${SER_RAIL_TOP_Y}" r="3"/>` +
    `<circle class="node-dot" cx="${SER_R2_R_X}" cy="${SER_RAIL_BOT_Y}" r="3"/>` +
    `<text x="${SER_L_X - 14}" y="${SER_RAIL_TOP_Y + 4}" font-family="var(--font-mono,monospace)" font-size="12" font-weight="bold" fill="#e63946" text-anchor="middle">+</text>` +
    `<text x="${SER_L_X - 14}" y="${SER_RAIL_BOT_Y + 4}" font-family="var(--font-mono,monospace)" font-size="12" font-weight="bold" fill="#4a90c4" text-anchor="middle">-</text>` +
    `<text x="${SVG_W / 2}" y="${SER_RAIL_TOP_Y - 16}" font-family="var(--font-body, 'Inter', system-ui)" font-size="9" fill="rgb(255 255 255 / 0.3)" text-anchor="middle">Последовательное соединение — опыт 3.8</text>`
  );
}

function parallelInnerHtml(): string {
  return (
    `<title id="par-title">Монтажная панель — параллельное соединение R1 и R2 (опыт 3.9)</title>` +
    `<line class="rail" x1="${PAR_FAR_L_X}" y1="${PAR_RAIL_TOP_Y}" x2="${PAR_L_NODE_X}" y2="${PAR_RAIL_TOP_Y}"/>` +
    `<line class="rail" x1="${PAR_FAR_L_X}" y1="${PAR_RAIL_TOP_Y}" x2="${PAR_FAR_L_X}" y2="${PAR_RAIL_BOT_Y}"/>` +
    `<line class="rail" x1="${PAR_FAR_L_X}" y1="${PAR_RAIL_BOT_Y}" x2="${PAR_L_NODE_X}" y2="${PAR_RAIL_BOT_Y}"/>` +
    `<line class="rail" x1="${PAR_L_NODE_X}" y1="${PAR_BRANCH_TOP_Y}" x2="${PAR_R_NODE_X}" y2="${PAR_BRANCH_TOP_Y}"/>` +
    `<line class="rail" x1="${PAR_L_NODE_X}" y1="${PAR_BRANCH_BOT_Y}" x2="${PAR_R_NODE_X}" y2="${PAR_BRANCH_BOT_Y}"/>` +
    `<line class="rail" x1="${PAR_L_NODE_X}" y1="${PAR_BRANCH_TOP_Y}" x2="${PAR_L_NODE_X}" y2="${PAR_BRANCH_BOT_Y}"/>` +
    `<line class="rail" x1="${PAR_R_NODE_X}" y1="${PAR_BRANCH_TOP_Y}" x2="${PAR_R_NODE_X}" y2="${PAR_BRANCH_BOT_Y}"/>` +
    `<line class="rail" x1="${PAR_R_NODE_X}" y1="${PAR_RAIL_TOP_Y}" x2="${PAR_R_NODE_X + 20}" y2="${PAR_RAIL_TOP_Y}"/>` +
    `<line class="rail" x1="${PAR_R_NODE_X}" y1="${PAR_RAIL_BOT_Y}" x2="${PAR_R_NODE_X + 20}" y2="${PAR_RAIL_BOT_Y}"/>` +
    `<line class="rail" x1="${PAR_R_NODE_X + 20}" y1="${PAR_RAIL_TOP_Y}" x2="${PAR_R_NODE_X + 20}" y2="${PAR_RAIL_BOT_Y}"/>` +
    `<line class="rail-parallel" x1="${PAR_R_NODE_X + 20}" y1="${PAR_RAIL_TOP_Y}" x2="${PAR_VM_CX - SLOT_W / 2}" y2="${PAR_RAIL_TOP_Y}"/>` +
    `<line class="rail-parallel" x1="${PAR_VM_CX + SLOT_W / 2 + 2}" y1="${PAR_RAIL_TOP_Y}" x2="${PAR_VM_CX + SLOT_W / 2 + 10}" y2="${PAR_RAIL_TOP_Y}"/>` +
    `<line class="rail-parallel" x1="${PAR_VM_CX + SLOT_W / 2 + 10}" y1="${PAR_RAIL_TOP_Y}" x2="${PAR_VM_CX + SLOT_W / 2 + 10}" y2="${PAR_RAIL_BOT_Y}"/>` +
    `<line class="rail-parallel" x1="${PAR_R_NODE_X + 20}" y1="${PAR_RAIL_BOT_Y}" x2="${PAR_VM_CX + SLOT_W / 2 + 10}" y2="${PAR_RAIL_BOT_Y}"/>` +
    `<line class="rail-parallel" x1="${PAR_VM_CX - SLOT_W / 2}" y1="${PAR_VM_CY}" x2="${PAR_R_NODE_X + 20}" y2="${PAR_VM_CY}"/>` +
    `<line class="rail-parallel" x1="${PAR_VM_CX + SLOT_W / 2 + 2}" y1="${PAR_VM_CY}" x2="${PAR_VM_CX + SLOT_W / 2 + 10}" y2="${PAR_VM_CY}"/>` +
    `<polygon class="current-arrow" style="animation-delay:0s"` +
    ` points="${PAR_FAR_L_X + 2},${PAR_RAIL_TOP_Y - 5} ${PAR_FAR_L_X + 14},${PAR_RAIL_TOP_Y} ${PAR_FAR_L_X + 2},${PAR_RAIL_TOP_Y + 5}"/>` +
    `<polygon class="current-arrow" style="animation-delay:0.4s"` +
    ` points="${PAR_L_NODE_X + 10},${PAR_BRANCH_TOP_Y - 5} ${PAR_L_NODE_X + 22},${PAR_BRANCH_TOP_Y} ${PAR_L_NODE_X + 10},${PAR_BRANCH_TOP_Y + 5}"/>` +
    `<polygon class="current-arrow" style="animation-delay:0.6s"` +
    ` points="${PAR_L_NODE_X + 10},${PAR_BRANCH_BOT_Y - 5} ${PAR_L_NODE_X + 22},${PAR_BRANCH_BOT_Y} ${PAR_L_NODE_X + 10},${PAR_BRANCH_BOT_Y + 5}"/>` +
    slotG('source',     PAR_SOURCE_CX,    PAR_SOURCE_CY,    'Источник',    '+ -') +
    slotG('key',        PAR_KEY_CX,       PAR_KEY_CY,       'Ключ',        'SW') +
    slotG('a-pos-main', PAR_APOS_MAIN_CX, PAR_APOS_MAIN_CY, 'A главная',   'A', 'ветвь main') +
    slotG('a-pos-r1',  PAR_APOS_R1_CX,  PAR_BRANCH_TOP_Y, 'A ветвь R1', 'A', 'ветвь R1') +
    slotG('r1',         PAR_R1_CX,       PAR_BRANCH_TOP_Y, 'Резистор R1', 'R1') +
    slotG('a-pos-r2',  PAR_APOS_R2_CX,  PAR_BRANCH_BOT_Y, 'A ветвь R2', 'A', 'ветвь R2') +
    slotG('r2',         PAR_R2_CX,       PAR_BRANCH_BOT_Y, 'Резистор R2', 'R2') +
    slotG('voltmeter',  PAR_VM_CX,       PAR_VM_CY,        'Вольтметр',   'V') +
    `<circle class="node-dot" cx="${PAR_FAR_L_X}" cy="${PAR_RAIL_TOP_Y}" r="4"/>` +
    `<circle class="node-dot" cx="${PAR_FAR_L_X}" cy="${PAR_RAIL_BOT_Y}" r="4"/>` +
    `<circle class="node-dot" cx="${PAR_L_NODE_X}" cy="${PAR_BRANCH_TOP_Y}" r="5"/>` +
    `<circle class="node-dot" cx="${PAR_L_NODE_X}" cy="${PAR_BRANCH_BOT_Y}" r="5"/>` +
    `<circle class="node-dot" cx="${PAR_R_NODE_X}" cy="${PAR_BRANCH_TOP_Y}" r="5"/>` +
    `<circle class="node-dot" cx="${PAR_R_NODE_X}" cy="${PAR_BRANCH_BOT_Y}" r="5"/>` +
    `<circle class="node-dot" cx="${PAR_R_NODE_X + 20}" cy="${PAR_RAIL_TOP_Y}" r="3"/>` +
    `<circle class="node-dot" cx="${PAR_R_NODE_X + 20}" cy="${PAR_RAIL_BOT_Y}" r="3"/>` +
    `<text x="${PAR_FAR_L_X - 4}" y="${PAR_RAIL_TOP_Y - 8}" font-family="var(--font-mono,monospace)" font-size="12" font-weight="bold" fill="#e63946" text-anchor="middle">+</text>` +
    `<text x="${PAR_FAR_L_X - 4}" y="${PAR_RAIL_BOT_Y + 14}" font-family="var(--font-mono,monospace)" font-size="12" font-weight="bold" fill="#4a90c4" text-anchor="middle">-</text>` +
    `<text x="${PAR_L_NODE_X}" y="${PAR_BRANCH_TOP_Y - 18}" font-family="var(--font-body, 'Inter', system-ui)" font-size="9" fill="rgb(255 255 255 / 0.3)" text-anchor="middle">узел A (+)</text>` +
    `<text x="${PAR_R_NODE_X}" y="${PAR_BRANCH_TOP_Y - 18}" font-family="var(--font-body, 'Inter', system-ui)" font-size="9" fill="rgb(255 255 255 / 0.3)" text-anchor="middle">узел B (-)</text>` +
    `<text x="${SVG_W / 2 - 30}" y="${PAR_RAIL_TOP_Y - 8}" font-family="var(--font-body, 'Inter', system-ui)" font-size="9" fill="rgb(255 255 255 / 0.3)" text-anchor="middle">Параллельное соединение — опыт 3.9</text>`
  );
}

// ─── Шаблон (стили + пустые SVG-оболочки) ────────────────────────────────────
// Оба SVG всегда присутствуют в shadow-root для совместимости с тестом
// «смена topology переключает hidden». Их содержимое заменяется при переключении,
// чтобы data-slot неактивной топологии не были searchable через shadowRoot.querySelector.

const template = document.createElement('template');
template.innerHTML = `<style>
  :host {
    display: block;
    width: 100%;
    max-width: ${SVG_W}px;
    user-select: none;
  }
  svg { display: block; width: 100%; height: auto; overflow: visible; }
  svg[hidden] { display: none; }

  .rail { stroke: #4a90c4; stroke-width: 3; fill: none; stroke-linecap: round; }
  .rail-parallel {
    stroke: #38bdaf; stroke-width: 1.5; fill: none;
    stroke-dasharray: 6 3; stroke-linecap: round;
  }
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
  .node-dot { fill: #4a90c4; }
  :host(:focus-visible) {
    outline: 2px solid var(--color-brand-orange, #ffbe0b);
    outline-offset: 4px;
    border-radius: 8px;
  }
</style>
<svg id="svg-series" viewBox="0 0 ${SVG_W} ${SVG_H}"
     xmlns="http://www.w3.org/2000/svg"
     role="img" aria-labelledby="ser-title" tabindex="-1">
  <title id="ser-title">Монтажная панель — последовательное соединение</title>
</svg>
<svg id="svg-parallel" hidden viewBox="0 0 ${SVG_W} ${SVG_H}"
     xmlns="http://www.w3.org/2000/svg"
     role="img" aria-labelledby="par-title" tabindex="-1">
  <title id="par-title">Монтажная панель — параллельное соединение</title>
</svg>`;

// ─── Компонент ────────────────────────────────────────────────────────────────

export class LabConnectionBoard extends HTMLElement {
  static observedAttributes = ['topology'];

  #svgSeries: SVGSVGElement | null = null;
  #svgParallel: SVGSVGElement | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.#svgSeries = shadow.querySelector<SVGSVGElement>('#svg-series');
    this.#svgParallel = shadow.querySelector<SVGSVGElement>('#svg-parallel');
  }

  connectedCallback(): void {
    this.setAttribute('role', 'img');
    this.#update(this.getAttribute('topology') ?? 'series');
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === 'topology') {
      this.#update(value ?? 'series');
    }
  }

  /**
   * Переключает активный SVG: заполняет его содержимым нужной топологии и
   * очищает неактивный (кроме <title>) — так data-slot неактивной топологии
   * не видны через shadowRoot.querySelector.
   */
  #update(topology: string): void {
    const ser = this.#svgSeries;
    const par = this.#svgParallel;
    if (!ser || !par) return;

    if (topology === 'parallel') {
      ser.hidden = true;
      par.hidden = false;
      ser.innerHTML = `<title id="ser-title">Монтажная панель — последовательное соединение</title>`;
      par.innerHTML = parallelInnerHtml();
    } else {
      ser.hidden = false;
      par.hidden = true;
      ser.innerHTML = seriesInnerHtml();
      par.innerHTML = `<title id="par-title">Монтажная панель — параллельное соединение</title>`;
    }

    const label =
      topology === 'parallel'
        ? 'Монтажная панель — параллельное соединение R1 и R2 (опыт 3.9)'
        : 'Монтажная панель — последовательное соединение R1 и R2 (опыт 3.8)';
    this.setAttribute('aria-label', label);
  }

  /**
   * Возвращает viewport DOMRect гнезда активного SVG по data-slot id.
   * Если гнездо не найдено — возвращает пустой DOMRect (не бросает).
   */
  getSlotRect(id: string): DOMRect {
    const topology = this.getAttribute('topology') ?? 'series';
    const activeSvg = topology === 'parallel' ? this.#svgParallel : this.#svgSeries;
    const slotEl = activeSvg?.querySelector<SVGGElement>(`[data-slot="${id}"]`);
    return slotEl ? slotEl.getBoundingClientRect() : new DOMRect(0, 0, 0, 0);
  }

  /**
   * Включить/выключить анимацию стрелок тока.
   * Реализуется через атрибут current-animating на host (CSS :host([current-animating])).
   */
  setCurrentAnimating(on: boolean): void {
    if (on) {
      this.setAttribute('current-animating', '');
    } else {
      this.removeAttribute('current-animating');
    }
  }
}

customElements.define('lab-connection-board', LabConnectionBoard);
