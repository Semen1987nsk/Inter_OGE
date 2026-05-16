/**
 * <lab-spring-board spring-id="k50" extension="0">
 *
 * Планшет с пружиной в стиле реального оборудования (комплект №2 ФИПИ).
 * Референсы: фото himlabo-experiment.jpg и kit-02-forces.png (ЛАБОСФЕРА).
 *
 * Композиция:
 *  - серый прямоугольный корпус с прозрачным окном
 *  - вертикальная маркировка «Пружина 1» / «Пружина 2» слева на корпусе
 *  - двойная миллиметровая шкала по обе стороны от пружины (0…100 мм)
 *  - металлическая пружина по центру окна
 *  - КРАСНАЯ горизонтальная риска через всю ширину окна (указатель)
 *  - длинный шток с крюком снизу для подвеса груза
 *  - хром-крюк сверху для подвеса на штатив
 *
 * Атрибуты:
 *   spring-id="k50" | "k10"
 *   extension="<mm>" — текущее удлинение
 *   interactive — включает клик по шкале
 *
 * События:
 *   scale-click {detail: {valueMm: number}}
 */

const SVG_WIDTH = 130;
const SVG_HEIGHT = 360;

// Корпус планшета (серый, с прозрачным окном)
const BOARD_X = 12;
const BOARD_Y = 26;
const BOARD_W = 106;
const BOARD_H = 274;

// Прозрачное окно (где видны пружина и шкала)
const WINDOW_X = 26;
const WINDOW_Y = 50;
const WINDOW_W = 78;
const WINDOW_H = 230;

// Шкала: миллиметры от 0 до 100
const SCALE_MM_TOTAL = 100;
const PX_PER_MM = WINDOW_H / SCALE_MM_TOTAL; // 2.3 px/мм

// Двойная шкала: левая колонка делений и правая
const TICK_LEFT_X = WINDOW_X;
const TICK_LEFT_END = WINDOW_X + 12;
const NUM_LEFT_X = WINDOW_X + 14;
const TICK_RIGHT_X = WINDOW_X + WINDOW_W;
const TICK_RIGHT_END = WINDOW_X + WINDOW_W - 12;
const NUM_RIGHT_X = WINDOW_X + WINDOW_W - 14;

// Пружина по центру окна. SPRING_TOP_Y = WINDOW_Y — верхний виток ровно на отметке «0»
// шкалы. Это обеспечивает: при extension=0 пружина длиной restLengthMm указывает на
// деление "restLengthMm" (например, 30 мм для k50). Без этой калибровки указатель
// смещался бы на ~1.7 мм вверх по шкале.
const SPRING_CX = WINDOW_X + WINDOW_W / 2;
const SPRING_TOP_Y = WINDOW_Y;
const COIL_RADIUS = 8;
const COILS = 12;

// Крюки
const HOOK_TOP_Y = 4;

/** Подписи на корпусе планшета. Жёсткость k НЕ показывается — её ученик должен
 *  определить экспериментально (это и есть цель опыта). */
const SPRING_LABELS: Record<string, { num: string }> = {
  k50: { num: '1' },
  k10: { num: '2' },
};

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    --board-w: 130px;
    --board-h: 360px;
    display: inline-block;
    width: var(--board-w);
    height: var(--board-h);
    position: relative;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .scale-area {
    cursor: crosshair;
    pointer-events: all;
  }

  :host(:not([interactive])) .scale-area {
    cursor: default;
    pointer-events: none;
  }

  .hover-group {
    transition: opacity 80ms ease-out;
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
    <!-- Серый корпус (с лёгким "стальным" градиентом) -->
    <linearGradient id="board-body" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#5a626d" />
      <stop offset="6%" stop-color="#7e8794" />
      <stop offset="50%" stop-color="#aab2bd" />
      <stop offset="94%" stop-color="#7e8794" />
      <stop offset="100%" stop-color="#5a626d" />
    </linearGradient>

    <!-- Прозрачное окно -->
    <linearGradient id="board-window" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#dee5ed" />
      <stop offset="50%" stop-color="#f4f7fb" />
      <stop offset="100%" stop-color="#dee5ed" />
    </linearGradient>

    <linearGradient id="board-hook" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#9aa3b0" />
      <stop offset="40%" stop-color="#dde2e8" />
      <stop offset="60%" stop-color="#dde2e8" />
      <stop offset="100%" stop-color="#9aa3b0" />
    </linearGradient>

    <linearGradient id="coil-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#5a6470" />
      <stop offset="50%" stop-color="#e8edf3" />
      <stop offset="100%" stop-color="#5a6470" />
    </linearGradient>

    <filter id="board-shadow" x="-15%" y="-5%" width="130%" height="115%">
      <feDropShadow dx="2" dy="5" stdDeviation="4" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- ВЕРХНИЙ КРЮК -->
  <path
    d="M 65 ${HOOK_TOP_Y} Q 60 ${HOOK_TOP_Y + 2} 60 ${HOOK_TOP_Y + 8} Q 60 ${HOOK_TOP_Y + 14} 65 ${HOOK_TOP_Y + 14} Q 70 ${HOOK_TOP_Y + 14} 70 ${HOOK_TOP_Y + 20} L 70 ${BOARD_Y}"
    stroke="url(#board-hook)" stroke-width="2.6" fill="none" stroke-linecap="round"
  />

  <!-- КОРПУС ПЛАНШЕТА -->
  <g filter="url(#board-shadow)">
    <rect
      x="${BOARD_X}" y="${BOARD_Y}" width="${BOARD_W}" height="${BOARD_H}"
      rx="3" fill="url(#board-body)"
      stroke="#3d434c" stroke-width="0.6"
    />
    <!-- Внутренняя обводка -->
    <rect
      x="${BOARD_X + 1}" y="${BOARD_Y + 1}" width="${BOARD_W - 2}" height="${BOARD_H - 2}"
      rx="2" fill="none" stroke="rgb(255 255 255 / 0.2)" stroke-width="0.5"
    />
  </g>

  <!-- ВЕРТИКАЛЬНАЯ МАРКИРОВКА «Пружина 1» (как на фото himlabo) -->
  <g transform="translate(${BOARD_X + 8}, ${BOARD_Y + BOARD_H / 2})">
    <text class="brand-num"
          font-family="var(--font-display, sans-serif)"
          font-size="11" font-weight="800"
          fill="rgb(255 255 255 / 0.95)"
          text-anchor="middle"
          transform="rotate(-90)"
          letter-spacing="0.18em">Пружина 1</text>
  </g>

  <!-- БРЕНД ЛАБОСФЕРЫ справа на корпусе. Без k = N Н/м — жёсткость ученик определяет сам. -->
  <g transform="translate(${BOARD_X + BOARD_W - 8}, ${BOARD_Y + BOARD_H / 2})">
    <text class="brand-k"
          font-family="var(--font-display, sans-serif)"
          font-size="8.5" font-weight="700"
          fill="rgb(255 255 255 / 0.7)"
          text-anchor="middle"
          transform="rotate(90)"
          letter-spacing="0.18em">ЛАБОСФЕРА</text>
  </g>

  <!-- ПРОЗРАЧНОЕ ОКНО (за стеклом — пружина и шкала) -->
  <rect
    x="${WINDOW_X}" y="${WINDOW_Y}" width="${WINDOW_W}" height="${WINDOW_H}"
    rx="1.5" fill="url(#board-window)"
    stroke="#3d434c" stroke-width="0.5"
  />

  <!-- ДВОЙНАЯ ШКАЛА: левая и правая колонки делений + цифры -->
  <g class="scale-left" font-family="var(--font-mono, monospace)" font-size="9"
     fill="#14233a">
    ${(() => {
      const out: string[] = [];
      for (let mm = 0; mm <= SCALE_MM_TOTAL; mm += 1) {
        const y = WINDOW_Y + mm * PX_PER_MM;
        if (mm % 10 === 0) {
          out.push(
            `<line x1="${TICK_LEFT_X}" y1="${y}" x2="${TICK_LEFT_END}" y2="${y}" stroke="#0f2747" stroke-width="0.9" />`,
          );
          out.push(
            `<text x="${NUM_LEFT_X}" y="${y + 3}" font-weight="700">${mm}</text>`,
          );
        } else if (mm % 5 === 0) {
          out.push(
            `<line x1="${TICK_LEFT_X}" y1="${y}" x2="${TICK_LEFT_X + 7}" y2="${y}" stroke="#1f3a5c" stroke-width="0.6" />`,
          );
        } else {
          out.push(
            `<line x1="${TICK_LEFT_X}" y1="${y}" x2="${TICK_LEFT_X + 3}" y2="${y}" stroke="#1f3a5c" stroke-width="0.4" />`,
          );
        }
      }
      return out.join('\n');
    })()}
  </g>

  <g class="scale-right" font-family="var(--font-mono, monospace)" font-size="9"
     fill="#14233a">
    ${(() => {
      const out: string[] = [];
      for (let mm = 0; mm <= SCALE_MM_TOTAL; mm += 1) {
        const y = WINDOW_Y + mm * PX_PER_MM;
        if (mm % 10 === 0) {
          out.push(
            `<line x1="${TICK_RIGHT_END}" y1="${y}" x2="${TICK_RIGHT_X}" y2="${y}" stroke="#0f2747" stroke-width="0.9" />`,
          );
          out.push(
            `<text x="${NUM_RIGHT_X}" y="${y + 3}" font-weight="700" text-anchor="end">${mm}</text>`,
          );
        } else if (mm % 5 === 0) {
          out.push(
            `<line x1="${TICK_RIGHT_X - 7}" y1="${y}" x2="${TICK_RIGHT_X}" y2="${y}" stroke="#1f3a5c" stroke-width="0.6" />`,
          );
        } else {
          out.push(
            `<line x1="${TICK_RIGHT_X - 3}" y1="${y}" x2="${TICK_RIGHT_X}" y2="${y}" stroke="#1f3a5c" stroke-width="0.4" />`,
          );
        }
      }
      return out.join('\n');
    })()}
  </g>

  <!-- "мм" надписи сверху и снизу окна -->
  <text x="${WINDOW_X + WINDOW_W / 2}" y="${WINDOW_Y - 4}"
        text-anchor="middle" font-family="var(--font-display, sans-serif)" font-size="8"
        font-weight="700" fill="rgb(255 255 255 / 0.75)" letter-spacing="0.1em">мм</text>

  <!-- Подсветка-подсказка (золотая полоса) -->
  <g class="hint-mark" style="display:none">
    <rect x="${WINDOW_X - 2}" y="-1.5" width="${WINDOW_W + 4}" height="3"
          fill="var(--equip-snap-active, #f2c94c)" opacity="0.55" />
  </g>

  <!-- Запись ученика (тёмная риска поверх с подписью l₀/l₁ слева) -->
  <g class="reading-mark" style="display:none">
    <rect x="${WINDOW_X - 4}" y="-1.4" width="${WINDOW_W + 8}" height="2.8"
          fill="#0d6efd" opacity="0.9" />
    <!-- Подпись слева: l₀ = 50 мм (фон + текст) -->
    <rect class="reading-label-bg" x="${WINDOW_X - 46}" y="-7" width="42" height="14" rx="2.5"
          fill="#0d6efd" />
    <text class="reading-label-text" x="${WINDOW_X - 25}" y="2.6"
          font-family="var(--font-mono, monospace)" font-size="9" font-weight="800"
          fill="#fff" text-anchor="middle"></text>
    <!-- Число справа: 50 мм -->
    <rect class="reading-value-bg" x="${WINDOW_X + WINDOW_W + 4}" y="-7" width="42" height="14" rx="2.5"
          fill="#0d6efd" />
    <text class="reading-value" x="${WINDOW_X + WINDOW_W + 25}" y="2.6"
          font-family="var(--font-mono, monospace)" font-size="9" font-weight="800"
          fill="#fff" text-anchor="middle"></text>
  </g>

  <!-- Hover-индикатор: пунктирная линия + бейдж с цифрой -->
  <g class="hover-group" style="opacity:0; pointer-events:none">
    <line class="hover-tick" x1="${WINDOW_X - 2}" y1="0" x2="${WINDOW_X + WINDOW_W + 2}" y2="0"
          stroke="var(--color-brand-orange, #ffbe0b)" stroke-width="0.9"
          stroke-dasharray="2 1.5" />
    <rect class="hover-badge-bg" x="${WINDOW_X + WINDOW_W + 4}" y="-7" width="40" height="14" rx="2.5"
          fill="var(--color-brand-orange, #ffbe0b)" />
    <text class="hover-badge-text" x="${WINDOW_X + WINDOW_W + 24}" y="2.6"
          font-family="var(--font-mono, monospace)" font-size="9" font-weight="800"
          fill="#1a1b1f" text-anchor="middle"></text>
  </g>

  <!-- ПРУЖИНА (path обновляется в JS) -->
  <path class="spring-coil"
        stroke="url(#coil-grad)" stroke-width="2.4"
        fill="none" stroke-linecap="round" stroke-linejoin="round" />

  <!-- ШТОК (металлический стержень от пружины вниз — выходит за окно и крюк) -->
  <line class="spring-rod"
        stroke="url(#board-hook)" stroke-width="1.4" stroke-linecap="round" />

  <!-- ЗИГЗАГ-РАЗРЫВ: рисуется при extension > 100 мм (пружина сжата для масштаба).
       Условный знак из инженерных чертежей: «здесь продолжается, но мы это сжали». -->
  <g class="break-symbol" style="display:none">
    <path class="break-zigzag" stroke="url(#board-hook)" stroke-width="1.4"
          fill="none" stroke-linecap="round" stroke-linejoin="round" />
    <text class="break-label" font-family="var(--font-display, sans-serif)" font-size="6.5"
          font-weight="700" fill="var(--color-warning, #f59e0b)" text-anchor="middle"
          letter-spacing="0.05em">за шкалой</text>
  </g>

  <!-- КРАСНАЯ ГОРИЗОНТАЛЬНАЯ РИСКА-УКАЗАТЕЛЬ через всё окно -->
  <g class="pointer">
    <!-- Тонкая внутренняя риска -->
    <rect x="${WINDOW_X - 1}" y="-1.4" width="${WINDOW_W + 2}" height="2.8"
          fill="var(--equip-pointer, #e63946)" />
    <!-- Треугольные носики слева и справа -->
    <polygon points="${WINDOW_X - 5},0 ${WINDOW_X - 1},-2.4 ${WINDOW_X - 1},2.4"
             fill="var(--equip-pointer, #e63946)" />
    <polygon points="${WINDOW_X + WINDOW_W + 5},0 ${WINDOW_X + WINDOW_W + 1},-2.4 ${WINDOW_X + WINDOW_W + 1},2.4"
             fill="var(--equip-pointer, #e63946)" />
  </g>

  <!-- НИЖНИЙ КРЮК для подвеса груза (выходит за корпус) -->
  <g class="bottom-hook">
    <line class="hook-stem" stroke="url(#board-hook)" stroke-width="1.5" stroke-linecap="round" />
    <ellipse class="hook-loop" rx="4.5" ry="3.8" fill="none"
             stroke="url(#board-hook)" stroke-width="1.5" />
  </g>

  <!-- Невидимый клик-слой для шкалы — расширен по ширине на ВЕСЬ корпус планшета,
       чтобы ученик мог кликнуть и по цифрам шкалы по бокам, не только по узкой полосе
       вокруг пружины. По высоте — ровно границы шкалы (WINDOW_Y…WINDOW_Y+WINDOW_H),
       чтобы калибровка y → мм осталась корректной (#pointerEventToMm).
       Размещён ПОСЛЕДНИМ в SVG → поверх hover/reading marks, клик не перехватывается. -->
  <rect class="scale-area" x="${BOARD_X + 2}" y="${WINDOW_Y}"
        width="${BOARD_W - 4}" height="${WINDOW_H}" fill="transparent" />

  <!-- Focus-ring -->
  <rect class="focus-ring" x="2" y="2" width="${SVG_WIDTH - 4}" height="${SVG_HEIGHT - 4}" rx="6" />
</svg>
`;

export class LabSpringBoard extends HTMLElement {
  static observedAttributes = ['extension', 'spring-id', 'interactive'];

  /** Длина пружины без нагрузки в мм. */
  restLengthMm = 30;

  #scaleArea: SVGRectElement;
  #hoverGroup: SVGGElement;
  #hoverBadgeText: SVGTextElement;
  #hintMark: SVGGElement;
  #readingMark: SVGGElement;
  #readingValue: SVGTextElement;
  #readingLabelText: SVGTextElement;
  #springPath: SVGPathElement;
  #springRod: SVGLineElement;
  #pointer: SVGGElement;
  #bottomHookStem: SVGLineElement;
  #bottomHookLoop: SVGEllipseElement;
  #brandNum: SVGTextElement;
  #brandK: SVGTextElement;
  #breakSymbol: SVGGElement;
  #breakZigzag: SVGPathElement;
  #breakLabel: SVGTextElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.#scaleArea = shadow.querySelector('.scale-area')!;
    this.#hoverGroup = shadow.querySelector('.hover-group')!;
    this.#hoverBadgeText = shadow.querySelector('.hover-badge-text')!;
    this.#hintMark = shadow.querySelector('.hint-mark')!;
    this.#readingMark = shadow.querySelector('.reading-mark')!;
    this.#readingValue = shadow.querySelector('.reading-value')!;
    this.#readingLabelText = shadow.querySelector('.reading-label-text')!;
    this.#springPath = shadow.querySelector('.spring-coil')!;
    this.#springRod = shadow.querySelector('.spring-rod')!;
    this.#pointer = shadow.querySelector('.pointer')!;
    this.#bottomHookStem = shadow.querySelector('.hook-stem')!;
    this.#bottomHookLoop = shadow.querySelector('.hook-loop')!;
    this.#brandNum = shadow.querySelector('.brand-num')!;
    this.#brandK = shadow.querySelector('.brand-k')!;
    this.#breakSymbol = shadow.querySelector('.break-symbol')!;
    this.#breakZigzag = shadow.querySelector('.break-zigzag')!;
    this.#breakLabel = shadow.querySelector('.break-label')!;

    this.#scaleArea.addEventListener('pointermove', this.#onScalePointerMove);
    this.#scaleArea.addEventListener('pointerleave', this.#onScalePointerLeave);
    this.#scaleArea.addEventListener('click', this.#onScaleClick);
  }

  connectedCallback(): void {
    if (this.tabIndex < 0 && this.hasAttribute('interactive')) this.tabIndex = 0;
    this.#updateBranding();
    this.#updatePointerAndSpring();
  }

  attributeChangedCallback(name: string): void {
    if (name === 'extension') this.#updatePointerAndSpring();
    if (name === 'spring-id') this.#updateBranding();
    if (name === 'interactive') {
      this.tabIndex = this.hasAttribute('interactive') ? 0 : -1;
    }
  }

  get extension(): number {
    return Number(this.getAttribute('extension') ?? 0);
  }

  /** Y-координата верхнего крюка (для подвеса на штатив) в host. */
  getTopHookY(): number {
    return this.#svgToHost(65, HOOK_TOP_Y + 4).y;
  }

  /** Позиция верхнего крюка (для подвеса на штатив) в координатах host. */
  getHookPosition(): { x: number; y: number } {
    return this.#svgToHost(65, HOOK_TOP_Y + 4);
  }

  /** Позиция нижнего крюка (где подвешивают груз) в координатах host.
   *  Клампится так, чтобы указатель не выходил за нижний край шкалы (totalLen ≤ SCALE_MM_TOTAL),
   *  иначе при перерастяжении грузы «отрывались» бы от визуального конца пружины. */
  getWeightHookPosition(): { x: number; y: number } {
    const maxExt = Math.max(0, SCALE_MM_TOTAL - this.restLengthMm);
    const visibleExt = Math.max(0, Math.min(maxExt, this.extension));
    const totalLen = this.restLengthMm + visibleExt;
    const bottomY = SPRING_TOP_Y + totalLen * PX_PER_MM;
    // При перерастяжении (за шкалой) добавляем место под зигзаг-разрыв (12 SVG-юнитов).
    const breakOffset = this.extension > maxExt ? 12 : 0;
    const rodEndY = bottomY + 30 + breakOffset;
    return this.#svgToHost(SPRING_CX, rodEndY + 8);
  }

  /** Y-координата нижнего крюка в host (для chain positioning). */
  getWeightHookY(): number {
    return this.getWeightHookPosition().y;
  }

  setHighlight(mm: number | null): void {
    if (mm === null) {
      this.#hintMark.style.display = 'none';
      return;
    }
    const y = WINDOW_Y + mm * PX_PER_MM;
    this.#hintMark.setAttribute('transform', `translate(0 ${y})`);
    this.#hintMark.style.display = '';
  }

  /**
   * Показать метку записанного значения на шкале.
   * @param mm — позиция в миллиметрах, null чтобы скрыть.
   * @param label — подпись слева (например "l₀", "l₁"). Если не задана — пусто.
   */
  setReadingMark(mm: number | null, label = ''): void {
    if (mm === null) {
      this.#readingMark.style.display = 'none';
      return;
    }
    const y = WINDOW_Y + mm * PX_PER_MM;
    this.#readingMark.setAttribute('transform', `translate(0 ${y})`);
    this.#readingValue.textContent = `${mm} мм`;
    this.#readingLabelText.textContent = label;
    // Если подписи нет — прячем фон подписи
    const labelBg = this.#readingMark.querySelector('.reading-label-bg') as SVGRectElement;
    labelBg.style.display = label ? '' : 'none';
    this.#readingMark.style.display = '';
  }

  #onScalePointerMove = (ev: PointerEvent): void => {
    if (!this.hasAttribute('interactive')) return;
    const mm = this.#pointerEventToMm(ev);
    if (mm === null) return;
    const y = WINDOW_Y + mm * PX_PER_MM;
    this.#hoverGroup.setAttribute('transform', `translate(0 ${y})`);
    this.#hoverBadgeText.textContent = `${mm} мм`;
    this.#hoverGroup.style.opacity = '1';
  };

  #onScalePointerLeave = (): void => {
    this.#hoverGroup.style.opacity = '0';
  };

  #onScaleClick = (ev: MouseEvent): void => {
    if (!this.hasAttribute('interactive')) return;
    const mm = this.#pointerEventToMm(ev);
    if (mm === null) return;
    this.dispatchEvent(
      new CustomEvent('scale-click', {
        detail: { valueMm: mm },
        bubbles: true,
        composed: true,
      }),
    );
  };

  #pointerEventToMm(ev: { clientY: number }): number | null {
    const rect = this.#scaleArea.getBoundingClientRect();
    const yLocal = ev.clientY - rect.top;
    const ratio = yLocal / rect.height;
    if (ratio < 0 || ratio > 1) return null;
    return Math.round(ratio * SCALE_MM_TOTAL);
  }

  #svgToHost(svgX: number, svgY: number): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return {
      x: (svgX / SVG_WIDTH) * rect.width,
      y: (svgY / SVG_HEIGHT) * rect.height,
    };
  }

  #updateBranding(): void {
    const id = this.getAttribute('spring-id') ?? 'k50';
    const info = SPRING_LABELS[id] ?? SPRING_LABELS['k50']!;
    this.#brandNum.textContent = `Пружина ${info.num}`;
    this.#brandK.textContent = 'ЛАБОСФЕРА';
    // ARIA — тоже без значения k, иначе скринридер «прочтёт» ответ ученику
    this.setAttribute(
      'aria-label',
      `Пружина №${info.num}, миллиметровая шкала 0…100 мм. Кликните по делению, чтобы записать положение указателя.`,
    );
  }

  #updatePointerAndSpring(): void {
    const rawExt = this.extension;
    // Клампим extension так, чтобы totalLen (rest + ext) не вышел за нижний край шкалы
    // (SCALE_MM_TOTAL = 100 мм). Это держит красный указатель внутри окна шкалы при
    // любых нагрузках. Перерастяжение → зигзаг-разрыв ниже + баннер «за шкалой».
    const maxExt = Math.max(0, SCALE_MM_TOTAL - this.restLengthMm);
    const ext = Math.max(0, Math.min(maxExt, rawExt));
    const overstretched = rawExt > maxExt;
    const totalLenMm = this.restLengthMm + ext;
    const springTopY = SPRING_TOP_Y;
    const springBottomY = springTopY + totalLenMm * PX_PER_MM;
    const span = springBottomY - springTopY;

    // Витки пружины
    const points: string[] = [`M ${SPRING_CX} ${springTopY}`];
    for (let i = 0; i < COILS; i++) {
      const t1 = (i + 0.5) / COILS;
      const t2 = (i + 1) / COILS;
      const dir = i % 2 === 0 ? 1 : -1;
      points.push(
        `Q ${SPRING_CX + dir * COIL_RADIUS} ${springTopY + t1 * span} ${SPRING_CX} ${springTopY + t2 * span}`,
      );
    }
    this.#springPath.setAttribute('d', points.join(' '));

    // Указатель — на уровне нижнего витка
    this.#pointer.setAttribute('transform', `translate(0 ${springBottomY})`);

    // Если перерастяжение — после нижнего витка вставляем зигзаг-разрыв
    // (символ «здесь сжато для масштаба»), потом шток и крюк.
    const breakOffset = overstretched ? 12 : 0;
    if (overstretched) {
      // Зигзаг из 3 пиков, между springBottomY+2 и springBottomY+10
      const zigzagTop = springBottomY + 2;
      const zigzagBottom = springBottomY + 12;
      const cx = SPRING_CX;
      // M cx zigzagTop  L cx-4 zigzagTop+3  L cx+4 zigzagTop+6  L cx-4 zigzagTop+9  L cx zigzagBottom
      const path = [
        `M ${cx} ${zigzagTop}`,
        `L ${cx - 5} ${zigzagTop + 2.5}`,
        `L ${cx + 5} ${zigzagTop + 5}`,
        `L ${cx - 5} ${zigzagTop + 7.5}`,
        `L ${cx} ${zigzagBottom}`,
      ].join(' ');
      this.#breakZigzag.setAttribute('d', path);
      this.#breakLabel.setAttribute('x', String(cx + 22));
      this.#breakLabel.setAttribute('y', String(zigzagTop + 6));
      this.#breakSymbol.style.display = '';
    } else {
      this.#breakSymbol.style.display = 'none';
    }

    // Шток — после возможного зигзага
    const rodTop = springBottomY + 2 + breakOffset;
    const rodEnd = springBottomY + 30 + breakOffset;
    this.#springRod.setAttribute('x1', String(SPRING_CX));
    this.#springRod.setAttribute('y1', String(rodTop));
    this.#springRod.setAttribute('x2', String(SPRING_CX));
    this.#springRod.setAttribute('y2', String(rodEnd));

    // Нижний крюк — продолжение штока за пределами планшета
    this.#bottomHookStem.setAttribute('x1', String(SPRING_CX));
    this.#bottomHookStem.setAttribute('y1', String(rodEnd));
    this.#bottomHookStem.setAttribute('x2', String(SPRING_CX));
    this.#bottomHookStem.setAttribute('y2', String(rodEnd + 4));
    this.#bottomHookLoop.setAttribute('cx', String(SPRING_CX));
    this.#bottomHookLoop.setAttribute('cy', String(rodEnd + 8));
  }
}

customElements.define('lab-spring-board', LabSpringBoard);
