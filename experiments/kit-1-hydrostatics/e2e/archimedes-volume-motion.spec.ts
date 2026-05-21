/**
 * E2E motion spec — Опыт 1.3 «F_А от объёма погружения».
 *
 * Task 7 (mechanical part): проверяем корректность после motion-polish Tasks 1-6:
 *   1. Визуальный baseline всего собранного стенда (animations: disabled).
 *   2. depth-label позиционирован слева от центра цилиндра (нет коллизии с detach).
 *   3. reduced-motion: стенд собирается без ошибок (prefers-reduced-motion: reduce).
 */

import { test, expect, type Page } from '@playwright/test';
import type { ArchimedesVolumeExperiment } from '../src/screens/archimedes-volume/ArchimedesVolumeExperiment';

declare global {
  interface Window {
    archimedesVolumeExperiment?: ArchimedesVolumeExperiment;
  }
}

async function assemble(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('kit-1') || k.startsWith('kit-1-hydrostatics')) {
          localStorage.removeItem(k);
        }
      }
    } catch { /* ignore */ }
  });
  await page.goto('/?screen=archimedes-volume');
  await page.waitForFunction(
    () => typeof window.archimedesVolumeExperiment !== 'undefined',
    { timeout: 10_000 },
  );
  await page.evaluate(() => window.archimedesVolumeExperiment?.reset());
  await page.evaluate(() => {
    const exp = window.archimedesVolumeExperiment!;
    exp.placeDynamometer();
    exp.attachCylinder();
    exp.placeBeaker();
  });
  await page.waitForTimeout(700); // entrance + playFill settle
}

test('собранный стенд 1.3 — visual baseline (анимации отключены)', async ({ page }) => {
  await assemble(page);
  await expect(page).toHaveScreenshot('av-assembled.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.02,
  });
});

test('depth-label слева от центра цилиндра (нет коллизии с detach)', async ({ page }) => {
  await assemble(page);
  await page.evaluate(() => {
    const exp = window.archimedesVolumeExperiment!;
    exp.fixateBaseline?.();
    exp.submergeTo?.(20);
  });
  await page.waitForTimeout(400);
  const label = page.locator('#av-depth-label');
  const cyl = page.locator('#av-cyl');
  const lb = await label.boundingBox();
  const cb = await cyl.boundingBox();
  expect(lb, 'depth-label должен быть виден').not.toBeNull();
  expect(cb, '#av-cyl должен быть виден').not.toBeNull();
  expect(lb!.x + lb!.width / 2).toBeLessThan(cb!.x + cb!.width / 2);
});

test('reduced-motion: стенд собирается без ошибок', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('kit-1') || k.startsWith('kit-1-hydrostatics')) {
          localStorage.removeItem(k);
        }
      }
    } catch { /* ignore */ }
  });
  await page.goto('/?screen=archimedes-volume');
  await page.waitForFunction(
    () => typeof window.archimedesVolumeExperiment !== 'undefined',
    { timeout: 10_000 },
  );
  await page.evaluate(() => window.archimedesVolumeExperiment?.reset());
  await page.evaluate(() => {
    const exp = window.archimedesVolumeExperiment!;
    exp.placeDynamometer();
    exp.attachCylinder();
    exp.placeBeaker();
  });
  await page.waitForTimeout(700);
  await expect(page.locator('#av-beaker-mount')).toBeVisible();
  await ctx.close();
});
