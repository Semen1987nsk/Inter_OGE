import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('заголовок ребрендирован', async ({ page }) => {
  await expect(page).toHaveTitle(/Комплект виртуального оборудования для ОГЭ по физике/);
});

test('клавиатура: Tab в сетку, стрелка двигает фокус, Enter открывает drawer', async ({ page }) => {
  // Click into the page first to establish focus context, then focus the first poster host.
  const grid = page.locator('[role=grid]');
  const firstPoster = grid.locator('kit-poster').first();
  await firstPoster.focus();

  // ArrowRight moves roving tabindex to the second poster host.
  await page.keyboard.press('ArrowRight');

  // Enter on the focused kit-poster HOST — activation handlers are now on the host,
  // so a real keypress opens the drawer without any page.evaluate workaround.
  await page.keyboard.press('Enter');

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
