/**
 * CatalogSection — рендер bento-сетки 7 комплектов.
 *
 * Bento layout (правило 2):
 *   - Кит-2 flagship (span 6, 2 ряда, gold-tinted shadow)
 *   - Кит-1, Кит-7 medium (span 3, тень глубже)
 *   - Кит-3, Кит-4, Кит-5, Кит-6 compact (span 2, тень тоньше)
 *
 * Stagger entrance — каждая карточка задерживается на --i-delay (CSS).
 */

import type { Kit } from '../data/kits';
import { kitUrl } from '../lib/urls';

const LOCK_ICON_SVG = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="4" y="11" width="16" height="9" rx="2"/>
  <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
</svg>
`;

const ARROW_SVG = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M5 12h14M13 6l6 6-6 6"/>
</svg>
`;

export function mountBento(host: HTMLElement, kits: ReadonlyArray<Kit>): void {
  // Сортировка для bento-flow: flagship (Кит-2) первым, потом по приоритету
  const sorted = [...kits].sort((a, b) => {
    const order = (k: Kit) =>
      k.priority === 'flagship' ? 0 : k.priority === 'medium' ? 1 : 2;
    return order(a) - order(b) || a.num - b.num;
  });

  host.replaceChildren();
  sorted.forEach((kit, i) => {
    const card = renderKitCard(kit, i);
    host.appendChild(card);
  });
}

function renderKitCard(kit: Kit, index: number): HTMLElement {
  const isReady = kit.status === 'ready';
  const tag = isReady ? 'a' : 'div';
  const card = document.createElement(tag) as HTMLElement & { href?: string };
  card.className = 'kit-card';
  card.setAttribute('role', 'listitem');
  card.dataset['priority'] = kit.priority;
  card.dataset['status'] = kit.status;
  card.dataset['kitNum'] = String(kit.num);
  card.style.setProperty('--i', String(index));

  if (isReady && card instanceof HTMLAnchorElement) {
    card.href = kitUrl(kit.slug);
    card.setAttribute('aria-label',
      `Открыть комплект №${kit.num} ${kit.title}, ${kit.progress.done} из ${kit.progress.total} опытов готово`,
    );
  } else {
    card.setAttribute('aria-label',
      `Комплект №${kit.num} ${kit.title}, в разработке, ожидается ${kit.eta ?? 'позднее'}`,
    );
    card.setAttribute('aria-disabled', 'true');
    card.setAttribute('tabindex', '0');
    card.addEventListener('click', () => playLockedFeedback(card));
    card.addEventListener('keydown', (e) => {
      const ev = e as KeyboardEvent;
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        playLockedFeedback(card);
      }
    });
  }

  // Список опытов — только для flagship (для остальных — summary)
  const experimentsHtml =
    kit.priority === 'flagship'
      ? `<ul class="kit-card-experiments">
          ${kit.experiments
            .map((e) => `<li><span>${escapeHtml(`${e.id} · ${e.title}`)}</span></li>`)
            .join('')}
        </ul>`
      : '';

  // Lock-overlay для planned (status-aware shimmer)
  const lockHtml = !isReady
    ? `<div class="kit-lock" aria-hidden="true">${LOCK_ICON_SVG}</div>`
    : '';

  // CTA в карточке
  const ctaHtml = isReady
    ? `<span class="kit-card-cta">
         <span>Открыть комплект</span>
         <span class="kit-card-cta-arrow">${ARROW_SVG}</span>
       </span>`
    : `<span class="kit-card-cta" data-disabled style="opacity:0.5;cursor:not-allowed">
         <span>Скоро · ${escapeHtml(kit.eta ?? '—')}</span>
       </span>`;

  // Числовой scrubber для прогресса
  const progressLabel = isReady
    ? `${kit.progress.done} / ${kit.progress.total} опытов`
    : `Скоро · ${kit.progress.total} опытов`;

  card.innerHTML = `
    <div class="kit-card-bg" aria-hidden="true"></div>
    <div class="kit-card-photo-wrap" aria-hidden="true">
      <img class="kit-card-photo" src="/photos/${kit.photo}" alt="" loading="lazy" />
    </div>
    <div class="kit-card-corners" aria-hidden="true"></div>
    ${lockHtml}
    <div class="kit-card-meta">
      <div class="kit-card-meta-top">
        <span class="kit-card-num">КОМПЛЕКТ № ${kit.num}</span>
        <span class="kit-card-status" data-status="${kit.status}">
          <span class="kit-card-status-dot" aria-hidden="true"></span>
          <span>${escapeHtml(progressLabel)}</span>
        </span>
      </div>
      <h3 class="kit-card-title">${escapeHtml(kit.title)}</h3>
      <p class="kit-card-subtitle">${escapeHtml(kit.summary)}</p>
      ${experimentsHtml}
      ${ctaHtml}
    </div>
  `;

  return card;
}

/**
 * Lock-feedback: при клике/Enter на planned-карточку
 * проигрываем короткое shake-движение, чтобы пользователь не подумал, что сайт сломан.
 * Анимация определена в home.css → @keyframes lock-shake.
 */
function playLockedFeedback(card: HTMLElement): void {
  if (card.dataset['shaking'] === '1') return;
  card.dataset['shaking'] = '1';
  card.classList.add('kit-card--shake');
  window.setTimeout(() => {
    card.classList.remove('kit-card--shake');
    delete card.dataset['shaking'];
  }, 480);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
