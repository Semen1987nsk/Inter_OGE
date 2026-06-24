/**
 * E2E visual regression — постер-стена «home» v0.3.
 *
 * Базовые снапшоты:
 *   1. Стена по умолчанию 1440×900 (desktop).
 *   2. Drawer открыт (первый постер).
 *   3. Мобайл 1 колонка 390×844.
 *
 * NOTE: baselines сгенерированы на win32 — CI на Linux будет отличаться пиксельно.
 * Это ожидаемо. Обновить: npm --workspace=labosfera-home run test:e2e -- --update-snapshots
 */

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

test('VISUAL: постер-стена default 1440×900', async ({ page }) => {
  await page.goto('/');
  // Ждём появления хотя бы одного постера
  await page.waitForSelector('kit-poster', { timeout: 10_000 });
  // Небольшая пауза для завершения CSS-анимаций (transition/fade-in)
  await page.waitForTimeout(300);
  await expect(page).toHaveScreenshot('wall-default-1440.png', {
    animations: 'disabled',
    fullPage: true,
    maxDiffPixels: 500,
  });
});

test('VISUAL: drawer открыт — первый постер', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('kit-poster', { timeout: 10_000 });
  // Кликаем первый постер — он открывает drawer
  await page.locator('kit-poster').first().click();
  // Ждём появления открытого dialog
  await page.waitForSelector('dialog[open]', { timeout: 5_000 });
  await page.waitForTimeout(300);
  await expect(page).toHaveScreenshot('wall-drawer-open.png', {
    animations: 'disabled',
    fullPage: true,
    maxDiffPixels: 500,
  });
});

test('VISUAL: мобайл 1 колонка 390×844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForSelector('kit-poster', { timeout: 10_000 });
  await page.waitForTimeout(300);
  await expect(page).toHaveScreenshot('wall-mobile-390.png', {
    animations: 'disabled',
    fullPage: true,
    maxDiffPixels: 500,
  });
});
