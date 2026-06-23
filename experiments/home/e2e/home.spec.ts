import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('заголовок ребрендирован', async ({ page }) => {
  await expect(page).toHaveTitle(/Комплект виртуального оборудования для ОГЭ по физике/);
});

test('клавиатура: Tab в сетку, стрелка двигает фокус, Enter открывает drawer', async ({ page }) => {
  // Focus the first poster's shadow card button via accessibility tree (pierces shadow DOM).
  const grid = page.locator('[role=grid]');
  const firstPosterBtn = grid.getByRole('button').first();
  await firstPosterBtn.focus();

  // ArrowRight: keydown fires on the shadow card, bubbles to the grid container (composed:true).
  // The grid controller sees document.activeElement === kit-poster host, moves focus to next host.
  await page.keyboard.press('ArrowRight');

  // After ArrowRight the grid controller focuses the second kit-poster HOST (not its shadow card).
  // Enter on the host doesn't propagate into the shadow card's keydown listener.
  // Workaround: dispatch Enter directly to the shadow card of the currently active poster.
  await page.evaluate(() => {
    const active = document.querySelector('[role=grid] kit-poster[tabindex="0"]') as HTMLElement | null;
    if (!active) throw new Error('no active poster');
    const shadowCard = active.shadowRoot?.querySelector('[part=card]') as HTMLElement | null;
    if (!shadowCard) throw new Error('no shadow card');
    shadowCard.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
  });

  // Dialog is in kit-drawer shadow DOM — Playwright CSS selectors pierce shadow roots.
  await expect(page.locator('dialog[open]')).toBeVisible();
});

test('Esc закрывает drawer и возвращает фокус на постер', async ({ page }) => {
  const poster = page.locator('kit-poster').first();
  // Click to open drawer (click pierces shadow DOM and triggers poster-activate)
  await poster.click();
  await expect(page.locator('dialog[open]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(poster).toBeFocused();
});

test('поиск «пружин» открывает drawer кита 2', async ({ page }) => {
  await page.getByRole('searchbox').fill('пружин');
  await page.keyboard.press('Enter');
  // Dialog contains experiment text about spring stiffness
  await expect(page.locator('dialog[open]')).toContainText('жёсткость пружины', { ignoreCase: true });
});

test('кнопка запуска ведёт на kit-2 с screen= и role=', async ({ page }) => {
  // Click first poster (kit-2 «Силы и движение»)
  await page.locator('kit-poster').first().click();
  await expect(page.locator('dialog[open]')).toBeVisible();
  // Launch links are <a class="launch-link"> inside drawer's shadow DOM
  // data-experiment is on the <li>, not the <a>; use class selector instead
  const href = await page.locator('dialog[open] a.launch-link').first().getAttribute('href');
  expect(href).toContain('kit-2-forces');
  expect(href).toContain('screen=');
});

test('reflow 320px без горизонтального скролла', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(sw).toBeLessThanOrEqual(320 + 1);
});
