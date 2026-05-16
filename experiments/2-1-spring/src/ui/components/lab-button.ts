/**
 * <lab-button variant="primary|secondary|icon-round">…</lab-button>
 *
 * Бренд-кнопка с тремя вариантами:
 *  - primary: градиент orange→blue, основные действия (CTA)
 *  - secondary: outline, второстепенные действия
 *  - icon-round: круглая иконочная (Reset All — жёлто-оранжевая)
 */

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: inline-flex;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2, 8px);
    padding: var(--space-3, 12px) var(--space-6, 24px);
    border-radius: var(--radius-md, 8px);
    font-family: var(--font-display, 'Space Grotesk', sans-serif);
    font-size: var(--text-body, 1rem);
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    transition:
      transform var(--dur-fast, 150ms) var(--ease-out, ease-out),
      box-shadow var(--dur-fast, 150ms) var(--ease-out, ease-out),
      background var(--dur-fast, 150ms) var(--ease-out, ease-out),
      opacity var(--dur-fast, 150ms) var(--ease-out, ease-out);
    min-height: 44px; /* a11y touch-target */
  }

  button:focus-visible {
    outline: 2px solid var(--color-brand-orange, #FFBE0B);
    outline-offset: 2px;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* primary */
  :host([variant="primary"]) button {
    background: var(--gradient-cta, linear-gradient(135deg, #FFBE0B 0%, #3A86FF 100%));
    color: #fff;
    box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.4));
  }

  :host([variant="primary"]) button:hover:not(:disabled) {
    box-shadow: var(--shadow-glow-blue, 0 0 24px rgba(58,134,255,0.35));
    transform: translateY(-1px);
  }

  /* secondary */
  :host([variant="secondary"]) button {
    background: transparent;
    color: var(--color-brand-blue, #3A86FF);
    border: 2px solid var(--color-brand-blue, #3A86FF);
  }

  :host([variant="secondary"]) button:hover:not(:disabled) {
    background: var(--color-brand-blue, #3A86FF);
    color: #fff;
  }

  /* icon-round (Reset All в стиле PhET) */
  :host([variant="icon-round"]) button {
    width: 56px;
    height: 56px;
    padding: 0;
    border-radius: var(--radius-pill, 9999px);
    background: var(--color-brand-orange, #FFBE0B);
    color: #1B263B;
  }

  :host([variant="icon-round"]) button:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: var(--shadow-glow-orange, 0 0 24px rgba(255,190,11,0.35));
  }

  :host([variant="icon-round"]) button:active {
    transform: scale(0.95);
  }

  ::slotted(svg) {
    width: 1.25em;
    height: 1.25em;
  }
</style>
<button part="button">
  <slot></slot>
</button>
`;

export class LabButton extends HTMLElement {
  static observedAttributes = ['disabled', 'variant', 'aria-label'];

  #button: HTMLButtonElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.#button = shadow.querySelector('button')!;
  }

  connectedCallback(): void {
    if (!this.hasAttribute('variant')) {
      this.setAttribute('variant', 'primary');
    }
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (name === 'disabled') {
      this.#button.disabled = newValue !== null;
    }
    if (name === 'aria-label' && newValue !== null) {
      this.#button.setAttribute('aria-label', newValue);
    }
  }
}

customElements.define('lab-button', LabButton);
