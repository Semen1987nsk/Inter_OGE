/**
 * E2E — Опыт 1.1 «Плотность»: manual-flow §20.4 REFERENCE.md.
 *
 * Покрытие:
 *   - default = manual: drop в мензурку НЕ создаёт строку, нужна кнопка.
 *   - click по `#record-pending-btn` → запись в журнале.
 *   - toggle auto при накопленном pending → commit немедленно.
 *
 * Подход — реальный мышиный drag через `page.mouse.move/down/up`,
 * как в density-manual-flow vitest-тестах, но с настоящим браузером
 * (CSS layout, pointer-capture, hit-detection из density-overlay).
 */

import { test, expect, type Page } from '@playwright/test';

async function dragFromTo(
  page: Page,
  srcSel: string,
  dstSel: string,
  opts: { offsetX?: number; offsetY?: number } = {},
): Promise<void> {
  const src = page.locator(srcSel).first();
  const dst = page.locator(dstSel).first();
  const isOverlay = srcSel.startsWith('#weight-');
  if (!isOverlay) {
    await src.scrollIntoViewIfNeeded();
  }
  await dst.scrollIntoViewIfNeeded();
  const sBox = await src.boundingBox();
  const dBox = await dst.boundingBox();
  if (!sBox || !dBox) throw new Error(`bbox not found for ${srcSel} or ${dstSel}`);
  const sx = sBox.x + sBox.width / 2 + (opts.offsetX ?? 0);
  const sy = sBox.y + sBox.height / 2 + (opts.offsetY ?? 0);
  const dx = dBox.x + dBox.width / 2;
  const dy = dBox.y + dBox.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 25, sy + 25, { steps: 5 });
  await page.mouse.move(dx, dy, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(50);
}

async function setupManual(page: Page): Promise<void> {
  // §20.4 — устанавливаем manual до загрузки, чтобы оркестратор
  // прочитал его при первом render'е.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('inter-oge.record-mode.kit-1', 'fully-manual');
    } catch {
      /* ignore */
    }
  });
  await page.goto('/');
  await page.waitForSelector('lab-equipment-card[data-eq="balance"]', { timeout: 10_000 });
  await page.locator('#reset-btn').click();
}

test.describe('E2E — Опыт 1.1 manual-flow (§20.4 REFERENCE.md)', () => {
  test('default manual: drop в мензурку → кнопка «Записать», запись по клику', async ({
    page,
  }) => {
    await setupManual(page);

    // Шаги 1-4: собираем установку.
    await dragFromTo(page, 'lab-equipment-card[data-eq="balance"]', '[data-dropzone-id="balance"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cylinder"]', '[data-dropzone-id="cylinder"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="beaker"]', '[data-dropzone-id="cylinder"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cyl-1"]', '[data-dropzone-id="balance"]');
    await dragFromTo(page, '#weight-on-balance', '[data-dropzone-id="cylinder"]');

    // Inv1: журнал ПУСТ (manual default).
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(0);

    // Inv2: pending-кнопка visible с правильным текстом.
    const pendingSlot = page.locator('#record-pending-slot');
    await expect(pendingSlot).toBeVisible();
    const summary = await page.locator('#record-pending-summary').textContent();
    expect(summary).toContain('m =');
    expect(summary).toContain('V₁');
    expect(summary).toContain('V₂');

    // Inv3: click → запись.
    await page.locator('#record-pending-btn').click();
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(1);
    await expect(pendingSlot).toBeHidden();
  });

  test('toggle на auto при накопленном pending → запись немедленно', async ({ page }) => {
    await setupManual(page);

    await dragFromTo(page, 'lab-equipment-card[data-eq="balance"]', '[data-dropzone-id="balance"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cylinder"]', '[data-dropzone-id="cylinder"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="beaker"]', '[data-dropzone-id="cylinder"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cyl-2"]', '[data-dropzone-id="balance"]');
    await dragFromTo(page, '#weight-on-balance', '[data-dropzone-id="cylinder"]');

    await expect(page.locator('.lab-journal-body tr')).toHaveCount(0);
    await expect(page.locator('#record-pending-slot')).toBeVisible();

    // §21: toggle 3-сегментный — переключаем на «Полу-авто», pending зафиксируется.
    const semiBtn = page.locator(
      '#record-mode-slot button[data-mode="semi-auto"]',
    );
    await semiBtn.click();

    // Pending сразу зафиксировался, кнопка скрылась.
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(1);
    await expect(page.locator('#record-pending-slot')).toBeHidden();
  });

  test('detach цилиндра до записи → pending сбрасывается', async ({ page }) => {
    await setupManual(page);

    await dragFromTo(page, 'lab-equipment-card[data-eq="balance"]', '[data-dropzone-id="balance"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cylinder"]', '[data-dropzone-id="cylinder"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="beaker"]', '[data-dropzone-id="cylinder"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cyl-3"]', '[data-dropzone-id="balance"]');
    await dragFromTo(page, '#weight-on-balance', '[data-dropzone-id="cylinder"]');

    await expect(page.locator('#record-pending-slot')).toBeVisible();

    // Вынимаем цилиндр из мензурки через crestik (#detach-submerged).
    await page.locator('#detach-submerged').click();

    await expect(page.locator('#record-pending-slot')).toBeHidden();
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(0);
  });
});
