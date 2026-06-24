/**
 * E2E — Опыт 1.4 «F_арх(ρ жидкости)» в табе «Архимедова сила».
 *
 * Реальный браузерный flow (real mouse, не programmatic):
 *   - режим «Вода» (1.2) не сломан: happy-path даёт строку журнала;
 *   - режим «Раствор» (1.4): соль реально перетаскивается в стакан → ρ растёт;
 *   - 2 точки (вода + раствор) → график F_арх(ρ) виден.
 *
 * Salt-drag — через нативные page.mouse.* (memory-правило: D&D self-check
 * через мышь, не addItem-API — иначе overlay-dup и drop-flow не покрыты).
 */

import { test, expect, type Page } from '@playwright/test';
import type { ArchimedesExperiment } from '../src/screens/archimedes/ArchimedesExperiment';

declare global {
  interface Window {
    archimedesExperiment?: ArchimedesExperiment & {
      setLiquidMode(m: 'water' | 'solution'): void;
      addSaltPortion(): void;
      getFullState(): { liquidMode: string; saltPortions: number; liquidRhoKgM3: number };
    };
  }
}

async function setup(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('kit-1')) localStorage.removeItem(k);
      }
    } catch {
      /* ignore */
    }
  });
  await page.goto('/?screen=archimedes');
  await page.waitForFunction(() => typeof window.archimedesExperiment !== 'undefined', {
    timeout: 10_000,
  });
  await page.evaluate(() => window.archimedesExperiment?.reset());
}

/** Нативный drag через pointer events с дискретными шагами. */
async function dragFromTo(page: Page, srcSel: string, dstSel: string): Promise<void> {
  const src = page.locator(srcSel).first();
  const dst = page.locator(dstSel).first();
  await src.scrollIntoViewIfNeeded();
  await dst.scrollIntoViewIfNeeded();
  const sBox = await src.boundingBox();
  const dBox = await dst.boundingBox();
  if (!sBox || !dBox) throw new Error(`bbox not found for ${srcSel} or ${dstSel}`);
  const sx = sBox.x + sBox.width / 2;
  const sy = sBox.y + sBox.height / 2;
  const dx = dBox.x + dBox.width / 2;
  const dy = dBox.y + dBox.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 25, sy + 25, { steps: 5 });
  await page.mouse.move(dx, dy, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(60);
}

test.describe('E2E — Опыт 1.4 (режим раствора в табе Архимед)', () => {
  test('режим «Вода» (1.2) happy-path не сломан — строка в журнале', async ({ page }) => {
    await setup(page);
    // Тумблер виден и стоит на «Вода».
    await expect(page.locator('#ar-liquid-toggle')).toBeVisible();
    await expect(
      page.locator('#ar-liquid-toggle [data-liquid-mode="water"]'),
    ).toHaveAttribute('data-state', 'active');
    // Группа реактивов скрыта в режиме воды.
    await expect(page.locator('#ar-reagents-group')).toBeHidden();

    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.attachCylinderById(3);
      e.recordCurrentReading();
      e.placeBeaker();
      e.pourWater(200);
      e.dipCylinderInWater();
      e.recordCurrentReading();
    });
    await page.waitForTimeout(100);
    await expect(page.locator('#ar-journal-host tbody tr')).toHaveCount(1);
    // Колонка «Цилиндр» есть, «ρ» нет.
    const headers = await page.locator('#ar-journal-host thead th').allTextContents();
    expect(headers.some((h) => h.includes('Цилиндр'))).toBe(true);
    expect(headers.some((h) => h.includes('ρ'))).toBe(false);
  });

  test('режим «Раствор»: соль drag в стакан → ρ растёт; 2 точки → график виден', async ({
    page,
  }) => {
    await setup(page);
    // Переключаемся на раствор кликом по тумблеру.
    await page.locator('#ar-liquid-toggle [data-liquid-mode="solution"]').click();
    await expect(
      page.locator('#ar-liquid-toggle [data-liquid-mode="solution"]'),
    ).toHaveAttribute('data-state', 'active');
    // Группа реактивов (соль) появилась.
    await expect(page.locator('#ar-reagents-group')).toBeVisible();
    await expect(page.locator('lab-equipment-card[data-eq="salt"]')).toBeVisible();

    // Готовим сцену: динамометр 5Н, стакан, вода, цилиндр №3.
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(5);
      e.placeBeaker();
      e.pourWater(200);
    });
    await page.waitForTimeout(100);

    // Точка 1: чистая вода (ρ=1000).
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.attachCylinderById(3);
      e.recordCurrentReading();
      e.dipCylinderInWater();
      e.recordCurrentReading();
      e.liftCylinderFromWater();
    });
    await page.waitForTimeout(80);

    // Соль реальным drag в стакан → ρ 1000 → 1070.
    await dragFromTo(page, 'lab-equipment-card[data-eq="salt"]', '#ar-beaker-host');
    const rho = await page.evaluate(
      () => window.archimedesExperiment!.getFullState().liquidRhoKgM3,
    );
    expect(rho).toBe(1070);

    // Точка 2: раствор ρ=1070.
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.detachCylinder();
      e.attachCylinderById(3);
      e.recordCurrentReading();
      e.dipCylinderInWater();
      e.recordCurrentReading();
    });
    await page.waitForTimeout(100);

    // Журнал: 2 строки раствора, колонка «ρ» есть.
    await expect(page.locator('#ar-journal-host tbody tr')).toHaveCount(2);
    const headers = await page.locator('#ar-journal-host thead th').allTextContents();
    expect(headers.some((h) => h.includes('ρ'))).toBe(true);

    // График виден при ≥2 точках.
    await expect(page.locator('#ar-graph-wrap')).toBeVisible();
    const pointsCount = await page.evaluate(() => {
      const g = document.querySelector('#ar-graph') as unknown as {
        data: { points: unknown[] };
      };
      return g.data.points.length;
    });
    expect(pointsCount).toBeGreaterThanOrEqual(2);
  });

  test('режим «Раствор»: соль без воды — банер, ρ не растёт', async ({ page }) => {
    await setup(page);
    await page.locator('#ar-liquid-toggle [data-liquid-mode="solution"]').click();
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeBeaker(); // воды нет
    });
    await page.waitForTimeout(80);
    await dragFromTo(page, 'lab-equipment-card[data-eq="salt"]', '#ar-beaker-host');
    const state = await page.evaluate(() => window.archimedesExperiment!.getFullState());
    expect(state.saltPortions).toBe(0);
    expect(state.liquidRhoKgM3).toBe(1000);
    await expect(page.locator('#ar-banner')).toBeVisible();
  });
});
