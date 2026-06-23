/**
 * kit-poster.ts — постер-карточка комплекта лаборатории.
 *
 * Attrs: num, status, title, meta, photo, done, total
 * CSS var: --kit-glow (цвет glow-ring при hover)
 *
 * Events:
 *   poster-activate  {bubbles, composed, detail:{num}} — status=ready click/Enter/Space
 *   poster-info      {bubbles, composed, detail:{num}} — status=planned click/Enter/Space
 *
 * 6 состояний: default / hover / focus-visible / active / planned / loading
 * Слот name=preview для Task 13 (микропревью SVG).
 */

const TAG = 'kit-poster';

// ── Цветовые константы (design system) ──────────────────────────────────────
const GRAPHITE = '#06101e';
const AMBER = '#ffbe0b';
const BRAND_BLUE = '#3a86ff';

// ── Безопасная экранировка для вставки в атрибуты/текст ────────────────────

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Шаблон Shadow DOM ────────────────────────────────────────────────────────

function buildShadowHTML(
  num: number,
  status: string,
  title: string,
  meta: string,
  photo: string,
  done: number,
  total: number,
): string {
  const isPlanned = status === 'planned';
  const isLoading = status === 'loading';

  // photo используется только в CSS background-image; одинарные кавычки экранируем
  const safePhoto = photo.replace(/'/g, '%27').replace(/[<>"]/g, '');
  const photoStyle = safePhoto ? `background-image: url('${safePhoto}');` : '';
  const stateClass = isPlanned ? 'planned' : isLoading ? 'loading' : 'ready';

  const badgeHTML = isPlanned
    ? `<span class="badge-soon" aria-hidden="true">Скоро</span>`
    : '';

  const safeTitle = esc(title);
  const safeMeta = esc(meta);
  const metaHTML = safeMeta ? `<span class="meta">${safeMeta}</span>` : '';

  // progress-ring нейтральный (data-neutral) для planned
  const ringAttrs = isPlanned ? 'data-neutral' : '';

  return `
    <style>
      :host {
        display: block;
        --_glow: var(--kit-glow, ${AMBER});
        --_radius: 12px;
        --_aspect: 3 / 4;
        position: relative;
      }

      .card {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        width: 100%;
        aspect-ratio: var(--_aspect);
        border-radius: var(--_radius);
        overflow: hidden;
        cursor: pointer;
        border: none;
        padding: 0;
        background: ${GRAPHITE} ${photoStyle};
        background-size: cover;
        background-position: center;
        text-align: left;
        outline: none;
        /* Spine accent */
        box-shadow: inset 4px 0 0 0 var(--kit-accent, ${BRAND_BLUE});
        transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
        transform-style: preserve-3d;
      }

      /* Lift shadow as ::after for opacity-only animation */
      .card::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: var(--_radius);
        box-shadow:
          0 20px 60px rgba(0,0,0,0.6),
          0 0 0 2px var(--_glow);
        opacity: 0;
        transition: opacity 250ms ease;
        pointer-events: none;
        z-index: 5;
      }

      /* Scrim gradient (bottom ~55%) */
      .scrim {
        position: absolute;
        inset: 0;
        border-radius: var(--_radius);
        background: linear-gradient(
          to top,
          rgba(6, 16, 30, 0.95) 0%,
          rgba(6, 16, 30, 0.7) 30%,
          rgba(6, 16, 30, 0.1) 55%,
          transparent 100%
        );
        pointer-events: none;
        z-index: 1;
      }

      /* Progress ring centered absolutely */
      .ring-wrap {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .num-label {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 3;
        font-family: 'JetBrains Mono', monospace;
        font-size: 2rem;
        font-weight: 700;
        color: #fff;
        letter-spacing: -0.02em;
        line-height: 1;
        pointer-events: none;
      }

      .content {
        position: relative;
        z-index: 4;
        width: 100%;
        padding: 12px 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .title {
        font-family: 'Space Grotesk', 'Inter', sans-serif;
        font-size: 1rem;
        font-weight: 600;
        color: #fff;
        margin: 0;
        line-height: 1.25;
      }

      .meta {
        font-size: 0.75rem;
        color: rgba(255,255,255,0.65);
        font-family: 'Inter', sans-serif;
      }

      /* Preview slot */
      .preview-wrap {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 3;
        width: 48px;
        height: 48px;
        pointer-events: none;
      }

      /* Badge «Скоро» */
      .badge-soon {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 999px;
        border: 1.5px solid rgba(255,255,255,0.5);
        background: transparent;
        font-size: 0.7rem;
        font-weight: 600;
        font-family: 'Inter', sans-serif;
        color: rgba(255,255,255,0.85);
        letter-spacing: 0.04em;
        text-transform: uppercase;
        margin-bottom: 2px;
      }

      /* planned state */
      :host(.planned) .card {
        filter: grayscale(1) brightness(0.6);
        cursor: default;
      }
      :host(.planned) .card::after {
        display: none;
      }

      /* loading state */
      :host(.loading) .card {
        cursor: wait;
        opacity: 0.7;
      }

      /* Hover / focus / active — motion-safe only */
      @media (prefers-reduced-motion: no-preference) {
        .card:hover,
        .card:focus-visible {
          transform: scale(1.04);
        }
        .card:hover::after,
        .card:focus-visible::after {
          opacity: 1;
        }
        .card:active {
          transform: scale(0.98);
        }
      }

      /* Focus-visible ring */
      .card:focus-visible {
        outline: 2px solid ${AMBER};
        outline-offset: 3px;
      }
    </style>

    <div
      part="card"
      class="card ${stateClass}"
      role="button"
      tabindex="0"
      style="${photoStyle}"
    >
      <div class="scrim"></div>

      <div class="ring-wrap">
        <progress-ring
          value="${done}"
          max="${total}"
          ${ringAttrs}
          style="--ring-color: ${isPlanned ? 'rgba(255,255,255,0.3)' : 'var(--kit-glow, ' + AMBER + ')'}"
        ></progress-ring>
      </div>

      <div class="num-label" aria-hidden="true">${num}</div>

      <div class="preview-wrap">
        <slot name="preview"></slot>
      </div>

      <div class="content">
        ${badgeHTML}
        <span class="title">${safeTitle}</span>
        ${metaHTML}
      </div>
    </div>
  `;
}

// ── Custom Element ───────────────────────────────────────────────────────────

class KitPoster extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['num', 'status', 'title', 'meta', 'photo', 'done', 'total'];
  }

  private _root: ShadowRoot;
  private _card: HTMLElement | null = null;
  private _handleClick: (() => void) | null = null;
  private _handleKeydown: ((e: KeyboardEvent) => void) | null = null;
  private _handleMouseenter: (() => void) | null = null;
  private _handleMouseleave: (() => void) | null = null;
  private _handleFocusin: (() => void) | null = null;
  private _handleFocusout: (() => void) | null = null;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this._render();
    this._bindEvents();
    this._syncHostClass();
    this._syncAriaLabel();
  }

  disconnectedCallback(): void {
    this._unbindEvents();
  }

  attributeChangedCallback(_name: string, _old: string | null, _next: string | null): void {
    if (this._root.innerHTML) {
      this._render();
      this._bindEvents();
      this._syncHostClass();
      this._syncAriaLabel();
    }
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  private get _num(): number {
    return parseInt(this.getAttribute('num') ?? '0', 10);
  }

  private get _status(): string {
    return this.getAttribute('status') ?? 'ready';
  }

  private get _isPlanned(): boolean {
    return this._status === 'planned';
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  private _render(): void {
    const num = this._num;
    const status = this._status;
    const title = this.getAttribute('title') ?? '';
    const meta = this.getAttribute('meta') ?? '';
    const photo = this.getAttribute('photo') ?? '';
    const done = parseInt(this.getAttribute('done') ?? '0', 10);
    const total = parseInt(this.getAttribute('total') ?? '0', 10);

    this._root.innerHTML = buildShadowHTML(num, status, title, meta, photo, done, total);
    this._card = this._root.querySelector('[part=card]') as HTMLElement | null;
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  private _unbindEvents(): void {
    if (!this._card) return;
    if (this._handleClick) this._card.removeEventListener('click', this._handleClick);
    if (this._handleKeydown) this._card.removeEventListener('keydown', this._handleKeydown);
    if (this._handleMouseenter) this._card.removeEventListener('mouseenter', this._handleMouseenter);
    if (this._handleMouseleave) this._card.removeEventListener('mouseleave', this._handleMouseleave);
    if (this._handleFocusin) this._card.removeEventListener('focusin', this._handleFocusin);
    if (this._handleFocusout) this._card.removeEventListener('focusout', this._handleFocusout);
  }

  private _bindEvents(): void {
    this._unbindEvents();
    if (!this._card) return;

    this._handleClick = () => this._activate();
    this._handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._activate();
      }
    };
    this._handleMouseenter = () => {
      if (this._card && !this._isPlanned) {
        this._card.style.willChange = 'transform';
      }
    };
    this._handleMouseleave = () => {
      if (this._card) {
        this._card.style.willChange = '';
      }
    };
    this._handleFocusin = () => {
      if (this._card && !this._isPlanned) {
        this._card.style.willChange = 'transform';
      }
    };
    this._handleFocusout = () => {
      if (this._card) {
        this._card.style.willChange = '';
      }
    };

    this._card.addEventListener('click', this._handleClick);
    this._card.addEventListener('keydown', this._handleKeydown);
    this._card.addEventListener('mouseenter', this._handleMouseenter);
    this._card.addEventListener('mouseleave', this._handleMouseleave);
    this._card.addEventListener('focusin', this._handleFocusin);
    this._card.addEventListener('focusout', this._handleFocusout);
  }

  private _activate(): void {
    const eventName = this._isPlanned ? 'poster-info' : 'poster-activate';
    this.dispatchEvent(new CustomEvent(eventName, {
      bubbles: true,
      composed: true,
      detail: { num: this._num },
    }));
  }

  // ── A11y ───────────────────────────────────────────────────────────────────

  private _syncAriaLabel(): void {
    const title = this.getAttribute('title') ?? '';
    const num = this._num;
    const label = this._isPlanned
      ? `Комплект №${num} «${title}» — недоступен, скоро`
      : `Комплект №${num} «${title}»`;
    this.setAttribute('aria-label', label);
  }

  private _syncHostClass(): void {
    this.classList.toggle('planned', this._isPlanned);
    this.classList.toggle('loading', this._status === 'loading');
  }
}

if (!customElements.get(TAG)) {
  customElements.define(TAG, KitPoster);
}
