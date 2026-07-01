/**
 * <lab-protractor-disc>
 *
 * Круговой транспортир с полуцилиндром n≈1,5 для опыта на преломление (4.3 / 4.6).
 * Плоская грань полуцилиндра = горизонтальный диаметр (y=210).
 * Стекло = нижний полукруг (y>210), воздух = верхний полукруг.
 * Нормаль = вертикальная пунктирная линия через центр.
 * Транспортир: штрихи каждые 1°, подписи каждые 10°; отсчёт от вертикальной нормали.
 * 2 гнезда: semicylinder (центр диска) и emitter (слева на уровне грани).
 *
 * API (Task 3 — статический каркас; лучи/угловой хэндл — Task 4):
 *   getSlotRect(id): DOMRect   — viewport-координаты гнезда (для D&D)
 *   setSlotHover(id, on): void — подсветка drop-zone гнезда
 *   setPlaced(kind, on): void  — показать/скрыть прибор в гнезде
 *   setDragging(on): void      — класс dragging-active на host (раскрывает slot-rect)
 *   refractiveIndex: number    — показатель преломления (default 1.5, использ. в T4)
 *
 * A11y: host role="group" (НЕ role="img" — внутри role="slider"-хэндл угла),
 *        <title> на SVG. svg[hidden]{display:none} + [hidden]{display:none} для групп.
 */

import { refractionAngle } from '../../physics/optics/RefractionModel';

// ─── Геометрия (SVG-единицы) ──────────────────────────────────────────────────

const SVG_SIZE = 420;
const CX = 210;   // центр диска X
const CY = 210;   // центр диска Y (= уровень плоской грани)
const R = 180;    // радиус диска

// Нормаль: вертикаль от y=30 до y=390
const NORMAL_X = CX;
const NORMAL_Y1 = CY - R;
const NORMAL_Y2 = CY + R;

// Плоская грань: горизонтальный диаметр
const FACE_X1 = CX - R;
const FACE_X2 = CX + R;
const FACE_Y = CY;

// Гнездо полуцилиндра — в центре диска
const SLOT_CYL_W = 64;
const SLOT_CYL_H = 52;
const SLOT_CYL_X = CX - SLOT_CYL_W / 2;
const SLOT_CYL_Y = CY - SLOT_CYL_H / 2;

// Гнездо осветителя — слева на уровне плоской грани
const SLOT_EM_W = 56;
const SLOT_EM_H = 44;
const SLOT_EM_X = CX - R - SLOT_EM_W - 10;  // левее левого края диска
const SLOT_EM_Y = CY - SLOT_EM_H / 2;

// Транспортир: углы 0° = нормаль (вертикаль), 90° = плоская грань
const TICK_MINOR_LEN = 6;
const TICK_MAJOR_LEN = 12;
const TICK_LABEL_R = R - 22; // радиус подписей (внутри обода)

// Угол падения: домен UI-хэндла (клампится). Скользящее падение i>85° даёт
// r близко к предельному — держим верх на 85° (как ФИПИ-транспортир на практике).
const I_MIN = 0;
const I_MAX = 85;
const I_DEFAULT = 45; // 45°→r≈28° — эталонная контрольная точка Снелла (n=1,5)

// Радиусы дуг-индикаторов угла (внутри диска, между лучом и нормалью)
const ARC_I_R = 46; // дуга i (верх)
const ARC_R_R = 46; // дуга r (низ)
const READOUT_R = 68; // радиус текстовых ридаутов «i = N°» / «r = N°»
const HANDLE_R = 9; // радиус кружка-хэндла

// ─── Утилиты ─────────────────────────────────────────────────────────────────

const NS = 'http://www.w3.org/2000/svg';

/** Создать SVG-элемент с namespace */
function svgEl<T extends SVGElement>(tag: string): T {
  return document.createElementNS(NS, tag) as T;
}

/** Полярные координаты относительно центра диска */
function polar(r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

const DEG = Math.PI / 180;

/**
 * Точка на верхнем ободе для падающего луча (сторона хэндла = слева).
 * i отсчитывается от ВЕРХНЕЙ нормали (0=top); i↑ уводит точку влево.
 *   i=0  → (CX, CY-R)  верх
 *   i=90 → (CX-R, CY)  левый край
 */
function incidentRimPoint(iDeg: number, r: number): { x: number; y: number } {
  return { x: CX - r * Math.sin(iDeg * DEG), y: CY - r * Math.cos(iDeg * DEG) };
}

/**
 * Точка на нижнем ободе для преломлённого луча (стеклянная половина, вправо-вниз).
 *   r=0  → (CX, CY+R)  низ
 *   r=90 → (CX+R, CY)  правый край
 */
function refractedRimPoint(rDeg: number, r: number): { x: number; y: number } {
  return { x: CX + r * Math.sin(rDeg * DEG), y: CY + r * Math.cos(rDeg * DEG) };
}

/**
 * Точка на верхнем ободе для отражённого луча (зеркало падающего, вправо-вверх).
 *   i=0  → (CX, CY-R)  верх
 *   i=90 → (CX+R, CY)  правый край
 */
function reflectedRimPoint(iDeg: number, r: number): { x: number; y: number } {
  return { x: CX + r * Math.sin(iDeg * DEG), y: CY - r * Math.cos(iDeg * DEG) };
}

// ─── Шаблон (статический HTML/CSS) ──────────────────────────────────────────

const template = document.createElement('template');
// Содержимое шаблона: только CSS + пустой SVG-контейнер.
// Все SVG-элементы строятся программно в connectedCallback через createElementNS,
// чтобы избежать eval innerHTML с переменными геометрии.
template.innerHTML = `
<style>
  :host {
    display: block;
    width: 100%;
    max-width: ${SVG_SIZE}px;
    user-select: none;
    -webkit-user-select: none;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  /* SVG-ловушка (урок kit-3/kit-4): атрибут hidden на SVG-элементе
     без явного CSS правила НЕ скрывает элемент в браузере. */
  svg[hidden] { display: none; }
  [hidden] { display: none; }

  /* Диск — обод транспортира */
  .disc-rim {
    fill: #1a2535;
    stroke: #3a7fb5;
    stroke-width: 1.5;
  }

  /* Нижний полукруг (стекло полуцилиндра) */
  .glass-body {
    fill: rgba(120, 195, 245, 0.34);
    stroke: #74c4ee;
    stroke-width: 1.6;
  }

  /* Плоская грань — усиленная граница воздух/стекло */
  .flat-face {
    stroke: #aee3f7;
    stroke-width: 2.6;
    stroke-linecap: round;
  }

  /* Нормаль */
  .normal-line {
    stroke: #ffffff;
    stroke-width: 1.2;
    stroke-dasharray: 6 4;
    opacity: 0.55;
  }

  /* Штрихи транспортира */
  .tick {
    stroke: #4a90c4;
    stroke-width: 0.8;
    vector-effect: non-scaling-stroke;
  }
  .tick.tick--major {
    stroke: #7ecef0;
    stroke-width: 1.2;
  }

  /* Подписи транспортира */
  .tick-label {
    font-family: var(--font-body, 'Inter', system-ui, sans-serif);
    font-size: 9px;
    fill: rgb(200 230 255 / 0.7);
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
  }

  /* Гнёзда (slots) — REST-state: скрыты (opacity 0), проявляются при drag или hover */
  .slot-rect {
    fill: #1a2a3a;
    stroke: #38bdaf;
    stroke-width: 1.5;
    stroke-dasharray: 5 3;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s, fill 0.15s, stroke 0.15s;
    rx: 6;
  }
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
    font-family: var(--font-body, 'Inter', system-ui, sans-serif);
    font-size: 8px;
    fill: rgb(255 255 255 / 0.45);
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
  }

  /* Осветитель-гнездо (группа с приборчиком после setPlaced) */
  .emitter-group {
    pointer-events: none;
  }

  /* Подпись показателя преломления */
  .n-label {
    font-family: var(--font-body, 'Inter', system-ui, sans-serif);
    font-size: 11px;
    font-style: italic;
    fill: rgb(140 210 255 / 0.85);
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
  }

  /* ── Лучи (Task 4) ─────────────────────────────────────────────────────── */
  .ray-incident {
    stroke: #ffd44d;
    stroke-width: 2.4;
    stroke-linecap: round;
    pointer-events: none;
  }
  .ray-refracted {
    stroke: #ff9838;
    stroke-width: 2.4;
    stroke-linecap: round;
    pointer-events: none;
  }
  .ray-reflected {
    stroke: #ffd44d;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-dasharray: 5 4;
    opacity: 0.35;
    pointer-events: none;
  }

  /* Дуги-индикаторы угла i / r */
  .angle-arc {
    fill: none;
    stroke: #7ecef0;
    stroke-width: 1;
    opacity: 0.85;
    pointer-events: none;
  }
  .angle-arc--i { stroke: #ffd44d; }
  .angle-arc--r { stroke: #ff9838; }

  /* Текстовые ридауты угла */
  .angle-readout {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 12px;
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
  }
  .angle-readout--i { fill: #ffe38a; }
  .angle-readout--r { fill: #ffb877; }

  /* Хэндл угла падения — перетаскиваемый кружок на верхнем ободе */
  .angle-handle {
    cursor: grab;
    touch-action: none;
  }
  .angle-handle:active { cursor: grabbing; }
  .angle-handle .handle-dot {
    fill: #ffd44d;
    stroke: #1a2535;
    stroke-width: 2;
  }
  .angle-handle:focus-visible {
    outline: none;
  }
  .angle-handle:focus-visible .handle-dot {
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    filter: drop-shadow(0 0 5px #ffbe0bcc);
  }

  @media (prefers-reduced-motion: reduce) {
    .slot-rect { transition: none; }
  }

  :host(:focus-visible) {
    outline: 2px solid var(--color-brand-orange, #ffbe0b);
    outline-offset: 4px;
    border-radius: 8px;
  }
</style>
<svg viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}"
     xmlns="http://www.w3.org/2000/svg"
     aria-labelledby="protractor-disc-title">
  <title id="protractor-disc-title">Круговой транспортир с полуцилиндром для опыта на преломление</title>
</svg>
`;

// ─── Компонент ────────────────────────────────────────────────────────────────

export class LabProtractorDisc extends HTMLElement {
  #refractiveIndex = 1.5;
  #i = I_DEFAULT; // угол падения (целые градусы), default 45°
  #placedCyl = false; // полуцилиндр размещён в гнезде
  #revealIndex = false; // раскрывать подпись n (только в fully-auto)

  // Ссылки на SVG-элементы (кешируются после render)
  #glassBody: SVGPathElement | null = null;
  #emitterGroup: SVGGElement | null = null;
  #nLabel: SVGTextElement | null = null;
  #rendered = false;

  // Лучи / дуги / ридауты / хэндл (Task 4)
  #raysGroup: SVGGElement | null = null;
  #rayIncident: SVGLineElement | null = null;
  #rayRefracted: SVGLineElement | null = null;
  #rayReflected: SVGLineElement | null = null;
  #arcI: SVGPathElement | null = null;
  #arcR: SVGPathElement | null = null;
  #readoutI: SVGTextElement | null = null;
  #readoutR: SVGTextElement | null = null;
  #handle: SVGGElement | null = null;
  #handleDot: SVGCircleElement | null = null;
  #dragging = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.setAttribute('role', 'group');
    if (!this.hasAttribute('aria-label')) {
      this.setAttribute(
        'aria-label',
        'Круговой транспортир с полуцилиндром для опыта на преломление',
      );
    }
    if (!this.#rendered) {
      this.#render();
      this.#rendered = true;
    }
    // По умолчанию оба прибора не размещены (находятся в лотке)
    this.setPlaced('semicylinder', false);
    this.setPlaced('emitter', false);
    // Отрисовать лучи под текущий угол (по умолчанию 45°); группа лучей скрыта,
    // пока полуцилиндр не размещён (setPlaced('semicylinder',true)).
    this.#redraw();
  }

  // ─── Публичный API ────────────────────────────────────────────────────────

  get refractiveIndex(): number {
    return this.#refractiveIndex;
  }

  set refractiveIndex(val: number) {
    this.#refractiveIndex = val;
    this.#redraw();
  }

  /** Угол падения i [°], как читает ученик (целое). */
  get incidenceAngleDeg(): number {
    return this.#i;
  }

  /** Угол преломления r [°] по Снеллу для текущего i и n (целое). */
  get refractionAngleDeg(): number {
    return Math.round(refractionAngle(this.#i, 1, this.#refractiveIndex));
  }

  /**
   * Задать угол падения (клампится в [0,85], округляется до целого).
   * Пересчитывает r по Снеллу, перерисовывает лучи/дуги/ридауты,
   * синхронизирует aria-valuenow хэндла, эмитит `angle-change`.
   */
  setIncidenceAngle(iDeg: number): void {
    const next = Math.round(clamp(iDeg, I_MIN, I_MAX));
    this.#i = next;
    this.#redraw();
    const r = this.refractionAngleDeg;
    this.dispatchEvent(
      new CustomEvent<{ i: number; r: number }>('angle-change', {
        detail: { i: this.#i, r },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Viewport-координаты гнезда (для D&D overlay).
   * В happy-dom возвращает DOMRect с нулями — OK для unit-теста;
   * реальные координаты проверяет selfcheck/playwright.
   */
  getSlotRect(id: string): DOMRect {
    const slotEl = this.shadowRoot?.querySelector<SVGGElement>(`[data-slot="${id}"]`);
    if (slotEl) {
      return slotEl.getBoundingClientRect();
    }
    return new DOMRect(0, 0, 0, 0);
  }

  /** Подсвечивает/гасит drop-zone на гнезде (shadow-DOM-safe). */
  setSlotHover(id: string, active: boolean): void {
    const slotEl = this.shadowRoot?.querySelector<SVGGElement>(`[data-slot="${id}"]`);
    slotEl?.classList.toggle('drop-zone--active', active);
  }

  /**
   * Показать/скрыть прибор в гнезде.
   *   semicylinder → toggle hidden на .glass-body (нижний полукруг)
   *   emitter      → toggle hidden на .emitter-group
   */
  setPlaced(kind: 'semicylinder' | 'emitter' | string, on: boolean): void {
    if (kind === 'semicylinder') {
      this.#placedCyl = on;
      this.#toggleHidden(this.#glassBody, !on);
      // n-label раскрывается ТОЛЬКО когда полуцилиндр на месте И включён reveal
      // (fully-auto). setPlaced НЕ палит ответ сам по себе — no-leak (§21).
      this.#syncNLabel();
      // Лучи имеют смысл только когда стекло на месте.
      this.#toggleHidden(this.#raysGroup, !on);
    } else if (kind === 'emitter') {
      this.#toggleHidden(this.#emitterGroup, !on);
    }
  }

  /**
   * Раскрыть/скрыть подпись показателя преломления «n ≈1,5» на диске.
   * По умолчанию СКРЫТА (no-leak). Оркестратор включает только в fully-auto.
   * Даже при on=true метка видна лишь когда полуцилиндр размещён.
   */
  setRevealIndex(on: boolean): void {
    this.#revealIndex = on;
    this.#syncNLabel();
  }

  /** Единый источник видимости n-label: показывать ⇔ полуцилиндр на месте И reveal. */
  #syncNLabel(): void {
    this.#toggleHidden(this.#nLabel, !(this.#placedCyl && this.#revealIndex));
  }

  /**
   * Добавляет/снимает класс dragging-active на host.
   * Когда active=true — все .slot-rect проявляются (через CSS :host(.dragging-active)).
   */
  setDragging(on: boolean): void {
    this.classList.toggle('dragging-active', on);
  }

  // ─── Приватные методы ─────────────────────────────────────────────────────

  /** Установить/снять атрибут hidden (нужен явный CSS [hidden]{display:none}). */
  #toggleHidden(el: Element | null, hidden: boolean): void {
    if (!el) return;
    if (hidden) {
      el.setAttribute('hidden', '');
    } else {
      el.removeAttribute('hidden');
    }
  }

  /**
   * Строит весь SVG-контент программно через createElementNS.
   * Порядок слоёв (DOM = z-order): диск → стекло → грань → нормаль →
   * штрихи → подписи → гнёзда → осветитель.
   */
  #render(): void {
    const svg = this.shadowRoot!.querySelector<SVGSVGElement>('svg');
    if (!svg) return;

    // ── Диск (обод + фон) ──────────────────────────────────────────────────
    const discRim = svgEl<SVGCircleElement>('circle');
    discRim.setAttribute('class', 'disc-rim');
    discRim.setAttribute('cx', String(CX));
    discRim.setAttribute('cy', String(CY));
    discRim.setAttribute('r', String(R));
    svg.appendChild(discRim);

    // ── Стекло полуцилиндра (нижний полукруг, y>CY) ───────────────────────
    // path: M(CX-R, CY) A R R 0 0 0 (CX+R, CY) Z
    // sweep-flag=0 → дуга идёт вниз (y>CY = стекло), sweep-flag=1 → вверх (воздух).
    const glassBody = svgEl<SVGPathElement>('path');
    glassBody.setAttribute('class', 'glass-body');
    glassBody.setAttribute(
      'd',
      `M ${FACE_X1} ${FACE_Y} A ${R} ${R} 0 0 0 ${FACE_X2} ${FACE_Y} Z`,
    );
    svg.appendChild(glassBody);
    this.#glassBody = glassBody;

    // ── Плоская грань (горизонтальный диаметр) ────────────────────────────
    const flatFace = svgEl<SVGLineElement>('line');
    flatFace.setAttribute('class', 'flat-face');
    flatFace.setAttribute('x1', String(FACE_X1));
    flatFace.setAttribute('y1', String(FACE_Y));
    flatFace.setAttribute('x2', String(FACE_X2));
    flatFace.setAttribute('y2', String(FACE_Y));
    svg.appendChild(flatFace);

    // ── Нормаль (вертикальная пунктирная линия через центр) ───────────────
    const normalLine = svgEl<SVGLineElement>('line');
    normalLine.setAttribute('class', 'normal-line');
    normalLine.setAttribute('x1', String(NORMAL_X));
    normalLine.setAttribute('y1', String(NORMAL_Y1));
    normalLine.setAttribute('x2', String(NORMAL_X));
    normalLine.setAttribute('y2', String(NORMAL_Y2));
    svg.appendChild(normalLine);

    // ── Штрихи и подписи транспортира ────────────────────────────────────
    // Угол отсчитывается от нормали (вертикаль=0°) в каждом из 4 квадрантов.
    // Штрихи идут по всему ободу (0..359°), но в SVG-角系 0=вправо.
    // Нормаль сверху = -90° SVG, снизу = 90° SVG.
    // По всему ободу: 360 штрихов (каждые 1°), из них 36 мажорных (каждые 10°).

    const ticksGroup = svgEl<SVGGElement>('g');
    ticksGroup.setAttribute('id', 'ticks-group');
    svg.appendChild(ticksGroup);

    for (let svgAngle = 0; svgAngle < 360; svgAngle++) {
      // fromNormal: угол от ближайшей нормали (0°/180°); для подписей — квадрантный угол
      const isMajor = svgAngle % 10 === 0;
      const tickLen = isMajor ? TICK_MAJOR_LEN : TICK_MINOR_LEN;

      // Внешняя точка (на ободе)
      const outer = polar(R, svgAngle);
      // Внутренняя точка (внутрь диска)
      const inner = polar(R - tickLen, svgAngle);

      const tick = svgEl<SVGLineElement>('line');
      tick.setAttribute('class', isMajor ? 'tick tick--major' : 'tick');
      tick.setAttribute('x1', outer.x.toFixed(2));
      tick.setAttribute('y1', outer.y.toFixed(2));
      tick.setAttribute('x2', inner.x.toFixed(2));
      tick.setAttribute('y2', inner.y.toFixed(2));
      ticksGroup.appendChild(tick);

      // Подписи для мажорных штрихов (каждые 10°)
      if (isMajor) {
        // Квадрантный угол от нормали (нормаль=90°/270° SVG, грань=0°/180° SVG).
        // Отсчёт по часовой в каждом квадранте даёт fromNormal 0..90.
        let fromNormal: number;
        if (svgAngle <= 90) {
          // Q1: svgAngle=0(грань правая)→90, svgAngle=90(нормаль снизу)→0
          fromNormal = 90 - svgAngle;
        } else if (svgAngle <= 180) {
          // Q2: 90°(нормаль снизу)→0, 180°(грань левая)→90
          fromNormal = svgAngle - 90;
        } else if (svgAngle <= 270) {
          // Q3: 180°(грань левая)→90, 270°(нормаль сверху)→0
          fromNormal = 270 - svgAngle;
        } else {
          // Q4: 270°(нормаль сверху)→0, 360°(грань правая)→90
          fromNormal = svgAngle - 270;
        }

        // Не дублировать подпись на самой нормали и грани в соседних квадрантах
        // (svgAngle 0,90,180,270 появятся 1 раз каждый при svgAngle%90===0)
        const labelPos = polar(TICK_LABEL_R, svgAngle);
        const label = svgEl<SVGTextElement>('text');
        label.setAttribute('class', 'tick-label');
        label.setAttribute('x', labelPos.x.toFixed(2));
        label.setAttribute('y', labelPos.y.toFixed(2));
        label.textContent = String(fromNormal);
        ticksGroup.appendChild(label);
      }
    }

    // ── Гнездо полуцилиндра (центр диска) ────────────────────────────────
    const slotCyl = svgEl<SVGGElement>('g');
    slotCyl.setAttribute('data-slot', 'semicylinder');
    slotCyl.setAttribute('id', 'slot-semicylinder');

    const cylRect = svgEl<SVGRectElement>('rect');
    cylRect.setAttribute('class', 'slot-rect');
    cylRect.setAttribute('x', String(SLOT_CYL_X));
    cylRect.setAttribute('y', String(SLOT_CYL_Y));
    cylRect.setAttribute('width', String(SLOT_CYL_W));
    cylRect.setAttribute('height', String(SLOT_CYL_H));
    cylRect.setAttribute('rx', '6');
    slotCyl.appendChild(cylRect);

    const cylLabel = svgEl<SVGTextElement>('text');
    cylLabel.setAttribute('class', 'slot-label');
    cylLabel.setAttribute('x', String(CX));
    cylLabel.setAttribute('y', String(CY));
    cylLabel.textContent = 'Полуцилиндр';
    slotCyl.appendChild(cylLabel);

    svg.appendChild(slotCyl);

    // ── Гнездо осветителя (слева на уровне плоской грани) ─────────────────
    const slotEm = svgEl<SVGGElement>('g');
    slotEm.setAttribute('data-slot', 'emitter');
    slotEm.setAttribute('id', 'slot-emitter');

    const emRect = svgEl<SVGRectElement>('rect');
    emRect.setAttribute('class', 'slot-rect');
    emRect.setAttribute('x', String(SLOT_EM_X));
    emRect.setAttribute('y', String(SLOT_EM_Y));
    emRect.setAttribute('width', String(SLOT_EM_W));
    emRect.setAttribute('height', String(SLOT_EM_H));
    emRect.setAttribute('rx', '6');
    slotEm.appendChild(emRect);

    const emLabel = svgEl<SVGTextElement>('text');
    emLabel.setAttribute('class', 'slot-label');
    emLabel.setAttribute('x', String(SLOT_EM_X + SLOT_EM_W / 2));
    emLabel.setAttribute('y', String(CY));
    emLabel.textContent = 'Осветитель';
    slotEm.appendChild(emLabel);

    svg.appendChild(slotEm);

    // ── Группа осветителя (SVG-значок, видима только после setPlaced) ─────
    // Узнаваемый источник света: корпус + горловина + линза-апертура + пучок к центру.
    // Функц-детали ≥15% от SVG_SIZE=420 → корпус 72px высотой (§27/§28).
    const emitterGroup = svgEl<SVGGElement>('g');
    emitterGroup.setAttribute('class', 'emitter-group');
    emitterGroup.setAttribute('id', 'emitter-glyph');

    const EM_W = 42;
    const EM_H = 72; // ≥15% viewBox (правило §27/§28)
    const emBodyX = SLOT_EM_X + (SLOT_EM_W - EM_W) / 2;
    const emBodyY = CY - EM_H / 2;
    const emNoseX = emBodyX + EM_W; // передний торец корпуса (со стороны диска)

    // Корпус (прямоугольник со скруглением, тёплый металлик)
    const emBody = svgEl<SVGRectElement>('rect');
    emBody.setAttribute('x', String(emBodyX));
    emBody.setAttribute('y', String(emBodyY));
    emBody.setAttribute('width', String(EM_W));
    emBody.setAttribute('height', String(EM_H));
    emBody.setAttribute('rx', '6');
    emBody.setAttribute('fill', '#e8a020');
    emBody.setAttribute('stroke', '#a85e08');
    emBody.setAttribute('stroke-width', '1.6');
    emBody.setAttribute('paint-order', 'stroke');
    emitterGroup.appendChild(emBody);

    // Продольный блик на корпусе (объём)
    const emGloss = svgEl<SVGRectElement>('rect');
    emGloss.setAttribute('x', String(emBodyX + 5));
    emGloss.setAttribute('y', String(emBodyY + 6));
    emGloss.setAttribute('width', '6');
    emGloss.setAttribute('height', String(EM_H - 12));
    emGloss.setAttribute('rx', '3');
    emGloss.setAttribute('fill', 'rgb(255 240 200 / 0.55)');
    emitterGroup.appendChild(emGloss);

    // Горловина-рефлектор (трапеция, сужается к линзе)
    const emNose = svgEl<SVGPathElement>('path');
    const noseH = 34; // высота выходной апертуры
    emNose.setAttribute(
      'd',
      `M ${emNoseX} ${CY - EM_H / 2 + 12} ` +
        `L ${emNoseX + 14} ${CY - noseH / 2} ` +
        `L ${emNoseX + 14} ${CY + noseH / 2} ` +
        `L ${emNoseX} ${CY + EM_H / 2 - 12} Z`,
    );
    emNose.setAttribute('fill', '#c8801a');
    emNose.setAttribute('stroke', '#a85e08');
    emNose.setAttribute('stroke-width', '1.4');
    emNose.setAttribute('stroke-linejoin', 'round');
    emNose.setAttribute('paint-order', 'stroke');
    emitterGroup.appendChild(emNose);

    // Линза-апертура (светящийся овал на торце горловины)
    const emLens = svgEl<SVGEllipseElement>('ellipse');
    emLens.setAttribute('cx', String(emNoseX + 14));
    emLens.setAttribute('cy', String(CY));
    emLens.setAttribute('rx', '4.5');
    emLens.setAttribute('ry', String(noseH / 2 - 1));
    emLens.setAttribute('fill', 'rgb(255 246 214 / 0.95)');
    emLens.setAttribute('stroke', '#f5d060');
    emLens.setAttribute('stroke-width', '1.4');
    emitterGroup.appendChild(emLens);

    // Пучок света (короткая расширяющаяся полоса от линзы к краю диска)
    const beamStartX = emNoseX + 18;
    const emBeam = svgEl<SVGPathElement>('path');
    emBeam.setAttribute(
      'd',
      `M ${beamStartX} ${CY - noseH / 2 + 3} ` +
        `L ${FACE_X1} ${CY - 6} ` +
        `L ${FACE_X1} ${CY + 6} ` +
        `L ${beamStartX} ${CY + noseH / 2 - 3} Z`,
    );
    emBeam.setAttribute('fill', 'rgb(255 224 102 / 0.28)');
    emitterGroup.appendChild(emBeam);

    // Осевой луч (яркая линия по центру пучка к центру диска)
    const emRay = svgEl<SVGLineElement>('line');
    emRay.setAttribute('x1', String(beamStartX));
    emRay.setAttribute('y1', String(CY));
    emRay.setAttribute('x2', String(FACE_X1));
    emRay.setAttribute('y2', String(CY));
    emRay.setAttribute('stroke', '#ffe066');
    emRay.setAttribute('stroke-width', '2.2');
    emRay.setAttribute('stroke-linecap', 'round');
    emitterGroup.appendChild(emRay);

    svg.appendChild(emitterGroup);
    this.#emitterGroup = emitterGroup;

    // ── Подпись n≈1,5 (внутри нижнего полукруга, видима только при setPlaced('semicylinder',true)) ──
    const nLabel = svgEl<SVGTextElement>('text');
    nLabel.setAttribute('class', 'n-label');
    nLabel.setAttribute('x', String(CX));
    nLabel.setAttribute('y', String(CY + 50));
    // a11y no-leak: SR не должен озвучивать ответ n — метка вне дерева доступности.
    nLabel.setAttribute('aria-hidden', 'true');
    nLabel.textContent = 'n ≈1,5';
    svg.appendChild(nLabel);
    this.#nLabel = nLabel;

    // ── Лучи + дуги + ридауты + хэндл (Task 4) ───────────────────────────────
    this.#renderRays(svg);
  }

  /**
   * Строит группу лучей (падающий/преломлённый/отражённый), дуги i/r,
   * текстовые ридауты и перетаскиваемый хэндл угла падения.
   * Геометрия обновляется в #redraw(); здесь только каркас + подписка событий.
   */
  #renderRays(svg: SVGSVGElement): void {
    const rays = svgEl<SVGGElement>('g');
    rays.setAttribute('class', 'rays-group');
    rays.setAttribute('id', 'rays-group');

    // Отражённый — рисуем первым (под остальными, тусклый)
    const reflected = svgEl<SVGLineElement>('line');
    reflected.setAttribute('class', 'ray-reflected');
    rays.appendChild(reflected);
    this.#rayReflected = reflected;

    // Преломлённый
    const refracted = svgEl<SVGLineElement>('line');
    refracted.setAttribute('class', 'ray-refracted');
    rays.appendChild(refracted);
    this.#rayRefracted = refracted;

    // Падающий
    const incident = svgEl<SVGLineElement>('line');
    incident.setAttribute('class', 'ray-incident');
    rays.appendChild(incident);
    this.#rayIncident = incident;

    // Дуга i (верх, между падающим и верхней нормалью)
    const arcI = svgEl<SVGPathElement>('path');
    arcI.setAttribute('class', 'angle-arc angle-arc--i');
    rays.appendChild(arcI);
    this.#arcI = arcI;

    // Дуга r (низ, между преломлённым и нижней нормалью)
    const arcR = svgEl<SVGPathElement>('path');
    arcR.setAttribute('class', 'angle-arc angle-arc--r');
    rays.appendChild(arcR);
    this.#arcR = arcR;

    // Ридаут i
    const readoutI = svgEl<SVGTextElement>('text');
    readoutI.setAttribute('class', 'angle-readout angle-readout--i');
    rays.appendChild(readoutI);
    this.#readoutI = readoutI;

    // Ридаут r
    const readoutR = svgEl<SVGTextElement>('text');
    readoutR.setAttribute('class', 'angle-readout angle-readout--r');
    rays.appendChild(readoutR);
    this.#readoutR = readoutR;

    // Хэндл угла падения (кружок на конце падающего луча = на верхнем ободе)
    const handle = svgEl<SVGGElement>('g');
    handle.setAttribute('class', 'angle-handle');
    handle.setAttribute('role', 'slider');
    handle.setAttribute('tabindex', '0');
    handle.setAttribute('aria-label', 'Угол падения, градусы');
    handle.setAttribute('aria-valuemin', String(I_MIN));
    handle.setAttribute('aria-valuemax', String(I_MAX));
    handle.setAttribute('aria-valuenow', String(this.#i));

    const dot = svgEl<SVGCircleElement>('circle');
    dot.setAttribute('class', 'handle-dot');
    dot.setAttribute('r', String(HANDLE_R));
    handle.appendChild(dot);
    this.#handleDot = dot;

    handle.addEventListener('pointerdown', this.#onPointerDown);
    handle.addEventListener('keydown', this.#onKeydown);
    rays.appendChild(handle);
    this.#handle = handle;

    svg.appendChild(rays);
    this.#raysGroup = rays;
  }

  // ─── Отрисовка лучей / дуг / ридаутов / хэндла ──────────────────────────────

  /** Пересчитывает и перерисовывает всю угловую графику под текущие #i / #n. */
  #redraw(): void {
    if (!this.#rendered) return;
    const i = this.#i;
    const r = Math.round(refractionAngle(i, 1, this.#refractiveIndex));

    // Падающий луч: точка на верхнем ободе (слева) → центр
    const pInc = incidentRimPoint(i, R);
    this.#setLine(this.#rayIncident, pInc.x, pInc.y, CX, CY);

    // Преломлённый: центр → точка на нижнем ободе (вправо-вниз) под углом r
    const pRef = refractedRimPoint(r, R);
    this.#setLine(this.#rayRefracted, CX, CY, pRef.x, pRef.y);

    // Отражённый: центр → точка на верхнем ободе (вправо-вверх) под углом i
    const pRefl = reflectedRimPoint(i, R);
    this.#setLine(this.#rayReflected, CX, CY, pRefl.x, pRefl.y);

    // Дуга i: от верхней нормали (0°) до падающего луча (влево, i°)
    this.#arcI?.setAttribute('d', this.#arcTopIncident(i, ARC_I_R));
    // Дуга r: от нижней нормали (0°) до преломлённого луча (вправо, r°)
    this.#arcR?.setAttribute('d', this.#arcBottomRefracted(r, ARC_R_R));

    // Ридауты
    if (this.#readoutI) {
      const p = incidentRimPoint(i / 2, READOUT_R);
      this.#readoutI.setAttribute('x', p.x.toFixed(1));
      this.#readoutI.setAttribute('y', p.y.toFixed(1));
      this.#readoutI.textContent = `i = ${i}°`;
    }
    if (this.#readoutR) {
      const p = refractedRimPoint(r / 2, READOUT_R);
      this.#readoutR.setAttribute('x', p.x.toFixed(1));
      this.#readoutR.setAttribute('y', p.y.toFixed(1));
      this.#readoutR.textContent = `r = ${r}°`;
    }

    // Хэндл в конце падающего луча + aria
    if (this.#handleDot) {
      this.#handleDot.setAttribute('cx', pInc.x.toFixed(1));
      this.#handleDot.setAttribute('cy', pInc.y.toFixed(1));
    }
    this.#handle?.setAttribute('aria-valuenow', String(i));
    this.#handle?.setAttribute('aria-valuetext', `${i} градусов`);
  }

  #setLine(line: SVGLineElement | null, x1: number, y1: number, x2: number, y2: number): void {
    if (!line) return;
    line.setAttribute('x1', x1.toFixed(1));
    line.setAttribute('y1', y1.toFixed(1));
    line.setAttribute('x2', x2.toFixed(1));
    line.setAttribute('y2', y2.toFixed(1));
  }

  /** Дуга у центра от верхней нормали к падающему лучу (по часовой влево). */
  #arcTopIncident(iDeg: number, r: number): string {
    const start = { x: CX, y: CY - r }; // верхняя нормаль
    const end = incidentRimPoint(iDeg, r); // падающий (влево-вверх)
    // sweep-flag=0: от верха к влево-верху идёт против часовой в SVG-координатах
    return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${r} ${r} 0 0 0 ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  }

  /** Дуга у центра от нижней нормали к преломлённому лучу (вправо-вниз). */
  #arcBottomRefracted(rDeg: number, r: number): string {
    const start = { x: CX, y: CY + r }; // нижняя нормаль
    const end = refractedRimPoint(rDeg, r); // преломлённый (вправо-вниз)
    // sweep-flag=0: от низа к вправо-низу идёт против часовой в SVG-координатах
    return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${r} ${r} 0 0 0 ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  }

  // ─── Интеракция: указатель + клавиатура ─────────────────────────────────────

  #onPointerDown = (ev: PointerEvent): void => {
    ev.preventDefault();
    this.#dragging = true;
    this.#handle?.setPointerCapture?.(ev.pointerId);
    this.#handle?.addEventListener('pointermove', this.#onPointerMove);
    this.#handle?.addEventListener('pointerup', this.#onPointerUp);
    this.#handle?.addEventListener('pointercancel', this.#onPointerUp);
    this.#angleFromPointer(ev);
  };

  #onPointerMove = (ev: PointerEvent): void => {
    if (!this.#dragging) return;
    this.#angleFromPointer(ev);
  };

  #onPointerUp = (ev: PointerEvent): void => {
    this.#dragging = false;
    this.#handle?.releasePointerCapture?.(ev.pointerId);
    this.#handle?.removeEventListener('pointermove', this.#onPointerMove);
    this.#handle?.removeEventListener('pointerup', this.#onPointerUp);
    this.#handle?.removeEventListener('pointercancel', this.#onPointerUp);
  };

  #onKeydown = (ev: KeyboardEvent): void => {
    let delta = 0;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') delta = 1;
    else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') delta = -1;
    else return;
    ev.preventDefault();
    this.setIncidenceAngle(this.#i + delta);
  };

  /**
   * Преобразует позицию курсора в угол падения:
   * атан2 от центра диска к курсору, спроецированный на верхнюю нормаль.
   * Хэндл на левой стороне ⇒ i = atan2(-dx, -dy).
   */
  #angleFromPointer(ev: PointerEvent): void {
    const svg = this.shadowRoot?.querySelector<SVGSVGElement>('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    // Курсор → SVG-координаты (viewBox 0..SVG_SIZE)
    const sx = ((ev.clientX - rect.left) / rect.width) * SVG_SIZE;
    const sy = ((ev.clientY - rect.top) / rect.height) * SVG_SIZE;
    const dx = sx - CX;
    const dy = sy - CY;
    // i от верхней нормали, положительно влево (сторона хэндла)
    const iDeg = (Math.atan2(-dx, -dy) * 180) / Math.PI;
    this.setIncidenceAngle(iDeg);
  }
}

// ─── Регистрация ──────────────────────────────────────────────────────────────

if (!customElements.get('lab-protractor-disc')) {
  customElements.define('lab-protractor-disc', LabProtractorDisc);
}
