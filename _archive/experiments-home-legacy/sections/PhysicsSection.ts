/**
 * PhysicsSection — секция «Физика в браузере» с lazy Three.js сценой.
 *
 * Lazy gates:
 *   1. canRunHeavyMotion() → если false, остаётся CSS-poster (никакого Three).
 *   2. IO `rootMargin: 200px` — сцена начинает загружаться когда секция
 *      приближается к viewport на 200px.
 *   3. requestIdleCallback (fallback setTimeout) — грузим только в idle.
 *
 * Управление playback'ом:
 *   - При выходе из viewport — `scene.stop()` (экономия CPU).
 *   - При повторном входе — `scene.start()`.
 *   - При unmount — `scene.dispose()`.
 */

import { canRunHeavyMotion } from '../lib/reduced-motion';
import type { SceneHandle } from '../three/scene';

export function mountPhysicsSection(host: HTMLElement): void {
  // Базовая разметка секции с CSS-poster (виден сразу).
  host.innerHTML = `
    <div class="container">
      <header class="section-header">
        <span class="eyebrow eyebrow--teal">Физика — в браузере</span>
        <h2 class="section-title">
          Реальные приборы, <em>реальные расчёты</em><br />
          без установок и поломок
        </h2>
        <p class="section-subtitle">
          Каждый прибор смоделирован с точностью ФИПИ: тот же диапазон, та же
          погрешность, тот же отклик на движение и силу. Симуляция работает
          прямо в браузере, без 3D-движков на стороне ученика.
        </p>
      </header>
      <div class="physics-stage" data-state="poster">
        <canvas class="physics-canvas" aria-hidden="true"></canvas>
        <div class="physics-poster" aria-hidden="true"></div>
        <div class="physics-labels" aria-hidden="true">
          <span class="physics-label physics-label--top-left">Динамометр · ФИПИ-калибровка</span>
          <span class="physics-label physics-label--bottom-right">Пружина · k = 50 Н/м</span>
        </div>
      </div>
    </div>
  `;

  const stage = host.querySelector<HTMLElement>('.physics-stage');
  const canvas = host.querySelector<HTMLCanvasElement>('.physics-canvas');
  if (!stage || !canvas) return;

  if (!canRunHeavyMotion()) {
    // Mobile / reduced-motion: остаёмся на poster, без Three.js.
    return;
  }

  let sceneHandle: SceneHandle | null = null;
  let loadingPromise: Promise<void> | null = null;

  function loadScene(): Promise<void> {
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async (): Promise<void> => {
      const { mountThreeScene } = await import('../three/scene');
      if (!canvas) return;
      sceneHandle = mountThreeScene(canvas);
      if (stage) stage.dataset['state'] = 'live';
      sceneHandle.start();
    })().catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.warn('[PhysicsSection] scene load failed', err);
    });
    return loadingPromise;
  }

  // IO gate: грузим когда секция приближается к viewport.
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!sceneHandle) {
            const idle =
              (window as Window & { requestIdleCallback?: typeof requestIdleCallback })
                .requestIdleCallback;
            if (idle) idle(() => void loadScene(), { timeout: 1500 });
            else window.setTimeout(() => void loadScene(), 200);
          } else {
            sceneHandle.start();
          }
        } else {
          sceneHandle?.stop();
        }
      }
    },
    { rootMargin: '200px 0px' },
  );
  io.observe(stage);
}
