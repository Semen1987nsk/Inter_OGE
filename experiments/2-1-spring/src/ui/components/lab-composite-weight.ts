/**
 * <lab-composite-weight kind="rod|disc" mass="10">
 *
 * Компонент наборного груза по спецификации ФИПИ комплекта №2:
 *  - kind="rod"  — штанга-основа 10 г: тонкий вертикальный стержень с крюком
 *                  сверху и петлёй снизу, на нём фланцы для удержания дисков.
 *  - kind="disc" — плоский диск с центральным отверстием (надевается на штангу).
 *                  mass определяет диаметр: 10 г → малый, 20 г → средний, 50 г → большой.
 *
 * Из штанги + комбинации дисков ученик собирает грузы №4=60 г, №5=70 г, №6=80 г.
 *
 * Поддерживает PointerEvents (мышь/touch/стилус) и keyboard (Enter/Space).
 */

const DISC_GEOM: Record<number, { rx: number; ry: number; height: number }> = {
  10: { rx: 14, ry: 4, height: 10 },
  20: { rx: 18, ry: 5, height: 12 },
  50: { rx: 24, ry: 6, height: 16 },
};

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    --piece-size: 64px;
    --metal: var(--equip-metal, #a8afb8);
    --metal-light: var(--equip-metal-light, #d5dbe3);
    --metal-shadow: var(--equip-metal-shadow, #4a5260);
    --disc-body: var(--equip-weight-dark, #6e7682);
    --disc-edge: var(--equip-weight-edge, #4a5260);
    --label-bg: var(--equip-weight-label-bg, #f8f8f4);
    --label-text: var(--equip-weight-label-text, #1a1b1f);

    display: inline-flex;
    align-items: flex-end;
    justify-content: center;
    width: var(--piece-size);
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    transition: transform var(--dur-fast, 150ms) var(--ease-out, ease-out);
    filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.35));
  }

  :host([kind="rod"]) {
    height: 130px;
  }

  :host([kind="disc"][mass="10"]) {
    height: 32px;
  }

  :host([kind="disc"][mass="20"]) {
    height: 38px;
  }

  :host([kind="disc"][mass="50"]) {
    height: 48px;
  }

  :host(:hover) {
    transform: translateY(-2px);
    filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.5));
  }

  :host([dragging]) {
    cursor: grabbing;
    transform: scale(1.06);
    z-index: 100;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }

  /* HTML-атрибут [hidden] на SVG-элементах ненадёжен (browser quirk на SVG namespace).
     Без явного display:none все режимные SVG рендерятся параллельно. */
  svg[hidden] { display: none; }

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
<svg class="rod" viewBox="0 0 60 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" hidden>
  <defs>
    <linearGradient id="rod-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="var(--metal-shadow)" />
      <stop offset="20%" stop-color="var(--metal)" />
      <stop offset="50%" stop-color="var(--metal-light)" />
      <stop offset="80%" stop-color="var(--metal)" />
      <stop offset="100%" stop-color="var(--metal-shadow)" />
    </linearGradient>
    <linearGradient id="rod-hook" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#9aa3b0" />
      <stop offset="40%" stop-color="#dde2e8" />
      <stop offset="60%" stop-color="#dde2e8" />
      <stop offset="100%" stop-color="#9aa3b0" />
    </linearGradient>
  </defs>

  <!-- Верхний крюк -->
  <path d="M 30 4 Q 25 6 25 12 Q 25 18 30 18 Q 35 18 35 24 L 35 30"
        stroke="url(#rod-hook)" stroke-width="2.4" fill="none" stroke-linecap="round" />

  <!-- Верхний фланец-упор (для нижнего диска) -->
  <ellipse cx="30" cy="32" rx="10" ry="2.2" fill="var(--metal-shadow)" />
  <ellipse cx="30" cy="31" rx="9" ry="1.6" fill="var(--metal-light)" />

  <!-- Стержень штанги -->
  <rect x="27.5" y="32" width="5" height="62" fill="url(#rod-grad)" rx="0.8" />
  <!-- Тонкий блик -->
  <rect x="29.2" y="32" width="0.8" height="62" fill="rgb(255 255 255 / 0.6)" />

  <!-- Бирка с массой удалена по правилу «не подписывать массу» (ФИПИ-канон).
       Ученик взвешивает на динамометре сам. -->


  <!-- Нижний фланец -->
  <ellipse cx="30" cy="94" rx="10" ry="2.2" fill="var(--metal-shadow)" />
  <ellipse cx="30" cy="93" rx="9" ry="1.6" fill="var(--metal-light)" />

  <!-- Нижняя петля для соединения -->
  <line x1="30" y1="94" x2="30" y2="100"
        stroke="url(#rod-hook)" stroke-width="2.2" stroke-linecap="round" />
  <ellipse cx="30" cy="106" rx="4.5" ry="4" fill="none"
           stroke="url(#rod-hook)" stroke-width="2" />

  <rect class="focus-ring" x="2" y="2" width="56" height="126" rx="8" />
</svg>

<svg class="disc" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" hidden>
  <defs>
    <linearGradient id="disc-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--disc-body)" />
      <stop offset="40%" stop-color="color-mix(in srgb, var(--disc-body) 70%, white 30%)" />
      <stop offset="100%" stop-color="var(--disc-edge)" />
    </linearGradient>
  </defs>

  <!-- Боковая поверхность диска -->
  <rect class="disc-side" fill="url(#disc-grad)" stroke="var(--disc-edge)" stroke-width="0.5" />
  <!-- Верхняя плоскость диска (эллипс с лёгким бликом) -->
  <ellipse class="disc-top" fill="color-mix(in srgb, var(--disc-body) 70%, white 30%)"
           stroke="var(--disc-edge)" stroke-width="0.5" />
  <!-- Центральное отверстие (для штанги) -->
  <ellipse class="disc-hole" fill="var(--disc-edge)" />
  <!-- Нижний эллипс (тёмный край) -->
  <ellipse class="disc-bottom" fill="var(--disc-edge)" />

  <!-- Метка массы -->
  <text class="disc-label" text-anchor="middle"
        font-family="var(--font-display, sans-serif)" font-weight="800"
        fill="#fff" stroke="rgb(0 0 0 / 0.4)" stroke-width="0.3"
        paint-order="stroke"></text>

  <rect class="focus-ring" x="2" y="2" width="56" height="26" rx="4" />
</svg>
`;

export class LabCompositeWeight extends HTMLElement {
  static observedAttributes = ['kind', 'mass'];

  #rodSvg: SVGSVGElement;
  #discSvg: SVGSVGElement;
  #discSide: SVGRectElement;
  #discTop: SVGEllipseElement;
  #discHole: SVGEllipseElement;
  #discBottom: SVGEllipseElement;
  #discLabel: SVGTextElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.#rodSvg = shadow.querySelector('svg.rod')!;
    this.#discSvg = shadow.querySelector('svg.disc')!;
    this.#discSide = this.#discSvg.querySelector('.disc-side')!;
    this.#discTop = this.#discSvg.querySelector('.disc-top')!;
    this.#discHole = this.#discSvg.querySelector('.disc-hole')!;
    this.#discBottom = this.#discSvg.querySelector('.disc-bottom')!;
    this.#discLabel = this.#discSvg.querySelector('.disc-label')!;
  }

  connectedCallback(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
    if (this.tabIndex < 0) this.tabIndex = 0;
    this.#render();
  }

  attributeChangedCallback(): void {
    this.#render();
  }

  get kind(): 'rod' | 'disc' {
    return (this.getAttribute('kind') as 'rod' | 'disc') ?? 'rod';
  }

  get mass(): number {
    return Number(this.getAttribute('mass') ?? 10);
  }

  /** Y верхнего крюка в host. */
  getTopHookY(): number {
    const rect = this.getBoundingClientRect();
    if (this.kind === 'rod') {
      // SVG vbox 60×130, верхний крюк в (30, 4) → 4/130 * host.h
      return (4 / 130) * rect.height;
    }
    // Диск — отверстие в (30, 8) на верхней плоскости. vbox высота 30.
    return (8 / 30) * rect.height;
  }

  /** Y нижней точки крепления в host. */
  getWeightHookY(): number {
    const rect = this.getBoundingClientRect();
    if (this.kind === 'rod') {
      // Нижняя петля в (30, 110) при vbox 130 → 110/130 * host.h
      return (110 / 130) * rect.height;
    }
    // Диск — низ ВИДИМОЙ side-rect (не низ host'а). Это критично для тесной
    // стопки: следующий диск садится на ВИЗУАЛЬНЫЙ низ предыдущего, без зазоров.
    // sideBottom = sideTop(8) + geom.height (mass-зависимо). vbox высота 30.
    const geom = DISC_GEOM[this.mass] ?? DISC_GEOM[10]!;
    const sideBottom = 8 + geom.height;
    return (sideBottom / 30) * rect.height;
  }

  #render(): void {
    if (this.kind === 'rod') {
      this.#rodSvg.removeAttribute('hidden');
      this.#discSvg.setAttribute('hidden', '');
      this.setAttribute(
        'aria-label',
        'Штанга-основа 10 г, наберите массу дисками. Нажмите Enter чтобы взять.',
      );
    } else {
      this.#rodSvg.setAttribute('hidden', '');
      this.#discSvg.removeAttribute('hidden');
      this.#renderDisc();
      this.setAttribute(
        'aria-label',
        `Диск ${this.mass} г для наборного груза. Нажмите Enter чтобы взять.`,
      );
    }
  }

  #renderDisc(): void {
    const geom = DISC_GEOM[this.mass] ?? DISC_GEOM[10]!;
    const cx = 30;
    const topY = 8;
    const sideTop = topY;
    const sideBottom = topY + geom.height;

    // Верхняя плоскость
    this.#discTop.setAttribute('cx', String(cx));
    this.#discTop.setAttribute('cy', String(sideTop));
    this.#discTop.setAttribute('rx', String(geom.rx));
    this.#discTop.setAttribute('ry', String(geom.ry));

    // Боковая поверхность (прямоугольник между двумя эллипсами)
    this.#discSide.setAttribute('x', String(cx - geom.rx));
    this.#discSide.setAttribute('y', String(sideTop));
    this.#discSide.setAttribute('width', String(geom.rx * 2));
    this.#discSide.setAttribute('height', String(geom.height));

    // Нижняя плоскость
    this.#discBottom.setAttribute('cx', String(cx));
    this.#discBottom.setAttribute('cy', String(sideBottom));
    this.#discBottom.setAttribute('rx', String(geom.rx));
    this.#discBottom.setAttribute('ry', String(geom.ry));

    // Центральное отверстие (на верхней плоскости)
    this.#discHole.setAttribute('cx', String(cx));
    this.#discHole.setAttribute('cy', String(sideTop + 0.5));
    this.#discHole.setAttribute('rx', '3');
    this.#discHole.setAttribute('ry', '1');

    // Подпись массы удалена по правилу «не подписывать массу» — ученик
    // взвешивает на динамометре сам. Различает диски по размеру (rx).
    this.#discLabel.textContent = '';
  }
}

customElements.define('lab-composite-weight', LabCompositeWeight);
