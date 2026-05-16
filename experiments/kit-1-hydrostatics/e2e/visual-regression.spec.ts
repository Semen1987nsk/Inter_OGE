/**
 * E2E visual regression — снапшоты ключевых состояний мензурки.
 *
 * Поймал бы тот самый баг «вода из ниоткуда»: state корректный, а пиксели
 * не совпадают с baseline → diff подсветит зону «вода в пустой мензурке».
 *
 * Также пиксельная проверка ловит:
 *   - смещение overlay-цилиндра при разных размерах
 *   - схлопывание ghost'а
 *   - неверные градиенты, обрезанные подписи и т.д.
 *
 * При первом запуске Playwright создаёт baseline (.png рядом со spec'ом),
 * при последующих сравнивает. Чтобы обновить baseline — `--update-snapshots`.
 */

import { test, expect, type Page } from '@playwright/test';

async function dragFromTo(page: Page, srcSel: string, dstSel: string): Promise<void> {
  const src = page.locator(srcSel).first();
  const dst = page.locator(dstSel).first();
  if (!srcSel.startsWith('#weight-')) {
    await src.scrollIntoViewIfNeeded();
  }
  await dst.scrollIntoViewIfNeeded();
  const sBox = await src.boundingBox();
  const dBox = await dst.boundingBox();
  if (!sBox || !dBox) throw new Error(`bbox not found`);
  const sx = sBox.x + sBox.width / 2;
  const sy = sBox.y + sBox.height / 2;
  const dx = dBox.x + dBox.width / 2;
  const dy = dBox.y + dBox.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 25, sy + 25, { steps: 5 });
  await page.mouse.move(dx, dy, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(80);
}

async function setup(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('lab-equipment-card[data-eq="balance"]', { timeout: 10_000 });
  await page.locator('#reset-btn').click();
}

test.describe('Visual regression — мензурка', () => {
  test('REGRESSION: цилиндр в ПУСТУЮ мензурку → воды визуально нет', async ({ page }) => {
    await setup(page);
    await dragFromTo(page, 'lab-equipment-card[data-eq="balance"]', '[data-dropzone-id="balance"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cylinder"]', '[data-dropzone-id="cylinder"]');
    // НЕ наливаем воду; масса измерена → запись V₁=0
    await dragFromTo(page, 'lab-equipment-card[data-eq="cyl-1"]', '[data-dropzone-id="balance"]');
    // Карточка cyl-1 placed → второй шаг через overlay-balance
    await dragFromTo(page, '#weight-on-balance', '[data-dropzone-id="cylinder"]');

    // Жёсткая проверка: высота rect воды в shadow DOM = 0
    const waterHeight = await page.evaluate(() => {
      const cyl = document.querySelector('#cylinder');
      const w = cyl?.shadowRoot?.getElementById('cyl-water') as SVGRectElement | null;
      return parseFloat(w?.getAttribute('height') ?? '-1');
    });
    expect(waterHeight, 'water rect height в пустой мензурке должна быть 0').toBe(0);

    // Visual snapshot мензурки — diff покажет, если в каком-то рендере воду
    // подло снова рисовать начнут.
    await expect(page.locator('#cylinder')).toHaveScreenshot('cylinder-empty-with-weight.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('налита вода 100 мл, цилиндр погружён → height = 125 мл', async ({ page }) => {
    await setup(page);
    await dragFromTo(page, 'lab-equipment-card[data-eq="balance"]', '[data-dropzone-id="balance"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cylinder"]', '[data-dropzone-id="cylinder"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="beaker"]', '[data-dropzone-id="cylinder"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cyl-1"]', '[data-dropzone-id="balance"]');
    // Карточка cyl-1 placed → второй шаг через overlay-balance
    await dragFromTo(page, '#weight-on-balance', '[data-dropzone-id="cylinder"]');

    const waterHeight = await page.evaluate(() => {
      const cyl = document.querySelector('#cylinder');
      const w = cyl?.shadowRoot?.getElementById('cyl-water') as SVGRectElement | null;
      return parseFloat(w?.getAttribute('height') ?? '0');
    });
    // PIXELS_PER_ML = (230-36)/250 = 0.776; 125 ml ≈ 97 px
    expect(waterHeight).toBeGreaterThan(90);
    expect(waterHeight).toBeLessThan(110);

    await expect(page.locator('#cylinder')).toHaveScreenshot('cylinder-with-water-and-weight.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('пустая мензурка без цилиндра → совсем сухая', async ({ page }) => {
    await setup(page);
    await dragFromTo(page, 'lab-equipment-card[data-eq="cylinder"]', '[data-dropzone-id="cylinder"]');
    const waterHeight = await page.evaluate(() => {
      const cyl = document.querySelector('#cylinder');
      const w = cyl?.shadowRoot?.getElementById('cyl-water') as SVGRectElement | null;
      return parseFloat(w?.getAttribute('height') ?? '-1');
    });
    expect(waterHeight).toBe(0);
  });
});
