/**
 * LensBenchScreen — реализует IScreen для экрана «Оптическая скамья» (опыт 4.1).
 *
 * meta.id = 'lens-bench' (URL: ?screen=lens-bench, экран по умолчанию).
 *
 * Task 1: тривиальный placeholder (mount рендерит «в разработке»). Реальный шаблон+логику
 * (lab-optical-bench, лоток, слайдер экрана, оверлей лучей, журнал) добавляет Task 7.
 */

import type { IScreen, ScreenMeta } from '@shell/IScreen';

export class LensBenchScreen implements IScreen {
  readonly meta: ScreenMeta = {
    id: 'lens-bench',
    label: 'Оптическая сила линзы',
    kicker: 'Опыт 4.1 · Линзы',
    icon: 'lens',
    tooltip:
      'Оптическая сила и фокусное расстояние собирающей линзы; свойства изображения; сложенные линзы.',
  };

  #host: HTMLElement | null = null;

  mount(host: HTMLElement): void {
    this.#host = host;
    host.innerHTML = '<p>Опыт 4.1 — в разработке</p>';
  }

  unmount(): void {
    if (this.#host) this.#host.replaceChildren();
    this.#host = null;
  }

  reset(): void {
    /* placeholder — нет состояния до Task 7 */
  }
}
