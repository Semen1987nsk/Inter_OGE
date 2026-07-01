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
 * A11y: host role="group" (НЕ role="img" — внутри в T4 будет role="slider"-хэндл),
 *        <title> на SVG. svg[hidden]{display:none} + [hidden]{display:none} для групп.
 */

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
    fill: rgba(100, 180, 240, 0.22);
    stroke: #5ab0e0;
    stroke-width: 1.2;
  }

  /* Плоская грань */
  .flat-face {
    stroke: #7ecef0;
    stroke-width: 2;
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

  // Ссылки на SVG-элементы (кешируются после render)
  #glassBody: SVGPathElement | null = null;
  #emitterGroup: SVGGElement | null = null;
  #rendered = false;

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
  }

  // ─── Публичный API ────────────────────────────────────────────────────────

  get refractiveIndex(): number {
    return this.#refractiveIndex;
  }

  set refractiveIndex(val: number) {
    this.#refractiveIndex = val;
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
    const rect = slotEl?.querySelector<SVGRectElement>('.slot-rect');
    rect?.classList.toggle('drop-zone--active', active);
  }

  /**
   * Показать/скрыть прибор в гнезде.
   *   semicylinder → toggle hidden на .glass-body (нижний полукруг)
   *   emitter      → toggle hidden на .emitter-group
   */
  setPlaced(kind: 'semicylinder' | 'emitter' | string, on: boolean): void {
    if (kind === 'semicylinder') {
      this.#toggleHidden(this.#glassBody, !on);
    } else if (kind === 'emitter') {
      this.#toggleHidden(this.#emitterGroup, !on);
    }
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
    // path: M(CX-R, CY) A R R 0 0 1 (CX+R, CY) L(CX-R, CY) Z
    const glassBody = svgEl<SVGPathElement>('path');
    glassBody.setAttribute('class', 'glass-body');
    glassBody.setAttribute(
      'd',
      `M ${FACE_X1} ${FACE_Y} A ${R} ${R} 0 0 1 ${FACE_X2} ${FACE_Y} Z`,
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
    // Минимальный глиф: прямоугольник + лучи — ≥15% от SVG_SIZE=420 → ≥63 единицы.
    const emitterGroup = svgEl<SVGGElement>('g');
    emitterGroup.setAttribute('class', 'emitter-group');
    emitterGroup.setAttribute('id', 'emitter-glyph');

    // Корпус осветителя (≥15% от 420 = 63px, делаем 70px высотой)
    const emBody = svgEl<SVGRectElement>('rect');
    const EM_W = 40;
    const EM_H = 70;  // ≥15% viewBox (правило §27/§28)
    emBody.setAttribute('x', String(SLOT_EM_X + (SLOT_EM_W - EM_W) / 2));
    emBody.setAttribute('y', String(CY - EM_H / 2));
    emBody.setAttribute('width', String(EM_W));
    emBody.setAttribute('height', String(EM_H));
    emBody.setAttribute('rx', '4');
    emBody.setAttribute('fill', '#e8a020');
    emBody.setAttribute('stroke', '#c07010');
    emBody.setAttribute('stroke-width', '1.5');
    emitterGroup.appendChild(emBody);

    // Луч осветителя (горизонтальная линия от корпуса к диску)
    const emRay = svgEl<SVGLineElement>('line');
    emRay.setAttribute('x1', String(SLOT_EM_X + SLOT_EM_W));
    emRay.setAttribute('y1', String(CY));
    emRay.setAttribute('x2', String(FACE_X1));
    emRay.setAttribute('y2', String(CY));
    emRay.setAttribute('stroke', '#f5d060');
    emRay.setAttribute('stroke-width', '2');
    emRay.setAttribute('stroke-dasharray', '4 3');
    emitterGroup.appendChild(emRay);

    svg.appendChild(emitterGroup);
    this.#emitterGroup = emitterGroup;

    // ── Подпись n≈1,5 (внутри нижнего полукруга, видима всегда) ──────────
    const nLabel = svgEl<SVGTextElement>('text');
    nLabel.setAttribute('class', 'n-label');
    nLabel.setAttribute('x', String(CX));
    nLabel.setAttribute('y', String(CY + 50));
    nLabel.textContent = 'n ≈1,5';  // n≈1,5
    svg.appendChild(nLabel);
  }
}

// ─── Регистрация ──────────────────────────────────────────────────────────────

if (!customElements.get('lab-protractor-disc')) {
  customElements.define('lab-protractor-disc', LabProtractorDisc);
}
