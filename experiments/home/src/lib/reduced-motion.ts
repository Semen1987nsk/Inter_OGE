/**
 * reduced-motion.ts — единый guard для motion-features.
 *
 * Объединяет 2 правила в одно API:
 *   1. prefers-reduced-motion: reduce → отключаем все анимации (WCAG 2.2).
 *   2. (max-width: 768px) → mobile-clean: без GSAP-оркестрации, без 3D,
 *      без cursor-follower, без parallax-tilt (правило premium-лендингов
 *      2026 — Stripe Press, Linear /method, Lusion).
 *
 * Используется во всех motion-компонентах (HeroSection, CatalogSection,
 * PhysicsSection, JourneySection, cursor-follower, scroll-orchestrator).
 */

const MOBILE_BREAKPOINT_PX = 768;

const reducedMotionMql =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} } as unknown as MediaQueryList);

const mobileMql =
  typeof window !== 'undefined'
    ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`)
    : ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} } as unknown as MediaQueryList);

/** true, если пользователь попросил «уменьшить движение» в ОС/браузере. */
export function prefersReducedMotion(): boolean {
  return reducedMotionMql.matches;
}

/** true, если viewport < 768px (правило mobile-clean). */
export function isMobileViewport(): boolean {
  return mobileMql.matches;
}

/**
 * Главный guard: тяжёлые motion-фичи (Lenis, GSAP scroll-orchestration,
 * Three.js, cursor-follower, 3-layer tilt) должны запускаться ТОЛЬКО
 * если `canRunHeavyMotion() === true`.
 *
 * Возвращает false если:
 *   - prefers-reduced-motion: reduce, или
 *   - viewport < 768px.
 */
export function canRunHeavyMotion(): boolean {
  return !prefersReducedMotion() && !isMobileViewport();
}

/**
 * Подписаться на изменение reduced-motion или mobile-breakpoint.
 * Callback получает текущее значение `canRunHeavyMotion()`.
 *
 * Возвращает функцию-отписки.
 */
export function onMotionPreferenceChange(cb: (canRun: boolean) => void): () => void {
  const handler = (): void => cb(canRunHeavyMotion());
  reducedMotionMql.addEventListener('change', handler);
  mobileMql.addEventListener('change', handler);
  return (): void => {
    reducedMotionMql.removeEventListener('change', handler);
    mobileMql.removeEventListener('change', handler);
  };
}
