/**
 * kit-drawer.ts — выдвижная панель со списком опытов комплекта.
 *
 * API:
 *   open(kit: Kit, role: Role, triggerEl?: Element) — открывает drawer, запоминает триггер.
 *   close()                                          — закрывает, возвращает фокус на триггер.
 *
 * Построен на нативном <dialog> в Shadow DOM (focus-trap + Esc + backdrop — бесплатно из браузера).
 * В happy-dom showModal/close могут отсутствовать → feature-detect + fallback через open-attr.
 */

import { experimentUrl } from '../lib/launch.js';
import type { Kit } from '../data/kits.js';
import type { Role } from '../lib/launch.js';

const TAG = 'kit-drawer';

// ── Утилиты ──────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Шаблон ───────────────────────────────────────────────────────────────────

/** Чистая функция рендера HTML-содержимого drawer (пригодна для тестирования). */
export function renderKitDrawerHTML(kit: Kit, role: Role): string {
  const isPlanned = kit.status === 'planned';
  const labelId = 'kd-title';
  const descId = 'kd-desc';

  const experimentItems = kit.experiments
    .map((exp, i) => {
      const fipiHTML = exp.fipiTask
        ? `<span class="fipi-badge" aria-label="Задача ФИПИ ${esc(exp.fipiTask)}">${esc(exp.fipiTask)}</span>`
        : '';
      const bonusHTML = exp.isFipi
        ? ''
        : `<span class="bonus-badge" title="${esc(exp.bonusReason ?? '')}" aria-label="Бонус ЛАБОСФЕРЫ (не входит в ФИПИ)">бонус</span>`;
      const statusDotClass = isPlanned ? 'dot dot--planned' : 'dot dot--ready';
      const statusDotLabel = isPlanned ? 'Не готов' : 'Готов';
      const launchControl = isPlanned
        ? ''
        : `<a
            class="launch-link"
            href="${esc(experimentUrl(kit, exp.id, role))}"
            aria-label="Запустить: ${esc(exp.resultVerb)}"
          >Запустить</a>`;

      // stagger delay через CSS custom property
      const staggerDelay = `--stagger-i: ${i};`;

      return `<li
          data-experiment="${esc(exp.id)}"
          class="exp-item${isPlanned ? ' exp-item--planned' : ''}"
          style="${staggerDelay}"
        >
          <span class="${statusDotClass}" aria-label="${statusDotLabel}" role="img"></span>
          <span class="exp-verb">${esc(exp.resultVerb)}</span>
          ${fipiHTML}
          ${bonusHTML}
          ${launchControl}
        </li>`;
    })
    .join('');

  const etaHTML =
    isPlanned && kit.eta
      ? `<p class="eta">Ожидаемый выход: ${esc(kit.eta)}</p>`
      : '';

  return `
    <style>
      :host { display: contents; }

      dialog {
        /* Right-docked full-height panel */
        position: fixed;
        inset: 0 0 0 auto;
        margin: 0 0 0 auto;
        width: min(460px, 100vw);
        height: 100vh;
        height: 100dvh;
        max-height: 100vh;
        max-height: 100dvh;
        border: none;
        border-radius: 16px 0 0 16px;
        padding: 0;
        background: #0d1b2a;
        color: #e8eaf0;
        overflow: hidden;
        box-shadow: -8px 0 40px rgba(0,0,0,0.55), -1px 0 0 rgba(255,255,255,0.06);
      }

      dialog::backdrop {
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
      }

      /* Slide-in from right */
      @media (prefers-reduced-motion: no-preference) {
        dialog {
          animation: drawer-slide-in 320ms cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        @keyframes drawer-slide-in {
          from {
            transform: translateX(100%);
            opacity: 0.6;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      }

      .drawer-inner {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }

      .header {
        padding: 24px 28px 16px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        flex-shrink: 0;
      }

      .eyebrow {
        font-size: 0.7rem;
        font-family: 'JetBrains Mono', monospace;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.55);
        margin: 0 0 6px;
      }

      .title {
        font-size: 1.4rem;
        font-weight: 700;
        font-family: 'Space Grotesk', 'Inter', sans-serif;
        color: #fff;
        margin: 0 0 8px;
        line-height: 1.2;
        outline: none;
      }

      .description {
        font-size: 0.875rem;
        color: rgba(255,255,255,0.6);
        margin: 0;
        line-height: 1.5;
      }

      .close-btn {
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        color: rgba(255,255,255,0.5);
        cursor: pointer;
        font-size: 1.5rem;
        line-height: 1;
        padding: 6px;
        border-radius: 6px;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 150ms;
      }

      .close-btn:hover,
      .close-btn:focus-visible {
        color: #fff;
        background: rgba(255,255,255,0.08);
      }

      .exp-list {
        list-style: none;
        padding: 16px 28px 24px;
        margin: 0;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .exp-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        border-radius: 10px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        font-size: 0.9rem;
        color: #cdd5e0;
      }

      .exp-item--planned {
        /* Mute background only — keep text color at full contrast */
        background: rgba(255,255,255,0.01);
        border-color: rgba(255,255,255,0.04);
      }

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .dot--ready { background: #22c55e; }
      .dot--planned { background: rgba(255,255,255,0.25); }

      .exp-verb {
        flex: 1;
      }

      .fipi-badge {
        font-size: 0.7rem;
        font-family: 'JetBrains Mono', monospace;
        padding: 2px 7px;
        border-radius: 999px;
        background: rgba(58, 134, 255, 0.15);
        border: 1px solid rgba(58, 134, 255, 0.35);
        color: #7eb3ff;
        flex-shrink: 0;
      }

      .bonus-badge {
        font-size: 0.7rem;
        padding: 2px 7px;
        border-radius: 999px;
        background: rgba(245, 158, 11, 0.15);
        border: 1px solid rgba(245, 158, 11, 0.4);
        color: #f4b54a;
        flex-shrink: 0;
      }

      .launch-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 44px;
        min-height: 44px;
        padding: 0 14px;
        border-radius: 8px;
        background: rgba(58, 134, 255, 0.15);
        border: 1px solid rgba(58, 134, 255, 0.35);
        /* #a0c4ff: contrast ≥4.5:1 on rgba(58,134,255,0.15) over drawer bg */
        color: #a0c4ff;
        text-decoration: none;
        font-size: 0.8rem;
        font-weight: 600;
        flex-shrink: 0;
        transition: background 150ms, color 150ms;
      }

      .launch-link:hover,
      .launch-link:focus-visible {
        background: rgba(58, 134, 255, 0.35);
        color: #fff;
      }

      .eta {
        padding: 0 28px 20px;
        margin: 0;
        font-size: 0.8rem;
        color: rgba(255,255,255,0.4);
        font-style: italic;
      }

      /* Stagger animation — skip if prefers-reduced-motion */
      @media (prefers-reduced-motion: no-preference) {
        .exp-item {
          animation: slide-in 350ms calc(var(--stagger-i) * 50ms) both;
        }

        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .exp-item--planned {
          animation: fade-in 350ms calc(var(--stagger-i) * 50ms) both;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      }
    </style>

    <dialog
      aria-labelledby="${labelId}"
      aria-describedby="${descId}"
      aria-modal="true"
    >
      <div class="drawer-inner">
        <div class="header">
          <p class="eyebrow">Комплект №${kit.num}</p>
          <h2 id="${labelId}" class="title" tabindex="-1">${esc(kit.title)}</h2>
          <p id="${descId}" class="description">${esc(kit.summary)}</p>
          <button class="close-btn" aria-label="Закрыть">&#x2715;</button>
        </div>

        <ul class="exp-list" role="list">
          ${experimentItems}
        </ul>

        ${etaHTML}
      </div>
    </dialog>
  `;
}

// ── Custom Element ────────────────────────────────────────────────────────────

class KitDrawer extends HTMLElement {
  private _root: ShadowRoot;
  private _trigger: Element | null = null;
  private _handleBackdropClick: ((e: MouseEvent) => void) | null = null;
  private _handleCloseBtn: (() => void) | null = null;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  open(kit: Kit, role: Role, triggerEl?: Element): void {
    // Remember focus return target
    this._trigger = triggerEl ?? document.activeElement;

    // Render
    this._root.innerHTML = renderKitDrawerHTML(kit, role);

    const dialog = this._root.querySelector('dialog')!;
    const closeBtn = this._root.querySelector('.close-btn') as HTMLButtonElement;

    // Backdrop click → close
    this._handleBackdropClick = (e: MouseEvent) => {
      // Click on dialog itself (not its children) = backdrop
      if (e.target === dialog) this.close();
    };
    this._handleCloseBtn = () => this.close();

    dialog.addEventListener('click', this._handleBackdropClick);
    closeBtn.addEventListener('click', this._handleCloseBtn);

    // Native Esc handling (dialog does this automatically on showModal)
    dialog.addEventListener('close', () => this._returnFocus(), { once: true });

    // Show: feature-detect for happy-dom compatibility
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }

    // Set initial focus to h2
    const h2 = this._root.querySelector('h2') as HTMLElement | null;
    h2?.focus();
  }

  close(): void {
    const dialog = this._root.querySelector('dialog');
    if (!dialog) return;

    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }

    this._returnFocus();
  }

  private _returnFocus(): void {
    if (this._trigger && typeof (this._trigger as HTMLElement).focus === 'function') {
      (this._trigger as HTMLElement).focus();
    }
    this._trigger = null;
  }
}

if (!customElements.get(TAG)) {
  customElements.define(TAG, KitDrawer);
}
