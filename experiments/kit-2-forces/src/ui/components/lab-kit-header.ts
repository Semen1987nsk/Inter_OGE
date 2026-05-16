/**
 * <lab-kit-header> — верхний хедер комплекта.
 *
 * Слева: бренд «ЛАБОСФЕРА», ниже мелким — название комплекта.
 * Центр: название текущего опыта (динамическое).
 * Справа: спецификация ФИПИ.
 *
 * Атрибуты:
 *   experiment="<title>" — название текущего опыта (центр).
 *   experiment-kicker="<id>" — нумерация задачи (например, «Опыт 2.1»).
 */

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    width: 100%;
    background: var(--color-surface-elevated, #1a1f2e);
    border-bottom: 1px solid var(--color-border, rgb(255 255 255 / 0.08));
  }
  .row {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 16px;
    padding: 10px 24px;
    max-width: 1400px;
    margin: 0 auto;
  }
  .left { text-align: left; }
  .center { text-align: center; }
  .right { text-align: right; }

  .brand {
    font-family: var(--font-display, system-ui, sans-serif);
    font-weight: 800;
    font-size: 14px;
    letter-spacing: 0.08em;
    color: var(--color-brand-teal, #14b8a6);
  }
  .kit-label {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 11px;
    color: var(--color-text-secondary, #a8b3c7);
    letter-spacing: 0.04em;
  }
  .exp-kicker {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 11px;
    color: var(--color-brand-orange, #ffbe0b);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .exp-title {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 17px;
    font-weight: 700;
    color: var(--color-text-primary, #e8eef9);
    margin-top: 2px;
  }
  .spec {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 11px;
    color: var(--color-text-secondary, #a8b3c7);
    letter-spacing: 0.04em;
  }
  @media (max-width: 720px) {
    .left, .right { display: none; }
    .row { grid-template-columns: 1fr; padding: 8px 16px; }
  }
</style>
<div class="row">
  <div class="left">
    <div class="brand">ЛАБОСФЕРА</div>
    <div class="kit-label">Комплект №2 · Силы (механика)</div>
  </div>
  <div class="center">
    <div class="exp-kicker" id="kicker"></div>
    <div class="exp-title" id="title"></div>
  </div>
  <div class="right">
    <div class="spec">ФИПИ ОГЭ-2026</div>
  </div>
</div>
`;

export class LabKitHeader extends HTMLElement {
  static observedAttributes = ['experiment', 'experiment-kicker'];

  #shadow: ShadowRoot;
  #titleEl: HTMLElement;
  #kickerEl: HTMLElement;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.appendChild(template.content.cloneNode(true));
    this.#titleEl = this.#shadow.getElementById('title')!;
    this.#kickerEl = this.#shadow.getElementById('kicker')!;
  }

  attributeChangedCallback(): void {
    this.#titleEl.textContent = this.getAttribute('experiment') ?? '';
    this.#kickerEl.textContent = this.getAttribute('experiment-kicker') ?? '';
  }
}

customElements.define('lab-kit-header', LabKitHeader);
