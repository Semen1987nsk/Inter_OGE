/**
 * <lab-equipment-card title="Линза" status="available">
 *   <slot></slot>
 * </lab-equipment-card>
 *
 * Компактная карточка оборудования в правой панели — в стиле готовых
 * опытов из kit2: тёмная карточка с тонкой рамкой, миниатюра оборудования
 * сверху, название посередине, подпись «В комплекте», кнопка «Перетащите на
 * установку» снизу.
 *
 * Атрибуты:
 *   title         — название (например "Линза")
 *   status        — "available" | "in-use" | "disabled"
 *   compact       — добавляет более плотный layout
 *
 * Слоты:
 *   default       — миниатюра оборудования
 */

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    --card-bg: #0f1f3a;
    --card-bg-hover: #14263f;
    --card-border: rgb(255 255 255 / 0.08);
    --card-border-active: rgb(56 189 175 / 0.5);
    --card-accent: #7de5dd;

    display: block;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg, 12px);
    padding: 8px;
    transition:
      border-color var(--dur-fast, 150ms) var(--ease-out),
      background var(--dur-fast, 150ms) var(--ease-out),
      transform var(--dur-fast, 150ms) var(--ease-out);
    position: relative;
  }

  :host(:hover:not([status="disabled"])) {
    background: var(--card-bg-hover);
    border-color: var(--card-border-active);
    transform: translateY(-1px);
  }

  :host([status="in-use"]) {
    opacity: 0.55;
  }

  :host([status="disabled"]) {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .thumb {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    min-height: 56px;
    padding: 0;
  }

  .meta {
    margin-top: 4px;
    text-align: center;
  }

  .title {
    font-family: var(--font-display, sans-serif);
    font-size: 12px;
    font-weight: 700;
    color: var(--color-text-primary, #e0e1dd);
    line-height: 1.2;
    margin-bottom: 1px;
  }

  .status {
    font-family: var(--font-display, sans-serif);
    font-size: 10px;
    color: var(--color-text-muted, #8a93a0);
    font-style: italic;
  }

  :host([status="in-use"]) .status {
    color: var(--card-accent);
    font-style: normal;
    font-weight: 600;
  }

  /* Кнопка-«пилюля»: компактная, появляется на hover */
  .action {
    width: 100%;
    margin-top: 4px;
    padding: 3px 6px;
    background: rgb(56 189 175 / 0.12);
    border: 1px solid rgb(56 189 175 / 0.4);
    border-radius: var(--radius-md, 8px);
    font-family: var(--font-display, sans-serif);
    font-size: 10px;
    color: var(--card-accent);
    cursor: pointer;
    transition:
      background var(--dur-fast, 150ms) var(--ease-out),
      border-color var(--dur-fast, 150ms) var(--ease-out),
      opacity var(--dur-fast, 150ms) var(--ease-out);
    min-height: 22px;
    line-height: 1.1;
    /* opacity < 1 смешивает текст с bg и роняет color-contrast (WCAG 1.4.3).
       Используем полную непрозрачность; визуальная «тихость» — через border-opacity. */
  }

  :host(:not(:hover)) .action:not(:focus-visible) {
    border-color: rgb(125 229 221 / 0.25);
    background: rgb(56 189 175 / 0.06);
  }

  :host(:hover) .action,
  .action:focus-visible {
    opacity: 1;
  }

  .action:hover:not(:disabled) {
    background: rgb(56 189 175 / 0.22);
    border-color: var(--card-accent);
  }

  .action:focus-visible {
    outline: 2px solid var(--color-brand-orange, #ffbe0b);
    outline-offset: 2px;
  }

  .action:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
<div class="thumb"><slot></slot></div>
<div class="meta">
  <div class="title"></div>
  <div class="status">В комплекте</div>
</div>
<button class="action" type="button">Перетащите на установку</button>
`;

export class LabEquipmentCard extends HTMLElement {
  static observedAttributes = ['title', 'status'];

  #titleEl: HTMLDivElement;
  #statusEl: HTMLDivElement;
  #actionBtn: HTMLButtonElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.#titleEl = shadow.querySelector('.title')!;
    this.#statusEl = shadow.querySelector('.status')!;
    this.#actionBtn = shadow.querySelector('.action')!;

    this.#actionBtn.addEventListener('click', () => {
      if (this.getAttribute('status') === 'in-use') return;
      this.dispatchEvent(
        new CustomEvent('equipment-pick', {
          bubbles: true,
          composed: true,
          detail: { title: this.getAttribute('title') ?? '' },
        }),
      );
    });
  }

  connectedCallback(): void {
    this.#update();
  }

  attributeChangedCallback(): void {
    this.#update();
  }

  #update(): void {
    const title = this.getAttribute('title') ?? '';
    const status = this.getAttribute('status') ?? 'available';
    this.#titleEl.textContent = title;
    if (status === 'in-use') {
      this.#statusEl.textContent = 'На установке';
      this.#actionBtn.textContent = 'Установлено';
      this.#actionBtn.disabled = true;
    } else if (status === 'disabled') {
      this.#statusEl.textContent = 'Недоступно';
      this.#actionBtn.textContent = '—';
      this.#actionBtn.disabled = true;
    } else {
      this.#statusEl.textContent = 'В комплекте';
      this.#actionBtn.textContent = 'Перетащить →';
      this.#actionBtn.disabled = false;
    }
  }
}

customElements.define('lab-equipment-card', LabEquipmentCard);
