/**
 * <lab-block>
 *
 * Деревянный брусок с крючком слева — для опыта 2.2 «Трение скольжения».
 * Соответствует комплекту №2 ФИПИ ОГЭ (масса 50±5 г).
 *
 * Композиция:
 *  - прямоугольный корпус с текстурой светлого дерева (берёза)
 *  - металлический крючок-петля слева (для крепления динамометра)
 *  - плоская верхняя грань-площадка (на неё ставятся грузы)
 *  - тонкая тень снизу для «опоры»
 *
 * Атрибуты:
 *   mass="50"            — масса бруска (г), для отображения и API
 *   interactive          — включает курсор-grab и hover-эффект (на сцене)
 *   attached             — ставится оркестратором, выключает drag (см. REFERENCE 3.5)
 *
 * Геометрический контракт (для drag-and-drop цепочки):
 *   getHookPositionLeft(): { x, y }   — позиция крючка слева (для крепления динамометра)
 *   getTopCenterPosition(): { x, y }  — центр верхней площадки (для стопки грузов)
 */

const SVG_WIDTH = 160;
const SVG_HEIGHT = 84;

// Корпус бруска (без крючка)
const BLOCK_X = 18;
const BLOCK_Y = 18;
const BLOCK_W = 132;
const BLOCK_H = 52;

// Хром-крючок СПРАВА (петля для динамометра).
// Динамометр стоит справа, тянем его вправо → нитка тянет брусок вправо (естественно).
const HOOK_CX = SVG_WIDTH - 8; // 152
const HOOK_CY = BLOCK_Y + BLOCK_H / 2;
const HOOK_R = 5;

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    --block-w: ${SVG_WIDTH}px;
    --block-h: ${SVG_HEIGHT}px;
    display: inline-block;
    width: var(--block-w);
    height: var(--block-h);
    position: relative;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  :host([interactive]:not([attached])) {
    cursor: grab;
  }

  :host([dragging]) {
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
    <!-- Светло-древесный градиент (берёза) с лёгкой текстурой -->
    <linearGradient id="wood-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--equip-wood, #e8dcb8)" />
      <stop offset="50%" stop-color="var(--equip-wood, #e8dcb8)" />
      <stop offset="100%" stop-color="var(--equip-wood-dark, #c8b888)" />
    </linearGradient>

    <linearGradient id="wood-side" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="var(--equip-wood-edge, #8d7e58)" />
      <stop offset="50%" stop-color="var(--equip-wood, #e8dcb8)" />
      <stop offset="100%" stop-color="var(--equip-wood-edge, #8d7e58)" />
    </linearGradient>

    <!-- Хром-крючок -->
    <linearGradient id="block-hook" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="var(--equip-metal-shadow, #4a5260)" />
      <stop offset="40%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="60%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="100%" stop-color="var(--equip-metal-shadow, #4a5260)" />
    </linearGradient>

    <!-- Узор «древесных волокон» — горизонтальные тонкие линии -->
    <pattern id="wood-grain" width="40" height="6" patternUnits="userSpaceOnUse">
      <line x1="0" y1="3" x2="40" y2="3" stroke="var(--equip-wood-edge, #8d7e58)" stroke-width="0.4" opacity="0.35" />
      <line x1="0" y1="5.5" x2="40" y2="5.5" stroke="var(--equip-wood-edge, #8d7e58)" stroke-width="0.25" opacity="0.18" />
    </pattern>

    <filter id="block-shadow" x="-15%" y="-10%" width="130%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Тень-«опора» под бруском (если он стоит на поверхности) -->
  <ellipse class="block-floor-shadow" cx="${BLOCK_X + BLOCK_W / 2}" cy="${BLOCK_Y + BLOCK_H + 6}"
           rx="${BLOCK_W / 2}" ry="3" fill="rgb(0 0 0 / 0.25)" opacity="0" />

  <!-- КРЮЧОК СПРАВА: планка от корпуса наружу + петля -->
  <g class="hook">
    <!-- Планка от правой грани корпуса до петли -->
    <line x1="${BLOCK_X + BLOCK_W}" y1="${HOOK_CY}" x2="${HOOK_CX - HOOK_R}" y2="${HOOK_CY}"
          stroke="url(#block-hook)" stroke-width="2.4" stroke-linecap="round" />
    <!-- Тень петли -->
    <ellipse cx="${HOOK_CX}" cy="${HOOK_CY + 1.5}" rx="${HOOK_R + 0.5}" ry="1.2" fill="rgb(0 0 0 / 0.3)" />
    <!-- Внешнее кольцо петли -->
    <circle cx="${HOOK_CX}" cy="${HOOK_CY}" r="${HOOK_R}" fill="none"
            stroke="var(--equip-metal-shadow, #4a5260)" stroke-width="2" />
    <!-- Блик на верхней половине -->
    <path d="M ${HOOK_CX - HOOK_R + 0.5} ${HOOK_CY} A ${HOOK_R - 0.5} ${HOOK_R - 0.5} 0 0 1 ${HOOK_CX + HOOK_R - 0.5} ${HOOK_CY}"
          stroke="var(--equip-metal-shine, #f0f2f5)" stroke-width="1" fill="none" />
  </g>

  <!-- Корпус бруска (с тенью, древесной текстурой и боковой гранью) -->
  <g filter="url(#block-shadow)">
    <!-- Боковая (фасадная) грань — главный плоский прямоугольник -->
    <rect x="${BLOCK_X}" y="${BLOCK_Y}" width="${BLOCK_W}" height="${BLOCK_H}"
          rx="2" fill="url(#wood-grad)"
          stroke="var(--equip-wood-edge, #8d7e58)" stroke-width="0.7" />
    <!-- Текстура волокон (overlay) -->
    <rect x="${BLOCK_X}" y="${BLOCK_Y}" width="${BLOCK_W}" height="${BLOCK_H}"
          rx="2" fill="url(#wood-grain)" pointer-events="none" />

    <!-- Верхняя грань-площадка (с лёгким перспективным сдвигом для глубины) -->
    <path d="M ${BLOCK_X + 4} ${BLOCK_Y}
             L ${BLOCK_X + BLOCK_W - 4} ${BLOCK_Y}
             L ${BLOCK_X + BLOCK_W} ${BLOCK_Y - 5}
             L ${BLOCK_X} ${BLOCK_Y - 5} Z"
          fill="var(--equip-wood, #e8dcb8)"
          stroke="var(--equip-wood-edge, #8d7e58)" stroke-width="0.7" />
    <!-- Тонкая тень-канавка между «верхом» и «фасадом» -->
    <line x1="${BLOCK_X + 1}" y1="${BLOCK_Y + 0.2}" x2="${BLOCK_X + BLOCK_W - 1}" y2="${BLOCK_Y + 0.2}"
          stroke="var(--equip-wood-edge, #8d7e58)" stroke-width="0.4" opacity="0.5" />
  </g>

  <!-- Подпись «?» на боковой грани (масса НЕИЗВЕСТНА — ученик измеряет динамометром).
       На карточках в правой панели подпись скрыта (через CSS), а на сцене — видна как «?». -->
  <text x="${BLOCK_X + BLOCK_W / 2}" y="${BLOCK_Y + BLOCK_H / 2 + 4}"
        text-anchor="middle"
        font-family="var(--font-display, sans-serif)"
        font-size="14" font-weight="800"
        fill="var(--equip-wood-edge, #8d7e58)"
        opacity="0.6">
    <tspan class="mass-label">m = ?</tspan>
  </text>

  <!-- Focus-ring -->
  <rect class="focus-ring" x="2" y="2" width="${SVG_WIDTH - 4}" height="${SVG_HEIGHT - 4}" rx="6" />
</svg>
`;

export class LabBlock extends HTMLElement {
  static observedAttributes = ['mass', 'interactive', 'on-surface'];

  #shadow: ShadowRoot;
  #massLabel: SVGTextElement;
  #floorShadow: SVGEllipseElement;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.appendChild(template.content.cloneNode(true));
    this.#massLabel = this.#shadow.querySelector('.mass-label')!;
    this.#floorShadow = this.#shadow.querySelector('.block-floor-shadow')!;
    this.#updateLabel();
  }

  connectedCallback(): void {
    if (this.tabIndex < 0 && this.hasAttribute('interactive')) this.tabIndex = 0;
  }

  attributeChangedCallback(name: string): void {
    if (name === 'mass') this.#updateLabel();
    if (name === 'interactive') {
      this.tabIndex = this.hasAttribute('interactive') ? 0 : -1;
    }
    if (name === 'on-surface') {
      // Брусок стоит на поверхности — показываем тень
      this.#floorShadow.setAttribute(
        'opacity',
        this.hasAttribute('on-surface') ? '1' : '0',
      );
    }
  }

  /** Масса бруска в граммах (по ФИПИ — 50±5). */
  get mass(): number {
    return Number(this.getAttribute('mass') ?? 50);
  }

  /** Позиция крючка справа в координатах host (px). Куда крепится динамометр. */
  getHookPosition(): { x: number; y: number } {
    return this.#svgToHost(HOOK_CX, HOOK_CY);
  }

  /** Центр верхней площадки в координатах host. Сюда ставятся грузы (стопкой). */
  getTopCenterPosition(): { x: number; y: number } {
    return this.#svgToHost(BLOCK_X + BLOCK_W / 2, BLOCK_Y - 2);
  }

  /** Высота корпуса бруска в host px (нужна для точной стыковки динамометра). */
  getBlockHeightHost(): number {
    const rect = this.getBoundingClientRect();
    return (BLOCK_H / SVG_HEIGHT) * rect.height;
  }

  /** Y-координата визуального низа корпуса бруска (НЕ host bottom — он включает «пустоту»
   *  под тенью). Возвращает offset от верха host'а в px. */
  getVisualBottomY(): number {
    const rect = this.getBoundingClientRect();
    return ((BLOCK_Y + BLOCK_H) / SVG_HEIGHT) * rect.height;
  }

  /** Y-координата визуального ВЕРХА корпуса бруска от верха host'а (с учётом перспективной
   *  «крышки», которая выступает на 5 SVG-юнитов выше BLOCK_Y). */
  getVisualTopY(): number {
    const rect = this.getBoundingClientRect();
    return ((BLOCK_Y - 5) / SVG_HEIGHT) * rect.height;
  }

  /** Координата левого края корпуса бруска в host px. */
  getLeftEdgeX(): number {
    return this.#svgToHost(BLOCK_X, 0).x;
  }

  /** Координата правого края корпуса бруска в host px. */
  getRightEdgeX(): number {
    return this.#svgToHost(BLOCK_X + BLOCK_W, 0).x;
  }

  #svgToHost(svgX: number, svgY: number): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return {
      x: (svgX / SVG_WIDTH) * rect.width,
      y: (svgY / SVG_HEIGHT) * rect.height,
    };
  }

  #updateLabel(): void {
    // Масса НЕ показывается — ученик измеряет её динамометром (педагогически — это
    // часть задачи). На бруске видна метка «m = ?». Реальная масса — в атрибуте `mass`.
    this.#massLabel.textContent = 'm = ?';
    this.setAttribute(
      'aria-label',
      'Деревянный брусок неизвестной массы с крючком справа. Используется в опытах по трению.',
    );
  }
}

customElements.define('lab-block', LabBlock);
