/**
 * <lab-checkbox-preview label="..." preview="vector|dashed-line">
 *
 * Чекбокс с миниатюрным превью того, что он включает (по PhET).
 * Слева — нативный input checkbox, центр — лейбл, справа — иконка-превью.
 */

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
  }

  label {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--space-3, 12px);
    align-items: center;
    padding: var(--space-2, 8px) var(--space-3, 12px);
    border-radius: var(--radius-md, 8px);
    cursor: pointer;
    transition: background var(--dur-fast, 150ms) var(--ease-out, ease-out);
    min-height: 44px;
  }

  label:hover {
    background: rgba(255,255,255,0.05);
  }

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    accent-color: var(--color-brand-blue, #3A86FF);
    cursor: pointer;
  }

  input[type="checkbox"]:focus-visible {
    outline: 2px solid var(--color-brand-orange, #FFBE0B);
    outline-offset: 2px;
  }

  .text {
    font-size: var(--text-sm, 14px);
    color: var(--color-text-secondary, #9CA3AF);
    transition: color var(--dur-fast, 150ms) var(--ease-out, ease-out);
  }

  :host([checked]) .text {
    color: var(--color-text-primary, #E0E1DD);
  }

  :host([checked]) label {
    background: rgba(58,134,255,0.1);
  }

  .preview {
    display: inline-block;
    width: 32px;
    height: 16px;
    flex-shrink: 0;
  }
</style>
<label part="label">
  <input type="checkbox" part="checkbox" />
  <span class="text" part="text">
    <slot></slot>
  </span>
  <span class="preview" part="preview" aria-hidden="true">
    <slot name="preview"></slot>
  </span>
</label>
`;

export class LabCheckboxPreview extends HTMLElement {
  static observedAttributes = ['checked', 'disabled'];

  #checkbox: HTMLInputElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.#checkbox = shadow.querySelector('input')!;

    this.#checkbox.addEventListener('change', () => {
      if (this.#checkbox.checked) this.setAttribute('checked', '');
      else this.removeAttribute('checked');
      this.dispatchEvent(
        new CustomEvent<{ checked: boolean }>('change', {
          detail: { checked: this.#checkbox.checked },
          bubbles: true,
        }),
      );
    });
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (name === 'checked') {
      this.#checkbox.checked = newValue !== null;
    }
    if (name === 'disabled') {
      this.#checkbox.disabled = newValue !== null;
    }
  }

  get checked(): boolean {
    return this.#checkbox.checked;
  }

  set checked(value: boolean) {
    this.#checkbox.checked = value;
    if (value) this.setAttribute('checked', '');
    else this.removeAttribute('checked');
  }
}

customElements.define('lab-checkbox-preview', LabCheckboxPreview);
