/**
 * scroll-orchestrator.ts — Lenis + GSAP ScrollTrigger bridge.
 *
 * Lenis (3 кБ) даёт «cinematic» smooth-scroll; GSAP ScrollTrigger
 * получает обновления через scrollerProxy. На mobile / при reduced-motion
 * Lenis НЕ инициализируется — браузерный нативный scroll.
 *
 * Использование: вызвать `initScrollOrchestrator()` ОДИН раз в main.ts
 * перед регистрацией ScrollTrigger'ов.
 *
 * Ссылки:
 *   - Lenis: https://github.com/darkroomengineering/lenis
 *   - ScrollTrigger.scrollerProxy: https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.scrollerProxy()
 */

import { canRunHeavyMotion } from '../lib/reduced-motion';

let lenisInstance: import('lenis').default | null = null;
let registered = false;

/**
 * Инициализирует Lenis + ScrollTrigger bridge.
 * Idempotent: повторный вызов возвращает существующий Lenis.
 *
 * Если `canRunHeavyMotion() === false` — НЕ грузит Lenis/GSAP,
 * возвращает null.
 */
export async function initScrollOrchestrator(): Promise<import('lenis').default | null> {
  if (registered) return lenisInstance;
  if (!canRunHeavyMotion()) {
    registered = true;
    return null;
  }

  const [{ default: Lenis }, gsapModule, scrollTriggerModule] = await Promise.all([
    import('lenis'),
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);

  const gsap = gsapModule.default ?? gsapModule;
  const ScrollTrigger = scrollTriggerModule.default ?? scrollTriggerModule.ScrollTrigger;

  gsap.registerPlugin(ScrollTrigger);

  lenisInstance = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 2,
  });

  // Обновляем ScrollTrigger при каждом скролле Lenis.
  lenisInstance.on('scroll', ScrollTrigger.update);

  // GSAP ticker качает Lenis raf (передаём ms, не секунды).
  gsap.ticker.add((t: number) => {
    lenisInstance?.raf(t * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  registered = true;
  return lenisInstance;
}

/** Получить текущий Lenis (null если orchestrator не запущен). */
export function getLenis(): import('lenis').default | null {
  return lenisInstance;
}

/**
 * Прокрутка к элементу через Lenis (с easing) или native scrollIntoView.
 */
export function scrollToElement(
  target: HTMLElement | string,
  opts: { offset?: number; duration?: number } = {},
): void {
  if (lenisInstance) {
    lenisInstance.scrollTo(target, {
      offset: opts.offset ?? 0,
      duration: opts.duration ?? 1.2,
    });
    return;
  }
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
