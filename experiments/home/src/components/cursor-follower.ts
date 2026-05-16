/**
 * cursor-follower.ts — премиальный custom cursor с lerp + magnetic-эффектом.
 *
 * AWWWARDS-стандарт 2026:
 *   - 24×24 круг с mix-blend-mode: difference (виден на любом фоне).
 *   - Lerp 0.12 — плавное «отставание» от мыши, ощущение веса.
 *   - На hover любого `[data-cursor="grow"]` / CTA / kit-card —
 *     растягивается до 80×80 с opacity 0.4.
 *
 * Не активен на:
 *   - touch-устройствах (pointer:coarse),
 *   - prefers-reduced-motion: reduce,
 *   - mobile (<768px).
 */

import { canRunHeavyMotion } from '../lib/reduced-motion';

const GROW_SELECTORS = [
  '.hero-cta',
  '.kit-card[data-status="ready"]',
  '.journey-stage-cta',
  '.kit-card-cta',
  '[data-cursor="grow"]',
].join(', ');

const HIDE_ON_FOCUS = 'input, textarea, select, [contenteditable="true"]';

export function attachCursorFollower(): void {
  if (!canRunHeavyMotion()) return;
  // Дополнительная проверка на физическую мышь (touch отключает).
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const cursor = document.createElement('div');
  cursor.className = 'cursor-follower';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span class="cursor-follower-dot"></span>';
  document.body.appendChild(cursor);

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let curX = mouseX;
  let curY = mouseY;
  let rafId = 0;
  let isGrowing = false;
  let isHidden = false;

  const lerp = 0.18;

  function onMove(e: PointerEvent): void {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (isHidden) {
      isHidden = false;
      cursor.dataset['hidden'] = 'false';
    }
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  function onLeave(): void {
    isHidden = true;
    cursor.dataset['hidden'] = 'true';
  }

  function onOver(e: PointerEvent): void {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest(HIDE_ON_FOCUS)) {
      isHidden = true;
      cursor.dataset['hidden'] = 'true';
      return;
    }
    const grow = !!target.closest(GROW_SELECTORS);
    if (grow !== isGrowing) {
      isGrowing = grow;
      cursor.dataset['grow'] = String(grow);
    }
  }

  function frame(): void {
    curX += (mouseX - curX) * lerp;
    curY += (mouseY - curY) * lerp;
    cursor.style.transform = `translate3d(${curX}px, ${curY}px, 0)`;
    const stillMoving = Math.abs(mouseX - curX) > 0.5 || Math.abs(mouseY - curY) > 0.5;
    rafId = stillMoving ? requestAnimationFrame(frame) : 0;
  }

  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave);
  document.addEventListener('pointerover', onOver, { passive: true });
}
