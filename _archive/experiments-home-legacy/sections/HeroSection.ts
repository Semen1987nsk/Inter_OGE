/**
 * HeroSection — 5-stage cinematic reveal + видео-lifecycle.
 *
 * Стандарт AWWWARDS 2026 (правило 10):
 *   Stage 1 (0→600ms)    — grain-overlay уже на body::before, статично.
 *   Stage 2 (200→600ms)  — видео-fade-in (CLS=0 через aspect-ratio + poster).
 *   Stage 3 (400→1200ms) — h1 split-char clip-path inset(100% 0 0 0)→0,
 *                          stagger 60ms, cubic-bezier(.22,1,.36,1).
 *   Stage 4 (700→1300ms) — подзаголовок translateY 24→0 + opacity 0→1.
 *   Stage 5 (1000→1500ms)— CTA scale 0.92→1 + magnetic-attach уже работает.
 *
 * Если `canRunHeavyMotion() === false` (mobile / reduced-motion) —
 * stages 3-5 заменяются на простой CSS opacity-fade без stagger'а.
 * Видео всё ещё может играть, но через `prefers-reduced-data` мы его убиваем.
 */

import { canRunHeavyMotion } from '../lib/reduced-motion';

/** Полный hero-lifecycle: видео + reveal-timeline. */
export function setupHeroVideo(): void {
  setupHeroVideoLifecycle();
  void runHeroReveal();
}

// ─── Видео ─────────────────────────────────────────────────────

function setupHeroVideoLifecycle(): void {
  const video = document.querySelector<HTMLVideoElement>('.hero-video');
  if (!video) return;

  if (video.querySelectorAll('source').length === 0) {
    video.style.display = 'none';
    return;
  }

  // IntersectionObserver — экономим батарею mobile.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          video.play().catch(() => {
            /* autoplay blocked — fallback poster уже виден */
          });
        } else {
          video.pause();
        }
      }
    },
    { threshold: 0.1 },
  );
  observer.observe(video);

  // Reduced-motion: НЕ запускаем автоплей.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.removeAttribute('autoplay');
    video.pause();
  }
  // Reduced-data: вообще выключаем.
  if (window.matchMedia('(prefers-reduced-data: reduce)').matches) {
    video.remove();
  }
}

// ─── 5-stage cinematic reveal ──────────────────────────────────

async function runHeroReveal(): Promise<void> {
  // Сначала помечаем root для CSS-стартовых состояний.
  const heroRoot = document.querySelector<HTMLElement>('.hero');
  if (!heroRoot) return;
  heroRoot.dataset['revealState'] = 'pre';

  if (!canRunHeavyMotion()) {
    runMobileFallbackReveal(heroRoot);
    return;
  }

  // Загружаем GSAP + SplitType только если heavy-motion разрешено.
  const [{ default: gsap }, { default: SplitType }] = await Promise.all([
    import('gsap'),
    import('split-type'),
  ]);

  const tl = gsap.timeline({
    defaults: { ease: 'power3.out' },
    onStart: () => {
      heroRoot.dataset['revealState'] = 'running';
    },
    onComplete: () => {
      heroRoot.dataset['revealState'] = 'done';
    },
  });

  // ─── Stage 2: видео fade-in (200 → 600ms) ────────────────────
  const video = heroRoot.querySelector<HTMLElement>('.hero-video');
  if (video) {
    gsap.set(video, { opacity: 0 });
    tl.to(video, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0.2);
  }

  // ─── Stage 3: h1 split-char clip-path (400 → 1200ms) ─────────
  // Разбиваем title на chars, но НЕ трогаем coda (вёрстка-зависимое).
  const title = heroRoot.querySelector<HTMLElement>('.hero-title');
  let titleChars: HTMLElement[] = [];
  if (title) {
    // Сохраняем coda отдельно — не разбиваем её посимвольно.
    const coda = title.querySelector<HTMLElement>('.hero-title-coda');
    let codaHtml = '';
    if (coda) {
      codaHtml = coda.outerHTML;
      coda.remove();
    }
    const split = new SplitType(title, { types: 'chars', tagName: 'span' });
    titleChars = (split.chars ?? []) as HTMLElement[];
    if (codaHtml) {
      title.insertAdjacentHTML('beforeend', codaHtml);
    }
    // Стартовое состояние: каждое слово полностью скрыто.
    gsap.set(titleChars, {
      yPercent: 110,
      opacity: 0,
    });
    tl.to(
      titleChars,
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.025,
        ease: 'expo.out',
      },
      0.4,
    );
    // Анимируем coda отдельно (одна строка, золотая).
    const codaEl = title.querySelector<HTMLElement>('.hero-title-coda');
    if (codaEl) {
      gsap.set(codaEl, { opacity: 0, y: 20 });
      tl.to(codaEl, { opacity: 1, y: 0, duration: 0.6 }, 1.0);
    }
  }

  // ─── Stage 4: hero-spec translateY (700 → 1300ms) ────────────
  const specLines = heroRoot.querySelectorAll<HTMLElement>('.hero-spec-line');
  if (specLines.length > 0) {
    gsap.set(specLines, { opacity: 0, y: 24 });
    tl.to(specLines, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 }, 0.7);
  }

  // ─── Stage 5: CTA scale-pop (1000 → 1500ms) ──────────────────
  const ctas = heroRoot.querySelectorAll<HTMLElement>('.hero-cta');
  if (ctas.length > 0) {
    gsap.set(ctas, { opacity: 0, scale: 0.92 });
    tl.to(
      ctas,
      {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        stagger: 0.1,
        ease: 'back.out(1.4)',
      },
      1.0,
    );
  }

  // Scroll-hint появляется в самом конце.
  const scrollHint = heroRoot.querySelector<HTMLElement>('.hero-scroll-hint');
  if (scrollHint) {
    gsap.set(scrollHint, { opacity: 0, y: -10 });
    tl.to(scrollHint, { opacity: 1, y: 0, duration: 0.5 }, 1.4);
  }
}

/** Mobile / reduced-motion: один общий fade-in без stagger'а. */
function runMobileFallbackReveal(heroRoot: HTMLElement): void {
  heroRoot.dataset['revealState'] = 'done';
  // Стартовые состояния установлены в CSS (.hero[data-reveal-state="pre"]),
  // тут переключаем в done — CSS-transition сделает плавный fade.
}
