/**
 * <lab-metal-weight material="steel|aluminum|plastic" id-num="1|2|3|4" selected attached>
 *
 * Цилиндр-груз — реалистичная отрисовка по образцу настоящих цилиндров
 * комплекта №1 ФИПИ:
 *   - сталь: тёмная полированная сталь с радиальным блеском
 *   - алюминий: светлый матовый алюминий с микро-текстурой
 *   - пластик: матовый светлый ABS с тонкой кромкой
 *
 * Крючок: хром-стальной, S-образный.
 * Этикетка: гравированный номер на белом/тёмном фоне.
 *
 * Атрибуты:
 *   material — определяет цвет/текстуру корпуса
 *   id-num — номер цилиндра (1..4)
 *   selected — подсветка при выборе
 *   attached — снижает контраст (груз уже размещён)
 *
 * События:
 *   weight-tap { detail: { material, idNum } } — клик.
 */

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    --w-size: 96px;
    /* Все цилиндры имеют одинаковую длину (по реальному ФИПИ-комплекту,
       фото слайд №24 спецификации), отличаются ДИАМЕТРОМ. Поэтому высота
       host'а фиксирована: --w-size · 1.65 ≈ 158px при дефолте 96.
       Default 96 (was 64) приведён к реальному соотношению dyno:cyl=2.67:1
       по ФИПИ slide09_img26 — см. §19.11.16 REFERENCE. На сцене опыта 1.2
       override до 56 (было 36) — see archimedes-experiment.css:301. */
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    width: var(--w-size);
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
                filter 200ms ease-out;
    filter: drop-shadow(0 5px 8px rgb(0 0 0 / 0.4));
  }

  :host(:hover) {
    transform: translateY(-3px) rotate(-1deg);
    filter: drop-shadow(0 9px 14px rgb(0 0 0 / 0.5));
  }
  :host([selected]) {
    transform: translateY(-3px) scale(1.06);
    filter: drop-shadow(0 0 0 2.5px var(--color-brand-orange, #ffbe0b))
            drop-shadow(0 8px 14px rgb(0 0 0 / 0.55));
  }
  :host([attached]) {
    cursor: default;
    opacity: 0.55;
    filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.3)) saturate(0.7);
  }
  :host(:focus-visible) { outline: none; }
  :host(:focus-visible) .focus-ring { opacity: 1; }

  /* Используется в overlay — скрывает подпись под SVG. */
  :host([no-legend]) .legend { display: none; }
  :host([hidden]) { display: none; }

  .frame {
    width: 100%;
    height: calc(var(--w-size) * 1.65);
    pointer-events: none;
  }

  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 5 3;
    opacity: 0;
    transition: opacity 150ms;
  }

  .label-text {
    pointer-events: none;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-weight: 800;
    font-size: 12px;
    text-anchor: middle;
    dominant-baseline: middle;
    letter-spacing: 0.04em;
  }
  .legend {
    margin-top: 5px;
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text-secondary, #a8b3c7);
    text-align: center;
    pointer-events: none;
    line-height: 1.15;
  }
  .legend-mass {
    display: block;
    color: var(--color-text-muted, #6a7081);
    font-size: 9px;
    font-weight: 500;
    margin-top: 1px;
  }
</style>

<svg id="root-svg" class="frame" viewBox="0 0 64 110" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <!-- Сталь: тёмная полированная -->
    <linearGradient id="bodySteel" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1f2228" />
      <stop offset="20%" stop-color="#363b46" />
      <stop offset="48%" stop-color="#7a818f" />
      <stop offset="55%" stop-color="#7a818f" />
      <stop offset="80%" stop-color="#363b46" />
      <stop offset="100%" stop-color="#1f2228" />
    </linearGradient>
    <!-- Алюминий: светлый матовый -->
    <linearGradient id="bodyAluminum" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#737a85" />
      <stop offset="20%" stop-color="#a8b0bb" />
      <stop offset="48%" stop-color="#dde2e8" />
      <stop offset="55%" stop-color="#dde2e8" />
      <stop offset="80%" stop-color="#a8b0bb" />
      <stop offset="100%" stop-color="#737a85" />
    </linearGradient>
    <!-- Пластик: бежево-белый -->
    <linearGradient id="bodyPlastic" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a8a294" />
      <stop offset="20%" stop-color="#d8d3c4" />
      <stop offset="48%" stop-color="#f5f1e6" />
      <stop offset="55%" stop-color="#f5f1e6" />
      <stop offset="80%" stop-color="#d8d3c4" />
      <stop offset="100%" stop-color="#a8a294" />
    </linearGradient>
    <!-- Крючок (хром-сталь) -->
    <linearGradient id="hookGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#5a606e" />
      <stop offset="50%" stop-color="#cdd1d8" />
      <stop offset="100%" stop-color="#5a606e" />
    </linearGradient>
    <!-- Верхняя/нижняя кромка корпуса (более тёмная фаска) -->
    <linearGradient id="rimDark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0.45)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.05)" />
    </linearGradient>
    <linearGradient id="rimLight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.30)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.0)" />
    </linearGradient>
    <!-- Тонкая микро-текстура (для алюминия — параллельные риски) -->
    <pattern id="aluminumLines" x="0" y="0" width="4" height="3" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="4" y2="0" stroke="rgba(0,0,0,0.07)" stroke-width="0.4" />
    </pattern>
  </defs>

  <!-- Тень. cy динамически в #applyMaterial. -->
  <ellipse id="shadow-ellipse" cx="32" cy="104" rx="22" ry="2.5" fill="rgba(0,0,0,0.4)" />

  <!-- Крючок (S-образный, хром-сталь) -->
  <g>
    <!-- Часть, выходящая из корпуса вверх -->
    <line x1="32" y1="22" x2="32" y2="14" stroke="url(#hookGrad)" stroke-width="2.4" stroke-linecap="round" />
    <!-- Изгиб -->
    <path d="M32 14 Q 24 14, 24 8 Q 24 4, 28 4"
          fill="none" stroke="url(#hookGrad)" stroke-width="2.4" stroke-linecap="round" />
    <!-- Highlight на крючке -->
    <line x1="33" y1="22" x2="33" y2="14" stroke="rgba(255,255,255,0.5)" stroke-width="0.5" />
  </g>

  <!-- Корпус-цилиндр (steel/aluminum/plastic в зависимости от material) -->
  <g id="body-group">
    <!-- Основная заливка -->
    <rect id="body-rect" x="14" y="22" width="36" height="78" rx="2"
          fill="url(#bodySteel)" stroke="rgba(0,0,0,0.35)" stroke-width="0.6" />
    <!-- Микро-текстура для алюминия -->
    <rect id="body-texture" x="14" y="22" width="36" height="78" rx="2"
          fill="url(#aluminumLines)" opacity="0" />
    <!-- Верхняя фаска -->
    <rect x="14" y="22" width="36" height="3.5" rx="1.5" fill="url(#rimDark)" />
    <rect x="14" y="22.5" width="36" height="1.5" fill="url(#rimLight)" />
    <!-- Нижняя фаска. y динамически в #applyMaterial. -->
    <rect id="body-rim-bottom" x="14" y="96" width="36" height="3.5" rx="1.5" fill="url(#rimDark)" transform="scale(1,-1) translate(0,-200)" />
    <!-- Боковые тонкие отражения. y2 динамически. -->
    <line id="body-glint-l" x1="16" y1="26" x2="16" y2="98" stroke="rgba(255,255,255,0.18)" stroke-width="0.5" />
    <line id="body-glint-r" x1="48" y1="26" x2="48" y2="98" stroke="rgba(0,0,0,0.18)" stroke-width="0.5" />
  </g>

  <!-- Шкала на пластиковом цилиндре №3 (по ФИПИ — со шкалой 1мм вдоль образующей).
       Заполняется программно в #applyMaterial под актуальную высоту корпуса. -->
  <g id="cyl-scale" opacity="0"></g>

  <!-- Гравированный номер (на белой/тёмной этикетке в центре). y динамически. -->
  <g>
    <rect id="lbl-bg" x="20" y="50" width="24" height="22" rx="1.5"
          fill="#f5f5f0" stroke="rgba(0,0,0,0.45)" stroke-width="0.5" />
    <text id="lbl-num" class="label-text" x="32" y="62" fill="#1a1b1f">№ ?</text>
  </g>

  <!-- Focus ring. height динамически. -->
  <rect id="focus-ring-rect" class="focus-ring" x="6" y="2" width="52" height="106" rx="4" />
</svg>

<span class="legend" id="legend">
  <span id="legend-name"></span>
  <span class="legend-mass" id="legend-mass"></span>
</span>
`;

/* SVG viewBox геометрия. ViewBox 64×110 ФИКСИРОВАН — все 4 цилиндра помещаются
   в стандартный стакан 250 мл (физически по ФИПИ-комплекту). Меняется ТОЛЬКО
   диаметр тела пропорционально √(V/V_BASE) — равная высота, разный диаметр.
   Это соответствует реальному комплекту ФИПИ (фото слайд №24 спецификации):
   все цилиндры ~75 мм длиной, диаметры 18..27 мм.

   Педагогическая ценность: ученик видит, что F_A зависит от ОБЪЁМА (а не
   только от высоты), сравнивая цилиндры с одинаковой длиной но разной
   толщиной. Архимед формулирует именно так: F_A = ρ·g·V, без привязки
   к форме. */
const SVG_WIDTH = 64;
const SVG_HEIGHT = 110;
/** Y-координата верхнего края тела (постоянна — крюк сверху). */
const BODY_TOP_Y = 22;
/** Y-координата нижнего края тела (фиксированная — равная длина цилиндров). */
const BODY_BOTTOM_Y = 100;
/** Базовая высота тела (для V=25 см³). Постоянна для всех id. */
const BASE_BODY_H = BODY_BOTTOM_Y - BODY_TOP_Y; // 78
/** Базовый диаметр тела SVG-units (для V=25). */
const BASE_BODY_W = 36;
/** Базовый объём (см³), к которому привязаны базовые размеры SVG. */
const V_BASE_CM3 = 25;

/* Вершина дуги S-образного крючка (см. <path d="M32 14 Q24 14, 24 8 Q24 4, 28 4">).
   Это реалистичная точка, на которую накидывается петля нити. */
const HOOK_TIE_X = 28;
const HOOK_TIE_Y = 4;

/**
 * V_cm3 для каждого цилиндра по ФИПИ-паспорту комплекта №1. Дублирование
 * физических констант здесь — намеренное: компонент не должен зависеть от
 * physics/archimedes/tables (ниже по уровню в стеке). Если ФИПИ изменит
 * паспорт — синхронно править tables.ts и эту таблицу.
 */
const CYL_VOLUME_CM3: Record<string, number> = {
  '1': 25,
  '2': 25,
  '3': 56,
  '4': 34,
};

/**
 * Материал-специфичные параметры отрисовки (только для рендера, не для подсказок).
 * Учёник определяет материал по плотности — поэтому ничего о массе/объёме здесь
 * подсказывать НЕЛЬЗЯ. В legend показываем только «Цилиндр № N».
 */
const MATERIAL_INFO: Record<
  string,
  { bodyFill: string; labelFill: string; labelText: string }
> = {
  steel: { bodyFill: 'url(#bodySteel)', labelFill: '#1f2228', labelText: '#f5f5f0' },
  aluminum: { bodyFill: 'url(#bodyAluminum)', labelFill: '#ffffff', labelText: '#1a1b1f' },
  plastic: { bodyFill: 'url(#bodyPlastic)', labelFill: '#2a2d36', labelText: '#f5f5f0' },
};

export class LabMetalWeight extends HTMLElement {
  static observedAttributes = ['material', 'id-num', 'selected', 'attached'];

  #shadow: ShadowRoot;
  #lblNum: SVGTextElement;
  #lblBg: SVGRectElement;
  #bodyRect: SVGRectElement;
  #bodyTexture: SVGRectElement;
  #bodyRimBottom: SVGRectElement;
  #bodyGlintL: SVGLineElement;
  #bodyGlintR: SVGLineElement;
  #shadowEllipse: SVGEllipseElement;
  #cylScale: SVGGElement;
  #legendName: HTMLElement;
  #legendMass: HTMLElement;

  /** Текущая высота тела (SVG units). Кеш для getBottomY. */
  #currentBodyH = BASE_BODY_H;
  /** Текущая высота viewBox (SVG units). */
  #currentSvgH = SVG_HEIGHT;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.appendChild(template.content.cloneNode(true));
    this.#lblNum = this.#shadow.getElementById('lbl-num') as unknown as SVGTextElement;
    this.#lblBg = this.#shadow.getElementById('lbl-bg') as unknown as SVGRectElement;
    this.#bodyRect = this.#shadow.getElementById('body-rect') as unknown as SVGRectElement;
    this.#bodyTexture = this.#shadow.getElementById('body-texture') as unknown as SVGRectElement;
    this.#bodyRimBottom = this.#shadow.getElementById('body-rim-bottom') as unknown as SVGRectElement;
    this.#bodyGlintL = this.#shadow.getElementById('body-glint-l') as unknown as SVGLineElement;
    this.#bodyGlintR = this.#shadow.getElementById('body-glint-r') as unknown as SVGLineElement;
    this.#shadowEllipse = this.#shadow.getElementById('shadow-ellipse') as unknown as SVGEllipseElement;
    this.#cylScale = this.#shadow.getElementById('cyl-scale') as unknown as SVGGElement;
    this.#legendName = this.#shadow.getElementById('legend-name')!;
    this.#legendMass = this.#shadow.getElementById('legend-mass')!;
    this.addEventListener('click', this.#emitTap);
    this.addEventListener('keydown', this.#handleKey);
    this.#applyMaterial();
  }

  connectedCallback(): void {
    this.#applyA11yAttrs();
    this.#applyMaterial();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#applyA11yAttrs();
    this.#applyMaterial();
  }

  /**
   * a11y-host attributes:
   *   - не attached: focusable (tabindex=0) + role=button — карточка
   *     цилиндра в kit-panel, ученик может Enter'ом «взять».
   *   - attached: НЕ focusable (tabindex=-1, role убран) — цилиндр
   *     висит на динамометре, не должен дублировать фокус с родительским
   *     контейнером (cylinder-host имеет свою клавиатурную семантику —
   *     ↓/Enter «погрузить», ↑ «поднять»).
   *
   * Без этого axe ругается «focusable element has focusable descendants»,
   * и Tab проходит дважды по одному и тому же элементу.
   */
  #applyA11yAttrs(): void {
    if (this.hasAttribute('attached')) {
      this.setAttribute('tabindex', '-1');
      this.removeAttribute('role');
    } else {
      if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
      if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
    }
  }

  #applyMaterial(): void {
    const idNum = this.getAttribute('id-num') ?? '?';
    const material = this.getAttribute('material') ?? 'steel';
    const info = MATERIAL_INFO[material];
    if (info) {
      this.#bodyRect.setAttribute('fill', info.bodyFill);
      this.#lblBg.setAttribute('fill', info.labelFill);
      this.#lblNum.setAttribute('fill', info.labelText);
    }
    // Микро-текстура только для алюминия (намёк на материал, но не label)
    this.#bodyTexture.style.opacity = material === 'aluminum' ? '1' : '0';
    this.#lblNum.textContent = `№ ${idNum}`;
    // legend: только номер, без материала и без массы — учёник определяет сам
    this.#legendName.textContent = `Цилиндр № ${idNum}`;
    this.#legendMass.textContent = '';
    if (this.isConnected) this.setAttribute('aria-label', `Цилиндр № ${idNum}.`);

    // ── Параметризация пропорций по ФИПИ-объёму ───────────────────────
    // Реальный комплект ФИПИ-2026 (фото слайд №24 спецификации): все цилиндры
    // имеют примерно одинаковую длину (~75 мм), отличаются ДИАМЕТРОМ.
    // V = π·r²·h → при фиксированном h: r ∝ √V.
    //
    // ratio_d = √(V_actual / V_BASE):
    //   №1 (V=25, steel)    → 1.00 (базовый)
    //   №2 (V=25, aluminum) → 1.00
    //   №3 (V=56, plastic)  → 1.50 (на 50% толще)
    //   №4 (V=34, aluminum) → 1.17 (на 17% толще)
    //
    // Высота тела (#currentBodyH) и viewBox остаются фиксированными — это
    // важно для того, чтобы все 4 цилиндра помещались в один стакан 250 мл и
    // на единой baseline-Y у крюка дин-ра. Ученик видит «толстый пластиковый
    // №3» и понимает, что его F_A больше из-за объёма, а не длины.
    const V_actual = CYL_VOLUME_CM3[idNum] ?? V_BASE_CM3;
    const widthRatio = Math.sqrt(V_actual / V_BASE_CM3);
    const bodyW = BASE_BODY_W * widthRatio;
    const bodyX = SVG_WIDTH / 2 - bodyW / 2; // центрируем по горизонтали
    this.#currentBodyH = BASE_BODY_H;
    this.#currentSvgH = SVG_HEIGHT;

    // 1) viewBox фиксирован 64×110 — высота тела одинакова для всех id.
    //    Атрибут уже стоит в template; повторно НЕ ставим, чтобы не нарушать
    //    Custom Elements invariant «constructor MUST NOT set attributes».

    // 2) Тело: новая ширина и x-offset (высота не меняется).
    this.#bodyRect.setAttribute('x', String(bodyX));
    this.#bodyRect.setAttribute('width', String(bodyW));
    this.#bodyTexture.setAttribute('x', String(bodyX));
    this.#bodyTexture.setAttribute('width', String(bodyW));

    // 4) Нижняя фаска. В исходном SVG она была наклеена на y=96 с
    //    transform="scale(1,-1) translate(0,-200)" — это «отражение» по Y;
    //    при изменении ширины убираем transform и ставим штатно.
    const RIM_H = 3.5;
    this.#bodyRimBottom.removeAttribute('transform');
    this.#bodyRimBottom.setAttribute('x', String(bodyX));
    this.#bodyRimBottom.setAttribute('width', String(bodyW));
    this.#bodyRimBottom.setAttribute('y', String(BODY_BOTTOM_Y - RIM_H));
    this.#bodyRimBottom.setAttribute('height', String(RIM_H));

    // 5) Боковые блики смещаются с новыми краями тела.
    this.#bodyGlintL.setAttribute('x1', String(bodyX + 2));
    this.#bodyGlintL.setAttribute('x2', String(bodyX + 2));
    this.#bodyGlintR.setAttribute('x1', String(bodyX + bodyW - 2));
    this.#bodyGlintR.setAttribute('x2', String(bodyX + bodyW - 2));

    // 6) Тень — пропорциональна ширине тела (масса в реальности тоже
    //    больше у толстых цилиндров).
    this.#shadowEllipse.setAttribute('rx', String(bodyW / 2 + 4));

    // 7) Этикетка с номером — в центре тела по горизонтали (фиксированная
    //    Y-позиция, размер не меняем — чтобы текст «№ N» оставался читаемым).
    const lblBgW = 24;
    const lblBgX = SVG_WIDTH / 2 - lblBgW / 2;
    this.#lblBg.setAttribute('x', String(lblBgX));
    this.#lblNum.setAttribute('x', String(SVG_WIDTH / 2));

    // 8) Focus-ring — стандартный размер.
    // 9) Шкала на пластиковом цилиндре №3 (ФИПИ Прил.2: «шкала вдоль
    //    образующей с ценой деления 1 мм, длина не менее 80 мм»).
    //
    //    Геометрия: 80 мм реального цилиндра отрисовываются по высоте body
    //    (BODY_TOP_Y..BODY_BOTTOM_Y = 78 SVG-юнитов). Major-риски каждые
    //    10 мм с метками 20/40/60, minor — каждый 1 мм. Слева от этикетки
    //    (этикетка справа), чёрные риски для видимости на бежевом пластике.
    while (this.#cylScale.firstChild) {
      this.#cylScale.removeChild(this.#cylScale.firstChild);
    }
    if (material === 'plastic' && idNum === '3') {
      this.#cylScale.style.opacity = '1';
      const ns = 'http://www.w3.org/2000/svg';
      const yTop = BODY_TOP_Y + 3;
      const yBot = BODY_BOTTOM_Y - 3;
      const totalH = yBot - yTop; // ~72 SVG-юнита ≈ 80 мм
      const mmPerUnit = 80 / totalH;
      // Светлая полоска-подложка по левой кромке для контраста рисок —
      // имитирует «белую наклейку со шкалой» на реальном цилиндре №3.
      const xLeft = bodyX + 1.5;
      const stripeWidth = 9;
      const stripe = document.createElementNS(ns, 'rect');
      stripe.setAttribute('x', String(xLeft));
      stripe.setAttribute('y', String(yTop - 1.5));
      stripe.setAttribute('width', String(stripeWidth));
      stripe.setAttribute('height', String(yBot - yTop + 3));
      stripe.setAttribute('fill', '#fbf8ee');
      stripe.setAttribute('stroke', 'rgba(0,0,0,0.25)');
      stripe.setAttribute('stroke-width', '0.2');
      stripe.setAttribute('rx', '0.6');
      this.#cylScale.appendChild(stripe);

      const xMinorEnd = xLeft + 3;
      const xMidEnd = xLeft + 5;
      const xMajorEnd = xLeft + 7;

      // Минор (каждый 1 мм, кроме 5 и 10 кратных).
      for (let mm = 1; mm < 80; mm++) {
        if (mm % 5 === 0) continue;
        const y = yTop + mm / mmPerUnit;
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', String(xLeft));
        line.setAttribute('y1', String(y));
        line.setAttribute('x2', String(xMinorEnd));
        line.setAttribute('y2', String(y));
        line.setAttribute('stroke', '#3a3a44');
        line.setAttribute('stroke-width', '0.35');
        this.#cylScale.appendChild(line);
      }

      // Mid (каждые 5 мм, не major).
      for (let mm = 5; mm < 80; mm += 5) {
        if (mm % 10 === 0) continue;
        const y = yTop + mm / mmPerUnit;
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', String(xLeft));
        line.setAttribute('y1', String(y));
        line.setAttribute('x2', String(xMidEnd));
        line.setAttribute('y2', String(y));
        line.setAttribute('stroke', '#1a1b1f');
        line.setAttribute('stroke-width', '0.55');
        this.#cylScale.appendChild(line);
      }

      // Мажор (каждые 10 мм) — длиннее, толще + числовые метки.
      for (let mm = 10; mm <= 80; mm += 10) {
        const y = yTop + mm / mmPerUnit;
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', String(xLeft));
        line.setAttribute('y1', String(y));
        line.setAttribute('x2', String(xMajorEnd));
        line.setAttribute('y2', String(y));
        line.setAttribute('stroke', '#0a0a14');
        line.setAttribute('stroke-width', '0.9');
        line.setAttribute('stroke-linecap', 'round');
        this.#cylScale.appendChild(line);

        if (mm === 20 || mm === 40 || mm === 60) {
          const txt = document.createElementNS(ns, 'text');
          txt.setAttribute('x', String(xMajorEnd + 0.8));
          txt.setAttribute('y', String(y + 1.5));
          txt.setAttribute('fill', '#0a0a14');
          txt.setAttribute('font-family', "'JetBrains Mono', ui-monospace, monospace");
          txt.setAttribute('font-size', '4.2');
          txt.setAttribute('font-weight', '800');
          txt.textContent = String(mm);
          this.#cylScale.appendChild(txt);
        }
      }
    } else {
      this.#cylScale.style.opacity = '0';
    }
  }

  /**
   * Позиция точки крепления нити к верхнему крюку цилиндра (host-space, как
   * у lab-dynamometer.getWeightHookPosition). На эту точку «вяжется» нить
   * до крючка динамометра в опыте 1.2 «Архимед».
   *
   * При параметризации пропорций по ФИПИ-объёму высота viewBox растёт
   * пропорционально V — пересчитываем через `#currentSvgH`, не через
   * фиксированную SVG_HEIGHT_BASE.
   */
  getThreadHookPosition(): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return {
      x: (HOOK_TIE_X / SVG_WIDTH) * rect.width,
      y: (HOOK_TIE_Y / this.#currentSvgH) * rect.height,
    };
  }

  /** Y-координата верхнего крюка в host-space. */
  getThreadHookY(): number {
    return this.getThreadHookPosition().y;
  }

  /**
   * Y-координата нижней кромки **физического корпуса** цилиндра в viewport-space
   * (DOM px от верха окна). Это нижняя точка SVG-тела (где будет смачиваться
   * вода при погружении), без учёта тени и нижнего зазора viewBox.
   *
   * Используется оркестратором для расчёта `submersionFraction` — насколько
   * глубоко тело погружено относительно поверхности воды:
   * `depth = max(0, getBottomY() - beaker.getWaterSurfaceY())`.
   */
  getBottomY(): number {
    const rect = this.getBoundingClientRect();
    if (rect.height === 0) return rect.bottom;
    const bodyBottomSvgY = BODY_TOP_Y + this.#currentBodyH;
    const scaleY = rect.height / this.#currentSvgH;
    return rect.top + bodyBottomSvgY * scaleY;
  }

  /**
   * Y-координата верхней кромки физического корпуса цилиндра (где начинается
   * тело сразу под крюком) в viewport-space.
   */
  getBodyTopY(): number {
    const rect = this.getBoundingClientRect();
    if (rect.height === 0) return rect.top;
    const scaleY = rect.height / this.#currentSvgH;
    return rect.top + BODY_TOP_Y * scaleY;
  }

  /**
   * Высота физического корпуса (без крюка, без тени) в DOM px.
   * `submersionFraction = clamp(0..1, depth_below_water / getBodyHeightPx())`.
   */
  getBodyHeightPx(): number {
    const rect = this.getBoundingClientRect();
    if (rect.height === 0) return 0;
    const scaleY = rect.height / this.#currentSvgH;
    return this.#currentBodyH * scaleY;
  }

  #emitTap = (): void => {
    if (this.hasAttribute('attached')) return;
    this.dispatchEvent(
      new CustomEvent('weight-tap', {
        detail: {
          material: this.getAttribute('material'),
          idNum: this.getAttribute('id-num'),
        },
        bubbles: true,
        composed: true,
      }),
    );
  };

  #handleKey = (ev: KeyboardEvent): void => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.#emitTap();
    }
  };
}

customElements.define('lab-metal-weight', LabMetalWeight);
