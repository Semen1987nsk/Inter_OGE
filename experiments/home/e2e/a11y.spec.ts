/**
 * E2E A11y — постер-стена «home» v0.3.
 *
 * axe-core WCAG 2.2 AA на:
 *   1. Главная страница (initial state).
 *   2. Drawer открыт (первый постер).
 *
 * Нарушения — реальные находки, не отключаем без обоснования.
 * Если test провалился — смотри описание violation'ов в stdout.
 */

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

function buildAxe(page: Parameters<typeof AxeBuilder>[0]['page']): AxeBuilder {
  return new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
  ]);
}

test('A11Y: главная страница — 0 violations (WCAG 2.2 AA)', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('kit-poster', { timeout: 10_000 });
  const results = await buildAxe(page).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('A11Y: drawer открыт — 0 violations (WCAG 2.2 AA)', async ({ page }) => {
  // Disable CSS animations so axe does not catch elements mid-animation
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForSelector('kit-poster', { timeout: 10_000 });
  // Открываем drawer кликом на первый постер
  await page.locator('kit-poster').first().click();
  await page.waitForSelector('dialog[open]', { timeout: 5_000 });
  const results = await buildAxe(page).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
