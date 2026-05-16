/**
 * <lab-dynamometer range="1" force="0">
 *
 * Планшетный школьный динамометр в стиле реального оборудования
 * (комплект №2 ФИПИ — Химлабо/Лабосфера/НауРа): серый прямоугольный корпус
 * с прозрачным окном, металлическая пружина внутри, двойная шкала
 * (Н слева, граммы или дробные Н справа), красная горизонтальная риска-указатель,
 * хром-крюк сверху для подвеса на штатив, кольцо снизу для подвеса груза.
 *
 * Атрибуты:
 *   range="1" | "5"     — предел измерения (1 Н или 5 Н)
 *   force="<N>"          — текущая сила в Ньютонах (0..range)
 *   interactive          — включает клик по шкале
 *
 * События:
 *   scale-click {detail:{valueN:number}} — ученик кликнул по делению
 */

const SVG_WIDTH = 76;
/**
 * SVG_HEIGHT 220 (после ревизии 2026-05-08 «по эталону slide09_img26»):
 * корпус 165, **нижний крюк висит снаружи корпуса на фиксированной Y** ≈ 201.
 * Раньше (250×90, BODY_H=200) цилиндр оказывался **внутри** корпуса
 * на 195+ px — катастрофа реализма. См. §19.11.16 REFERENCE.
 */
const SVG_HEIGHT = 220;

const BODY_X = 11;
const BODY_Y = 20;
const BODY_W = 54;
const BODY_H = 165;
const BODY_BOTTOM = BODY_Y + BODY_H; // 185

const WINDOW_X = 14;
const WINDOW_Y = 42;
const WINDOW_W = 48;
const WINDOW_H = 130;

const SPRING_CX = 38;
/** Точка крепления пружины в корпусе (выше окна — невидимая часть скрывается clipPath). */
const SPRING_TOP_Y = 28;
const COIL_RADIUS = 6;
const COILS = 12;
/**
 * Базовая длина штока от указателя до крюка груза (px в SVG). Фактическая
 * длина — `max(BODY_BOTTOM + 8, pointerY + ROD_LEN_BASE)` — гарантирует, что
 * **крюк всегда наружи корпуса** даже при F=0 (когда указатель почти у самого
 * верха окна и ROD_LEN_BASE мал). Это «жёсткое» крепление пружины к штоку.
 *
 * NB: при таком clamp нижний крюк фактически фиксирован на Y ≈ 201 (= BODY_BOTTOM + 8 + 8),
 * что упрощает позиционирование цилиндра и убирает нужду в force-компенсации
 * baseTop. Реальный ход пружины ≈ 1-2 мм — на экране это незаметно.
 */
const ROD_LEN_BASE = 14;

// Геометрия шкалы. После сжатия SVG до 76×220 двойная шкала перестала помещаться
// (цифры левой и правой колонок слипались). Реальные ОГЭ-динамометры обычно
// имеют **одну** колонку — это и педагогически чище. Tick — слева от центра,
// цифры — у самого левого края окна.
const TICK_LEFT_X = 17;
const TICK_RIGHT_X = 59;   // только риски, без цифр
const NUM_LEFT_X = 23;     // x_anchor=start

// LCD-плашка с цифровым показанием — вмонтирована в корпус под окном шкалы
// (как у настоящих демо-приборов Vernier/PASCO). Высоту уменьшили до 12 и
// сдвинули зазор до 2px, чтобы вся плашка помещалась в корпусе (BODY_BOTTOM=185).
const READOUT_X = WINDOW_X;
const READOUT_W = WINDOW_W;
const READOUT_Y = WINDOW_Y + WINDOW_H + 2; // 2px зазор под окном шкалы
const READOUT_H = 11;

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    --dyno-w: 76px;
    --dyno-h: 220px;
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

  /* §19.11.16: плавная анимация указателя/штока/крюка/LCD при смене force.
     Раньше плавность обеспечивал RAF-anim в orchestrator (state.forceN
     анимировалось от старого к target за DIP_ANIM_MS). После рефактора
     state.forceN сразу = target, а визуальный transition — через CSS на
     самих SVG-атрибутах (modern browsers поддерживают transition на y/x/y1/y2/cy
     и transform). Длительность 600ms cubic-bezier совпадает с dyno-host
     transform — синхронно с погружением цилиндра. */
  .dyno-pointer,
  .dyno-rod,
  .bottom-hook,
  .dyno-coil,
  .readout-text {
    transition: transform 600ms cubic-bezier(0.42, 0, 0.58, 1),
                y 600ms cubic-bezier(0.42, 0, 0.58, 1),
                y1 600ms cubic-bezier(0.42, 0, 0.58, 1),
                y2 600ms cubic-bezier(0.42, 0, 0.58, 1),
                cy 600ms cubic-bezier(0.42, 0, 0.58, 1),
                d 600ms cubic-bezier(0.42, 0, 0.58, 1);
  }
  @media (prefers-reduced-motion: reduce) {
    .dyno-pointer, .dyno-rod, .bottom-hook, .dyno-coil, .readout-text {
      transition: none;
    }
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
    <!-- Светлый корпус (как у школьных учебных динамометров): белый/светло-серый
         градиент с лёгкой объёмностью -->
    <linearGradient id="dyno-body" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a8b0bb" />
      <stop offset="6%" stop-color="#c8cfd8" />
      <stop offset="50%" stop-color="#eef1f5" />
      <stop offset="94%" stop-color="#c8cfd8" />
      <stop offset="100%" stop-color="#a8b0bb" />
    </linearGradient>

    <!-- Прозрачное окно -->
    <linearGradient id="dyno-window" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#dee5ed" />
      <stop offset="50%" stop-color="#f4f7fb" />
      <stop offset="100%" stop-color="#dee5ed" />
    </linearGradient>

    <!-- Хром-крюк -->
    <linearGradient id="dyno-hook" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#9aa3b0" />
      <stop offset="40%" stop-color="#dde2e8" />
      <stop offset="60%" stop-color="#dde2e8" />
      <stop offset="100%" stop-color="#9aa3b0" />
    </linearGradient>

    <!-- Витки пружины -->
    <linearGradient id="dyno-coil" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#5a6470" />
      <stop offset="50%" stop-color="#e8edf3" />
      <stop offset="100%" stop-color="#5a6470" />
    </linearGradient>

    <filter id="dyno-shadow" x="-15%" y="-5%" width="130%" height="115%">
      <feDropShadow dx="2" dy="4" stdDeviation="3" flood-opacity="0.45" />
    </filter>

    <!-- Окно как clipPath: пружина за его пределами обрезается (верх скрыт корпусом). -->
    <clipPath id="dyno-window-clip">
      <rect x="${WINDOW_X}" y="${WINDOW_Y}" width="${WINDOW_W}" height="${WINDOW_H}" />
    </clipPath>
  </defs>

  <!-- ВЕРХНИЙ КРЮК (центр SPRING_CX=38) -->
  <path
    d="M 38 4 Q 33 6 33 11 Q 33 17 38 17 Q 43 17 43 22 L 43 ${BODY_Y}"
    stroke="url(#dyno-hook)" stroke-width="2.2" fill="none" stroke-linecap="round"
  />

  <!-- КОРПУС -->
  <g filter="url(#dyno-shadow)">
    <rect
      x="${BODY_X}" y="${BODY_Y}" width="${BODY_W}" height="${BODY_H}"
      rx="3" fill="url(#dyno-body)"
      stroke="#3d434c" stroke-width="0.6"
    />
    <!-- Внутренняя обводка -->
    <rect
      x="${BODY_X + 1}" y="${BODY_Y + 1}" width="${BODY_W - 2}" height="${BODY_H - 2}"
      rx="2" fill="none" stroke="rgb(255 255 255 / 0.15)" stroke-width="0.5"
    />
  </g>

  <!-- ПРОЗРАЧНОЕ ОКНО (за стеклом — пружина и шкала) -->
  <rect
    x="${WINDOW_X}" y="${WINDOW_Y}" width="${WINDOW_W}" height="${WINDOW_H}"
    rx="1.5" fill="url(#dyno-window)"
    stroke="#3d434c" stroke-width="0.5"
  />

  <!-- LCD-плашка с цифровым показанием — встроена в корпус под окном шкалы.
       Вместо аналоговой маркировки диапазона. Чёрный фон + янтарные моноширинные
       цифры (как у Vernier/PASCO). Ученик одновременно видит и аналоговую шкалу,
       и точное число. Маркировка диапазона перенесена наверх (см. ниже). -->
  <g class="readout">
    <rect x="${READOUT_X}" y="${READOUT_Y}" width="${READOUT_W}" height="${READOUT_H}"
          rx="2" fill="#0a0e16"
          stroke="#3d434c" stroke-width="0.5" />
    <rect x="${READOUT_X + 1}" y="${READOUT_Y + 1}" width="${READOUT_W - 2}" height="3"
          rx="1.5" fill="rgb(255 255 255 / 0.05)" />
    <text class="readout-text"
          x="${READOUT_X + READOUT_W - 4}" y="${READOUT_Y + READOUT_H - 2.5}"
          text-anchor="end"
          font-family="var(--font-mono, monospace)" font-size="7.5"
          font-weight="800" letter-spacing="0.03em"
          fill="var(--color-brand-orange, #ffbe0b)">0,00 Н</text>
  </g>

  <!-- Маркировка диапазона СВЕРХУ корпуса (рядом с подписью ЛАБОСФЕРА) -->
  <g class="brand-top" transform="translate(${BODY_X + BODY_W - 4}, ${BODY_Y + 11})">
    <text class="brand-range-top"
          font-family="var(--font-display, sans-serif)"
          font-size="7" font-weight="800"
          fill="rgb(0 0 0 / 0.7)"
          text-anchor="end"
          dominant-baseline="middle">1Н</text>
  </g>

  <!-- Подпись ЛАБОСФЕРА мелким текстом сверху корпуса -->
  <g transform="translate(${BODY_X + 4}, ${BODY_Y + 11})">
    <text font-family="var(--font-display, sans-serif)"
          font-size="4" font-weight="700"
          fill="rgb(0 0 0 / 0.5)"
          text-anchor="start"
          letter-spacing="0.08em">ЛАБОСФЕРА</text>
  </g>

  <!-- ШКАЛА: одна колонка делений (после сжатия до 76×220 двойная не помещается) -->
  <g class="scale-left" font-family="var(--font-mono, monospace)" font-size="8"
     fill="#14233a">
    <!-- генерируем в JS через #renderTicks -->
  </g>
  <g class="scale-right" font-family="var(--font-mono, monospace)" font-size="8"
     fill="#14233a">
    <!-- только риски без цифр -->
  </g>

  <!-- Невидимый клик-слой для шкалы -->
  <rect class="scale-area"
        x="${WINDOW_X}" y="${WINDOW_Y}"
        width="${WINDOW_W}" height="${WINDOW_H}"
        fill="transparent" />

  <!-- Запись ученика (синяя риска поверх с бейджем "F = X.X Н") -->
  <g class="reading-mark" style="display:none">
    <rect x="${WINDOW_X - 3}" y="-1.4" width="${WINDOW_W + 6}" height="2.8"
          fill="#0d6efd" opacity="0.9" />
    <rect class="reading-bg" x="${WINDOW_X + WINDOW_W + 4}" y="-7" width="46" height="14" rx="2.5"
          fill="#0d6efd" />
    <text class="reading-value" x="${WINDOW_X + WINDOW_W + 27}" y="2.6"
          font-family="var(--font-mono, monospace)" font-size="9" font-weight="800"
          fill="#fff" text-anchor="middle"></text>
  </g>

  <!-- Hover: пунктирная линия + бейдж с цифрой Н -->
  <g class="hover-group" style="opacity:0; pointer-events:none">
    <line class="hover-tick" x1="${WINDOW_X - 2}" y1="0" x2="${WINDOW_X + WINDOW_W + 2}" y2="0"
          stroke="var(--color-brand-orange, #ffbe0b)" stroke-width="0.9"
          stroke-dasharray="2 1.5" />
    <rect class="hover-bg" x="${WINDOW_X + WINDOW_W + 4}" y="-7" width="42" height="14" rx="2.5"
          fill="var(--color-brand-orange, #ffbe0b)" />
    <text class="hover-text" x="${WINDOW_X + WINDOW_W + 25}" y="2.6"
          font-family="var(--font-mono, monospace)" font-size="9" font-weight="800"
          fill="#1a1b1f" text-anchor="middle"></text>
  </g>

  <!-- ПРУЖИНА (path обновляется в JS); clipPath прячет верхнюю часть за корпусом. -->
  <path class="dyno-coil"
        stroke="url(#dyno-coil)" stroke-width="2"
        fill="none" stroke-linecap="round" stroke-linejoin="round"
        clip-path="url(#dyno-window-clip)" />

  <!-- ШТОК (тонкий металлический стержень от пружины вниз к крюку) -->
  <line class="dyno-rod"
        stroke="url(#dyno-hook)" stroke-width="1.4" stroke-linecap="round" />

  <!-- КРАСНАЯ ГОРИЗОНТАЛЬНАЯ РИСКА-УКАЗАТЕЛЬ через всё окно -->
  <g class="dyno-pointer">
    <rect x="${WINDOW_X - 1}" y="-1.4" width="${WINDOW_W + 2}" height="2.8"
          fill="var(--equip-pointer, #e63946)" />
    <!-- Маленький треугольный носик слева и справа -->
    <polygon points="${WINDOW_X - 4},0 ${WINDOW_X - 1},-2 ${WINDOW_X - 1},2"
             fill="var(--equip-pointer, #e63946)" />
    <polygon points="${WINDOW_X + WINDOW_W + 4},0 ${WINDOW_X + WINDOW_W + 1},-2 ${WINDOW_X + WINDOW_W + 1},2"
             fill="var(--equip-pointer, #e63946)" />
  </g>

  <!-- НИЖНИЙ КРЮК для подвеса груза -->
  <g class="bottom-hook">
    <line class="hook-stem" stroke="url(#dyno-hook)" stroke-width="1.5" stroke-linecap="round" />
    <ellipse class="hook-loop" rx="4.5" ry="3.8" fill="none"
             stroke="url(#dyno-hook)" stroke-width="1.5" />
  </g>

  <!-- Focus ring -->
  <rect class="focus-ring" x="2" y="2" width="${SVG_WIDTH - 4}" height="${SVG_HEIGHT - 4}" rx="6" />
</svg>
`;

export class LabDynamometer extends HTMLElement {
  static observedAttributes = ['range', 'force', 'interactive'];

  #scaleLeft: SVGGElement;
  #scaleRight: SVGGElement;
  #scaleArea: SVGRectElement;
  #springPath: SVGPathElement;
  #rod: SVGLineElement;
  #pointer: SVGGElement;
  #hookStem: SVGLineElement;
  #hookLoop: SVGEllipseElement;
  #brandRangeTop: SVGTextElement;
  #hoverGroup: SVGGElement;
  #hoverText: SVGTextElement;
  #readingMark: SVGGElement;
  #readingValue: SVGTextElement;
  #readoutText: SVGTextElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.#scaleLeft = shadow.querySelector('.scale-left')!;
    this.#scaleRight = shadow.querySelector('.scale-right')!;
    this.#scaleArea = shadow.querySelector('.scale-area')!;
    this.#springPath = shadow.querySelector('.dyno-coil')!;
    this.#rod = shadow.querySelector('.dyno-rod')!;
    this.#pointer = shadow.querySelector('.dyno-pointer')!;
    this.#hookStem = shadow.querySelector('.hook-stem')!;
    this.#hookLoop = shadow.querySelector('.hook-loop')!;
    this.#brandRangeTop = shadow.querySelector('.brand-range-top')!;
    this.#hoverGroup = shadow.querySelector('.hover-group')!;
    this.#hoverText = shadow.querySelector('.hover-text')!;
    this.#readingMark = shadow.querySelector('.reading-mark')!;
    this.#readingValue = shadow.querySelector('.reading-value')!;
    this.#readoutText = shadow.querySelector('.readout-text')!;

    this.#scaleArea.addEventListener('click', this.#onScaleClick);
    this.#scaleArea.addEventListener('pointermove', this.#onScalePointerMove);
    this.#scaleArea.addEventListener('pointerleave', this.#onScalePointerLeave);
  }

  connectedCallback(): void {
    if (this.tabIndex < 0 && this.hasAttribute('interactive')) this.tabIndex = 0;
    this.#renderScale();
    this.#updateState();
  }

  attributeChangedCallback(): void {
    this.#renderScale();
    this.#updateState();
  }

  get range(): number {
    return Number(this.getAttribute('range') ?? 1);
  }

  get force(): number {
    return Number(this.getAttribute('force') ?? 0);
  }

  /** Y-координата верхнего крюка в host. */
  getTopHookY(): number {
    return this.#svgToHost(SPRING_CX, 6).y;
  }

  /** Позиция верхнего крюка в координатах host. */
  getHookPosition(): { x: number; y: number } {
    return this.#svgToHost(SPRING_CX, 6);
  }

  /** Позиция нижнего крюка (где подвешивается груз) — **с учётом** текущей силы. */
  getWeightHookPosition(): { x: number; y: number } {
    return this.#svgToHost(SPRING_CX, this.#hookCy());
  }

  /**
   * Y-координата центра петли нижнего крюка в SVG-юнитах.
   * Шток выходит **всегда** ниже корпуса: rodEnd = max(BODY_BOTTOM+8, pointerY+ROD_BASE).
   * При диапазоне сил, помещающемся в окно (pointerY ≤ WINDOW_Y+WINDOW_H = 172),
   * это всегда даёт фиксированный hookCy ≈ 201 — крюк стабилен по Y, что
   * упрощает позиционирование цилиндра и реалистично (ход пружины ≈ 1-2 мм).
   */
  #hookCy(): number {
    const pointerY = this.#pointerY();
    const rodEnd = Math.max(BODY_BOTTOM + 8, pointerY + ROD_LEN_BASE);
    return rodEnd + 8;
  }

  /** Y-координата нижнего крюка в host (текущая, зависит от force). */
  getWeightHookY(): number {
    return this.getWeightHookPosition().y;
  }

  /**
   * Y-координата нижнего крюка при произвольной силе (без побочного эффекта
   * — `force` атрибут не меняется). Используется оркестратором, чтобы
   * предсказать «куда уедет нижний крюк при силе F», прежде чем render
   * применит её. Применение: `dipOffsetPx` должен учитывать, что после
   * погружения force упадёт и крюк дин-ра поднимется на `Δ = hook(F_возд)
   * - hook(F_жид)` — без компенсации цилиндр окажется выше воды.
   * См. §19.11.14 «компенсация baseTop при погружении».
   */
  /**
   * NOTE §19.11.16: в текущей геометрии (range ≤ 5 N, BODY_BOTTOM=185,
   * ROD_LEN_BASE=14) `hookCy()` всегда клампится к `BODY_BOTTOM+8` → возвращает
   * **константу** для любой `forceN` в [0, range]. Это упрощает позиционирование
   * цилиндра и убирает нужду в force-компенсации baseTop.
   *
   * Метод сохранён как часть API на случай будущих вариантов с подвижным rod-end
   * (например, дин-р с более длинным ходом). НЕ удалять — используется в тестах
   * и сторонних модулях. Если pointerY+ROD_LEN_BASE > BODY_BOTTOM+8 (нагрузка
   * близка к range), результат может отличаться — но в типичной геометрии не
   * наступает.
   */
  predictWeightHookY(forceN: number): number {
    const range = this.range || 1;
    const ratio = Math.max(0, Math.min(1, forceN / range));
    const pointerY = WINDOW_Y + ratio * WINDOW_H;
    const rodEnd = Math.max(BODY_BOTTOM + 8, pointerY + ROD_LEN_BASE);
    const hookSvgY = rodEnd + 8;
    return this.#svgToHost(SPRING_CX, hookSvgY).y;
  }

  #onScaleClick = (ev: MouseEvent): void => {
    if (!this.hasAttribute('interactive')) return;
    const valueN = this.#eventToForce(ev);
    if (valueN === null) return;
    this.dispatchEvent(
      new CustomEvent('scale-click', {
        detail: { valueN },
        bubbles: true,
        composed: true,
      }),
    );
  };

  #onScalePointerMove = (ev: PointerEvent): void => {
    if (!this.hasAttribute('interactive')) return;
    const valueN = this.#eventToForce(ev);
    if (valueN === null) return;
    const ratio = valueN / this.range;
    const y = WINDOW_Y + ratio * WINDOW_H;
    this.#hoverGroup.setAttribute('transform', `translate(0 ${y})`);
    this.#hoverText.textContent = this.#formatN(valueN);
    this.#hoverGroup.style.opacity = '1';
  };

  #onScalePointerLeave = (): void => {
    this.#hoverGroup.style.opacity = '0';
  };

  /**
   * Показать метку записанного значения F на шкале.
   * @param valueN — сила в Ньютонах, null чтобы скрыть.
   */
  setReadingMark(valueN: number | null): void {
    if (valueN === null) {
      this.#readingMark.style.display = 'none';
      return;
    }
    const ratio = Math.max(0, Math.min(1, valueN / this.range));
    const y = WINDOW_Y + ratio * WINDOW_H;
    this.#readingMark.setAttribute('transform', `translate(0 ${y})`);
    this.#readingValue.textContent = `${this.#formatN(valueN)} Н`;
    this.#readingMark.style.display = '';
  }

  /** Русское форматирование числа в Ньютонах: запятая вместо точки.
   *  Точность совпадает с ценой деления шкалы (1Н → 2 знака, 5Н → 1 знак). */
  #formatN(valueN: number): string {
    return (this.range === 1 ? valueN.toFixed(2) : valueN.toFixed(1)).replace('.', ',');
  }

  #eventToForce(ev: MouseEvent): number | null {
    const rect = this.#scaleArea.getBoundingClientRect();
    const yLocal = ev.clientY - rect.top;
    const ratio = yLocal / rect.height;
    if (ratio < 0 || ratio > 1) return null;
    // На корпусе сверху F=0, снизу F=range
    const step = this.range === 1 ? 0.02 : 0.1;
    const raw = ratio * this.range;
    return Math.round(raw / step) * step;
  }

  #svgToHost(svgX: number, svgY: number): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return {
      x: (svgX / SVG_WIDTH) * rect.width,
      y: (svgY / SVG_HEIGHT) * rect.height,
    };
  }

  /**
   * Y-координата указателя на шкале — главная калибровка.
   *   F = 0     → y = WINDOW_Y          (отметка «0»)
   *   F = range → y = WINDOW_Y + WINDOW_H (отметка «range»)
   * Линейно по силе.
   */
  #pointerY(): number {
    const ratio = Math.max(0, Math.min(1, this.force / this.range));
    return WINDOW_Y + ratio * WINDOW_H;
  }

  #updateState(): void {
    // Маркировка диапазона сверху корпуса (теперь компактная, рядом с ЛАБОСФЕРА)
    this.#brandRangeTop.textContent = `${this.range}Н`;

    // LCD-плашка с цифровым показанием (под шкалой). Точность совпадает с ценой
    // деления: 1Н → "0,30 Н" (2 знака), 5Н → "1,5 Н" (1 знак). Запятая для ru-RU.
    // Источник истины — #formatN, чтобы LCD/hover/reading-mark/ARIA шли в ногу.
    {
      const f = Math.max(0, Math.min(this.range, this.force));
      this.#readoutText.textContent = `${this.#formatN(f)} Н`;
    }

    // Указатель — точно на отметке шкалы (главная привязка к физике).
    const bottom = this.#pointerY();

    // Пружина — от точки крепления (выше окна) до указателя.
    // Верхняя часть, выходящая за окно, скрывается clipPath «dyno-window-clip».
    const top = SPRING_TOP_Y;
    const span = bottom - top;
    const points: string[] = [`M ${SPRING_CX} ${top}`];
    for (let i = 0; i < COILS; i++) {
      const t1 = (i + 0.5) / COILS;
      const t2 = (i + 1) / COILS;
      const dir = i % 2 === 0 ? 1 : -1;
      points.push(
        `Q ${SPRING_CX + dir * COIL_RADIUS} ${top + t1 * span} ${SPRING_CX} ${top + t2 * span}`,
      );
    }
    this.#springPath.setAttribute('d', points.join(' '));

    // Шток — от указателя вниз к крюку. Шток ВСЕГДА выходит из корпуса:
    // rodEnd = max(BODY_BOTTOM + 8, pointerY + ROD_LEN_BASE). При типичных
    // силах (force ≤ range) это даёт фиксированный rodEnd ≈ 193 → крюк
    // стабилен по Y (≈ 201). См. §19.11.16 REFERENCE.
    const rodTop = bottom;
    const rodEnd = Math.max(BODY_BOTTOM + 8, rodTop + ROD_LEN_BASE);
    this.#rod.setAttribute('x1', String(SPRING_CX));
    this.#rod.setAttribute('y1', String(rodTop));
    this.#rod.setAttribute('x2', String(SPRING_CX));
    this.#rod.setAttribute('y2', String(rodEnd));

    // Указатель (красная риска)
    this.#pointer.setAttribute('transform', `translate(0 ${bottom})`);

    // Крюк — продолжение штока
    this.#hookStem.setAttribute('x1', String(SPRING_CX));
    this.#hookStem.setAttribute('y1', String(rodEnd));
    this.#hookStem.setAttribute('x2', String(SPRING_CX));
    this.#hookStem.setAttribute('y2', String(rodEnd + 4));
    this.#hookLoop.setAttribute('cx', String(SPRING_CX));
    this.#hookLoop.setAttribute('cy', String(rodEnd + 8));

    // ARIA — текущее показание (не «правильный ответ»). Запятая для ru-RU.
    this.setAttribute(
      'aria-label',
      `Динамометр 0…${this.range} Н, текущее показание ${this.#formatN(Math.max(0, Math.min(this.range, this.force)))} Н`,
    );
  }

  #renderScale(): void {
    const range = this.range;
    // Major деления: 0, 0.1, 0.2, ..., range (10 шагов)
    // Minor деления: каждое 0.5 от major (только риски, без цифр)
    this.#scaleLeft.replaceChildren();
    this.#scaleRight.replaceChildren();

    const majorCount = 10;
    for (let i = 0; i <= majorCount; i++) {
      const ratio = i / majorCount;
      const y = WINDOW_Y + ratio * WINDOW_H;
      const value = (i * range) / majorCount;
      // ru-RU: запятая в дробях («0,1 Н»), а не точка. На целых (5Н: «0», «1», …) запятой нет.
      const labelText =
        range === 1
          ? value.toFixed(1).replace('.', ',')
          : value === 0
          ? '0'
          : value.toString();

      // Левая шкала: рисочка + цифра (одна колонка)
      this.#scaleLeft.appendChild(
        this.#mkLine(TICK_LEFT_X, y, TICK_LEFT_X + 4, y, '#0f2747', 0.6),
      );
      this.#scaleLeft.appendChild(
        this.#mkText(NUM_LEFT_X, y + 1.4, labelText, '#14233a'),
      );
      // Правая колонка — только короткая риска (без цифры)
      this.#scaleRight.appendChild(
        this.#mkLine(TICK_RIGHT_X - 4, y, TICK_RIGHT_X, y, '#0f2747', 0.6),
      );
    }
    // Minor (сред-деления, между major)
    for (let i = 0; i < majorCount; i++) {
      const yMid = WINDOW_Y + ((i + 0.5) / majorCount) * WINDOW_H;
      this.#scaleLeft.appendChild(
        this.#mkLine(TICK_LEFT_X, yMid, TICK_LEFT_X + 3, yMid, '#1f3a5c', 0.4),
      );
      this.#scaleRight.appendChild(
        this.#mkLine(
          TICK_RIGHT_X - 3,
          yMid,
          TICK_RIGHT_X,
          yMid,
          '#1f3a5c',
          0.4,
        ),
      );
    }
  }

  #mkLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    width: number,
  ): SVGLineElement {
    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ln.setAttribute('x1', String(x1));
    ln.setAttribute('y1', String(y1));
    ln.setAttribute('x2', String(x2));
    ln.setAttribute('y2', String(y2));
    ln.setAttribute('stroke', color);
    ln.setAttribute('stroke-width', String(width));
    return ln;
  }

  #mkText(x: number, y: number, text: string, color: string): SVGTextElement {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', String(x));
    t.setAttribute('y', String(y));
    t.setAttribute('fill', color);
    t.setAttribute('font-weight', '700');
    t.textContent = text;
    return t;
  }

}

customElements.define('lab-dynamometer', LabDynamometer);
