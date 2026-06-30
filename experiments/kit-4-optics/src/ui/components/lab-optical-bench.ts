/**
 * <lab-optical-bench>
 *
 * Горизонтальная оптическая скамья (направляющая ≥700 мм) с сантиметровой шкалой.
 * Гнёзда (drop-targets) для осветителя-предмета, линзы и экрана.
 * Обслуживает опыты 4.1 / 4.2 / 4.4 (собирающая линза).
 *
 * Рендерит изображение стрелки в трёх режимах:
 *   d > F → действительное перевёрнутое (#projected-image-group), резкость по экрану.
 *   d < F → мнимое прямое призрачное (#virtual-image-group), у линзы, |Γ|=F/(F−d).
 *   d = F → note «изображение в бесконечности» + параллельные лучи (#infinity-note-group).
 * Opt-in оверлей: 3 главных луча + метки F / 2F (по умолчанию скрыт).
 *
 * API:
 *   getSlotRect(id): DOMRect                  — viewport-координаты гнезда
 *   setObjectDistanceMm(d): void              — расстояние предмет→линза
 *   setLensFocalMm(F): void                   — фокусное расстояние линзы
 *   setScreenDistanceMm(f): void              — расстояние линза→экран
 *   setRayOverlay(on): void                   — показать/скрыть оверлей лучей
 *   setImageSharpness(sharpness: 0..1): void  — прямой контроль резкости
 *
 * A11y: role="img" + <title> на SVG; svg[hidden]{display:none}.
 * Гнёзда: data-slot="bench-slot-object|bench-slot-lens|bench-slot-screen".
 */

// ─── Геометрия (SVG-единицы) ──────────────────────────────────────────────────

const SVG_W = 800;
const SVG_H = 220;

// Скамья
const BENCH_Y = 130;          // вертикаль оптической оси
const BENCH_LEFT_X = 30;
const BENCH_RIGHT_X = 770;
const BENCH_HEIGHT = 14;      // высота направляющей

// Шкала: 0–700 мм = 0–70 см по SVG
const SCALE_MM_MIN = 0;
const SCALE_MM_MAX = 700;
const SCALE_PX_START = BENCH_LEFT_X;
const SCALE_PX_END = BENCH_RIGHT_X;

// Гнёзда (позиции по умолчанию вдоль скамьи, в мм от левого края)
const DEFAULT_OBJECT_MM = 100;
const DEFAULT_LENS_MM = 300;
const DEFAULT_SCREEN_MM = 500;

// Размеры гнёзд
const SLOT_W = 64;
const SLOT_H = 52;

// Полоса размытия (мм): на каком отклонении от плоскости изображения резкость = 50%
const BLUR_BAND_MM = 30;
// Максимальный stdDeviation blur в SVG-единицах при sharpness=0
const MAX_BLUR_STD = 8;

// Высота стрелки-предмета (≥15% от SVG_H=220 → выполняет правило ≥15% viewBox)
const ARROW_H = 36;

// ─── Утилиты ─────────────────────────────────────────────────────────────────

/** Перевести мм вдоль скамьи в SVG px X-координату */
function mmToPx(mm: number): number {
  return (
    SCALE_PX_START +
    ((mm - SCALE_MM_MIN) / (SCALE_MM_MAX - SCALE_MM_MIN)) *
      (SCALE_PX_END - SCALE_PX_START)
  );
}

/**
 * Вычислить расстояние до изображения (формула линзы): f = d*F / (d - F).
 * d = расстояние предмет→линза (мм), F = фокусное расстояние (мм).
 * Возвращает Infinity при d ≈ F (изображение в бесконечности).
 */
function computeImageDistance(F_mm: number, d_mm: number): number {
  const denom = d_mm - F_mm;
  if (Math.abs(denom) < 0.001) return Infinity;
  return (d_mm * F_mm) / denom;
}

/**
 * Форматировать Y-компонент scale для transform.
 * Целое → без дробной части (1 → "-1" для совместимости с тестом 'scale(1,-1)').
 * Дробное → 2 знака после точки.
 */
function fmtScaleY(sy: number): string {
  return Number.isInteger(sy) ? `-${sy}` : `-${sy.toFixed(2)}`;
}

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
  /* SVG-ловушка (урок kit-3 Фаза E): атрибут hidden на ВНУТРЕННИХ SVG-группах
     (например .ray-overlay-group) не даёт display:none сам по себе — нужен явный CSS. */
  [hidden] { display: none; }

  /* Скамья (направляющая) */
  .bench-rail {
    fill: #2a3a4a;
    stroke: #4a90c4;
    stroke-width: 1.5;
  }
  .bench-axis {
    stroke: #4a90c4;
    stroke-width: 1;
    stroke-dasharray: 6 4;
    fill: none;
  }

  /* Шкала */
  .scale-tick { stroke: #4a90c4; stroke-width: 1; }
  .scale-tick-label {
    font-family: var(--font-body, 'Inter', system-ui);
    font-size: 8px;
    fill: rgb(255 255 255 / 0.5);
    text-anchor: middle;
    dominant-baseline: hanging;
  }

  /* Гнёзда (slots) — REST-state: в покое подсветки скрыты (opacity 0) */
  .slot-rect {
    fill: #1a2a3a;
    stroke: #38bdaf;
    stroke-width: 1.5;
    stroke-dasharray: 5 3;
    cursor: pointer;
    opacity: 0;
    transition: opacity .15s, fill 0.15s, stroke 0.15s;
  }
  /* Проявляются: пока хост в drag-режиме ИЛИ конкретное гнездо активно */
  :host(.dragging-active) .slot-rect,
  .slot-rect.drop-zone--active,
  [data-slot].drop-zone--active .slot-rect {
    opacity: 1;
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
    font-size: 8px;
    fill: rgb(255 255 255 / 0.5);
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
  }

  /* Проецируемое изображение */
  .projected-image {
    transition: opacity 0.2s;
  }

  .object-arrow { transition: opacity 0.2s; }
  /* size-match: подсветка «размеры равны» (опыт 4.2) */
  svg.size-match .object-arrow line,
  svg.size-match .object-arrow polygon { stroke: #ffbe0b; fill: #ffbe0b; }
  svg.size-match .projected-image line,
  svg.size-match .projected-image polygon { stroke: #ffbe0b; fill: #ffbe0b; }
  @media (prefers-reduced-motion: reduce) { .object-arrow { transition: none; } }

  /* Оверлей главных лучей */
  .ray-overlay-group { pointer-events: none; }
  .ray-line {
    stroke-width: 1.5;
    fill: none;
    stroke-linecap: round;
    opacity: 0.8;
  }
  .ray-parallel  { stroke: #ffbe0b; }
  .ray-center    { stroke: #38bdaf; }
  .ray-focal     { stroke: #e63946; }
  .focal-marker {
    font-family: var(--font-mono, monospace);
    font-size: 9px;
    fill: rgb(255 255 255 / 0.65);
    text-anchor: middle;
    dominant-baseline: auto;
  }

  @media (prefers-reduced-motion: reduce) {
    .projected-image { transition: none; }
    .slot-rect { transition: none; }
  }

  :host(:focus-visible) {
    outline: 2px solid var(--color-brand-orange, #ffbe0b);
    outline-offset: 4px;
    border-radius: 8px;
  }
</style>

<svg viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-labelledby="bench-title" tabindex="-1">
  <title id="bench-title">Оптическая скамья — опыты 4.1/4.2/4.4 (собирающая линза)</title>

  <defs>
    <!-- Blur-фильтр для проецируемого изображения -->
    <filter id="img-blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0" result="blur"/>
    </filter>
  </defs>

  <!-- ════ СКАМЬЯ (направляющая) ════ -->
  <rect class="bench-rail"
        x="${BENCH_LEFT_X}" y="${BENCH_Y - BENCH_HEIGHT / 2}"
        width="${BENCH_RIGHT_X - BENCH_LEFT_X}" height="${BENCH_HEIGHT}" rx="4"/>

  <!-- Оптическая ось (горизонталь через центр) -->
  <line class="bench-axis"
        x1="${BENCH_LEFT_X}" y1="${BENCH_Y}"
        x2="${BENCH_RIGHT_X}" y2="${BENCH_Y}"/>

  <!-- ════ ШКАЛА (0–70 см, риски каждый сантиметр) ════ -->
  <g id="scale-group">
    ${Array.from({ length: 71 }, (_, i) => {
      const mm = i * 10;
      const x = mmToPx(mm);
      const isMajor = i % 5 === 0;
      const tickH = isMajor ? 10 : 5;
      const label = isMajor
        ? `<text class="scale-tick-label" x="${x}" y="${BENCH_Y + BENCH_HEIGHT / 2 + 3}">${i}</text>`
        : '';
      return `<line class="scale-tick" x1="${x}" y1="${BENCH_Y + BENCH_HEIGHT / 2}" x2="${x}" y2="${BENCH_Y + BENCH_HEIGHT / 2 + tickH}"/>${label}`;
    }).join('\n    ')}
  </g>
  <!-- Подпись единицы шкалы -->
  <text class="scale-tick-label" x="${BENCH_RIGHT_X - 10}" y="${BENCH_Y + BENCH_HEIGHT / 2 + 14}" font-size="7">см</text>

  <!-- ════ ГНЁЗДА (slots) ════ -->

  <!-- Осветитель / предмет (object) -->
  <g data-slot="bench-slot-object" id="slot-object"
     transform="translate(${mmToPx(DEFAULT_OBJECT_MM) - SLOT_W / 2}, ${BENCH_Y - BENCH_HEIGHT / 2 - SLOT_H})">
    <rect class="slot-rect" x="0" y="0" width="${SLOT_W}" height="${SLOT_H}" rx="6"/>
    <text class="slot-label" x="${SLOT_W / 2}" y="12">Предмет</text>
    <text class="slot-label" x="${SLOT_W / 2}" y="${SLOT_H / 2 + 4}" font-size="10" fill="rgb(255 255 255 / 0.2)">↑</text>
    <text class="slot-label" x="${SLOT_W / 2}" y="${SLOT_H - 6}" font-size="7" fill="rgb(255 255 255 / 0.2)">light-object</text>
  </g>

  <!-- Линза (lens) -->
  <g data-slot="bench-slot-lens" id="slot-lens"
     transform="translate(${mmToPx(DEFAULT_LENS_MM) - SLOT_W / 2}, ${BENCH_Y - BENCH_HEIGHT / 2 - SLOT_H})">
    <rect class="slot-rect" x="0" y="0" width="${SLOT_W}" height="${SLOT_H}" rx="6"/>
    <text class="slot-label" x="${SLOT_W / 2}" y="12">Линза</text>
    <text class="slot-label" x="${SLOT_W / 2}" y="${SLOT_H / 2 + 4}" font-size="10" fill="rgb(255 255 255 / 0.2)">⌀</text>
    <text class="slot-label" x="${SLOT_W / 2}" y="${SLOT_H - 6}" font-size="7" fill="rgb(255 255 255 / 0.2)">lens</text>
  </g>

  <!-- Экран (screen) -->
  <g data-slot="bench-slot-screen" id="slot-screen"
     transform="translate(${mmToPx(DEFAULT_SCREEN_MM) - SLOT_W / 2}, ${BENCH_Y - BENCH_HEIGHT / 2 - SLOT_H})">
    <rect class="slot-rect" x="0" y="0" width="${SLOT_W}" height="${SLOT_H}" rx="6"/>
    <text class="slot-label" x="${SLOT_W / 2}" y="12">Экран</text>
    <text class="slot-label" x="${SLOT_W / 2}" y="${SLOT_H / 2 + 4}" font-size="10" fill="rgb(255 255 255 / 0.2)">▭</text>
    <text class="slot-label" x="${SLOT_W / 2}" y="${SLOT_H - 6}" font-size="7" fill="rgb(255 255 255 / 0.2)">screen</text>
  </g>

  <!-- ════ ПРОЕЦИРУЕМОЕ ИЗОБРАЖЕНИЕ (перевёрнутая стрелка на экране) ════ -->
  <!--
    Стрелка перевёрнута (scale(1,-1)) относительно центра гнезда экрана.
    Резкость управляется через filter="url(#img-blur)" и feGaussianBlur.stdDeviation.
    Трансформ включает и translate, и scale(1,-1) — тест проверяет наличие 'scale'.
  -->
  <g id="projected-image-group" filter="url(#img-blur)">
    <!-- scale(1,-sy) инвертирует направление стрелки (перевёрнутое изображение).
         Базовая геометрия направлена ВВЕРХ (y отрицателен), чтобы после scale(1,-sy)
         изображение рендерилось ВНИЗ — перевёрнутым относительно предмета. -->
    <g class="projected-image"
       transform="translate(${mmToPx(DEFAULT_SCREEN_MM)}, ${BENCH_Y - BENCH_HEIGHT / 2 - SLOT_H / 2}) scale(1,-1)">
      <!-- Тело стрелки (вверх: y2 отрицателен) -->
      <line x1="0" y1="0" x2="0" y2="${-ARROW_H}"
            stroke="#f2c94c" stroke-width="3" stroke-linecap="round"/>
      <!-- Наконечник (вверх: y отрицателен) -->
      <polygon points="0,${-(ARROW_H + 8)} -6,${-(ARROW_H - 2)} 6,${-(ARROW_H - 2)}"
               fill="#f2c94c"/>
      <!-- Свечение (halo) -->
      <ellipse cx="0" cy="${-ARROW_H / 2}" rx="10" ry="${ARROW_H / 2 + 4}"
               fill="rgba(242,201,76,0.08)"/>
    </g>
  </g>

  <!-- ════ СТРЕЛКА-ПРЕДМЕТ (upright, у гнезда предмета) ════ -->
  <g id="object-arrow" class="object-arrow"
     transform="translate(${mmToPx(DEFAULT_OBJECT_MM)}, ${BENCH_Y - BENCH_HEIGHT / 2 - SLOT_H / 2})">
    <line x1="0" y1="0" x2="0" y2="${-ARROW_H}"
          stroke="#7ee0d2" stroke-width="3" stroke-linecap="round"/>
    <polygon points="0,${-ARROW_H - 8} -6,${-ARROW_H + 2} 6,${-ARROW_H + 2}" fill="#7ee0d2"/>
  </g>

  <!-- ════ МНИМОЕ ИЗОБРАЖЕНИЕ «через линзу» (d<F): прямое, увеличенное, призрачное ════ -->
  <g id="virtual-image-group" hidden="">
    <g class="virtual-image"
       transform="translate(${mmToPx(DEFAULT_LENS_MM)}, ${BENCH_Y - BENCH_HEIGHT / 2 - SLOT_H / 2})">
      <!-- прямая стрелка (вверх), БЕЗ инверсии; масштаб задаётся в #updateImageRendering -->
      <line x1="0" y1="0" x2="0" y2="${-ARROW_H}"
            stroke="#9d8cff" stroke-width="3" stroke-linecap="round"
            stroke-dasharray="4 3" opacity="0.85"/>
      <polygon points="0,${-ARROW_H - 8} -6,${-ARROW_H + 2} 6,${-ARROW_H + 2}"
               fill="#9d8cff" opacity="0.85"/>
      <ellipse cx="0" cy="${-ARROW_H / 2}" rx="10" ry="${ARROW_H / 2 + 4}"
               fill="rgba(157,140,255,0.08)"/>
    </g>
  </g>

  <!-- ════ ИЗОБРАЖЕНИЕ В БЕСКОНЕЧНОСТИ (d=F): note + 2 параллельных луча ════ -->
  <!-- R9: текст «изображение в бесконечности» сдвинут ближе к линзе и выше,
       чтобы не пересекался с подписью «Экран» у правого гнезда. -->
  <g id="infinity-note-group" hidden="">
    <line class="ray-line ray-parallel" x1="${mmToPx(DEFAULT_LENS_MM)}" y1="${BENCH_Y - ARROW_H}"
          x2="${BENCH_RIGHT_X}" y2="${BENCH_Y - ARROW_H}" opacity="0.7"/>
    <line class="ray-line ray-parallel" x1="${mmToPx(DEFAULT_LENS_MM)}" y1="${BENCH_Y}"
          x2="${BENCH_RIGHT_X}" y2="${BENCH_Y}" opacity="0.7"/>
    <text class="focal-marker" x="${mmToPx(DEFAULT_LENS_MM) + 60}" y="${BENCH_Y - ARROW_H - 18}">
      изображение в бесконечности
    </text>
  </g>

  <!-- ════ ОВЕРЛЕЙ ГЛАВНЫХ ЛУЧЕЙ (скрыт по умолчанию) ════ -->
  <g class="ray-overlay-group" id="ray-overlay" hidden="">
    <!-- Луч 1: параллельно оси → через задний фокус F' (жёлтый) -->
    <line class="ray-line ray-parallel" id="ray-1a"
          x1="${mmToPx(DEFAULT_OBJECT_MM)}" y1="${BENCH_Y - ARROW_H}"
          x2="${mmToPx(DEFAULT_LENS_MM)}"  y2="${BENCH_Y - ARROW_H}"/>
    <line class="ray-line ray-parallel" id="ray-1b"
          x1="${mmToPx(DEFAULT_LENS_MM)}"  y1="${BENCH_Y - ARROW_H}"
          x2="${mmToPx(DEFAULT_SCREEN_MM)}" y2="${BENCH_Y}"/>

    <!-- Луч 2: через оптический центр линзы (голубой) -->
    <line class="ray-line ray-center" id="ray-2"
          x1="${mmToPx(DEFAULT_OBJECT_MM)}" y1="${BENCH_Y - ARROW_H}"
          x2="${mmToPx(DEFAULT_SCREEN_MM)}" y2="${BENCH_Y}"/>

    <!-- Луч 3: через передний фокус F → параллельно оси (красный) -->
    <line class="ray-line ray-focal" id="ray-3a"
          x1="${mmToPx(DEFAULT_OBJECT_MM)}" y1="${BENCH_Y - ARROW_H}"
          x2="${mmToPx(DEFAULT_LENS_MM)}"  y2="${BENCH_Y}"/>
    <line class="ray-line ray-focal" id="ray-3b"
          x1="${mmToPx(DEFAULT_LENS_MM)}"  y1="${BENCH_Y}"
          x2="${mmToPx(DEFAULT_SCREEN_MM)}" y2="${BENCH_Y}"/>

    <!-- Метки F и 2F -->
    <text class="focal-marker" id="label-F"
          x="${mmToPx(DEFAULT_LENS_MM + 100)}" y="${BENCH_Y + BENCH_HEIGHT / 2 + 20}">F</text>
    <text class="focal-marker" id="label-2F"
          x="${mmToPx(DEFAULT_LENS_MM + 200)}" y="${BENCH_Y + BENCH_HEIGHT / 2 + 20}">2F</text>
  </g>
</svg>
`;

// ─── Компонент ────────────────────────────────────────────────────────────────

export class LabOpticalBench extends HTMLElement {
  // Состояние скамьи (мм)
  #objectDistanceMm = DEFAULT_OBJECT_MM;    // расстояние предмет→линза
  #lensFocalMm = 100;                        // фокусное расстояние линзы
  #screenDistanceMm = DEFAULT_SCREEN_MM - DEFAULT_LENS_MM; // расстояние линза→экран

  // Позиции на направляющей (мм от левого края скамьи)
  #objectPosMm = DEFAULT_OBJECT_MM;
  #lensPosMm = DEFAULT_LENS_MM;
  #screenPosMm = DEFAULT_SCREEN_MM;

  // Ссылки на SVG-элементы
  #feBlur: SVGFEGaussianBlurElement | null = null;
  #projectedImageInner: SVGGElement | null = null;  // .projected-image (inner, has transform)
  #projectedImageGroup: SVGGElement | null = null;  // #projected-image-group (outer, visibility)
  #virtualImageGroup: SVGGElement | null = null;    // #virtual-image-group (мнимое, d<F)
  #virtualImageInner: SVGGElement | null = null;    // .virtual-image (inner, has transform)
  #infinityNoteGroup: SVGGElement | null = null;    // #infinity-note-group (d=F)
  #objectArrow: SVGGElement | null = null;
  #rayOverlay: SVGGElement | null = null;
  #slotObject: SVGGElement | null = null;
  #slotScreen: SVGGElement | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));

    this.#feBlur = shadow.querySelector<SVGFEGaussianBlurElement>('feGaussianBlur');
    this.#projectedImageInner = shadow.querySelector<SVGGElement>('.projected-image');
    this.#projectedImageGroup = shadow.querySelector<SVGGElement>('#projected-image-group');
    this.#virtualImageGroup = shadow.querySelector<SVGGElement>('#virtual-image-group');
    this.#virtualImageInner = shadow.querySelector<SVGGElement>('.virtual-image');
    this.#infinityNoteGroup = shadow.querySelector<SVGGElement>('#infinity-note-group');
    this.#objectArrow = shadow.querySelector<SVGGElement>('#object-arrow');
    this.#rayOverlay = shadow.querySelector<SVGGElement>('#ray-overlay');
    this.#slotObject = shadow.querySelector<SVGGElement>('[data-slot="bench-slot-object"]');
    this.#slotScreen = shadow.querySelector<SVGGElement>('[data-slot="bench-slot-screen"]');
  }

  connectedCallback(): void {
    this.setAttribute('role', 'img');
    // Не затирать aria-label, переданный вызывающим (template/тесты задают свой).
    if (!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', 'Оптическая скамья с направляющей и гнёздами для приборов');
    }
    this.#updateProjectedImage();
    this.#moveObjectArrow(this.#objectPosMm);
    this.#moveProjectedImageToScreen(this.#screenPosMm);
  }

  /**
   * Возвращает viewport DOMRect гнезда по его data-slot значению.
   * Нормализует префикс: вызывающий может передать сырой 'object' или полный 'bench-slot-object'.
   */
  getSlotRect(id: string): DOMRect {
    const fullId = id.startsWith('bench-slot-') ? id : `bench-slot-${id}`;
    const slotEl = this.shadowRoot?.querySelector<SVGGElement>(`[data-slot="${fullId}"]`);
    if (slotEl) {
      return slotEl.getBoundingClientRect();
    }
    return new DOMRect(0, 0, 0, 0);
  }

  /**
   * Переключить подсветку drop-zone на гнезде (shadow-DOM-safe).
   * Нормализует префикс так же, как getSlotRect.
   */
  setSlotHover(slotId: string, active: boolean): void {
    const fullId = slotId.startsWith('bench-slot-') ? slotId : `bench-slot-${slotId}`;
    const slotEl = this.shadowRoot?.querySelector<SVGGElement>(`[data-slot="${fullId}"]`);
    const rect = slotEl?.querySelector<SVGRectElement>('.slot-rect');
    slotEl?.classList.toggle('drop-zone--active', active);
    rect?.classList.toggle('drop-zone--active', active);
  }

  /** Установить расстояние предмет→линза (мм). Обновляет позицию гнезда и изображение. */
  setObjectDistanceMm(d: number): void {
    this.#objectDistanceMm = d;
    this.#objectPosMm = this.#lensPosMm - d;
    this.#moveSlot(this.#slotObject, this.#objectPosMm);
    this.#moveObjectArrow(this.#objectPosMm);
    this.#moveProjectedImageToScreen(this.#screenPosMm); // пересчитать масштаб под новый d
    this.#updateProjectedImage();
    this.#updateRayOverlay();
  }

  /** Установить фокусное расстояние линзы (мм). Обновляет изображение и оверлей. */
  setLensFocalMm(F: number): void {
    this.#lensFocalMm = F;
    this.#moveProjectedImageToScreen(this.#screenPosMm); // масштаб зависит от F
    this.#updateProjectedImage();
    this.#updateRayOverlay();
  }

  /** Установить расстояние линза→экран (мм). Обновляет позицию гнезда экрана и резкость. */
  setScreenDistanceMm(f: number): void {
    this.#screenDistanceMm = f;
    this.#screenPosMm = this.#lensPosMm + f;
    this.#moveSlot(this.#slotScreen, this.#screenPosMm);
    this.#moveProjectedImageToScreen(this.#screenPosMm);
    this.#updateProjectedImage();
    this.#updateRayOverlay();
  }

  /** Показать / скрыть оверлей главных лучей и меток F / 2F. */
  setRayOverlay(on: boolean): void {
    if (!this.#rayOverlay) return;
    if (on) {
      this.#rayOverlay.removeAttribute('hidden');
    } else {
      this.#rayOverlay.setAttribute('hidden', '');
    }
  }

  /**
   * Прямой контроль резкости (0..1, 1=резко).
   * Позволяет оркестратору переопределить автовычисление.
   */
  setImageSharpness(sharpness: number): void {
    this.#applyBlur(sharpness);
  }

  // ─── Приватные методы ───────────────────────────────────────────────────────

  /** Переместить SVGGElement гнезда вдоль скамьи в новую позицию (мм). */
  #moveSlot(slot: SVGGElement | null, posMm: number): void {
    if (!slot) return;
    const x = mmToPx(posMm) - SLOT_W / 2;
    const y = BENCH_Y - BENCH_HEIGHT / 2 - SLOT_H;
    slot.setAttribute('transform', `translate(${x}, ${y})`);
  }

  /** Переместить проецируемое изображение на позицию экрана. Масштаб по |Γ|. */
  #moveProjectedImageToScreen(screenPosMm: number): void {
    if (!this.#projectedImageInner) return;
    const x = mmToPx(screenPosMm);
    const y = BENCH_Y - BENCH_HEIGHT / 2 - SLOT_H / 2;
    const sy = this.#imageScale();
    // scale(1, -sy): инверсия (перевёрнутое) + масштаб высоты по увеличению.
    this.#projectedImageInner.setAttribute('transform', `translate(${x}, ${y}) scale(1,${fmtScaleY(sy)})`);
  }

  /** Истинное увеличение |Γ| = |imageDistance(F,d)/d|, кламп [0.2,3] для рендера. */
  #imageScale(): number {
    const f = computeImageDistance(this.#lensFocalMm, this.#objectDistanceMm);
    if (!isFinite(f) || this.#objectDistanceMm <= 0) return 1;
    const g = Math.abs(f / this.#objectDistanceMm);
    if (!isFinite(g) || g <= 0) return 1;
    return Math.max(0.2, Math.min(3, g));
  }

  /** Переместить стрелку-предмет вдоль скамьи в позицию предмета (мм). */
  #moveObjectArrow(posMm: number): void {
    if (!this.#objectArrow) return;
    const x = mmToPx(posMm);
    const y = BENCH_Y - BENCH_HEIGHT / 2 - SLOT_H / 2;
    this.#objectArrow.setAttribute('transform', `translate(${x}, ${y})`);
  }

  /** Подсветить «размеры равны» (опыт 4.2): класс size-match на корневом svg. */
  setSizeMatch(on: boolean): void {
    const svg = this.shadowRoot?.querySelector('svg');
    svg?.classList.toggle('size-match', on);
  }

  /**
   * Управляет видимостью трёх групп изображения в зависимости от зоны d:
   *   d > F → действительное (#projected-image-group), резкость по расстоянию до экрана.
   *   d < F → мнимое прямое (#virtual-image-group), масштаб |Γ|=F/(F−d).
   *   d = F → note «в бесконечности» (#infinity-note-group).
   * Ровно одна группа активна в каждый момент.
   */
  #updateProjectedImage(): void {
    const imagePlaneMm = computeImageDistance(this.#lensFocalMm, this.#objectDistanceMm);
    const isReal = isFinite(imagePlaneMm) && imagePlaneMm > 0;
    const isInfinity = !isFinite(imagePlaneMm); // d ≈ F
    const isVirtual = isFinite(imagePlaneMm) && imagePlaneMm < 0; // d < F

    this.#toggleHidden(this.#projectedImageGroup, !isReal);
    this.#toggleHidden(this.#virtualImageGroup, !isVirtual);
    this.#toggleHidden(this.#infinityNoteGroup, !isInfinity);

    if (isVirtual) this.#updateVirtualImage();

    let sharpness: number;
    if (!isReal) {
      sharpness = 0;
    } else {
      const delta = Math.abs(this.#screenDistanceMm - imagePlaneMm);
      sharpness = 1 / (1 + delta / BLUR_BAND_MM);
    }
    this.#applyBlur(sharpness);
  }

  /** Призрачная ПРЯМАЯ увеличенная стрелка у линзы (мнимое, |Γ|=F/(F−d), кламп [1,3]). */
  #updateVirtualImage(): void {
    if (!this.#virtualImageInner) return;
    const F = this.#lensFocalMm;
    const d = this.#objectDistanceMm;
    const denom = F - d;
    const g = denom > 0.001 ? F / denom : 3;
    const sy = Math.max(1, Math.min(3, g));
    const x = mmToPx(this.#lensPosMm);
    const y = BENCH_Y - BENCH_HEIGHT / 2 - SLOT_H / 2;
    // ПРЯМОЕ: scale(1, sy) БЕЗ минуса (не инвертировано); базовая стрелка направлена вверх.
    this.#virtualImageInner.setAttribute('transform', `translate(${x}, ${y}) scale(1,${sy.toFixed(2)})`);
  }

  /** Установить/снять hidden через setAttribute (SVG-ловушка §7: [hidden]{display:none}). */
  #toggleHidden(el: Element | null, hidden: boolean): void {
    if (!el) return;
    if (hidden) el.setAttribute('hidden', '');
    else el.removeAttribute('hidden');
  }

  /** Применить stdDeviation на feGaussianBlur исходя из sharpness (0..1). */
  #applyBlur(sharpness: number): void {
    if (!this.#feBlur) return;
    // sharpness=1 → stdDev≈0; sharpness=0 → stdDev=MAX_BLUR_STD
    const clamped = Math.max(0, Math.min(1, sharpness));
    const stdDev = MAX_BLUR_STD * (1 - clamped);
    this.#feBlur.setAttribute('stdDeviation', stdDev.toFixed(2));
  }

  /**
   * Обновить геометрию оверлея главных лучей под текущие позиции.
   * Три главных луча: параллельный → F', через центр, через F → параллельно.
   */
  #updateRayOverlay(): void {
    if (!this.#rayOverlay) return;

    const objX = mmToPx(this.#objectPosMm);
    const lensX = mmToPx(this.#lensPosMm);
    const screenX = mmToPx(this.#screenPosMm);
    const objTopY = BENCH_Y - ARROW_H;
    const axisY = BENCH_Y;

    const imagePlaneMm = computeImageDistance(this.#lensFocalMm, this.#objectDistanceMm);
    const imgX =
      isFinite(imagePlaneMm) && imagePlaneMm > 0
        ? mmToPx(this.#lensPosMm + imagePlaneMm)
        : screenX;

    const F = this.#lensFocalMm;
    const fX = mmToPx(this.#lensPosMm + F);
    const f2X = mmToPx(this.#lensPosMm + 2 * F);

    // Луч 1: параллельно оси → через задний фокус
    const ray1a = this.#rayOverlay.querySelector<SVGLineElement>('#ray-1a');
    const ray1b = this.#rayOverlay.querySelector<SVGLineElement>('#ray-1b');
    if (ray1a) {
      ray1a.setAttribute('x1', String(objX));
      ray1a.setAttribute('y1', String(objTopY));
      ray1a.setAttribute('x2', String(lensX));
      ray1a.setAttribute('y2', String(objTopY));
    }
    if (ray1b) {
      ray1b.setAttribute('x1', String(lensX));
      ray1b.setAttribute('y1', String(objTopY));
      ray1b.setAttribute('x2', String(imgX));
      ray1b.setAttribute('y2', String(axisY));
    }

    // Луч 2: через центр линзы прямо
    const ray2 = this.#rayOverlay.querySelector<SVGLineElement>('#ray-2');
    if (ray2) {
      ray2.setAttribute('x1', String(objX));
      ray2.setAttribute('y1', String(objTopY));
      ray2.setAttribute('x2', String(imgX));
      ray2.setAttribute('y2', String(axisY));
    }

    // Луч 3: из вершины предмета через ПЕРЕДНИЙ фокус F → за линзой параллельно оси.
    // Наклон считается по пролёту вершина-предмета → передний фокус (fFrontX − objX),
    // НЕ по постоянному пролёту F→линза (lensX − fFrontX): иначе луч верен лишь при d=2F
    // и «проваливается» под скамью во всём режиме d>2F (опыт 4.1).
    const fFrontX = mmToPx(this.#lensPosMm - F);
    const dxObj2FrontF = fFrontX - objX;
    const slopeRay3 = Math.abs(dxObj2FrontF) > 0.001
      ? (axisY - objTopY) / dxObj2FrontF
      : 0;
    // Высота, на которой луч пересекает плоскость линзы (после прохода фокуса).
    const ray3LensY = objTopY + slopeRay3 * (lensX - objX);
    const ray3a = this.#rayOverlay.querySelector<SVGLineElement>('#ray-3a');
    const ray3b = this.#rayOverlay.querySelector<SVGLineElement>('#ray-3b');
    if (ray3a) {
      ray3a.setAttribute('x1', String(objX));
      ray3a.setAttribute('y1', String(objTopY));
      ray3a.setAttribute('x2', String(lensX));
      ray3a.setAttribute('y2', String(ray3LensY));
    }
    // ray3b выходит ГОРИЗОНТАЛЬНО от высоты пересечения с линзой (параллельно оси).
    if (ray3b) {
      ray3b.setAttribute('x1', String(lensX));
      ray3b.setAttribute('y1', String(ray3LensY));
      ray3b.setAttribute('x2', String(imgX));
      ray3b.setAttribute('y2', String(ray3LensY));
    }

    // Метки F и 2F
    const labelF = this.#rayOverlay.querySelector<SVGTextElement>('#label-F');
    const label2F = this.#rayOverlay.querySelector<SVGTextElement>('#label-2F');
    if (labelF) labelF.setAttribute('x', String(fX));
    if (label2F) label2F.setAttribute('x', String(f2X));
  }
}

customElements.define('lab-optical-bench', LabOpticalBench);
