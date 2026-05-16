/**
 * <lab-weight mass="100" type="standard|fine|mystery" color="#XXX">
 *
 * Виртуальный груз в стиле физического оборудования ЛАБОСФЕРА:
 * тёмно-серый цилиндр с серебристым крюком сверху, нижняя петля для цепочки,
 * белая наклейка с массой по центру.
 * Источник стиля: фото kit-02-forces.png.
 *
 * Поддерживает PointerEvents (мышь/touch/стилус) и keyboard (Enter/Space).
 */

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    --weight-body: var(--equip-weight, #5a6172);
    --weight-body-light: var(--equip-weight-light, #7a8294);
    --weight-body-dark: var(--equip-weight-dark, #3d4252);
    --weight-edge: var(--equip-weight-edge, #2a2d36);
    --weight-label-bg: var(--equip-weight-label-bg, #f5f5f0);
    --weight-label-text: var(--equip-weight-label-text, #1a1b1f);
    --weight-size: 60px;

    display: inline-block;
    width: var(--weight-size);
    height: calc(var(--weight-size) * 1.55);
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    transition: transform var(--dur-fast, 150ms) var(--ease-out, ease-out);
    filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.35));
  }

  :host(:hover) {
    transform: translateY(-2px) rotate(-1.5deg);
    filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.45));
  }

  :host([dragging]) {
    cursor: grabbing;
    transform: scale(1.06);
    filter: drop-shadow(0 12px 16px rgb(0 0 0 / 0.55));
    z-index: 100;
  }

  :host([attached]) {
    cursor: pointer;
  }

  :host([type="mystery"]) {
    --weight-body: var(--mystery-color, #b94e4e);
    --weight-body-light: color-mix(in srgb, var(--mystery-color, #b94e4e) 70%, white);
    --weight-body-dark: color-mix(in srgb, var(--mystery-color, #b94e4e) 70%, black);
    --weight-edge: color-mix(in srgb, var(--mystery-color, #b94e4e) 50%, black);
  }

  .body {
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 5 3;
    opacity: 0;
    transition: opacity var(--dur-fast, 150ms);
  }

  :host(:focus-visible) {
    outline: none;
  }

  :host(:focus-visible) .focus-ring {
    opacity: 1;
  }

  .label-text {
    fill: var(--weight-label-text);
    font-family: var(--font-display, 'Space Grotesk', sans-serif);
    font-weight: 800;
    font-size: 14px;
    text-anchor: middle;
    dominant-baseline: middle;
    letter-spacing: 0.02em;
  }

  :host([type="mystery"]) .label-text {
    font-size: 22px;
    font-weight: 800;
  }
</style>
<svg class="body" viewBox="0 0 60 93" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <!-- Радиальный градиент на корпусе для объёма -->
    <linearGradient id="cyl-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="var(--weight-body-dark)" />
      <stop offset="35%" stop-color="var(--weight-body)" />
      <stop offset="55%" stop-color="var(--weight-body-light)" />
      <stop offset="80%" stop-color="var(--weight-body)" />
      <stop offset="100%" stop-color="var(--weight-body-dark)" />
    </linearGradient>
    <!-- Хромированный крюк -->
    <linearGradient id="hook-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#9aa3b0" />
      <stop offset="40%" stop-color="#dde2e8" />
      <stop offset="60%" stop-color="#dde2e8" />
      <stop offset="100%" stop-color="#9aa3b0" />
    </linearGradient>
    <!-- Тень под наклейкой -->
    <filter id="label-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="0.5" stdDeviation="0.4" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Верхний крючок (хромированный, S-образный) -->
  <path
    d="M 30 2 Q 25 2 25 7 Q 25 12 30 12 Q 35 12 35 17 L 35 22"
    stroke="url(#hook-grad)"
    stroke-width="2.4"
    fill="none"
    stroke-linecap="round"
  />
  <!-- Тёмный обод-фланец сверху (где крюк входит в груз) -->
  <ellipse cx="30" cy="22" rx="18" ry="3.5" fill="var(--weight-edge)" />
  <ellipse cx="30" cy="21" rx="17" ry="2.5" fill="var(--weight-body-light)" />

  <!-- Корпус-цилиндр -->
  <rect x="12" y="22" width="36" height="50" fill="url(#cyl-grad)" />
  <!-- Боковая риска / поясок (декор как у реального груза) -->
  <line x1="12" y1="33" x2="48" y2="33" stroke="var(--weight-edge)" stroke-width="0.5" opacity="0.4" />
  <line x1="12" y1="61" x2="48" y2="61" stroke="var(--weight-edge)" stroke-width="0.5" opacity="0.4" />

  <!-- Белая наклейка с массой -->
  <rect
    x="13" y="38" width="34" height="18" rx="2"
    fill="var(--weight-label-bg)"
    stroke="var(--weight-edge)"
    stroke-width="0.3"
    filter="url(#label-shadow)"
  />
  <text class="label-text" x="30" y="48"><slot></slot></text>

  <!-- Тёмный обод-фланец снизу -->
  <ellipse cx="30" cy="72" rx="18" ry="3.5" fill="var(--weight-edge)" />
  <ellipse cx="30" cy="73" rx="17" ry="2.5" fill="var(--weight-body-dark)" />

  <!-- Нижняя петля (для соединения в цепочку) — хромированное кольцо -->
  <path
    d="M 30 75 L 30 79"
    stroke="url(#hook-grad)" stroke-width="2.4" stroke-linecap="round"
  />
  <ellipse
    cx="30" cy="84" rx="4" ry="4"
    fill="none"
    stroke="url(#hook-grad)"
    stroke-width="2"
  />

  <!-- Focus ring -->
  <rect class="focus-ring" x="2" y="2" width="56" height="89" rx="8" />
</svg>
`;

export class LabWeight extends HTMLElement {
  static observedAttributes = ['mass', 'type', 'color'];

  #svgLabel: SVGTextElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.#svgLabel = shadow.querySelector('.label-text')!;
  }

  connectedCallback(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
    if (this.tabIndex < 0) this.tabIndex = 0;
    this.#updateLabel();
    this.#updateColor();
  }

  attributeChangedCallback(name: string): void {
    if (name === 'mass' || name === 'type') this.#updateLabel();
    if (name === 'color' || name === 'type') this.#updateColor();
  }

  /** Y верхнего крюка в host (где элемент цепляется за петлю предыдущего). */
  getTopHookY(): number {
    // SVG vbox 60×93, верхний крюк в (30, 4) → y_host = 4 * host.h / 93
    const rect = this.getBoundingClientRect();
    return (4 / 93) * rect.height;
  }

  /** Y нижней петли в host (где цепляется следующий элемент в цепочке). */
  getWeightHookY(): number {
    // Нижняя петля в (30, 88) → y_host = 88 * host.h / 93
    const rect = this.getBoundingClientRect();
    return (88 / 93) * rect.height;
  }

  get mass(): number {
    return Number(this.getAttribute('mass') ?? 0);
  }

  get type(): string {
    return this.getAttribute('type') ?? 'standard';
  }

  #updateLabel(): void {
    if (this.type === 'mystery') {
      this.#svgLabel.textContent = '?';
    } else {
      this.#svgLabel.textContent = `${this.mass} г`;
    }
    this.setAttribute(
      'aria-label',
      this.type === 'mystery'
        ? 'Груз неизвестной массы, нажмите Enter чтобы взять'
        : `Груз ${this.mass} грамм, нажмите Enter чтобы взять`,
    );
  }

  #updateColor(): void {
    const color = this.getAttribute('color');
    if (color) this.style.setProperty('--mystery-color', color);
  }
}

customElements.define('lab-weight', LabWeight);
