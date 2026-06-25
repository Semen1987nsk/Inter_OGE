/**
 * MeasurementsScreen — заглушка экрана «Измерения» (Опыт 3.1).
 *
 * Task 1 scaffold: рендерит временный «Скоро» стаб.
 * Реальная реализация — в Task 6 (Фаза A).
 *
 * ФИПИ ОГЭ-2026, СПЕЦ Прил.2 компл.№3 (стр.18): измерение сопротивления
 * резистора методом амперметра-вольтметра. R = U / I.
 */

import type { IScreen, ScreenMeta } from '@shell/IScreen';

export class MeasurementsScreen implements IScreen {
  readonly meta: ScreenMeta = {
    id: 'measurements',
    label: 'Сопротивление резистора',
    kicker: 'Опыт 3.1',
    icon: 'gauge',
    tooltip: 'Измерение сопротивления резистора (R = U / I)',
  };

  #root: HTMLElement | null = null;

  mount(host: HTMLElement): void {
    if (this.#root) return;
    const root = document.createElement('div');
    root.className = 'measurements-screen';
    root.style.cssText = [
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'height:100%',
      'flex-direction:column',
      'gap:16px',
      'color:var(--color-text-secondary,#a8b3c7)',
      'font-family:var(--font-display,system-ui,sans-serif)',
    ].join(';');

    const title = document.createElement('div');
    title.style.cssText = 'font-size:24px;font-weight:700;color:var(--color-text-primary,#e8eef9)';
    title.textContent = 'Опыт 3.1 — Сопротивление резистора';

    const sub = document.createElement('div');
    sub.style.cssText = 'font-size:14px';
    sub.textContent = 'Скоро — реализация в Task 6 (Фаза A)';

    const formula = document.createElement('div');
    formula.style.cssText = [
      'font-size:20px',
      'font-family:var(--font-mono,monospace)',
      'color:var(--color-brand-teal,#14b8a6)',
      'padding:12px 24px',
      'border:1px solid var(--color-border,rgba(255,255,255,0.1))',
      'border-radius:8px',
    ].join(';');
    formula.textContent = 'R = U / I';

    root.appendChild(title);
    root.appendChild(formula);
    root.appendChild(sub);
    host.appendChild(root);
    this.#root = root;
  }

  unmount(): void {
    this.#root?.remove();
    this.#root = null;
  }

  reset(): void {
    // no state to reset in stub
  }
}
