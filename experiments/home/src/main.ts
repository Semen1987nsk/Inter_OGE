/**
 * main.ts — точка входа каталога-главной ЛАБОСФЕРА.
 *
 * Архитектура:
 *   1. Импорт стилей (tokens → reset → home)
 *   2. Рендер bento-сетки из data/kits.ts
 *   3. Подключение pressure-aware tilt для kit-card[data-status='ready']
 *   4. Подключение magnetic-CTA для [data-magnetic]
 *   5. IntersectionObserver на hero-video (pause когда не виден)
 *
 * Без фреймворков. Vanilla TypeScript + Web APIs.
 */

import './styles/tokens.css';
import './styles/reset.css';
import './styles/home.css';

import { KITS, totalExperiments, type Kit } from './data/kits';
import { mountBento } from './sections/CatalogSection';
import { setupHeroVideo } from './sections/HeroSection';
import { attachPressureTilt } from './components/tilt-on-hover';
import { attachMagnetic } from './components/magnetic-cta';
import { rewriteKitHref } from './lib/urls';
import { initScrollOrchestrator } from './components/scroll-orchestrator';
import { canRunHeavyMotion } from './lib/reduced-motion';
import { mountPhysicsSection } from './sections/PhysicsSection';
import { mountJourneySection } from './sections/JourneySection';
import { attachCursorFollower } from './components/cursor-follower';

// ─── Hero CTA href rewrite (env-aware: dev:5173 / prod relative) ───
document.querySelectorAll<HTMLAnchorElement>('a.hero-cta[href]').forEach((a) => {
  const original = a.getAttribute('href');
  if (original) a.href = rewriteKitHref(original);
});

// ─── Hero spec-numbers: single source of truth = KITS data ─────
{
  const totals = totalExperiments(KITS);
  const kitsCount = KITS.length;
  const kitsSlot = document.querySelector<HTMLElement>('[data-spec="kits-count"]');
  const expSlot = document.querySelector<HTMLElement>('[data-spec="experiments-count"]');
  if (kitsSlot) {
    kitsSlot.innerHTML =
      `<span class="hero-spec-dot"></span>${kitsCount}&nbsp;комплектов`;
  }
  if (expSlot) {
    // Если готовых < общего числа — показываем «6 / 35 опытов».
    const text = totals.done < totals.total
      ? `${totals.done}&nbsp;/&nbsp;${totals.total}&nbsp;опытов`
      : `${totals.total}&nbsp;опытов`;
    expSlot.innerHTML = `<span class="hero-spec-dot"></span>${text}`;
  }
}

// ─── Bento ─────────────────────────────────────────────────────
const bentoEl = document.getElementById('kit-bento');
if (bentoEl) {
  mountBento(bentoEl, KITS as ReadonlyArray<Kit>);

  // Pressure-aware tilt для всех ready-карточек (правило 4)
  bentoEl.querySelectorAll<HTMLElement>('.kit-card[data-status="ready"]').forEach((card) => {
    attachPressureTilt(card);
  });
}

// ─── Magnetic CTA для всех [data-magnetic] (правило 5) ─────────
document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
  attachMagnetic(el, { strength: 0.18, radius: 80 });
});

// ─── Hero-video lifecycle ──────────────────────────────────────
setupHeroVideo();

// ─── Physics Section (Three.js scene, lazy) ───────────────────
const physicsEl = document.getElementById('physics');
if (physicsEl) mountPhysicsSection(physicsEl);

// ─── Journey Section (pin-scroll 4 опыта) ─────────────────────
const journeyEl = document.getElementById('journey');
if (journeyEl) mountJourneySection(journeyEl);

// ─── Custom cursor follower (desktop only) ────────────────────
attachCursorFollower();

// ─── Lenis smooth-scroll + GSAP ScrollTrigger bridge ──────────
// На mobile (<768px) и при prefers-reduced-motion — нативный scroll.
if (canRunHeavyMotion()) {
  void initScrollOrchestrator().catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.warn('[home] scroll-orchestrator init failed', err);
  });
}

// ─── Подсказка в консоли для разработчиков ─────────────────────
// eslint-disable-next-line no-console
console.info(
  '%cЛАБОСФЕРА %cкаталог-главная v2.0',
  'background:#ffbe0b;color:#06101e;font-weight:bold;padding:4px 8px;border-radius:4px',
  'color:#14b8a6;font-weight:600;padding:0 8px',
);
