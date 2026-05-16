/**
 * <lab-thread mode="coil|taut" length-mm="500"
 *             taut-from-x="..." taut-from-y="..."
 *             taut-to-x="..." taut-to-y="...">
 *
 * Нить (по комплекту №1 ФИПИ — нить 1 м, для подвешивания цилиндров).
 *
 * Два режима:
 *  - coil (default): моток-иконка для kit-панели. Интерактивен (focusable,
 *    клик), такая же иконка, как была до этапа 3. Никаких изменений
 *    поведения для опыта 1.1.
 *  - taut: натянутая нить между двумя точками `taut-from-*` → `taut-to-*`
 *    в host-space (CSS px host'а). Декоративный элемент: pointer-events
 *    отключены, tabindex=-1, aria-hidden=true. Используется в опыте 1.2,
 *    чтобы соединить крюк цилиндра (lab-metal-weight.getThreadHookPosition)
 *    с нижним крюком динамометра (lab-dynamometer.getWeightHookPosition).
 */

const COIL_TEMPLATE = `
<style id="thread-style">
  :host {
    display: inline-block;
    width: 70px;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.3));
  }
  :host(:hover) { filter: drop-shadow(0 7px 10px rgb(0 0 0 / 0.45)); }
  :host(:focus-visible) { outline: none; }
  :host(:focus-visible) .focus-ring { opacity: 1; }
  .frame { width: 100%; height: auto; display: block; pointer-events: none; }
  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 5 3;
    opacity: 0;
  }
</style>
<svg class="frame" viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="threadCoil" cx="0.4" cy="0.4" r="0.6">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="40%" stop-color="#e8e0d0" />
      <stop offset="100%" stop-color="#a89860" />
    </radialGradient>
  </defs>
  <!-- Моток нити — спиральный круг -->
  <circle cx="35" cy="32" r="22" fill="url(#threadCoil)" stroke="#7a6f4a" stroke-width="0.6" />
  <!-- Кольца обмотки -->
  <ellipse cx="35" cy="32" rx="20" ry="7" fill="none" stroke="#a89860" stroke-width="0.5" opacity="0.6" />
  <ellipse cx="35" cy="32" rx="14" ry="5" fill="none" stroke="#a89860" stroke-width="0.5" opacity="0.5" />
  <ellipse cx="35" cy="32" rx="9" ry="3" fill="none" stroke="#a89860" stroke-width="0.5" opacity="0.4" />
  <!-- Свободный конец нити -->
  <path d="M50 30 Q 58 24, 62 32 T 60 50" fill="none" stroke="#d8c890" stroke-width="0.8" stroke-linecap="round" />
  <!-- Тень на низу -->
  <ellipse cx="35" cy="58" rx="20" ry="3" fill="rgba(0,0,0,0.25)" />
  <rect class="focus-ring" x="8" y="6" width="54" height="58" rx="3" />
</svg>
`;

/**
 * Provis провисания: нить под собственным весом провисает чуть ниже прямой
 * между точками крепления. Сагитта (стрела прогиба) — небольшая доля
 * длины, ограничена сверху, чтобы для коротких отрезков не было «искусственно»
 * большого изгиба, а для длинных — оставалась читаемой кривая.
 */
const SAG_FRACTION = 0.025; // 2.5% от длины
const SAG_MIN_PX = 1.5;
const SAG_MAX_PX = 6;

function tautPath(fromX: number, fromY: number, toX: number, toY: number): string {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.hypot(dx, dy);
  if (length < 0.5) {
    return `M${fromX} ${fromY} L${toX} ${toY}`;
  }
  const sag = Math.max(SAG_MIN_PX, Math.min(SAG_MAX_PX, length * SAG_FRACTION));
  // Контрольная точка — середина отрезка, смещённая вниз на sag (чисто
  // визуальный провис, гравитация по экрану — вниз = +Y).
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2 + sag;
  return `M${fromX} ${fromY} Q${midX} ${midY} ${toX} ${toY}`;
}

export class LabThread extends HTMLElement {
  static observedAttributes = ['mode', 'taut-from-x', 'taut-from-y', 'taut-to-x', 'taut-to-y'];

  #shadow: ShadowRoot;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#render();
  }

  attributeChangedCallback(): void {
    this.#render();
    if (this.isConnected) this.#applyHostAttrs();
  }

  connectedCallback(): void {
    this.#applyHostAttrs();
  }

  #mode(): 'coil' | 'taut' {
    return this.getAttribute('mode') === 'taut' ? 'taut' : 'coil';
  }

  #render(): void {
    if (this.#mode() === 'taut') {
      this.#renderTaut();
    } else {
      this.#renderCoil();
    }
  }

  /** Host-attributes (tabIndex/role/aria-*) — только когда элемент уже в DOM,
   *  иначе нарушение DOM-spec при document.createElement. */
  #applyHostAttrs(): void {
    if (this.#mode() === 'taut') {
      this.tabIndex = -1;
      this.setAttribute('aria-hidden', 'true');
      this.removeAttribute('role');
      this.removeAttribute('aria-label');
    } else {
      this.tabIndex = 0;
      this.setAttribute('role', 'button');
      this.setAttribute('aria-label', 'Нить, 1 м. Используется для подвеса цилиндров.');
      this.removeAttribute('aria-hidden');
    }
  }

  #renderCoil(): void {
    this.#shadow.innerHTML = COIL_TEMPLATE;
  }

  #renderTaut(): void {
    const fromX = Number(this.getAttribute('taut-from-x') ?? 0);
    const fromY = Number(this.getAttribute('taut-from-y') ?? 0);
    const toX = Number(this.getAttribute('taut-to-x') ?? 0);
    const toY = Number(this.getAttribute('taut-to-y') ?? 0);
    /* SVG-bbox: левый-верхний (minX,minY), правый-нижний (maxX,maxY).
       Расширяем на пару px — учитываем толщину линии и провисание. */
    const minX = Math.min(fromX, toX) - 4;
    const minY = Math.min(fromY, toY) - 4;
    const maxX = Math.max(fromX, toX) + 4;
    const maxY = Math.max(fromY, toY) + SAG_MAX_PX + 4;
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const path = tautPath(fromX - minX, fromY - minY, toX - minX, toY - minY);
    this.#shadow.innerHTML = `
<style id="thread-style">
  :host {
    /* Декоративный overlay: позиционируется тем, кто его монтирует. */
    display: block;
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
    width: ${width}px;
    height: ${height}px;
    /* Сдвиг, чтобы svg визуально совпал с координатами from/to host-space. */
    transform: translate(${minX}px, ${minY}px);
  }
  .taut-svg { width: 100%; height: 100%; display: block; overflow: visible; }
  .taut-line {
    fill: none;
    stroke: #d8c890;
    stroke-width: 1.2;
    stroke-linecap: round;
    /* Лёгкая тень для читаемости на любом фоне. */
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.25));
  }
</style>
<svg class="taut-svg" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path class="taut-line" d="${path}" />
</svg>
`;
  }
}

customElements.define('lab-thread', LabThread);
