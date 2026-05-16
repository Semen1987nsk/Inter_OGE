/**
 * lab-kit-nav — render + integration тесты top-tabs опытов комплекта.
 *
 * Этап 8 спеки 2026-05-07. Покрытие:
 *   - setScreens рендерит правильное количество табов
 *   - data-state и ARIA для current / done / available / locked
 *   - check-icon у done, lock-icon у locked
 *   - событие screen-select { detail: { id } } и блокировка для locked
 *   - атрибут active как fallback при пустых stateOverrides
 *   - setProgress(0..100) → CSS-переменная --progress
 *   - mobile media-query overflow-x: auto в .screens
 *   - graceful render без setScreens()
 *   - сброс табов через setScreens([])
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { ScreenMeta } from '../shell/IScreen';

beforeAll(async () => {
  await import('../ui/components/lab-kit-nav');
});

afterEach(() => {
  document.body.innerHTML = '';
});

interface KitNavLike extends HTMLElement {
  setScreens(screens: ReadonlyArray<ScreenMeta>): void;
  setStates(map: Record<string, 'current' | 'done' | 'available' | 'locked'>): void;
  setProgress(percent: number): void;
}

const META_DENSITY_SOLID: ScreenMeta = {
  id: 'density-solid',
  label: 'Плотность тела',
  kicker: 'Опыт 1.1',
  icon: 'density',
  tooltip: 'Измерение плотности твёрдого тела',
};

const META_ARCHIMEDES: ScreenMeta = {
  id: 'archimedes',
  label: 'Архимедова сила',
  kicker: 'Опыт 1.2',
  icon: 'archimedes',
  tooltip: 'Измерение архимедовой силы',
};

const META_FLOATING: ScreenMeta = {
  id: 'floating',
  label: 'Плавание тел',
  kicker: 'Опыт 1.3',
  icon: 'float',
  tooltip: 'Условия плавания тел',
};

function mount(): KitNavLike {
  const el = document.createElement('lab-kit-nav') as KitNavLike;
  document.body.appendChild(el);
  return el;
}

describe('lab-kit-nav — setScreens', () => {
  it('setScreens([m1, m2]): рендерит 2 кнопки таба', () => {
    const el = mount();
    el.setScreens([META_DENSITY_SOLID, META_ARCHIMEDES]);
    const buttons = el.shadowRoot!.querySelectorAll('button');
    expect(buttons.length).toBe(2);
  });

  it('каждая кнопка содержит лейбл и kicker из meta', () => {
    const el = mount();
    el.setScreens([META_DENSITY_SOLID, META_ARCHIMEDES]);
    const buttons = el.shadowRoot!.querySelectorAll('button');

    const text0 = buttons[0]!.textContent ?? '';
    expect(text0).toContain('Опыт 1.1');
    expect(text0).toContain('Плотность тела');

    const text1 = buttons[1]!.textContent ?? '';
    expect(text1).toContain('Опыт 1.2');
    expect(text1).toContain('Архимедова сила');
  });

  it('каждая кнопка имеет data-screen-id, role="tab", title=tooltip', () => {
    const el = mount();
    el.setScreens([META_ARCHIMEDES]);
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('button')!;
    expect(btn.dataset['screenId']).toBe('archimedes');
    expect(btn.getAttribute('role')).toBe('tab');
    expect(btn.title).toBe(META_ARCHIMEDES.tooltip);
  });

  it('setScreens([]) очищает таб-контейнер (нет orphan DOM)', () => {
    const el = mount();
    el.setScreens([META_DENSITY_SOLID, META_ARCHIMEDES]);
    expect(el.shadowRoot!.querySelectorAll('button').length).toBe(2);
    el.setScreens([]);
    expect(el.shadowRoot!.querySelectorAll('button').length).toBe(0);
  });
});

describe('lab-kit-nav — состояния таба', () => {
  it('current: data-state="current", aria-current="page", tabIndex=0', () => {
    const el = mount();
    el.setScreens([META_DENSITY_SOLID, META_ARCHIMEDES]);
    el.setStates({ archimedes: 'current' });
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>(
      '[data-screen-id="archimedes"]',
    )!;
    expect(btn.dataset['state']).toBe('current');
    expect(btn.getAttribute('aria-current')).toBe('page');
    expect(btn.tabIndex).toBe(0);
  });

  it('done: data-state="done", aria-label содержит «выполнен», check-icon', () => {
    const el = mount();
    el.setScreens([META_DENSITY_SOLID, META_ARCHIMEDES]);
    el.setStates({ 'density-solid': 'done' });
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>(
      '[data-screen-id="density-solid"]',
    )!;
    expect(btn.dataset['state']).toBe('done');
    expect(btn.getAttribute('aria-label')).toContain('выполнен');
    // checkmark SVG в .state-icon
    const icon = btn.querySelector('.state-icon')!;
    expect(icon.innerHTML).toContain('<svg');
    expect(icon.innerHTML).toContain('path'); // checkmark = path
  });

  it('available: нейтральный — нет aria-current, нет aria-disabled, state-icon пуст', () => {
    const el = mount();
    el.setScreens([META_DENSITY_SOLID, META_ARCHIMEDES]);
    el.setStates({ 'density-solid': 'available' });
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>(
      '[data-screen-id="density-solid"]',
    )!;
    expect(btn.dataset['state']).toBe('available');
    expect(btn.hasAttribute('aria-current')).toBe(false);
    expect(btn.hasAttribute('aria-disabled')).toBe(false);
    const icon = btn.querySelector('.state-icon')!;
    expect(icon.innerHTML.trim()).toBe('');
  });

  it('locked: aria-disabled="true", lock-icon, title подсказывает разблокировку', () => {
    const el = mount();
    el.setScreens([META_DENSITY_SOLID, META_ARCHIMEDES, META_FLOATING]);
    el.setStates({ floating: 'locked' });
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>(
      '[data-screen-id="floating"]',
    )!;
    expect(btn.dataset['state']).toBe('locked');
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.tabIndex).toBe(-1);
    expect(btn.title).toMatch(/предыдущ/i);
    const icon = btn.querySelector('.state-icon')!;
    // SVG-замочек содержит rect (корпус)
    expect(icon.innerHTML).toContain('<svg');
    expect(icon.innerHTML).toContain('rect');
  });
});

describe('lab-kit-nav — атрибут active (fallback)', () => {
  it('setAttribute(active, "archimedes") без setStates → archimedes становится current', () => {
    const el = mount();
    el.setScreens([META_DENSITY_SOLID, META_ARCHIMEDES]);
    el.setAttribute('active', 'archimedes');
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>(
      '[data-screen-id="archimedes"]',
    )!;
    expect(btn.dataset['state']).toBe('current');
    expect(btn.getAttribute('aria-current')).toBe('page');
    // Остальные — available
    const other = el.shadowRoot!.querySelector<HTMLButtonElement>(
      '[data-screen-id="density-solid"]',
    )!;
    expect(other.dataset['state']).toBe('available');
  });

  it('setStates перекрывает active: explicit done > active', () => {
    const el = mount();
    el.setScreens([META_DENSITY_SOLID, META_ARCHIMEDES]);
    el.setAttribute('active', 'archimedes');
    el.setStates({ archimedes: 'done' }); // override active
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>(
      '[data-screen-id="archimedes"]',
    )!;
    expect(btn.dataset['state']).toBe('done');
  });
});

describe('lab-kit-nav — событие screen-select', () => {
  it('клик по табу эмитит screen-select { detail: { id } }', () => {
    const el = mount();
    el.setScreens([META_DENSITY_SOLID, META_ARCHIMEDES]);
    el.setStates({ 'density-solid': 'current', archimedes: 'available' });

    let captured: { id: string } | null = null;
    el.addEventListener('screen-select', (e) => {
      captured = (e as CustomEvent).detail;
    });

    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>(
      '[data-screen-id="archimedes"]',
    )!;
    btn.click();
    expect(captured).not.toBeNull();
    expect(captured!.id).toBe('archimedes');
  });

  it('событие composed=true и bubbles=true (пробивает Shadow DOM)', () => {
    const el = mount();
    el.setScreens([META_ARCHIMEDES]);

    let composed = false;
    let bubbles = false;
    document.addEventListener('screen-select', (e) => {
      composed = e.composed;
      bubbles = e.bubbles;
    });
    el.shadowRoot!.querySelector<HTMLButtonElement>('button')!.click();
    expect(composed).toBe(true);
    expect(bubbles).toBe(true);
  });

  it('locked таб: клик НЕ эмитит screen-select', () => {
    const el = mount();
    el.setScreens([META_DENSITY_SOLID, META_FLOATING]);
    el.setStates({ floating: 'locked' });

    let fired = 0;
    el.addEventListener('screen-select', () => fired++);

    el.shadowRoot!
      .querySelector<HTMLButtonElement>('[data-screen-id="floating"]')!
      .click();
    expect(fired).toBe(0);
  });

  it('current таб: клик ЭМИТИТ screen-select (повторный select допустим)', () => {
    const el = mount();
    el.setScreens([META_DENSITY_SOLID, META_ARCHIMEDES]);
    el.setStates({ archimedes: 'current' });
    let fired = 0;
    el.addEventListener('screen-select', () => fired++);
    el.shadowRoot!
      .querySelector<HTMLButtonElement>('[data-screen-id="archimedes"]')!
      .click();
    expect(fired).toBe(1);
  });
});

describe('lab-kit-nav — setProgress', () => {
  it('setProgress(40): kit-progress.style.--progress = "40%"', () => {
    const el = mount();
    el.setProgress(40);
    const bar = el.shadowRoot!.querySelector<HTMLElement>('.kit-progress')!;
    expect(bar.style.getPropertyValue('--progress')).toBe('40%');
  });

  it('setProgress(0) и setProgress(100) — границы', () => {
    const el = mount();
    el.setProgress(0);
    const bar = el.shadowRoot!.querySelector<HTMLElement>('.kit-progress')!;
    expect(bar.style.getPropertyValue('--progress')).toBe('0%');
    el.setProgress(100);
    expect(bar.style.getPropertyValue('--progress')).toBe('100%');
  });

  it('setProgress клампится: -10 → 0%, 150 → 100%', () => {
    const el = mount();
    const bar = el.shadowRoot!.querySelector<HTMLElement>('.kit-progress')!;
    el.setProgress(-10);
    expect(bar.style.getPropertyValue('--progress')).toBe('0%');
    el.setProgress(150);
    expect(bar.style.getPropertyValue('--progress')).toBe('100%');
  });

  it('setProgress(NaN) → 0% (Number.isFinite check)', () => {
    const el = mount();
    el.setProgress(Number.NaN);
    const bar = el.shadowRoot!.querySelector<HTMLElement>('.kit-progress')!;
    expect(bar.style.getPropertyValue('--progress')).toBe('0%');
  });
});

describe('lab-kit-nav — mobile / стили', () => {
  it('.screens имеет overflow-x: auto в стилях (горизонтальный скролл на мобиле)', () => {
    const el = mount();
    const styleEl = el.shadowRoot!.querySelector('style')!;
    const css = styleEl.textContent ?? '';
    expect(css).toMatch(/\.screens[^}]*overflow-x:\s*auto/);
  });

  it('mobile media-query (<=900px) уменьшает padding', () => {
    const el = mount();
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? '';
    expect(css).toMatch(/@media \(max-width: 900px\)/);
  });

  it('current-таб: gold underline через CSS-переменную --color-brand-orange', () => {
    const el = mount();
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? '';
    expect(css).toMatch(
      /button\[data-state='current'\][^}]*border-bottom-color:\s*var\(--color-brand-orange/,
    );
  });
});

describe('lab-kit-nav — graceful behavior', () => {
  it('mount без setScreens(): не падает, нет orphan кнопок', () => {
    const el = mount();
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot!.querySelectorAll('button').length).toBe(0);
    // .screens-контейнер существует
    expect(el.shadowRoot!.querySelector('.screens')).not.toBeNull();
  });

  it('setStates без setScreens: no-op (ничего не падает)', () => {
    const el = mount();
    expect(() => el.setStates({ archimedes: 'current' })).not.toThrow();
    expect(el.shadowRoot!.querySelectorAll('button').length).toBe(0);
  });

  it('повторный setScreens с тем же составом — переинициализирует кнопки (нет дубликатов)', () => {
    const el = mount();
    el.setScreens([META_DENSITY_SOLID, META_ARCHIMEDES]);
    el.setScreens([META_DENSITY_SOLID, META_ARCHIMEDES]);
    expect(el.shadowRoot!.querySelectorAll('button').length).toBe(2);
  });

  it('переключение active: предыдущий current → available', () => {
    const el = mount();
    el.setScreens([META_DENSITY_SOLID, META_ARCHIMEDES]);
    el.setAttribute('active', 'density-solid');
    expect(
      el.shadowRoot!.querySelector<HTMLButtonElement>(
        '[data-screen-id="density-solid"]',
      )!.dataset['state'],
    ).toBe('current');

    el.setAttribute('active', 'archimedes');
    expect(
      el.shadowRoot!.querySelector<HTMLButtonElement>(
        '[data-screen-id="density-solid"]',
      )!.dataset['state'],
    ).toBe('available');
    expect(
      el.shadowRoot!.querySelector<HTMLButtonElement>(
        '[data-screen-id="archimedes"]',
      )!.dataset['state'],
    ).toBe('current');
  });
});
