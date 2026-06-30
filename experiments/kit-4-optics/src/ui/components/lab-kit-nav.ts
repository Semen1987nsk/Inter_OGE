/**
 * <lab-kit-nav> — нижний навигационный бар комплекта (PhET-style).
 *
 * Показывает иконки-кнопки для каждого экрана комплекта. Активная кнопка
 * подсвечена бренд-цветом. Справа — кнопка «домой к комплектам».
 *
 * Атрибуты:
 *   active="<screenId>" — id текущего активного экрана.
 *
 * События:
 *   screen-select { detail: { id: ScreenId } } — клик по кнопке экрана.
 *   home-click — клик по кнопке «домой».
 *
 * API:
 *   setScreens(screens) — задать список кнопок (вызывается из main.ts).
 *
 * Лучшие практики:
 *   - Bottom-fixed на мобильных (большой палец удобен), inline на desktop.
 *   - aria-current на активной кнопке для скринридера.
 *   - Минимум 44x44 px для touch (Apple HIG).
 */

import type { ScreenMeta } from '../../shell/IScreen';

const ICONS = {
  spring: `
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M16 4 L16 7" />
      <path d="M10 9 L22 11 L10 13 L22 15 L10 17 L22 19 L10 21 L22 23" />
      <path d="M16 25 L16 28" />
    </svg>`,
  force: `
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M6 16 L26 16" />
      <path d="M21 11 L26 16 L21 21" />
      <circle cx="6" cy="16" r="2" fill="currentColor" />
    </svg>`,
  friction: `
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="8" y="11" width="12" height="8" rx="1" />
      <line x1="4" y1="22" x2="28" y2="22" />
      <line x1="4" y1="22" x2="6" y2="25" />
      <line x1="9" y1="22" x2="11" y2="25" />
      <line x1="14" y1="22" x2="16" y2="25" />
      <line x1="19" y1="22" x2="21" y2="25" />
      <line x1="24" y1="22" x2="26" y2="25" />
      <path d="M20 15 L26 15" />
      <path d="M24 12 L26 15 L24 18" />
    </svg>`,
  work: `
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <!-- Оси F (вертикаль) и Δl (горизонталь) -->
      <path d="M6 26 L6 6" />
      <path d="M6 26 L28 26" />
      <!-- Прямая F = k·Δl -->
      <path d="M6 26 L24 8" />
      <!-- Закрашенный треугольник (площадь = работа) -->
      <path d="M6 26 L24 26 L24 8 Z" fill="currentColor" fill-opacity="0.32" stroke="none" />
      <!-- Метка W -->
      <text x="13" y="22" font-size="9" font-weight="700" fill="currentColor" stroke="none"
            font-family="ui-sans-serif, system-ui">W</text>
    </svg>`,
  gauge: `
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="16" cy="18" r="10" />
      <path d="M8 18 A8 8 0 0 1 24 18" />
      <line x1="16" y1="18" x2="16" y2="10" />
      <line x1="16" y1="18" x2="22" y2="14" stroke-width="1.5" />
    </svg>`,
  iv: `
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 28 L4 4" />
      <path d="M4 28 L28 28" />
      <path d="M4 28 L22 8" stroke-dasharray="3 2" />
    </svg>`,
  wire: `
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 16 L10 16" />
      <rect x="10" y="12" width="12" height="8" rx="2" />
      <path d="M22 16 L28 16" />
    </svg>`,
  link: `
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 16 L28 16" />
      <rect x="6" y="12" width="6" height="8" rx="1" />
      <rect x="20" y="12" width="6" height="8" rx="1" />
    </svg>`,
  lens: `
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <ellipse cx="16" cy="16" rx="5" ry="12" />
      <line x1="4" y1="16" x2="28" y2="16" stroke-dasharray="3 2" />
      <line x1="4" y1="4" x2="4" y2="28" />
      <line x1="28" y1="4" x2="28" y2="28" stroke-dasharray="3 2" />
    </svg>`,
  prism: `
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M16 4 L28 26 L4 26 Z" />
      <line x1="4" y1="16" x2="16" y2="4" stroke-dasharray="3 2" opacity="0.5" />
    </svg>`,
  home: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 12 L12 3 L21 12" />
      <path d="M5 10 L5 21 L19 21 L19 10" />
    </svg>`,
} as const;

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    position: relative;
    width: 100%;
    background: var(--color-surface-elevated, #1a1f2e);
    border-top: 1px solid var(--color-border, rgb(255 255 255 / 0.08));
    box-shadow: 0 -4px 16px rgb(0 0 0 / 0.25);
    z-index: 100;
    /* Безопасная зона для устройств с notch / home-indicator */
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 5px 14px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .screens {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .screens::-webkit-scrollbar { height: 3px; }
  .screens::-webkit-scrollbar-thumb {
    background: rgb(255 255 255 / 0.15);
    border-radius: 2px;
  }

  button {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    border: 1.5px solid transparent;
    border-radius: 10px;
    padding: 3px 10px 4px;
    cursor: pointer;
    color: var(--color-text-secondary, #a8b3c7);
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 10px;
    font-weight: 600;
    line-height: 1.1;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    min-width: 68px;
    min-height: 44px;
    transition:
      background-color var(--dur-fast, 160ms) var(--ease-out, ease-out),
      color var(--dur-fast, 160ms) var(--ease-out, ease-out),
      border-color var(--dur-fast, 160ms) var(--ease-out, ease-out);
  }

  button:hover {
    background: rgb(255 255 255 / 0.04);
    color: var(--color-text-primary, #e8eef9);
  }

  button:focus-visible {
    outline: none;
    border-color: var(--color-brand-orange, #ffbe0b);
  }

  button[aria-current='true'] {
    background: var(--color-brand-teal-50, rgb(20 184 166 / 0.16));
    color: var(--color-brand-teal, #14b8a6);
  }

  button[aria-current='true'] svg { stroke: var(--color-brand-teal, #14b8a6); }

  button .icon-wrap {
    display: inline-flex;
    width: 22px;
    height: 22px;
    align-items: center;
    justify-content: center;
  }

  button svg {
    width: 20px;
    height: 20px;
  }

  button .kicker {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.03em;
    color: var(--color-brand-orange, #ffbe0b);
    margin-bottom: -1px;
    line-height: 1;
  }

  button[aria-current='true'] .kicker {
    color: var(--color-brand-teal, #14b8a6);
  }

  button .label {
    font-size: 10px;
    text-align: center;
    max-width: 80px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.1;
  }

  .home-btn {
    flex-shrink: 0;
    border-left: 1px solid var(--color-border, rgb(255 255 255 / 0.08));
    margin-left: 4px;
    padding-left: 12px;
    min-width: 56px;
  }

  .home-btn .kicker { display: none; }

  @media (max-width: 720px) {
    button .label { display: none; }
    button { min-width: 50px; padding: 4px 6px; }
  }
</style>

<nav class="nav" role="tablist" aria-label="Опыты комплекта">
  <div class="screens" role="presentation"></div>
  <button class="home-btn" type="button" data-action="home" aria-label="К списку комплектов" title="К списку комплектов">
    <span class="icon-wrap">${ICONS.home}</span>
    <span class="label">К комплектам</span>
  </button>
</nav>
`;

interface ScreenButton {
  id: string;
  meta: ScreenMeta;
  el: HTMLButtonElement;
}

export class LabKitNav extends HTMLElement {
  static observedAttributes = ['active'];

  #shadow: ShadowRoot;
  #screens: HTMLElement;
  #buttons: ScreenButton[] = [];

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.appendChild(template.content.cloneNode(true));
    this.#screens = this.#shadow.querySelector('.screens')!;
    this.#shadow.addEventListener('click', this.#handleClick);
  }

  attributeChangedCallback(name: string): void {
    if (name === 'active') this.#applyActive();
  }

  /** Установить список экранов (вызывается из main.ts). */
  setScreens(screens: ReadonlyArray<ScreenMeta>): void {
    this.#screens.replaceChildren();
    this.#buttons = screens.map((meta) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset['screenId'] = meta.id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', 'screen-content');
      btn.title = meta.tooltip;
      btn.innerHTML = `
        <span class="kicker">${meta.kicker}</span>
        <span class="icon-wrap">${ICONS[meta.icon]}</span>
        <span class="label">${meta.label}</span>
      `;
      this.#screens.appendChild(btn);
      return { id: meta.id, meta, el: btn };
    });
    this.#applyActive();
  }

  #applyActive(): void {
    const active = this.getAttribute('active');
    for (const b of this.#buttons) {
      const isActive = b.id === active;
      b.el.setAttribute('aria-current', isActive ? 'true' : 'false');
      b.el.tabIndex = isActive ? 0 : -1;
    }
  }

  #handleClick = (ev: Event): void => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn) return;
    if (btn.dataset['action'] === 'home') {
      this.dispatchEvent(new CustomEvent('home-click', { bubbles: true, composed: true }));
      return;
    }
    const id = btn.dataset['screenId'];
    if (!id) return;
    this.dispatchEvent(
      new CustomEvent('screen-select', {
        detail: { id },
        bubbles: true,
        composed: true,
      }),
    );
  };
}

customElements.define('lab-kit-nav', LabKitNav);
