/**
 * <lab-kit-header> — верхний хедер комплекта.
 *
 * Три зоны (по research §2):
 *   left   — breadcrumb-link «← Все комплекты» + ниже kit-label.
 *   center — название текущего опыта (динамическое из атрибутов).
 *   right  — спецификация ФИПИ.
 *
 * События: home-click — клик по breadcrumb-link «← Все комплекты».
 *
 * Атрибуты:
 *   experiment="<title>" — название текущего опыта (центр).
 *   experiment-kicker="<id>" — нумерация задачи (например, «Опыт 2.1»).
 *   home-href="<url>" — необязательный, ставится на <a> для прогрессивного
 *                       enhancement (открыть в новой вкладке через middle-click).
 *                       Сам клик всё равно перехватывается событием.
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

  .breadcrumb {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-secondary, #a8b3c7);
    text-decoration: none;
    background: transparent;
    border: 0;
    padding: 4px 8px;
    margin-left: -8px; /* визуально выравниваем по краю текста, не padding */
    border-radius: 6px;
    cursor: pointer;
    transition:
      color var(--dur-fast, 160ms) var(--ease-out, ease-out),
      background-color var(--dur-fast, 160ms) var(--ease-out, ease-out);
  }
  .breadcrumb:hover {
    color: var(--color-text-primary, #e8eef9);
    background: rgb(255 255 255 / 0.04);
  }
  .breadcrumb:focus-visible {
    outline: 2px solid var(--color-brand-orange, #ffbe0b);
    outline-offset: 2px;
  }
  .breadcrumb .arrow {
    display: inline-block;
    width: 14px;
    text-align: center;
    line-height: 1;
  }

  .kit-label {
    margin-top: 2px;
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 11px;
    color: var(--color-text-muted, #6b7280);
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
    .right { display: none; }
    .row { grid-template-columns: auto 1fr; padding: 8px 12px; gap: 10px; }
    .kit-label { display: none; }
    .breadcrumb { font-size: 12px; padding: 4px 6px; margin-left: -6px; }
    .exp-title { font-size: 15px; }
  }
</style>
<div class="row">
  <div class="left">
    <a class="breadcrumb" href="#" id="home-link" role="link" aria-label="Назад ко всем комплектам">
      <span class="arrow" aria-hidden="true">←</span>
      <span>Все комплекты</span>
    </a>
    <div class="kit-label">Комплект №1 · Гидростатика</div>
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
  static observedAttributes = ['experiment', 'experiment-kicker', 'home-href'];

  #shadow: ShadowRoot;
  #titleEl: HTMLElement;
  #kickerEl: HTMLElement;
  #homeLink: HTMLAnchorElement;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.appendChild(template.content.cloneNode(true));
    this.#titleEl = this.#shadow.getElementById('title')!;
    this.#kickerEl = this.#shadow.getElementById('kicker')!;
    this.#homeLink = this.#shadow.getElementById('home-link') as HTMLAnchorElement;
    this.#homeLink.addEventListener('click', this.#handleHomeClick);
  }

  attributeChangedCallback(name: string): void {
    if (name === 'experiment') this.#titleEl.textContent = this.getAttribute('experiment') ?? '';
    else if (name === 'experiment-kicker')
      this.#kickerEl.textContent = this.getAttribute('experiment-kicker') ?? '';
    else if (name === 'home-href') {
      const href = this.getAttribute('home-href');
      if (href) this.#homeLink.setAttribute('href', href);
      else this.#homeLink.setAttribute('href', '#');
    }
  }

  #handleHomeClick = (ev: MouseEvent): void => {
    // Не перехватываем middle-click / Ctrl-click / Cmd-click — пусть браузер
    // открывает в новой вкладке по home-href, если он задан.
    if (ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    this.dispatchEvent(new CustomEvent('home-click', { bubbles: true, composed: true }));
  };
}

customElements.define('lab-kit-header', LabKitHeader);
