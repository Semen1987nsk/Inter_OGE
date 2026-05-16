/**
 * <lab-dynamometer-h>
 *
 * ГОРИЗОНТАЛЬНЫЙ динамометр для опыта 2.2 «Трение скольжения».
 * В отличие от вертикального (`<lab-dynamometer>`), этот лежит горизонтально:
 *   - Корпус продолговатый, шкала 0..N идёт слева направо.
 *   - Крюк СПРАВА (туда крепится нитка к крючку бруска).
 *   - Ручка (петля) СЛЕВА — за неё ученик тянет мышью вправо.
 *   - Стрелка-указатель — вертикальная риска, движется по горизонтали в зависимости от force.
 *
 * Атрибуты:
 *   range="1" | "5"     — предел измерения, Н (С=0.02 Н или С=0.1 Н по ФИПИ)
 *   force="0..range"    — текущее показание, Н (управляется оркестратором)
 *   interactive         — включает курсор-grab на ручке (за неё тянуть)
 *   attached            — динамометр в установке (DragController не дёргает основной drag)
 *
 * События:
 *   pull-start, pull-move, pull-end — пробрасываются оркестратору для перехвата.
 *   Логика силы — у оркестратора (см. FrictionExperiment.#onPullStart).
 *
 * Геометрический контракт:
 *   getHookPositionRight(): { x, y }  — позиция крюка справа (для нитки к бруску)
 *   getHandlePositionLeft(): { x, y } — позиция ручки слева (где ученик тянет)
 */

const SVG_WIDTH = 280;
const SVG_HEIGHT = 92; // увеличено: 76 → 92, чтобы LCD-плашка под корпусом не обрезалась

// Корпус: жёлтый прямоугольник с прозрачным окном для шкалы
const BODY_X = 30;
const BODY_W = 220;
const BODY_Y = 18;
const BODY_H = 40;

// Окно шкалы (прозрачное)
const WINDOW_X = BODY_X + 8;
const WINDOW_W = BODY_W - 16;
const WINDOW_Y = BODY_Y + 6;
const WINDOW_H = BODY_H - 12;

// Шкала
const SCALE_LEFT = WINDOW_X + 6;
const SCALE_RIGHT = WINDOW_X + WINDOW_W - 6;
const SCALE_PIXEL_RANGE = SCALE_RIGHT - SCALE_LEFT;

// Хром-крюк СЛЕВА (туда нитка к крючку бруска — брусок СЛЕВА от дин в сцене 2.2)
const HOOK_LEFT_CX = BODY_X - 12;
const HOOK_CY = BODY_Y + BODY_H / 2;
const HOOK_R = 5;

// Хром-ручка СПРАВА (где ученик хватает и тянет ВПРАВО)
const HANDLE_RIGHT_CX = BODY_X + BODY_W + 12;
const HANDLE_W = 22;
const HANDLE_H = 28;

// LCD-плашка с цифровым показанием (под корпусом). Реальные приборы Vernier/PASCO
// имеют такой индикатор. Ученику не нужно угадывать "на глаз" между делениями —
// число подтверждает, что он считал со шкалы правильно.
const READOUT_W = 64;
const READOUT_H = 13;
const READOUT_X = BODY_X + BODY_W - READOUT_W - 4; // правый край корпуса
const READOUT_Y = BODY_Y + BODY_H + 2;             // 2px зазор под корпусом

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    --dyno-w: ${SVG_WIDTH}px;
    --dyno-h: ${SVG_HEIGHT}px;
    display: inline-block;
    width: var(--dyno-w);
    height: var(--dyno-h);
    position: relative;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .pull-handle {
    cursor: ew-resize;
    pointer-events: all;
  }

  :host(:not([interactive])) .pull-handle {
    cursor: default;
    pointer-events: none;
  }

  :host([dragging-pull]) .pull-handle {
    cursor: grabbing;
  }

  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 4 3;
    opacity: 0;
  }

  :host(:focus-visible) {
    outline: none;
  }

  :host(:focus-visible) .focus-ring {
    opacity: 1;
  }
</style>
<svg viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Жёлтый корпус (как реальный динамометр в комплекте ФИПИ) -->
    <linearGradient id="dynoH-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--equip-dyno-body, #f5c842)" />
      <stop offset="50%" stop-color="var(--equip-dyno-body, #f5c842)" />
      <stop offset="100%" stop-color="var(--equip-dyno-body-dark, #c89c1f)" />
    </linearGradient>

    <!-- Прозрачное окно для шкалы -->
    <linearGradient id="dynoH-window" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgb(255 255 255 / 0.85)" />
      <stop offset="100%" stop-color="rgb(220 235 255 / 0.7)" />
    </linearGradient>

    <!-- Хром -->
    <linearGradient id="dynoH-chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--equip-metal-shadow, #4a5260)" />
      <stop offset="40%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="60%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="100%" stop-color="var(--equip-metal-shadow, #4a5260)" />
    </linearGradient>

    <filter id="dynoH-shadow" x="-5%" y="-30%" width="115%" height="180%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- РУЧКА справа (за неё тянет ученик ВПРАВО) -->
  <g class="pull-handle">
    <!-- Ось от корпуса к ручке -->
    <line x1="${BODY_X + BODY_W}" y1="${HOOK_CY}" x2="${HANDLE_RIGHT_CX}" y2="${HOOK_CY}"
          stroke="url(#dynoH-chrome)" stroke-width="3" stroke-linecap="round" />
    <!-- Сама петля-ручка (с правой стороны) -->
    <ellipse cx="${HANDLE_RIGHT_CX + HANDLE_W / 2}" cy="${HOOK_CY}"
             rx="${HANDLE_W / 2}" ry="${HANDLE_H / 2}"
             fill="none" stroke="url(#dynoH-chrome)" stroke-width="3" />
    <!-- Шарик-«указатель» в центре петли (для grab) -->
    <circle cx="${HANDLE_RIGHT_CX + HANDLE_W / 2}" cy="${HOOK_CY}" r="4"
            fill="var(--equip-metal-shine, #f0f2f5)" stroke="var(--equip-metal-shadow, #4a5260)" stroke-width="0.6" />
    <!-- Прозрачная хитзона для удобного захвата мышью -->
    <rect x="${HANDLE_RIGHT_CX - 4}" y="${HOOK_CY - HANDLE_H / 2 - 4}"
          width="${HANDLE_W + 8}" height="${HANDLE_H + 8}"
          fill="transparent" />
  </g>

  <!-- КОРПУС с тенью -->
  <g filter="url(#dynoH-shadow)">
    <rect x="${BODY_X}" y="${BODY_Y}" width="${BODY_W}" height="${BODY_H}"
          rx="6" fill="url(#dynoH-body)"
          stroke="var(--equip-dyno-body-edge, #8a6a14)" stroke-width="0.7" />
    <!-- Прозрачное окно для шкалы -->
    <rect x="${WINDOW_X}" y="${WINDOW_Y}" width="${WINDOW_W}" height="${WINDOW_H}"
          rx="2" fill="url(#dynoH-window)"
          stroke="var(--equip-dyno-body-edge, #8a6a14)" stroke-width="0.5" />
  </g>

  <!-- ШКАЛА: вертикальные деления (major/mid/minor), цифры под major -->
  <g class="scale" font-family="var(--font-mono, monospace)" font-size="6.5"
     fill="#14233a" text-anchor="middle"></g>

  <!-- HOVER-индикатор: вертикальная пунктирная линия + бейдж со значением (стандарт REFERENCE.md). -->
  <g class="hover-group" style="opacity:0; pointer-events:none">
    <line class="hover-tick" x1="0" y1="${WINDOW_Y - 1}" x2="0" y2="${WINDOW_Y + WINDOW_H + 1}"
          stroke="var(--color-brand-orange, #ffbe0b)" stroke-width="0.9"
          stroke-dasharray="2 1.5" />
    <rect class="hover-bg" x="-15" y="${WINDOW_Y - 12}" width="30" height="9" rx="1.5"
          fill="var(--color-brand-orange, #ffbe0b)" />
    <text class="hover-text" x="0" y="${WINDOW_Y - 5.5}"
          font-family="var(--font-mono, monospace)" font-size="6"
          font-weight="800" fill="#1a1b1f" text-anchor="middle">0.00</text>
  </g>

  <!-- Невидимая интерактивная зона над окном — для hover. -->
  <rect class="scale-area" x="${WINDOW_X}" y="${WINDOW_Y}"
        width="${WINDOW_W}" height="${WINDOW_H}" fill="transparent" />

  <!-- Маркер «Н» (единицы) справа на корпусе -->
  <text x="${BODY_X + BODY_W - 8}" y="${BODY_Y + 12}"
        text-anchor="end"
        font-family="var(--font-display, sans-serif)" font-size="8"
        font-weight="700" fill="var(--equip-dyno-body-dark, #c89c1f)"
        class="unit-label">Н</text>

  <!-- Бренд ЛАБОСФЕРА -->
  <text x="${BODY_X + 6}" y="${BODY_Y + 12}"
        text-anchor="start"
        font-family="var(--font-display, sans-serif)" font-size="6.5"
        font-weight="700" fill="var(--equip-dyno-body-dark, #c89c1f)"
        letter-spacing="0.06em">ЛАБОСФЕРА</text>

  <!-- ВЕРТИКАЛЬНАЯ КРАСНАЯ РИСКА-УКАЗАТЕЛЬ (двигается по горизонтали в зависимости от force) -->
  <g class="pointer">
    <line x1="0" y1="${WINDOW_Y - 1}" x2="0" y2="${WINDOW_Y + WINDOW_H + 1}"
          stroke="var(--equip-pointer, #e63946)" stroke-width="2.4" stroke-linecap="round" />
    <!-- Треугольный носик сверху -->
    <polygon points="0,${WINDOW_Y - 5} -3,${WINDOW_Y - 1} 3,${WINDOW_Y - 1}"
             fill="var(--equip-pointer, #e63946)" />
  </g>

  <!-- КРЮК слева (туда крепится нитка к крючку бруска) -->
  <g class="hook-left">
    <!-- Ось от петли к корпусу -->
    <line x1="${HOOK_LEFT_CX + HOOK_R}" y1="${HOOK_CY}" x2="${BODY_X}" y2="${HOOK_CY}"
          stroke="url(#dynoH-chrome)" stroke-width="2.4" stroke-linecap="round" />
    <!-- Тень петли -->
    <ellipse cx="${HOOK_LEFT_CX}" cy="${HOOK_CY + 1.5}" rx="${HOOK_R + 0.5}" ry="1.2" fill="rgb(0 0 0 / 0.3)" />
    <!-- Внешнее кольцо петли -->
    <circle cx="${HOOK_LEFT_CX}" cy="${HOOK_CY}" r="${HOOK_R}" fill="none"
            stroke="var(--equip-metal-shadow, #4a5260)" stroke-width="2" />
    <!-- Блик -->
    <path d="M ${HOOK_LEFT_CX - HOOK_R + 0.5} ${HOOK_CY} A ${HOOK_R - 0.5} ${HOOK_R - 0.5} 0 0 1 ${HOOK_LEFT_CX + HOOK_R - 0.5} ${HOOK_CY}"
          stroke="var(--equip-metal-shine, #f0f2f5)" stroke-width="1" fill="none" />
  </g>

  <!-- LCD-плашка с цифровым показанием. Чёрный фон + янтарные моноширинные цифры
       (как у настоящих демо-приборов Vernier/PASCO). Ученик одновременно видит и
       аналоговую шкалу, и точное число. -->
  <g class="readout">
    <!-- Маленькая «ножка» от корпуса к плашке (визуально соединяет) -->
    <line x1="${READOUT_X + READOUT_W / 2}" y1="${BODY_Y + BODY_H}"
          x2="${READOUT_X + READOUT_W / 2}" y2="${READOUT_Y}"
          stroke="var(--equip-dyno-body-edge, #8a6a14)" stroke-width="0.6" />
    <!-- Корпус LCD-плашки -->
    <rect x="${READOUT_X}" y="${READOUT_Y}" width="${READOUT_W}" height="${READOUT_H}"
          rx="1.5" fill="#0a0e16"
          stroke="var(--equip-dyno-body-edge, #8a6a14)" stroke-width="0.5" />
    <!-- Лёгкое глянцевое отражение по верху -->
    <rect x="${READOUT_X + 1}" y="${READOUT_Y + 1}" width="${READOUT_W - 2}" height="3"
          rx="1" fill="rgb(255 255 255 / 0.05)" />
    <!-- Цифры -->
    <text class="readout-text"
          x="${READOUT_X + READOUT_W - 4}" y="${READOUT_Y + READOUT_H - 3}"
          text-anchor="end"
          font-family="var(--font-mono, monospace)" font-size="8.5"
          font-weight="800" letter-spacing="0.05em"
          fill="var(--color-brand-orange, #ffbe0b)">0,00 Н</text>
  </g>

  <!-- Focus-ring -->
  <rect class="focus-ring" x="2" y="2" width="${SVG_WIDTH - 4}" height="${SVG_HEIGHT - 4}" rx="6" />
</svg>
`;

export class LabDynamometerH extends HTMLElement {
  static observedAttributes = ['range', 'force', 'interactive'];

  #shadow: ShadowRoot;
  #scaleGroup: SVGGElement;
  #pointer: SVGGElement;
  #scaleArea: SVGRectElement;
  #hoverGroup: SVGGElement;
  #hoverText: SVGTextElement;
  #readoutText: SVGTextElement;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.appendChild(template.content.cloneNode(true));
    this.#scaleGroup = this.#shadow.querySelector('.scale')!;
    this.#pointer = this.#shadow.querySelector('.pointer')!;
    this.#scaleArea = this.#shadow.querySelector('.scale-area')!;
    this.#hoverGroup = this.#shadow.querySelector('.hover-group')!;
    this.#hoverText = this.#shadow.querySelector('.hover-text')!;
    this.#readoutText = this.#shadow.querySelector('.readout-text')!;
    this.#renderScale();
    this.#updatePointer();
    this.#updateReadout();
    this.#scaleArea.addEventListener('pointermove', this.#onScalePointerMove);
    this.#scaleArea.addEventListener('pointerleave', this.#onScalePointerLeave);
  }

  #onScalePointerMove = (ev: PointerEvent): void => {
    const rect = this.#scaleArea.getBoundingClientRect();
    const xLocal = ev.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, xLocal / rect.width));
    const valueN = ratio * this.range;
    const x = SCALE_LEFT + ratio * SCALE_PIXEL_RANGE;
    this.#hoverGroup.setAttribute('transform', `translate(${x} 0)`);
    this.#hoverText.textContent = this.range === 1 ? valueN.toFixed(2) : valueN.toFixed(1);
    this.#hoverGroup.style.opacity = '1';
  };

  #onScalePointerLeave = (): void => {
    this.#hoverGroup.style.opacity = '0';
  };

  connectedCallback(): void {
    if (this.tabIndex < 0 && this.hasAttribute('interactive')) this.tabIndex = 0;
    this.#updateAria();
  }

  attributeChangedCallback(name: string): void {
    if (name === 'range') {
      this.#renderScale();
      this.#updatePointer();
      this.#updateReadout();
      this.#updateAria();
    }
    if (name === 'force') {
      this.#updatePointer();
      this.#updateReadout();
    }
    if (name === 'interactive') {
      this.tabIndex = this.hasAttribute('interactive') ? 0 : -1;
    }
  }

  /** Предел измерения (Н). */
  get range(): 1 | 5 {
    return this.getAttribute('range') === '1' ? 1 : 5;
  }

  /** Текущее показание (Н). */
  get force(): number {
    return Number(this.getAttribute('force') ?? 0);
  }

  /** Позиция крюка слева в координатах host (туда нитка к бруску). */
  getHookPosition(): { x: number; y: number } {
    return this.#svgToHost(HOOK_LEFT_CX, HOOK_CY);
  }

  /** Позиция центра ручки справа в координатах host (где ученик хватает). */
  getHandlePosition(): { x: number; y: number } {
    return this.#svgToHost(HANDLE_RIGHT_CX + HANDLE_W / 2, HOOK_CY);
  }

  #svgToHost(svgX: number, svgY: number): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return {
      x: (svgX / SVG_WIDTH) * rect.width,
      y: (svgY / SVG_HEIGHT) * rect.height,
    };
  }

  #renderScale(): void {
    const range = this.range;
    /**
     * Цена деления по ФИПИ-2026, комплект №2:
     *   - Динамометр 1Н: С = 0.02 Н (50 делений на 1 Н)
     *     - major (с цифрой) каждые 0.1 Н   → 11 меток: 0, 0.1, 0.2, …, 1.0
     *     - minor каждые 0.02 Н                  → визуальные риски без цифр
     *   - Динамометр 5Н: С = 0.1 Н (50 делений на 5 Н)
     *     - major (с цифрой) каждые 1.0 Н   → 6 меток: 0, 1, 2, 3, 4, 5
     *     - mid каждые 0.5 Н                     → длинные риски без цифр
     *     - minor каждые 0.1 Н                   → короткие риски без цифр
     */
    const minorStep = range === 1 ? 0.02 : 0.1;
    const majorEvery = range === 1 ? 5 : 10; // 1Н: цифра каждые 0.1Н; 5Н: каждые 1Н
    const midEvery = range === 1 ? 0 : 5; // 1Н: без mid (мажорки уже плотные); 5Н: 0.5Н
    const totalMinors = Math.round(range / minorStep);
    const ns = 'http://www.w3.org/2000/svg';
    while (this.#scaleGroup.firstChild) this.#scaleGroup.removeChild(this.#scaleGroup.firstChild);

    for (let i = 0; i <= totalMinors; i++) {
      const value = i * minorStep;
      const x = SCALE_LEFT + (i / totalMinors) * SCALE_PIXEL_RANGE;
      const isMajor = i % majorEvery === 0;
      const isMid = !isMajor && midEvery > 0 && i % midEvery === 0;
      const tickH = isMajor ? 7 : isMid ? 5 : 3;
      const strokeWidth = isMajor ? '0.9' : isMid ? '0.6' : '0.4';
      const strokeColor = isMajor ? '#0f2747' : '#1f3a5c';
      const tick = document.createElementNS(ns, 'line');
      tick.setAttribute('x1', String(x));
      tick.setAttribute('y1', String(WINDOW_Y));
      tick.setAttribute('x2', String(x));
      tick.setAttribute('y2', String(WINDOW_Y + tickH));
      tick.setAttribute('stroke', strokeColor);
      tick.setAttribute('stroke-width', strokeWidth);
      this.#scaleGroup.appendChild(tick);
      if (isMajor) {
        const text = document.createElementNS(ns, 'text');
        text.setAttribute('x', String(x));
        text.setAttribute('y', String(WINDOW_Y + WINDOW_H - 2));
        text.setAttribute('font-weight', '700');
        // Формат меток:
        //   1Н: 0, 0.1, 0.2, …, 1   (показываем дробную часть, кроме 0 и 1)
        //   5Н: 0, 1, 2, 3, 4, 5    (целые)
        let labelText: string;
        if (range === 1) {
          if (Math.abs(value) < 1e-9) labelText = '0';
          else if (Math.abs(value - 1) < 1e-9) labelText = '1';
          else labelText = value.toFixed(1);
        } else {
          labelText = String(Math.round(value));
        }
        text.textContent = labelText;
        this.#scaleGroup.appendChild(text);
      }
    }
  }

  #updatePointer(): void {
    const range = this.range;
    const f = Math.max(0, Math.min(range, this.force));
    const x = SCALE_LEFT + (f / range) * SCALE_PIXEL_RANGE;
    this.#pointer.setAttribute('transform', `translate(${x} 0)`);
  }

  /**
   * Цифровое показание на LCD-плашке. Точность совпадает с ценой деления:
   *   - 1Н (С=0.02 Н): 2 знака после запятой → "0,30 Н"
   *   - 5Н (С=0.1 Н):  1 знак                → "1,5 Н"
   * Для русской локали используем запятую как десятичный разделитель.
   */
  #updateReadout(): void {
    const range = this.range;
    const f = Math.max(0, Math.min(range, this.force));
    const decimals = range === 1 ? 2 : 1;
    const text = f.toFixed(decimals).replace('.', ',');
    this.#readoutText.textContent = `${text} Н`;
  }

  #updateAria(): void {
    this.setAttribute(
      'aria-label',
      `Динамометр горизонтальный, предел измерения ${this.range} ньютон. Тяните за петлю слева, чтобы приложить силу.`,
    );
  }
}

customElements.define('lab-dynamometer-h', LabDynamometerH);
