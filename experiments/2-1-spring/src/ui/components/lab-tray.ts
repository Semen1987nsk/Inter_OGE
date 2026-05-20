/**
 * <lab-tray title="Комплект №2: Силы и пружины">
 *
 * Виртуальный лоток с оборудованием в стиле физического кейса ЛАБОСФЕРА:
 * тёмная пластиковая подставка с группами-ячейками, заголовок-маркировка,
 * лёгкая внутренняя тень. Внутри — оборудование (lab-weight, lab-spring-board,
 * lab-dynamometer и т.д.), сгруппированное через named slots.
 *
 * Slots:
 *   springs       — два планшета с пружинами
 *   dynamometers  — два динамометра
 *   weights       — готовые грузы 100 г и наборный
 *   accessories   — прочее (брусок, линейка и т.д.) — disabled в опыте 2.1
 *
 * Использование:
 *   <lab-tray>
 *     <lab-spring-board slot="springs" spring-id="k50"></lab-spring-board>
 *     <lab-weight slot="weights" mass="100">100</lab-weight>
 *     ...
 *   </lab-tray>
 */

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    --tray-bg: #16181d;
    --tray-bg-edge: #0a0b0e;
    --tray-rim: #2c2f36;
    --tray-cell-bg: rgb(255 255 255 / 0.025);
    --tray-cell-border: rgb(255 255 255 / 0.06);
    --tray-label: var(--color-text-secondary, #b8c0cc);

    display: block;
    background: linear-gradient(180deg, var(--tray-bg) 0%, var(--tray-bg-edge) 100%);
    border: 1px solid var(--tray-rim);
    border-top-color: rgb(255 255 255 / 0.05);
    border-radius: var(--radius-lg, 12px);
    box-shadow:
      inset 0 2px 6px rgb(0 0 0 / 0.6),
      inset 0 -1px 0 rgb(255 255 255 / 0.04),
      0 8px 20px rgb(0 0 0 / 0.45);
    padding: var(--space-4, 16px) var(--space-4, 16px) var(--space-4, 16px);
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-4, 16px);
    margin-bottom: var(--space-4, 16px);
    padding: 0 var(--space-2, 8px);
    border-bottom: 1px dashed rgb(255 255 255 / 0.08);
    padding-bottom: var(--space-2, 8px);
  }

  .header-title {
    font-family: var(--font-display, sans-serif);
    font-weight: 600;
    font-size: var(--text-sm, 14px);
    color: var(--color-text-primary, #e0e1dd);
    letter-spacing: 0.02em;
  }

  .header-spec {
    font-family: var(--font-mono, monospace);
    font-size: var(--text-xs, 12px);
    color: var(--color-text-muted, #8a93a0);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .grid {
    display: grid;
    grid-template-columns:
      minmax(160px, 1.4fr)
      minmax(140px, 1fr)
      minmax(220px, 2fr)
      minmax(120px, 1fr);
    gap: var(--space-4, 16px);
    align-items: stretch;
  }

  .cell {
    background: var(--tray-cell-bg);
    border: 1px solid var(--tray-cell-border);
    border-radius: var(--radius-md, 8px);
    padding: var(--space-4, 16px) var(--space-2, 8px) var(--space-2, 8px);
    display: flex;
    flex-direction: column;
    gap: var(--space-2, 8px);
    position: relative;
    min-height: 220px;
  }

  .cell-label {
    font-family: var(--font-display, sans-serif);
    font-size: var(--text-xs, 12px);
    font-weight: 600;
    color: var(--tray-label);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 2px;
  }

  .cell-content {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: center;
    gap: var(--space-4, 16px);
  }

  /* Планшеты пружин в лотке — компактнее, чем на сцене */
  .cell-content[data-cell="springs"] ::slotted(*) {
    --board-w: 84px;
    --board-h: 200px;
  }

  /* Динамометры — компактнее в лотке, чем на сцене */
  .cell-content[data-cell="dynamometers"] ::slotted(*) {
    --dyno-w: 70px;
    --dyno-h: 220px;
  }

  /* Грузы среднего размера */
  .cell-content[data-cell="weights"] ::slotted(*) {
    --weight-size: 52px;
  }

  /* Аксессуары — затенены, недоступны */
  .cell-content[data-cell="accessories"] {
    opacity: 0.45;
    filter: grayscale(0.4);
  }

  .cell-content[data-cell="accessories"]::after {
    content: 'Для других опытов';
    position: absolute;
    bottom: var(--space-2, 8px);
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--font-display, sans-serif);
    font-size: 10px;
    color: var(--color-text-muted, #8a93a0);
    font-style: italic;
    pointer-events: none;
  }

  @media (max-width: 1024px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 600px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>

<header class="header">
  <span class="header-title"><slot name="title">Комплект №2 «Силы и пружины»</slot></span>
  <span class="header-spec">FIPI-комплект · ОГЭ-2026</span>
</header>

<div class="grid">
  <section class="cell">
    <div class="cell-label">Пружины на планшетах</div>
    <div class="cell-content" data-cell="springs">
      <slot name="springs"></slot>
    </div>
  </section>
  <section class="cell">
    <div class="cell-label">Динамометры</div>
    <div class="cell-content" data-cell="dynamometers">
      <slot name="dynamometers"></slot>
    </div>
  </section>
  <section class="cell">
    <div class="cell-label">Грузы</div>
    <div class="cell-content" data-cell="weights">
      <slot name="weights"></slot>
    </div>
  </section>
  <section class="cell">
    <div class="cell-label">Принадлежности</div>
    <div class="cell-content" data-cell="accessories">
      <slot name="accessories"></slot>
    </div>
  </section>
</div>
`;

export class LabTray extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'region');
    if (!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', 'Лоток оборудования комплекта №2');
    }
  }
}

customElements.define('lab-tray', LabTray);
