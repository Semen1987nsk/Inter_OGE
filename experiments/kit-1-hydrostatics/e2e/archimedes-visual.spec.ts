/**
 * E2E visual regression — Опыт 1.2 «Архимедова сила».
 *
 * 8 baseline-снапшотов по спеке §9.6:
 *   1. dynamometer-empty-on-scene        — динамометр без груза
 *   2. dynamometer-with-cyl3-in-air      — цилиндр №3 подвешен, в воздухе
 *   3. dynamometer-with-cyl3-in-water    — цилиндр №3 полностью погружён
 *   4. dynamometer-overload-cyl1         — цилиндр №1 перегружает динамометр №1
 *   5. journal-after-1-row               — журнал с 1 полной строкой
 *   6. journal-after-3-rows-with-formula — 3 строки + formula-card
 *   7. kit-nav-tab-current-1-2           — top-tabs nav, 1.2 current
 *   8. mobile-768-archimedes             — mobile viewport 768×1024
 *
 * Все с `animations: 'disabled'`, `maxDiffPixels: 200`. При первом запуске
 * Playwright создаёт baseline; при повторном — сравнивает.
 *
 * Программный API через `window.archimedesExperiment` — детерминированный путь,
 * без зависимости от drag&drop таймингов.
 */

import { test, expect, type Page } from '@playwright/test';
import type { ArchimedesExperiment } from '../src/screens/archimedes/ArchimedesExperiment';

declare global {
  interface Window {
    archimedesExperiment?: ArchimedesExperiment;
  }
}

async function setupArchimedes(page: Page): Promise<void> {
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

/**
 * Прогоняет happy-path для одного цилиндра. Дожидается окончания всех анимаций
 * (600мс dip + 1500мс шумовая стабилизация) для детерминированного снапшота.
 */
async function recordOneCylinder(
  page: Page,
  cylId: 2 | 3 | 4,
  waterMl: number = 200,
): Promise<void> {
  await page.evaluate(
    ({ id, water }) => {
      const e = window.archimedesExperiment!;
      // Подготовка сцены ставится один раз — здесь только для первого вызова.
      if (e.getFullState().dynoRange === null) e.placeDynamometer(1);
      if (!e.getFullState().beakerOnScene) e.placeBeaker();
      if (e.getFullState().waterMl < 100) e.pourWater(water);
      e.attachCylinderById(id as 2 | 3 | 4);
    },
    { id: cylId, water: waterMl },
  );
  await page.waitForTimeout(1700); // шумовая стабилизация P_возд
  await page.evaluate(() => window.archimedesExperiment!.recordCurrentReading());
  await page.evaluate(() => window.archimedesExperiment!.dipCylinderInWater());
  await page.waitForTimeout(2300); // 600мс анимация + 1500мс шум
  await page.evaluate(() => window.archimedesExperiment!.recordCurrentReading());
  await page.evaluate(() => {
    const e = window.archimedesExperiment!;
    e.liftCylinderFromWater();
    e.detachCylinder();
  });
  await page.waitForTimeout(700);
}

test.describe('Visual regression — Опыт 1.2', () => {
  test('1. dynamometer-empty-on-scene — динамометр без груза', async ({ page }) => {
    await setupArchimedes(page);
    await page.evaluate(() => window.archimedesExperiment!.placeDynamometer(1));
    await page.waitForTimeout(150);
    await expect(page.locator('#ar-stage')).toHaveScreenshot(
      'dynamometer-empty-on-scene.png',
      { maxDiffPixels: 200, animations: 'disabled' },
    );
  });

  test('2. dynamometer-with-cyl3-in-air — цилиндр №3 в воздухе', async ({ page }) => {
    await setupArchimedes(page);
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.attachCylinderById(3);
    });
    // Ждём шумовую стабилизацию для устойчивого показания LCD.
    await page.waitForTimeout(1700);
    await expect(page.locator('#ar-stage')).toHaveScreenshot(
      'dynamometer-with-cyl3-in-air.png',
      { maxDiffPixels: 200, animations: 'disabled' },
    );
  });

  test('3. dynamometer-with-cyl3-in-water-full — цилиндр №3 полностью погружён', async ({
    page,
  }) => {
    await setupArchimedes(page);
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.placeBeaker();
      e.pourWater(200);
      e.attachCylinderById(3);
      e.dipCylinderInWater();
    });
    // 600мс анимация погружения + 1500мс стабилизация.
    await page.waitForTimeout(2300);
    await expect(page.locator('#ar-stage')).toHaveScreenshot(
      'dynamometer-with-cyl3-in-water-full.png',
      { maxDiffPixels: 200, animations: 'disabled' },
    );
  });

  test('4. dynamometer-overload-cyl1 — перегрузка №1 на динамометре 1Н', async ({ page }) => {
    await setupArchimedes(page);
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.attachCylinderById(1);
    });
    await page.waitForTimeout(1700); // шум стабилизация (force зашкаливает)
    // Проверим, что overloaded=true действительно установлено (детерминизм snapshot).
    const overloaded = await page.evaluate(() =>
      window.archimedesExperiment!.getOverloaded(),
    );
    expect(overloaded).toBe(true);
    await expect(page.locator('#ar-stage')).toHaveScreenshot(
      'dynamometer-overload-cyl1.png',
      { maxDiffPixels: 200, animations: 'disabled' },
    );
  });

  test('5. journal-after-1-row — журнал с одной полной строкой', async ({ page }) => {
    await setupArchimedes(page);
    await recordOneCylinder(page, 3, 200);
    // Ждём, что строка появилась.
    const rowCount = await page.evaluate(
      () => window.archimedesExperiment!.getJournalRows().length,
    );
    expect(rowCount).toBe(1);
    await expect(page.locator('lab-journal')).toHaveScreenshot(
      'journal-after-1-row.png',
      { maxDiffPixels: 200, animations: 'disabled' },
    );
  });

  test('6. journal-after-3-rows-with-formula — 3 строки + formula-card', async ({
    page,
  }) => {
    await setupArchimedes(page);
    // Один раз ставим динамометр + стакан + воду; затем 3 цилиндра.
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.placeBeaker();
      e.pourWater(200);
    });
    for (const id of [2, 3, 4] as const) {
      await page.evaluate((cid) => {
        window.archimedesExperiment!.attachCylinderById(cid as 2 | 3 | 4);
      }, id);
      await page.waitForTimeout(1700);
      await page.evaluate(() => window.archimedesExperiment!.recordCurrentReading());
      await page.evaluate(() => window.archimedesExperiment!.dipCylinderInWater());
      await page.waitForTimeout(2300);
      await page.evaluate(() => window.archimedesExperiment!.recordCurrentReading());
      await page.evaluate(() => {
        const e = window.archimedesExperiment!;
        e.liftCylinderFromWater();
        e.detachCylinder();
      });
      await page.waitForTimeout(700);
    }
    const rowCount = await page.evaluate(
      () => window.archimedesExperiment!.getJournalRows().length,
    );
    expect(rowCount).toBe(3);
    await expect(page.locator('lab-journal')).toHaveScreenshot(
      'journal-after-3-rows-with-formula.png',
      { maxDiffPixels: 200, animations: 'disabled' },
    );
  });

  test('7. kit-nav-tab-current-1-2 — top-tabs nav, 1.2 current', async ({ page }) => {
    await setupArchimedes(page);
    // Ждём, что nav смонтирован и стили применились.
    await expect(page.locator('lab-kit-nav')).toHaveAttribute('active', 'archimedes');
    await page.waitForTimeout(150);
    await expect(page.locator('lab-kit-nav')).toHaveScreenshot(
      'kit-nav-tab-current-1-2.png',
      { maxDiffPixels: 200, animations: 'disabled' },
    );
  });

  test('8. mobile-768-archimedes — viewport 768×1024', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await setupArchimedes(page);
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.attachCylinderById(3);
    });
    await page.waitForTimeout(1700);
    // Полный screenshot страницы в mobile — снимок всего layout 1.2.
    await expect(page).toHaveScreenshot('mobile-768-archimedes.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
      fullPage: false,
    });
  });
});
