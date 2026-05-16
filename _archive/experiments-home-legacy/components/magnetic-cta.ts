/**
 * Magnetic CTA (правило 5): кнопка слегка тянется к курсору когда он в радиусе.
 * Premium-сайты (Apple, Linear, Vercel) используют этот эффект — он создаёт
 * ощущение «отзывчивости» и мощно работает на конверсию.
 */

interface MagneticOptions {
  /** Сила притяжения 0..1, доля смещения от расстояния до курсора. */
  strength?: number;
  /** Радиус активации в пикселях. */
  radius?: number;
}

const DEFAULTS: Required<MagneticOptions> = {
  strength: 0.2,
  radius: 80,
};

export function attachMagnetic(el: HTMLElement, options: MagneticOptions = {}): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover)').matches) return;

  const opts = { ...DEFAULTS, ...options };
  let rafId = 0;

  const handleMove = (ev: PointerEvent): void => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = ev.clientX - cx;
      const dy = ev.clientY - cy;
      const distance = Math.hypot(dx, dy);

      if (distance < opts.radius + Math.max(rect.width, rect.height) / 2) {
        const tx = dx * opts.strength;
        const ty = dy * opts.strength;
        el.style.setProperty('--cta-tx', `${tx.toFixed(1)}px`);
        el.style.setProperty('--cta-ty', `${ty.toFixed(1)}px`);
      }
      rafId = 0;
    });
  };

  const handleLeave = (): void => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    el.style.setProperty('--cta-tx', '0px');
    el.style.setProperty('--cta-ty', '0px');
  };

  // Слушаем pointermove на window — кнопка тянется ДО того как курсор её коснётся
  window.addEventListener('pointermove', handleMove, { passive: true });
  el.addEventListener('pointerleave', handleLeave);
  el.addEventListener('pointerdown', handleLeave); // на клик возвращаем в норму
}
