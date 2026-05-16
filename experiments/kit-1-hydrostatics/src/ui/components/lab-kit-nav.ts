/**
 * <lab-kit-nav> — горизонтальные top-tabs опытов комплекта.
 *
 * Эстетика — Linear / Stripe / Vercel: flat + accent-line, без выпуклых кнопок.
 * Высота 56px. Активный таб — gold underline 3px + лёгкий tinted bg.
 * Над навигацией — тонкая полоска прогресса по комплекту (2px teal).
 *
 * Атрибуты: active="<screenId>" (id текущего таба).
 * События: screen-select { detail: { id } }.
 * API:
 *   setScreens(metaList)  — сформировать табы.
 *   setStates(map)        — состояния { id: 'current'|'done'|'available'|'locked' }.
 *                           Если состояние таба не передано — fallback по `active`:
 *                           совпадает → 'current', иначе 'available'.
 *   setProgress(percent)  — 0..100, ширина прогресс-полоски.
 */

import type { ScreenMeta } from '../../shell/IScreen';

export type NavTabState = 'current' | 'done' | 'available' | 'locked';

const ICONS = {
  density: `
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="11" y="6" width="10" height="20" rx="1.5" />
      <path d="M16 6 L16 3" />
      <circle cx="16" cy="2" r="1.5" />
      <line x1="13" y1="10" x2="15" y2="10" />
      <line x1="13" y1="14" x2="15" y2="14" />
      <line x1="13" y1="18" x2="15" y2="18" />
      <line x1="13" y1="22" x2="15" y2="22" />
    </svg>`,
  liquid: `
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M16 4 C 22 12, 24 18, 16 26 C 8 18, 10 12, 16 4 Z" fill="currentColor" fill-opacity="0.18" />
    </svg>`,
  archimedes: `
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M8 6 L24 6 L22 26 L10 26 Z" />
      <path d="M9.4 16 L22.6 16" />
      <rect x="13" y="12" width="6" height="8" fill="currentColor" fill-opacity="0.18" />
      <path d="M16 14 L16 8" />
      <path d="M14 10 L16 8 L18 10" />
    </svg>`,
  float: `
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 18 L29 18" />
      <path d="M3 18 Q 8 16, 13 18 T 23 18 T 29 18" stroke-opacity="0.5" />
      <rect x="11" y="13" width="10" height="6" fill="currentColor" fill-opacity="0.18" />
    </svg>`,
  hydrometer: `
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="16" y1="3" x2="16" y2="20" />
      <circle cx="16" cy="24" r="4" fill="currentColor" fill-opacity="0.18" />
      <line x1="14" y1="7"  x2="16" y2="7" />
      <line x1="14" y1="11" x2="16" y2="11" />
      <line x1="14" y1="15" x2="16" y2="15" />
    </svg>`,
} as const;

const STATE_ICONS = {
  check: `
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 8.5 L6.5 12 L13 4.5" />
    </svg>`,
  lock: `
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7 V5 a2.5 2.5 0 0 1 5 0 V7" />
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
    border-bottom: 1px solid var(--color-border, rgb(255 255 255 / 0.08));
    /* высота 56px управляется содержимым: padding + line-height */
    z-index: 100;
  }

  /* Прогресс-полоска по комплекту: ambient, без цифр (research §2). */
  .kit-progress {
    position: absolute;
    top: 0;
    left: 0;
    height: 2px;
    width: var(--progress, 0%);
    background: var(--color-brand-teal, #14b8a6);
    transition: width var(--dur-base, 250ms) var(--ease-out, ease-out);
    pointer-events: none;
  }

  .nav {
    display: flex;
    align-items: stretch;
    height: 56px;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 16px;
  }

  .screens {
    display: flex;
    align-items: stretch;
    gap: 0;
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scrollbar-width: none; /* Firefox */
  }
  .screens::-webkit-scrollbar { display: none; }

  button {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    border: 0;
    border-bottom: 3px solid transparent;
    border-radius: 0;
    margin: 0;
    padding: 0 14px;
    cursor: pointer;
    color: var(--color-text-secondary, #a8b3c7);
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 13px;
    font-weight: 500;
    line-height: 1.2;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 92px;
    height: 100%;
    scroll-snap-align: start;
    flex-shrink: 0;
    transition:
      color var(--dur-fast, 160ms) var(--ease-out, ease-out),
      background-color var(--dur-fast, 160ms) var(--ease-out, ease-out),
      border-color var(--dur-fast, 160ms) var(--ease-out, ease-out);
  }
  button:focus-visible {
    outline: 2px solid var(--color-brand-orange, #ffbe0b);
    outline-offset: -3px;
  }

  .icon-wrap { display: inline-flex; width: 18px; height: 18px; align-items: center; justify-content: center; flex-shrink: 0; }
  .icon-wrap svg { width: 18px; height: 18px; }

  .kicker {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--color-brand-orange, #ffbe0b);
    line-height: 1;
  }
  .label {
    font-size: 13px;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160px;
  }
  .state-icon {
    display: inline-flex;
    width: 14px;
    height: 14px;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .state-icon svg { width: 14px; height: 14px; }

  /* ─── Состояния ─────────────────────────────────────────────── */

  /* available — нейтральный, hover poke */
  button[data-state='available']:hover {
    color: var(--color-text-primary, #e8eef9);
    background: rgb(255 255 255 / 0.03);
  }

  /* current — gold underline + tinted bg + bold */
  button[data-state='current'] {
    color: var(--color-text-primary, #e8eef9);
    font-weight: 700;
    border-bottom-color: var(--color-brand-orange, #ffbe0b);
    background: color-mix(in oklch, var(--color-brand-orange, #ffbe0b) 6%, transparent);
  }
  button[data-state='current'] .kicker {
    color: var(--color-brand-orange, #ffbe0b);
  }

  /* done — teal checkmark рядом с лейблом, нормальный вес, hover тот же */
  button[data-state='done'] {
    color: var(--color-text-secondary, #a8b3c7);
  }
  button[data-state='done'] .state-icon {
    color: var(--color-brand-teal, #14b8a6);
  }
  button[data-state='done']:hover {
    color: var(--color-text-primary, #e8eef9);
    background: rgb(255 255 255 / 0.03);
  }

  /* locked — приглушённый, замочек, курсор not-allowed */
  button[data-state='locked'] {
    color: var(--color-text-muted, #6b7280);
    cursor: not-allowed;
  }
  button[data-state='locked'] .kicker { color: var(--color-text-muted, #6b7280); }
  button[data-state='locked'] .state-icon { color: var(--color-text-muted, #6b7280); }
  button[data-state='locked']:hover { background: transparent; color: var(--color-text-muted, #6b7280); }

  /* Мобильный: тот же горизонтальный layout, но без обрезания лейблов до конца */
  @media (max-width: 900px) {
    .nav { padding: 0 8px; }
    button { min-width: 88px; padding: 0 12px; gap: 6px; }
    .label { max-width: 120px; font-size: 12px; }
  }
  @media (max-width: 720px) {
    button { min-width: 78px; padding: 0 10px; }
    .label { max-width: 96px; }
  }
</style>

<div class="kit-progress" part="kit-progress" aria-hidden="true"></div>
<nav class="nav" role="tablist" aria-label="Опыты комплекта">
  <div class="screens" role="presentation"></div>
</nav>
`;

interface ScreenButton {
  id: string;
  meta: ScreenMeta;
  el: HTMLButtonElement;
  state: NavTabState;
}

export class LabKitNav extends HTMLElement {
  static observedAttributes = ['active'];

  #shadow: ShadowRoot;
  #screens: HTMLElement;
  #progressEl: HTMLElement;
  #buttons: ScreenButton[] = [];
  #stateOverrides: Record<string, NavTabState> = {};

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.appendChild(template.content.cloneNode(true));
    this.#screens = this.#shadow.querySelector('.screens')!;
    this.#progressEl = this.#shadow.querySelector('.kit-progress')!;
    this.#shadow.addEventListener('click', this.#handleClick);
  }

  attributeChangedCallback(name: string): void {
    if (name === 'active') this.#applyStates();
  }

  setScreens(screens: ReadonlyArray<ScreenMeta>): void {
    this.#screens.replaceChildren();
    this.#buttons = screens.map((meta) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset['screenId'] = meta.id;
      btn.setAttribute('role', 'tab');
      // ARIA не пересекает shadow-boundary: aria-controls здесь бесполезен
      // (axe ругается на «invalid ARIA attribute value»). Опускаем.
      btn.title = meta.tooltip;
      btn.innerHTML = `
        <span class="kicker">${meta.kicker}</span>
        <span class="icon-wrap">${ICONS[meta.icon]}</span>
        <span class="label">${meta.label}</span>
        <span class="state-icon" aria-hidden="true"></span>
      `;
      this.#screens.appendChild(btn);
      return { id: meta.id, meta, el: btn, state: 'available' as NavTabState };
    });
    this.#applyStates();
  }

  /**
   * Обновить состояния табов. Передаются только те, у которых state отличается
   * от дефолта; неуказанные → пересчитываются по `active`-атрибуту.
   */
  setStates(map: Record<string, NavTabState>): void {
    this.#stateOverrides = { ...map };
    this.#applyStates();
  }

  /** Прогресс по комплекту, 0..100. Без цифр — только ширина полоски. */
  setProgress(percent: number): void {
    const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
    this.#progressEl.style.setProperty('--progress', `${clamped}%`);
  }

  #applyStates(): void {
    const active = this.getAttribute('active');
    for (const b of this.#buttons) {
      const override = this.#stateOverrides[b.id];
      const state: NavTabState = override ?? (b.id === active ? 'current' : 'available');
      b.state = state;
      b.el.dataset['state'] = state;

      // ARIA + tabIndex по состоянию
      if (state === 'current') {
        b.el.setAttribute('aria-current', 'page');
        b.el.removeAttribute('aria-disabled');
        b.el.tabIndex = 0;
        b.el.setAttribute('aria-label', `${b.meta.kicker} ${b.meta.label}`);
      } else if (state === 'done') {
        b.el.removeAttribute('aria-current');
        b.el.removeAttribute('aria-disabled');
        b.el.tabIndex = -1;
        b.el.setAttribute('aria-label', `${b.meta.kicker} ${b.meta.label}, выполнен`);
      } else if (state === 'locked') {
        b.el.removeAttribute('aria-current');
        b.el.setAttribute('aria-disabled', 'true');
        b.el.tabIndex = -1;
        b.el.setAttribute('aria-label', `${b.meta.kicker} ${b.meta.label}, недоступен. Завершите предыдущий опыт`);
        b.el.title = 'Завершите предыдущий опыт';
      } else {
        b.el.removeAttribute('aria-current');
        b.el.removeAttribute('aria-disabled');
        b.el.tabIndex = -1;
        b.el.setAttribute('aria-label', `${b.meta.kicker} ${b.meta.label}`);
        b.el.title = b.meta.tooltip;
      }

      // Иконка состояния (check / lock / пусто)
      const stateIconEl = b.el.querySelector('.state-icon');
      if (stateIconEl) {
        if (state === 'done') stateIconEl.innerHTML = STATE_ICONS.check;
        else if (state === 'locked') stateIconEl.innerHTML = STATE_ICONS.lock;
        else stateIconEl.innerHTML = '';
      }
    }
  }

  #handleClick = (ev: Event): void => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn) return;
    // locked-табы не эмитят select (UI consistency: курсор not-allowed)
    if (btn.dataset['state'] === 'locked') return;
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
