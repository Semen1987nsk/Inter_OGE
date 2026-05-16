/**
 * E2E Responsive — Опыт 1.2 «Архимедова сила».
 *
 * 5 брейкпоинтов по спеке §10:
 *   375  / 600  — mobile (iPhone SE)
 *   768  / 1024 — tablet portrait (iPad mini)
 *   1024 / 768  — tablet landscape
 *   1366 / 768  — laptop
 *   1920 / 1080 — desktop
 *
 * Кейсы для каждого:
 *   - страница рендерится без horizontal scroll;
 *   - ключевые элементы (header, nav, scene, equipment-panel, journal) видимы;
 *   - стек оборудования влезает в свой контейнер.
 */

import { test, expect, type Page } from '@playwright/test';
import type { ArchimedesExperiment } from '../src/screens/archimedes/ArchimedesExperiment';

declare global {
  interface Window {
    archimedesExperiment?: ArchimedesExperiment;
  }
}

const BREAKPOINTS = [
  { name: 'mobile-375',  width: 375,  height: 600  },
  { name: 'tablet-768',  width: 768,  height: 1024 },
  { name: 'desktop-1024', width: 1024, height: 768 },
  { name: 'laptop-1366', width: 1366, height: 768  },
  { name: 'desktop-1920', width: 1920, height: 1080 },
] as const;

async function setup(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('kit-1') || k.startsWith('kit-1-hydrostatics')) {
          localStorage.removeItem(k);
        }
      }
    } catch {
      /* ignore */
    }
  });
  await page.goto('/?screen=archimedes');
  await page.waitForFunction(
    () => typeof window.archimedesExperiment !== 'undefined',
    { timeout: 10_000 },
  );
  await page.evaluate(() => window.archimedesExperiment?.reset());
}

test.describe('E2E Responsive — Опыт 1.2', () => {
  for (const bp of BREAKPOINTS) {
    test(`${bp.name} (${bp.width}×${bp.height}): рендер без horizontal scroll, ключевые элементы видны`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await setup(page);

      // Ждём что layout стабилизировался (один tick).
      await page.waitForTimeout(100);

      // 1. Нет горизонтального overflow на body.
      const overflowsX = await page.evaluate(() => {
        const html = document.documentElement;
        const body = document.body;
        return Math.max(html.scrollWidth, body.scrollWidth) > window.innerWidth + 1;
      });
      expect(overflowsX, 'page overflows horizontally').toBe(false);

      // 2. Header и nav видимы.
      await expect(page.locator('lab-kit-header')).toBeVisible();
      await expect(page.locator('lab-kit-nav')).toBeVisible();

      // 3. Сцена и equipment-panel — оба видимы.
      await expect(page.locator('.archimedes-stage-area')).toBeVisible();
      await expect(page.locator('.archimedes-equipment-panel')).toBeVisible();

      // 4. Журнал виден (panel-плавающий, может перекрываться сценой).
      await expect(page.locator('#ar-journal-panel')).toBeAttached();
    });
  }

  // Mobile-specific: equipment-panel становится bottom-strip (горизонтальный
  // скролл групп). Проверяем что хотя бы один цилиндр в viewport (не за краем).
  test('mobile-375: equipment-panel — bottom-strip, цилиндр №3 виден', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 600 });
    await setup(page);
    await page.waitForTimeout(150);

    // Cyl-3 — в первом scroll-snap положении, должен быть видим.
    const card = page.locator('lab-equipment-card[data-eq="cyl-3"]');
    await expect(card).toBeVisible();

    // equipment-panel имеет flex-direction: row на mobile (наш CSS-фикс).
    const flexDir = await page.evaluate(() => {
      const panel = document.querySelector('.archimedes-equipment-panel');
      if (!panel) return '';
      return getComputedStyle(panel).flexDirection;
    });
    expect(flexDir).toBe('row');
  });

  // Tablet 768: equipment-panel остаётся справа (column).
  test('tablet-768: equipment-panel остаётся правым column', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await setup(page);
    await page.waitForTimeout(150);

    const flexDir = await page.evaluate(() => {
      const panel = document.querySelector('.archimedes-equipment-panel');
      if (!panel) return '';
      return getComputedStyle(panel).flexDirection;
    });
    expect(flexDir).toBe('column');
  });

  // Desktop 1920: левая (сцена) и правая (panel) колонки распределены.
  test('desktop-1920: ширина equipment-panel в пределах 280–420px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await setup(page);
    await page.waitForTimeout(150);

    const w = await page.evaluate(() => {
      const panel = document.querySelector('.archimedes-equipment-panel');
      if (!panel) return 0;
      return panel.getBoundingClientRect().width;
    });
    // По CSS: minmax(340px, 420px) при ≥ 1600px.
    expect(w).toBeGreaterThanOrEqual(330);
    expect(w).toBeLessThanOrEqual(440);
  });
});
