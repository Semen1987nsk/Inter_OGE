/**
 * main.ts — точка входа лаунчера ЛАБОСФЕРА v0.3 «постер-стена».
 *
 * Экспортирует renderApp(root) для тестирования и bootstrap на странице.
 */

import './styles/fonts.css';
import './styles/tokens.css';
import './styles/reset.css';
import './styles/home.css';

import './components/progress-ring';
import './components/kit-poster';
import './components/kit-drawer';
import './components/role-switch';

import { BRAND } from './data/brand';
import { KITS, totalExperiments } from './data/kits';
import type { Kit, KitCategory } from './data/kits';
import { visibleKitNums, type FilterState } from './lib/filters';
import { searchExperiments } from './lib/search';
import { resumeTarget } from './lib/resume';
import { experimentUrl, type Role } from './lib/launch';
import { GridKeyboardController } from './lib/grid-keyboard';
import { prefersReducedMotion } from './lib/reduced-motion';

// ── Category label map ────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<KitCategory | 'all', string> = {
  all: 'Все',
  mechanics: 'Механика',
  electricity: 'Электричество',
  optics: 'Оптика',
  thermal: 'Тепло',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (HTMLElement | string)[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  for (const child of children) {
    if (typeof child === 'string') e.append(child);
    else e.appendChild(child);
  }
  return e;
}

// ── Build topbar ──────────────────────────────────────────────────────────────

function buildTopbar(
  onSearch: (query: string) => void,
): HTMLElement {
  const bar = el('header', { class: 'topbar', 'data-shell': 'topbar' });

  // Wordmark
  const wordmark = el('div', { class: 'wordmark', 'aria-label': `${BRAND.company} — ${BRAND.productShort}` });
  const eyebrow = el('span', { class: 'wordmark__eyebrow' }, BRAND.company);
  const product = el('span', { class: 'wordmark__product' }, BRAND.productShort);
  wordmark.append(eyebrow, product);

  // Search
  const searchWrap = el('div', { class: 'search-wrap' });
  const searchInput = el('input', {
    type: 'search',
    role: 'searchbox',
    'aria-label': 'Поиск опытов',
    placeholder: 'Поиск опытов…',
    class: 'search-input',
  });
  searchInput.addEventListener('input', () => onSearch(searchInput.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onSearch(searchInput.value);
  });
  searchWrap.appendChild(searchInput);

  // Role switch
  const roleSwitch = document.createElement('role-switch');
  roleSwitch.setAttribute('role', 'student');

  // Action buttons (stubs)
  const btnJournal = el(
    'button',
    { class: 'topbar-btn', 'aria-label': 'Журнал', title: 'Журнал' },
    '📓',
  );
  const btnSettings = el(
    'button',
    { class: 'topbar-btn', 'aria-label': 'Настройки', title: 'Настройки' },
    '⚙',
  );

  bar.append(wordmark, searchWrap, roleSwitch, btnJournal, btnSettings);
  return bar;
}

// ── Build sidebar ─────────────────────────────────────────────────────────────

function buildSidebar(
  onFilterChange: (state: FilterState) => void,
): HTMLElement {
  const sidebar = el('aside', { class: 'sidebar', 'data-shell': 'sidebar' });
  const nav = el('nav', { 'aria-label': 'Фильтры' });

  const totals = totalExperiments(KITS);

  // Progress summary
  const progressSummary = el('div', { class: 'sidebar__progress' });
  const ring = document.createElement('progress-ring');
  ring.setAttribute('value', String(totals.done));
  ring.setAttribute('max', String(totals.total));
  const progressText = el(
    'span',
    { class: 'sidebar__progress-text' },
    `${totals.done} / ${totals.total} опытов`,
  );
  const progressA11y = el(
    'span',
    { class: 'sr-only' },
    `Прогресс: ${totals.done} из ${totals.total} опытов выполнено`,
  );
  progressSummary.append(ring, progressText, progressA11y);

  // Category filter
  const categoryFieldset = el('fieldset', { class: 'filter-fieldset' });
  const categoryLegend = el('legend', {}, 'Раздел');
  categoryFieldset.appendChild(categoryLegend);

  const categories: Array<KitCategory | 'all'> = ['all', 'mechanics', 'electricity', 'optics', 'thermal'];
  for (const cat of categories) {
    const label = el('label', { class: 'filter-radio-label' });
    const radio = el('input', {
      type: 'radio',
      name: 'category-filter',
      value: cat,
      class: 'filter-radio',
    });
    if (cat === 'all') radio.checked = true;
    const text = el('span', {}, CATEGORY_LABELS[cat]);
    label.append(radio, text);
    categoryFieldset.appendChild(label);
  }

  // Ready-only checkbox
  const readyFieldset = el('fieldset', { class: 'filter-fieldset' });
  const readyLegend = el('legend', {}, 'Статус');
  const readyLabel = el('label', { class: 'filter-checkbox-label' });
  const readyCheckbox = el('input', {
    type: 'checkbox',
    'data-filter': 'ready-only',
    class: 'filter-checkbox',
  });
  const readyText = el('span', {}, 'Только готовые');
  readyLabel.append(readyCheckbox, readyText);
  readyFieldset.append(readyLegend, readyLabel);

  // Wire filter events
  const getState = (): FilterState => {
    const selected = categoryFieldset.querySelector<HTMLInputElement>('input:checked');
    return {
      category: (selected?.value ?? 'all') as KitCategory | 'all',
      readyOnly: readyCheckbox.checked,
    };
  };

  categoryFieldset.addEventListener('change', () => onFilterChange(getState()));
  // Listen to both change and click so programmatic .click() in tests fires the handler
  readyCheckbox.addEventListener('change', () => onFilterChange(getState()));
  readyCheckbox.addEventListener('click', () => onFilterChange(getState()));

  nav.append(progressSummary, categoryFieldset, readyFieldset);
  sidebar.appendChild(nav);
  return sidebar;
}

// ── Build resume strip ────────────────────────────────────────────────────────

function buildResumeStrip(currentRole: () => Role): HTMLElement {
  const strip = el('div', { class: 'resume-strip' });

  const target = resumeTarget(KITS, {});
  const kit = KITS.find(k => k.num === target.kitNum);

  // Do not show "Продолжить" for a fully-completed kit (remaining <= 0).
  // Fresh users (isFresh=true) always get "Начать с Комплекта №1".
  if (!kit || (!target.isFresh && target.remaining <= 0)) return strip;

  const label = target.isFresh
    ? `Начать с Комплекта №${target.kitNum}`
    : `Продолжить Комплект №${target.kitNum}`;

  const btn = el(
    'a',
    {
      class: 'resume-btn',
      href: experimentUrl(kit, kit.experiments[0]?.id ?? '', currentRole()),
    },
    label,
  );

  strip.appendChild(btn);
  return strip;
}

// ── Build poster wall ─────────────────────────────────────────────────────────

function buildPosterWall(
  kits: ReadonlyArray<Kit>,
  onActivate: (kit: Kit, posterEl: Element) => void,
): { grid: HTMLElement; posters: HTMLElement[]; applyFilter: (nums: number[]) => void } {
  const grid = el('div', {
    class: 'poster-grid',
    role: 'grid',
    'aria-label': 'Комплекты ОГЭ по физике',
  });

  const posters: HTMLElement[] = [];

  for (const kit of kits) {
    const exCount = kit.experiments.length;
    const catLabel = CATEGORY_LABELS[kit.category];
    const meta = `${exCount} опытов · ${catLabel}`;

    const poster = document.createElement('kit-poster') as HTMLElement;
    poster.setAttribute('num', String(kit.num));
    poster.setAttribute('status', kit.status);
    poster.setAttribute('title', kit.title);
    poster.setAttribute('meta', meta);
    poster.setAttribute('photo', `/photos/${kit.photo}`);
    poster.setAttribute('done', String(kit.progress.done));
    poster.setAttribute('total', String(kit.progress.total));
    poster.style.setProperty('--kit-glow', kit.accent);

    poster.addEventListener('poster-activate', (e) => {
      onActivate(kit, poster);
      e.stopPropagation();
    });
    poster.addEventListener('poster-info', (e) => {
      onActivate(kit, poster);
      e.stopPropagation();
    });

    grid.appendChild(poster);
    posters.push(poster);
  }

  const applyFilter = (visibleNums: number[]): void => {
    for (const poster of posters) {
      const num = parseInt(poster.getAttribute('num') ?? '0', 10);
      if (visibleNums.includes(num)) {
        poster.removeAttribute('data-hidden');
      } else {
        poster.setAttribute('data-hidden', '');
      }
    }
  };

  return { grid, posters, applyFilter };
}

// ── Dynamic tilt ──────────────────────────────────────────────────────────────

function attachTilt(grid: HTMLElement, posters: HTMLElement[]): void {
  if (prefersReducedMotion()) return;

  grid.style.perspective = '1000px';

  for (const poster of posters) {
    let rafId = 0;

    const onMove = (e: MouseEvent): void => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const rect = poster.getBoundingClientRect();
        if (rect.width === 0) return;
        const px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const py = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        const rx = (py * 6).toFixed(2);
        const ry = (-px * 6).toFixed(2);
        poster.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
    };

    const onLeave = (): void => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      poster.style.transform = '';
    };

    poster.addEventListener('mousemove', onMove);
    poster.addEventListener('mouseleave', onLeave);
  }
}

// ── renderApp ─────────────────────────────────────────────────────────────────

export function renderApp(root: HTMLElement): void {
  let currentRole: Role = 'student';
  let filterState: FilterState = { category: 'all', readyOnly: false };

  // Drawer
  const drawer = document.createElement('kit-drawer') as unknown as HTMLElement & {
    open(kit: Kit, role: Role, triggerEl?: Element): void;
    close(): void;
  };
  document.body?.appendChild(drawer);

  const openDrawer = (kit: Kit, posterEl: Element): void => {
    drawer.open(kit, currentRole, posterEl);
  };

  // Poster wall
  const { grid, posters, applyFilter } = buildPosterWall(KITS, openDrawer);

  // Apply initial filter
  applyFilter(visibleKitNums(KITS, filterState));

  // Keyboard grid navigation — declared early so sidebar filter can call setItems.
  const visiblePosters = (): HTMLElement[] =>
    posters.filter(p => !p.hasAttribute('data-hidden'));

  // Auto-cols via ResizeObserver (no fixedCols passed); items kept live after filter.
  const keyboardCtrl = new GridKeyboardController(grid, visiblePosters());

  // Sidebar — filter change re-syncs keyboard nav item set.
  const sidebar = buildSidebar((state) => {
    filterState = state;
    applyFilter(visibleKitNums(KITS, filterState));
    keyboardCtrl.setItems(visiblePosters());
  });

  // Topbar (search wired to highlight/open first hit)
  const topbar = buildTopbar((query) => {
    if (!query.trim()) return;
    const hits = searchExperiments(KITS, query);
    if (hits.length === 0) return;
    const firstHit = hits[0];
    if (!firstHit) return;
    const targetKit = KITS.find(k => k.num === firstHit.kitNum);
    if (!targetKit) return;
    const posterEl = posters.find(p => parseInt(p.getAttribute('num') ?? '0', 10) === firstHit.kitNum);
    if (posterEl) openDrawer(targetKit, posterEl);
  });

  // Role change
  topbar.addEventListener('role-change', (e: Event) => {
    const ce = e as CustomEvent<{ role: Role }>;
    currentRole = ce.detail.role;
  });

  // Resume strip
  const resumeStrip = buildResumeStrip(() => currentRole);

  // Main container
  const main = el('main', { class: 'main', 'data-shell': 'main' });
  main.append(resumeStrip, grid);

  // Shell layout
  const shellInner = el('div', { class: 'shell-inner' });
  shellInner.append(sidebar, main);

  root.append(topbar, shellInner);

  // Dynamic tilt
  attachTilt(grid, posters);
}

// ── Bootstrap page ────────────────────────────────────────────────────────────

const appRoot = document.getElementById('app');
if (appRoot) {
  renderApp(appRoot);
}
