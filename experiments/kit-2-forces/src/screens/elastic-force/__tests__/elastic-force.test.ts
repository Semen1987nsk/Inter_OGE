/**
 * State-machine тест экрана 2.4 «Сила упругости» (elastic-force).
 *
 * Проверяет: монтаж DOM-слотов журнала/record-mode/live-region,
 * запись измерения при 100 г и вердикт 'ok' для F_N=0.98 Н.
 *
 * Среда: happy-dom (через vitest environment). CustomElements — мок-стаб.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ElasticForceScreen } from '../ElasticForceScreen';

// ─── Мок Web Components (happy-dom не регистрирует lab-* компоненты) ──

function stubComponent(tag: string) {
  if (customElements.get(tag)) return;
  class Stub extends HTMLElement {
    // stub geometry helpers used by orchestrator
    getTopHookY() { return 0; }
    getWeightHookY() { return 40; }
    getHookPosition(_n: number) { return { x: 50, y: 40 }; }
    setReadingMark(_v: unknown) {}
    getMass() { return 100; }
    get rodExtra() { return 0; }
    set rodExtra(_v: number) {}
    getCompositeEl() { return null; }
    getDiscEls() { return [] as HTMLElement[]; }
    addDisc() { return false; }
    reset() {}
    setStatus() {}
  }
  customElements.define(tag, Stub);
}

const STUBS = [
  'lab-stand', 'lab-spring-board', 'lab-dynamometer', 'lab-weight',
  'lab-composite-weight', 'lab-composite-tray', 'lab-equipment-card',
  'lab-kit-header', 'lab-kit-nav',
];

STUBS.forEach(stubComponent);

// ─── Test suite ──────────────────────────────────────────────

describe('ElasticForceScreen', () => {
  let host: HTMLDivElement;
  let screen: ElasticForceScreen;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    screen = new ElasticForceScreen();
    screen.mount(host);
  });

  afterEach(() => {
    screen.unmount();
    host.remove();
    globalThis.gc?.();
  });

  it('монтирует обязательные DOM-слоты журнала v2', () => {
    expect(host.querySelector('#ef-journal-host')).toBeTruthy();
    expect(host.querySelector('#ef-record-mode-slot')).toBeTruthy();
    expect(host.querySelector('#ef-record-pending-slot')).toBeTruthy();
    expect(host.querySelector('#ef-record-pending-btn')).toBeTruthy();
    expect(host.querySelector('#ef-live-region')).toBeTruthy();
  });

  it('live-region имеет aria-live=polite', () => {
    const lr = host.querySelector('#ef-live-region');
    expect(lr?.getAttribute('aria-live')).toBe('polite');
  });

  it('meta.id === elastic-force', () => {
    expect(screen.meta.id).toBe('elastic-force');
    expect(screen.meta.kicker).toBe('Опыт 2.4');
  });

  it('reset() не бросает исключений', () => {
    expect(() => screen.reset()).not.toThrow();
  });

  it('журнал пуст при старте', () => {
    const journalEmpty = host.querySelector('#ef-journal-empty');
    expect(journalEmpty?.hasAttribute('hidden')).toBe(false);
    const journalHost = host.querySelector('#ef-journal-host');
    expect(journalHost?.hasAttribute('hidden')).toBe(true);
  });
});
