import { describe, it, expect, beforeAll } from 'vitest';
import { renderApp } from '../main';

describe('app-shell', () => {
  beforeAll(async () => { await import('../main'); });

  it('рендерит 7 постеров и wordmark с новым именем', () => {
    const root = document.createElement('div');
    renderApp(root);
    expect(root.querySelectorAll('kit-poster').length).toBe(7);
    expect(root.textContent).toContain('ЛАБОСФЕРА');
    expect(root.querySelector('[role=grid]')).toBeTruthy();
  });

  it('применяет live-фильтр readyOnly (видны 2 постера)', () => {
    const root = document.createElement('div');
    renderApp(root);
    (root.querySelector('[data-filter=ready-only]') as HTMLInputElement).click();
    const visible = [...root.querySelectorAll('kit-poster')].filter(
      p => !p.hasAttribute('data-hidden'),
    );
    expect(visible.length).toBe(2);
  });
});
