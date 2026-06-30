/**
 * <lab-optical-bench>
 *
 * Горизонтальная оптическая скамья (направляющая ≥700 мм) с сантиметровой шкалой.
 * Гнёзда (drop-targets) для осветителя-предмета, линзы и экрана.
 *
 * Рендерит проецируемое перевёрнутое изображение стрелки на гнезде экрана.
 * Резкость: sharpness ∝ 1/(1 + |screenDistanceMm − imagePlaneMm| / BLUR_BAND_MM).
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
  <title id="bench-title">Оптическая скамья — опыт 4.1 «Измерение оптической силы собирающей линзы»</title>

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
    <!-- scale(1,-1) инвертирует направление стрелки (перевёрнутое изображение) -->
    <g class="projected-image"
       transform="translate(${mmToPx(DEFAULT_SCREEN_MM)}, ${BENCH_Y - BENCH_HEIGHT / 2 - SLOT_H / 2}) scale(1,-1)">
      <!-- Тело стрелки -->
      <line x1="0" y1="0" x2="0" y2="${ARROW_H}"
            stroke="#f2c94c" stroke-width="3" stroke-linecap="round"/>
      <!-- Наконечник -->
      <polygon points="0,${ARROW_H + 8} -6,${ARROW_H - 2} 6,${ARROW_H - 2}"
               fill="#f2c94c"/>
      <!-- Свечение (halo) -->
      <ellipse cx="0" cy="${ARROW_H / 2}" rx="10" ry="${ARROW_H / 2 + 4}"
               fill="rgba(242,201,76,0.08)"/>
    </g>
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
  #rayOverlay: SVGGElement | null = null;
  #slotObject: SVGGElement | null = null;
  #slotScreen: SVGGElement | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));

    this.#feBlur = shadow.querySelector<SVGFEGaussianBlurElement>('feGaussianBlur');
    this.#projectedImageInner = shadow.querySelector<SVGGElement>('.projected-image');
    this.#rayOverlay = shadow.querySelector<SVGGElement>('#ray-overlay');
    this.#slotObject = shadow.querySelector<SVGGElement>('[data-slot="bench-slot-object"]');
    this.#slotScreen = shadow.querySelector<SVGGElement>('[data-slot="bench-slot-screen"]');
  }

  connectedCallback(): void {
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', 'Оптическая скамья с направляющей и гнёздами для приборов');
    this.#updateProjectedImage();
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
    this.#updateProjectedImage();
    this.#updateRayOverlay();
  }

  /** Установить фокусное расстояние линзы (мм). Обновляет изображение и оверлей. */
  setLensFocalMm(F: number): void {
    this.#lensFocalMm = F;
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

  /** Переместить проецируемое изображение на позицию экрана. */
  #moveProjectedImageToScreen(screenPosMm: number): void {
    if (!this.#projectedImageInner) return;
    const x = mmToPx(screenPosMm);
    const y = BENCH_Y - BENCH_HEIGHT / 2 - SLOT_H / 2;
    // Сохраняем scale(1,-1) — инверсия для перевёрнутого изображения
    this.#projectedImageInner.setAttribute('transform', `translate(${x}, ${y}) scale(1,-1)`);
  }

  /**
   * Вычислить резкость из текущих параметров и применить blur.
   * imagePlaneMm = d*F/(d-F) (от линзы).
   * sharpness = 1 / (1 + |screenDistanceMm − imagePlaneMm| / BLUR_BAND_MM).
   */
  #updateProjectedImage(): void {
    const imagePlaneMm = computeImageDistance(this.#lensFocalMm, this.#objectDistanceMm);
    let sharpness: number;
    if (!isFinite(imagePlaneMm) || imagePlaneMm <= 0) {
      // Изображение в бесконечности или мнимое → максимальное размытие
      sharpness = 0;
    } else {
      const delta = Math.abs(this.#screenDistanceMm - imagePlaneMm);
      sharpness = 1 / (1 + delta / BLUR_BAND_MM);
    }
    this.#applyBlur(sharpness);
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

    // Луч 3: через передний фокус → параллельно оси
    const fFrontX = mmToPx(this.#lensPosMm - F);
    const dxObj2Lens = lensX - fFrontX;
    const slopeRay3 = Math.abs(dxObj2Lens) > 0.001
      ? (axisY - objTopY) / dxObj2Lens
      : 0;
    const ray3aY2 = objTopY + slopeRay3 * (lensX - objX);
    const ray3a = this.#rayOverlay.querySelector<SVGLineElement>('#ray-3a');
    const ray3b = this.#rayOverlay.querySelector<SVGLineElement>('#ray-3b');
    if (ray3a) {
      ray3a.setAttribute('x1', String(objX));
      ray3a.setAttribute('y1', String(objTopY));
      ray3a.setAttribute('x2', String(lensX));
      ray3a.setAttribute('y2', String(ray3aY2));
    }
    if (ray3b) {
      ray3b.setAttribute('x1', String(lensX));
      ray3b.setAttribute('y1', String(ray3aY2));
      ray3b.setAttribute('x2', String(imgX));
      ray3b.setAttribute('y2', String(ray3aY2));
    }

    // Метки F и 2F
    const labelF = this.#rayOverlay.querySelector<SVGTextElement>('#label-F');
    const label2F = this.#rayOverlay.querySelector<SVGTextElement>('#label-2F');
    if (labelF) labelF.setAttribute('x', String(fX));
    if (label2F) label2F.setAttribute('x', String(f2X));
  }
}

customElements.define('lab-optical-bench', LabOpticalBench);
