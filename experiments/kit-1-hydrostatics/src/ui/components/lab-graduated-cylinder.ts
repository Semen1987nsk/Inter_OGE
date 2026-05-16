/**
 * <lab-graduated-cylinder level="0" submerged="0">
 *
 * Мензурка 250 мл — реалистичная отрисовка по образцу настоящего комплекта №1 ФИПИ:
 *   - стекло: тройной gradient (boroсиликат), внутренний highlight, мягкая
 *     внешняя подсветка
 *   - шкала: цена деления 2 мл (как требует ФИПИ — С=2 мл!), мажорные подписи
 *     каждые 50 мл, средние tick'и каждые 10 мл, минорные каждые 2 мл
 *   - вода: реалистичный мениск (вогнутая поверхность, лёгкое отражение
 *     внутренней стенки), пузырьки воздуха
 *   - подставка: тёмный лабораторный пластик с текстурой
 *
 * Атрибуты:
 *   level="0..250" — текущий уровень воды без погружения, мл.
 *   submerged="0..N" — объём погружённого тела, мл.
 *
 * События:
 *   cylinder-tap — клик по мензурке.
 */

const SVG_W = 150;
const SVG_H = 280;

// Геометрия (внутренняя область мензурки)
const INNER_X = 28;
const INNER_W = 94;
const TOP_Y = 36;       // верх внутренней полости (отметка 250 мл)
const BOTTOM_Y = 230;   // низ внутренней полости (отметка 0 мл)
const PIXELS_PER_ML = (BOTTOM_Y - TOP_Y) / 250;

const TICK_X_START = INNER_X + INNER_W;
const TICK_LEN_MAJOR = 12;
const TICK_LEN_MID = 8;
const TICK_LEN_MINOR = 4;

/** Сгенерировать SVG-разметку шкалы:
 *  мажорные (каждые 50 мл), средние (каждые 10 мл), минорные (каждые 2 мл).
 */
function generateScale(): string {
  const lines: string[] = [];
  for (let v = 0; v <= 250; v += 2) {
    const y = BOTTOM_Y - v * PIXELS_PER_ML;
    let len: number;
    let cls: string;
    if (v % 50 === 0) {
      len = TICK_LEN_MAJOR;
      cls = 'tick-major';
      lines.push(
        `<text class="scale-major-text" x="${TICK_X_START - 2}" y="${y + 2.5}">${v}</text>`,
      );
    } else if (v % 10 === 0) {
      len = TICK_LEN_MID;
      cls = 'tick-mid';
    } else {
      len = TICK_LEN_MINOR;
      cls = 'tick-minor';
    }
    lines.push(
      `<line class="${cls}" x1="${TICK_X_START}" y1="${y}" x2="${TICK_X_START + len}" y2="${y}" />`,
    );
  }
  return lines.join('\n');
}

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    --glass-stroke: rgba(220, 235, 245, 0.85);
    --glass-stroke-thin: rgba(180, 220, 240, 0.4);
    --water-color: #4ba8d4;
    --water-color-light: #87cae8;
    --water-color-deep: #2c7ea8;
    /* Шкала: высокий контраст для считывания учеником.
       Делениям дают тёмный краевой stroke, чтобы они оставались видимыми
       и на воде (тёмно-синяя), и на стекле (светлое). */
    --scale-stroke: #ffffff;
    --scale-stroke-mid: rgba(255, 255, 255, 0.78);
    --scale-stroke-minor: rgba(255, 255, 255, 0.55);
    --scale-text: #ffffff;
    --scale-text-edge: rgba(0, 0, 0, 0.65);
    --base-color: #1f2530;
    --base-edge: #0a0d12;

    display: inline-block;
    width: 150px;
    cursor: pointer;
  }
  :host([hidden]) { display: none; }
  :host {
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    filter: drop-shadow(0 8px 14px rgb(0 0 0 / 0.4));
    transition: filter 200ms ease-out, transform 200ms ease-out;
  }
  :host(:hover) {
    filter: drop-shadow(0 14px 20px rgb(0 0 0 / 0.55));
    transform: translateY(-2px);
  }
  :host([active]) {
    filter: drop-shadow(0 0 0 2.5px var(--color-brand-orange, #ffbe0b))
            drop-shadow(0 10px 16px rgb(0 0 0 / 0.55));
  }
  :host(:focus-visible) { outline: none; }
  :host(:focus-visible) .focus-ring { opacity: 1; }

  .frame { width: 100%; height: auto; display: block; pointer-events: none; }

  .water-rect {
    transition: y 520ms cubic-bezier(0.34, 0.6, 0.4, 1),
                height 520ms cubic-bezier(0.34, 0.6, 0.4, 1);
  }
  .meniscus {
    transition: cy 520ms cubic-bezier(0.34, 0.6, 0.4, 1),
                opacity 320ms ease-out;
  }
  .bubble {
    opacity: 0;
  }

  .tick-major { stroke: var(--scale-stroke); stroke-width: 1.6; stroke-linecap: round;
                paint-order: stroke; vector-effect: non-scaling-stroke; }
  .tick-mid   { stroke: var(--scale-stroke-mid); stroke-width: 1.1; stroke-linecap: round; }
  .tick-minor { stroke: var(--scale-stroke-minor); stroke-width: 0.7; stroke-linecap: round; }

  .scale-major-text {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 800;
    fill: var(--scale-text);
    /* Двойная заливка: тёмный обводка снаружи + белая заливка внутри —
       цифры остаются читаемыми и на синей воде, и на светлом стекле. */
    paint-order: stroke;
    stroke: var(--scale-text-edge);
    stroke-width: 0.9px;
    stroke-linejoin: round;
    text-anchor: end;
    dominant-baseline: middle;
  }
  .label-text {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 7px;
    font-weight: 800;
    fill: rgba(255, 255, 255, 0.78);
    text-anchor: middle;
    letter-spacing: 0.10em;
    text-transform: uppercase;
  }
  .label-cap {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 6.5px;
    font-weight: 700;
    fill: rgba(255, 255, 255, 0.55);
    text-anchor: middle;
    letter-spacing: 0.04em;
  }
  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 5 3;
    opacity: 0;
    transition: opacity 150ms;
  }
</style>

<svg class="frame" viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <!-- Стекло: тройной gradient — края светлее, центр прозрачнее -->
    <linearGradient id="cylGlass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(255,255,255,0.28)" />
      <stop offset="12%" stop-color="rgba(200,230,245,0.20)" />
      <stop offset="35%" stop-color="rgba(180,220,240,0.06)" />
      <stop offset="65%" stop-color="rgba(180,220,240,0.06)" />
      <stop offset="88%" stop-color="rgba(200,230,245,0.20)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.28)" />
    </linearGradient>
    <!-- Стекло горловины (носик) -->
    <linearGradient id="cylSpout" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(255,255,255,0.32)" />
      <stop offset="50%" stop-color="rgba(180,220,240,0.10)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.32)" />
    </linearGradient>
    <!-- Вода: верх светлее, низ темнее -->
    <linearGradient id="cylWater" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--water-color-light)" stop-opacity="0.85" />
      <stop offset="40%" stop-color="var(--water-color)" stop-opacity="0.92" />
      <stop offset="100%" stop-color="var(--water-color-deep)" stop-opacity="0.96" />
    </linearGradient>
    <!-- Боковое отражение в воде -->
    <linearGradient id="cylWaterSide" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(255,255,255,0.30)" />
      <stop offset="20%" stop-color="rgba(255,255,255,0.05)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.05)" />
    </linearGradient>
    <!-- Мениск (поверхность воды): эллипс с лёгким отражением -->
    <radialGradient id="cylMeniscusGrad" cx="0.5" cy="0.3" r="0.6">
      <stop offset="0%" stop-color="rgba(255,255,255,0.5)" />
      <stop offset="40%" stop-color="var(--water-color-light)" stop-opacity="0.7" />
      <stop offset="100%" stop-color="var(--water-color)" stop-opacity="0.4" />
    </radialGradient>
    <!-- Подставка -->
    <linearGradient id="cylBaseGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3a4150" />
      <stop offset="50%" stop-color="var(--base-color)" />
      <stop offset="100%" stop-color="var(--base-edge)" />
    </linearGradient>
    <!-- ClipPath для воды -->
    <clipPath id="cylInnerClip">
      <rect x="${INNER_X}" y="${TOP_Y}" width="${INNER_W}" height="${BOTTOM_Y - TOP_Y}" rx="2" />
    </clipPath>
  </defs>

  <!-- Тень -->
  <ellipse cx="${SVG_W / 2}" cy="${SVG_H - 4}" rx="58" ry="3" fill="rgba(0,0,0,0.45)" />

  <!-- Носик (наклонная фаска) -->
  <path d="M${INNER_X - 6} ${TOP_Y - 18} L${INNER_X + INNER_W + 6} ${TOP_Y - 18} L${INNER_X + INNER_W} ${TOP_Y - 4} L${INNER_X} ${TOP_Y - 4} Z"
        fill="url(#cylSpout)" stroke="var(--glass-stroke)" stroke-width="1" stroke-linejoin="round" />
  <!-- Сливная кромка слева (skewed) -->
  <path d="M${INNER_X - 6} ${TOP_Y - 18} L${INNER_X - 14} ${TOP_Y - 14} L${INNER_X - 10} ${TOP_Y - 4} L${INNER_X} ${TOP_Y - 4} Z"
        fill="url(#cylSpout)" stroke="var(--glass-stroke)" stroke-width="1" stroke-linejoin="round" />

  <!-- Корпус (основной цилиндр) -->
  <rect x="${INNER_X}" y="${TOP_Y - 4}" width="${INNER_W}" height="${BOTTOM_Y - TOP_Y + 14}" rx="2"
        fill="url(#cylGlass)" stroke="var(--glass-stroke)" stroke-width="1.3" />

  <!-- Дно -->
  <ellipse cx="${SVG_W / 2}" cy="${BOTTOM_Y + 10}" rx="${INNER_W / 2}" ry="4"
           fill="rgba(180,220,240,0.20)" stroke="var(--glass-stroke)" stroke-width="1" />

  <!-- Вода (clipped) -->
  <g clip-path="url(#cylInnerClip)">
    <rect id="cyl-water" class="water-rect" x="${INNER_X}" y="${BOTTOM_Y}"
          width="${INNER_W}" height="0" fill="url(#cylWater)" />
    <!-- Боковое отражение на воде -->
    <rect id="cyl-water-side" class="water-rect" x="${INNER_X}" y="${BOTTOM_Y}"
          width="${INNER_W}" height="0" fill="url(#cylWaterSide)" />
    <!-- Мениск -->
    <ellipse id="cyl-meniscus" class="meniscus" cx="${SVG_W / 2}" cy="${BOTTOM_Y}"
             rx="${INNER_W / 2 - 2}" ry="2.5"
             fill="url(#cylMeniscusGrad)" opacity="0" />
  </g>

  <!-- Шкала с делениями (генерируется JS — здесь placeholder) -->
  <g id="scale-group">${generateScale()}</g>

  <!-- Подставка (синий пластик) -->
  <rect x="${INNER_X - 12}" y="${BOTTOM_Y + 8}" width="${INNER_W + 24}" height="14" rx="2"
        fill="url(#cylBaseGrad)" stroke="var(--base-edge)" stroke-width="0.8" />
  <!-- Базовый highlight -->
  <line x1="${INNER_X - 10}" y1="${BOTTOM_Y + 10}" x2="${INNER_X + INNER_W + 10}" y2="${BOTTOM_Y + 10}"
        stroke="rgba(255,255,255,0.10)" stroke-width="0.5" />

  <!-- Verical highlight (на стекле слева) -->
  <rect x="${INNER_X + 4}" y="${TOP_Y}" width="3.5" height="${BOTTOM_Y - TOP_Y - 8}" rx="1.5"
        fill="rgba(255,255,255,0.40)" />
  <!-- Тонкое отражение справа от шкалы (внутри стекла) -->
  <rect x="${INNER_X + INNER_W - 6}" y="${TOP_Y}" width="1.5" height="${BOTTOM_Y - TOP_Y - 8}" rx="0.7"
        fill="rgba(255,255,255,0.18)" />

  <!-- Лейбл «250 мл · ЛАБОСФЕРА» сверху -->
  <text class="label-text" x="${SVG_W / 2}" y="${TOP_Y - 22}">250 мл · ЛАБОСФЕРА</text>
  <!-- C=2 мл -->
  <text class="label-cap" x="${SVG_W / 2}" y="${TOP_Y - 12}">C = 2 мл</text>

  <!-- Focus ring -->
  <rect class="focus-ring" x="6" y="6" width="${SVG_W - 12}" height="${SVG_H - 12}" rx="6" />
</svg>
`;

export class LabGraduatedCylinder extends HTMLElement {
  static observedAttributes = ['level', 'submerged', 'active'];

  #shadow: ShadowRoot;
  #water: SVGRectElement;
  #waterSide: SVGRectElement;
  #meniscus: SVGEllipseElement;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.appendChild(template.content.cloneNode(true));
    this.#water = this.#shadow.getElementById('cyl-water') as unknown as SVGRectElement;
    this.#waterSide = this.#shadow.getElementById('cyl-water-side') as unknown as SVGRectElement;
    this.#meniscus = this.#shadow.getElementById('cyl-meniscus') as unknown as SVGEllipseElement;
    this.tabIndex = 0;
    this.setAttribute('role', 'button');
    this.setAttribute('aria-label', 'Мензурка 250 мл, цена деления 2 мл.');
    this.addEventListener('click', this.#emitTap);
    this.addEventListener('keydown', this.#handleKey);
    this.#renderWater();
  }

  attributeChangedCallback(): void {
    this.#renderWater();
  }

  #renderWater(): void {
    const level = parseFloat(this.getAttribute('level') ?? '0') || 0;
    const submerged = parseFloat(this.getAttribute('submerged') ?? '0') || 0;
    // Физический инвариант: если в мензурку НЕ налита вода (level=0), то
    // погружённый цилиндр НИКАКУЮ воду не вытесняет — вода не появляется
    // из ниоткуда. Submerged учитываем только когда есть налитая вода.
    // Это как раз баг, который мы нашли: бросал цилиндр в сухую мензурку
    // и видел «появившиеся» 25 мл воды.
    const total = level === 0
      ? 0
      : Math.max(0, Math.min(250, level + submerged));
    const yTop = BOTTOM_Y - total * PIXELS_PER_ML;
    const height = BOTTOM_Y - yTop;
    this.#water.setAttribute('y', `${yTop}`);
    this.#water.setAttribute('height', `${height}`);
    this.#waterSide.setAttribute('y', `${yTop}`);
    this.#waterSide.setAttribute('height', `${height}`);
    this.#meniscus.setAttribute('cy', `${yTop}`);
    this.#meniscus.style.opacity = total > 0 ? '0.85' : '0';
    this.setAttribute(
      'aria-label',
      `Мензурка, уровень воды ${total.toFixed(0)} мл из 250.`,
    );
  }

  #emitTap = (): void => {
    this.dispatchEvent(new CustomEvent('cylinder-tap', { bubbles: true, composed: true }));
  };

  #handleKey = (ev: KeyboardEvent): void => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.#emitTap();
    }
  };
}

customElements.define('lab-graduated-cylinder', LabGraduatedCylinder);
