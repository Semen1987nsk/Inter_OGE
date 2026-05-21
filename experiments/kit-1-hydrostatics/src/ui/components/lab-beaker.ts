/**
 * <lab-beaker level="0" capacity-ml="200" liquid="water">
 *
 * Лабораторный стакан (по комплекту №1 ФИПИ: высота ≥120 мм, диаметр ≥50 мм).
 * Прозрачные стенки, без шкалы (в отличие от мензурки).
 * Используется в опытах 1.2-1.4 для приготовления растворов и переливаний.
 *
 * Атрибуты:
 *   level="0..200" — текущий уровень жидкости в мл
 *   capacity-ml — рекомендуемая вместимость
 *   liquid="water|salt-water|oil" — тип жидкости (для цвета)
 *
 * События:
 *   beaker-tap — клик по стакану.
 */

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    --glass-stroke: rgba(180, 220, 240, 0.7);
    --glass-fill-edge: rgba(180, 220, 240, 0.18);
    --glass-fill-center: rgba(180, 220, 240, 0.05);
    --water-color: #4a9fc7;
    --water-color-light: #7ec1e2;
    --salt-water-color: #84a8c4;
    --salt-water-color-light: #b3cde0;
    --oil-color: #d4b85a;
    --oil-color-light: #e8d27e;
    display: inline-block;
    /* width: 125px (was 96) — соотношение beaker:cyl = 1.6:1 по ФИПИ
       (slide09_img26). Высота host'а пропорционально растёт через
       aspect-ratio SVG (96×130) → ≈ 169 px при width 125. См. §19.11.16
       REFERENCE. */
    width: 125px;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.35));
    transition: filter 160ms ease-out, transform 160ms ease-out;
  }
  :host(:hover) {
    filter: drop-shadow(0 10px 14px rgb(0 0 0 / 0.45));
  }
  :host([active]) {
    filter: drop-shadow(0 0 0 2.5px var(--color-brand-orange, #ffbe0b))
            drop-shadow(0 8px 12px rgb(0 0 0 / 0.5));
  }
  :host(:focus-visible) { outline: none; }
  :host(:focus-visible) .focus-ring { opacity: 1; }

  :host([liquid="salt-water"]) {
    --water-color: var(--salt-water-color);
    --water-color-light: var(--salt-water-color-light);
  }
  :host([liquid="oil"]) {
    --water-color: var(--oil-color);
    --water-color-light: var(--oil-color-light);
  }

  .frame { width: 100%; height: auto; display: block; pointer-events: none; }
  .water-rect { transition: y 480ms cubic-bezier(0.42, 0, 0.58, 1), height 480ms cubic-bezier(0.42, 0, 0.58, 1); }
  .label-text {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 7px;
    font-weight: 700;
    fill: rgba(255, 255, 255, 0.65);
    text-anchor: middle;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 5 3;
    opacity: 0;
    transition: opacity 150ms;
  }
  .bk-contact-shadow { pointer-events: none; }
  @media (prefers-reduced-motion: no-preference) {
    .bk-liquid--filling {
      animation: bk-slosh var(--dur-water, 500ms) ease-out both;
      transform-origin: 48px 70px;
      transform-box: view-box;
    }
  }
  @keyframes bk-slosh {
    0%   { transform: skewX(1.2deg); }
    40%  { transform: skewX(-0.8deg); }
    70%  { transform: skewX(0.4deg); }
    100% { transform: skewX(0); }
  }
</style>

<svg class="frame" viewBox="0 0 96 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="bkGlass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(255,255,255,0.20)" />
      <stop offset="20%" stop-color="var(--glass-fill-edge)" />
      <stop offset="50%" stop-color="var(--glass-fill-center)" />
      <stop offset="80%" stop-color="var(--glass-fill-edge)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.20)" />
    </linearGradient>
    <linearGradient id="bkWater" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--water-color-light)" stop-opacity="0.85" />
      <stop offset="100%" stop-color="var(--water-color)" stop-opacity="0.95" />
    </linearGradient>
    <clipPath id="bkClip">
      <path d="M14 22 L82 22 L78 116 L18 116 Z" />
    </clipPath>
    <radialGradient id="bkShadow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(0,0,0,0.36)" />
      <stop offset="65%" stop-color="rgba(0,0,0,0.13)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0)" />
    </radialGradient>
  </defs>

  <ellipse class="bk-contact-shadow" cx="48" cy="125" rx="36" ry="4.5" fill="url(#bkShadow)" />

  <!-- Носик-сливная кромка -->
  <path d="M14 16 L24 12 L20 22 L14 22 Z"
        fill="url(#bkGlass)" stroke="var(--glass-stroke)" stroke-width="0.8" />

  <!-- Корпус -->
  <path d="M14 22 L82 22 L78 116 L18 116 Z"
        fill="url(#bkGlass)" stroke="var(--glass-stroke)" stroke-width="1" />

  <!-- Дно -->
  <ellipse cx="48" cy="116" rx="30" ry="3" fill="rgba(180,220,240,0.20)"
           stroke="var(--glass-stroke)" stroke-width="0.8" />

  <!-- Жидкость (clipped) -->
  <g class="bk-liquid" clip-path="url(#bkClip)">
    <rect id="bk-water" class="water-rect" x="14" y="116" width="68" height="0"
          fill="url(#bkWater)" />
    <ellipse id="bk-meniscus" cx="48" cy="116" rx="28" ry="1.5"
             fill="var(--water-color-light)" opacity="0" />
  </g>

  <!-- Highlight стекла -->
  <rect x="20" y="28" width="2.5" height="84" rx="1.2" fill="rgba(255,255,255,0.30)" />

  <!-- Лейбл «ЛАБОСФЕРА» -->
  <text class="label-text" x="48" y="32">ЛАБОСФЕРА · 250 мл</text>

  <!-- Focus ring -->
  <rect class="focus-ring" x="6" y="6" width="84" height="118" rx="4" />
</svg>
`;

const Y_AT_0_ML = 116;
const Y_AT_FULL_ML = 30; // ~250 мл
const PIXELS_PER_ML_BEAKER = (Y_AT_0_ML - Y_AT_FULL_ML) / 250;

export class LabBeaker extends HTMLElement {
  static observedAttributes = ['level', 'liquid', 'active'];

  #shadow: ShadowRoot;
  #water: SVGRectElement;
  #meniscus: SVGEllipseElement;
  #liquid: SVGGElement;
  #fillAbort: AbortController | null = null;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.appendChild(template.content.cloneNode(true));
    this.#water = this.#shadow.getElementById('bk-water') as unknown as SVGRectElement;
    this.#meniscus = this.#shadow.getElementById('bk-meniscus') as unknown as SVGEllipseElement;
    this.#liquid = this.#shadow.querySelector('.bk-liquid') as unknown as SVGGElement;
    this.addEventListener('click', this.#emitTap);
    this.addEventListener('keydown', this.#handleKey);
    this.#renderWater();
  }

  connectedCallback(): void {
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
    if (!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', 'Стакан 250 мл. Нажмите чтобы перетащить на стол.');
    }
  }

  attributeChangedCallback(): void {
    this.#renderWater();
  }

  #renderWater(): void {
    const level = parseFloat(this.getAttribute('level') ?? '0') || 0;
    const total = Math.max(0, Math.min(250, level));
    const yTop = Y_AT_0_ML - total * PIXELS_PER_ML_BEAKER;
    const height = Y_AT_0_ML - yTop;
    this.#water.setAttribute('y', `${yTop}`);
    this.#water.setAttribute('height', `${height}`);
    this.#meniscus.setAttribute('cy', `${yTop}`);
    this.#meniscus.style.opacity = total > 0 ? '0.7' : '0';
  }

  /**
   * Y-координата поверхности воды в **viewport-space** (px от начала экрана).
   * Используется оркестратором для расчёта `submersionFraction` цилиндра во
   * время drag-by-thread: нужно знать, насколько глубоко цилиндр погружён
   * относительно ВОДЫ, а не корпуса стакана.
   *
   * Если воды нет (level=0) — возвращаем уровень дна (Y_AT_0_ML), чтобы вызывающий
   * получил submersion=0 без специальной обработки.
   *
   * Используется через `cylinder_bottom_y - water_surface_y → depth_below_water`.
   */
  getWaterSurfaceY(): number {
    const rect = this.getBoundingClientRect();
    if (rect.height === 0) return rect.top;
    const yAttr = parseFloat(this.#water.getAttribute('y') ?? `${Y_AT_0_ML}`);
    // viewBox 96×130 → DOM-координаты через scaleY.
    const scaleY = rect.height / 130;
    return rect.top + yAttr * scaleY;
  }

  /** Y-координата дна стакана (нижняя точка водного столба) в viewport-space. */
  getWaterBottomY(): number {
    const rect = this.getBoundingClientRect();
    if (rect.height === 0) return rect.bottom;
    const scaleY = rect.height / 130;
    return rect.top + Y_AT_0_ML * scaleY;
  }

  /** Высота столба воды в DOM-px (≥0). */
  getWaterColumnHeightPx(): number {
    return Math.max(0, this.getWaterBottomY() - this.getWaterSurfaceY());
  }

  /** Проигрывает «налив + успокоение» (затухающий slosh). Идемпотентно
   *  перезапускается: отменяем прошлый listener, снимаем класс, форс-reflow,
   *  навешиваем заново. */
  playFill(): void {
    if (typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Под reduce slosh не нужен; класс не навешиваем (иначе он завис бы —
      // animationend не сработает, т.к. keyframe за no-preference).
      this.#fillAbort?.abort();
      this.#fillAbort = null;
      this.#liquid.classList.remove('bk-liquid--filling');
      return;
    }
    const g = this.#liquid;
    this.#fillAbort?.abort();
    const ctrl = new AbortController();
    this.#fillAbort = ctrl;
    g.classList.remove('bk-liquid--filling');
    // offsetWidth недоступен у SVGElement — getBoundingClientRect это
    // канонический reflow-триггер для SVG-узла (перезапуск keyframe).
    void (g as unknown as HTMLElement).getBoundingClientRect();
    g.classList.add('bk-liquid--filling');
    g.addEventListener(
      'animationend',
      () => { g.classList.remove('bk-liquid--filling'); this.#fillAbort = null; },
      { once: true, signal: ctrl.signal },
    );
  }

  /**
   * X-границы ВНУТРЕННЕГО горлышка стакана (viewport-space). Используется
   * оркестратором как guard при drag цилиндра — цилиндр не должен «пройти
   * через стенку», т.е. центр цилиндра должен оставаться в [left, right].
   *
   * Внутренний контур горлышка в SVG: x=14..82 на y=22 (см. path выше).
   * Чуть сужаем (inset 2 SVG-units) под толщину стенки.
   */
  getMouthBounds(): { left: number; right: number; center: number } {
    const rect = this.getBoundingClientRect();
    const scaleX = rect.width / 96;
    const MOUTH_LEFT_SVG = 16;  // 14 + 2 (inset под стенку)
    const MOUTH_RIGHT_SVG = 80; // 82 - 2
    const left = rect.left + MOUTH_LEFT_SVG * scaleX;
    const right = rect.left + MOUTH_RIGHT_SVG * scaleX;
    return { left, right, center: (left + right) / 2 };
  }

  #emitTap = (): void => {
    this.dispatchEvent(new CustomEvent('beaker-tap', { bubbles: true, composed: true }));
  };

  #handleKey = (ev: KeyboardEvent): void => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.#emitTap();
    }
  };
}

customElements.define('lab-beaker', LabBeaker);
