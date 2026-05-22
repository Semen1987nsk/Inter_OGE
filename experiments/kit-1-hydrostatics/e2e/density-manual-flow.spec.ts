/**
 * E2E — Опыт 1.1 «Плотность»: record-mode flows §21 REFERENCE.md (UX-v2).
 *
 * Покрытие трёх режимов записи журнала:
 *   - fully-manual: погружение цилиндра СРАЗУ создаёт строку журнала
 *     (без pending-кнопки); ученик заполняет все колонки руками.
 *   - semi-auto (DEFAULT): погружение → pending-плашка «Записать»; строка
 *     появляется только после клика. Переключение на «Авто» при накопленном
 *     pending → немедленный commit.
 *   - semi-auto: detach цилиндра до записи → pending сбрасывается.
 *
 * Подход — реальный мышиный drag через `page.mouse.move/down/up`
 * (helper `dragFromTo`), с настоящим браузером (CSS layout, pointer-capture,
 * hit-detection из density-overlay). Синтетическим pointer-event не доверяем.
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

/** §21 — стандартный заход в semi-auto (DEFAULT): localStorage не трогаем. */
async function setup(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('lab-equipment-card[data-eq="balance"]', { timeout: 10_000 });
  await page.locator('#reset-btn').click();
}

/** §21 — fully-manual: ставим режим в localStorage до загрузки SPA. */
async function setupManual(page: Page): Promise<void> {
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

/** Шаги 1-5: собираем установку и погружаем цилиндр `cylId` в мензурку. */
async function assembleAndDip(page: Page, cylId: string): Promise<void> {
  await dragFromTo(page, 'lab-equipment-card[data-eq="balance"]', '[data-dropzone-id="balance"]');
  await dragFromTo(page, 'lab-equipment-card[data-eq="cylinder"]', '[data-dropzone-id="cylinder"]');
  await dragFromTo(page, 'lab-equipment-card[data-eq="beaker"]', '[data-dropzone-id="cylinder"]');
  await dragFromTo(page, `lab-equipment-card[data-eq="${cylId}"]`, '[data-dropzone-id="balance"]');
  await dragFromTo(page, '#weight-on-balance', '[data-dropzone-id="cylinder"]');
}

test.describe('E2E — Опыт 1.1 record-mode flows (§21 REFERENCE.md, UX-v2)', () => {
  test('fully-manual: погружение → строка появляется сразу, без pending, колонки редактируемы', async ({
    page,
  }) => {
    await setupManual(page);

    await assembleAndDip(page, 'cyl-1');

    // §21 fully-manual: строка журнала появляется СРАЗУ при погружении.
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(1);

    // Pending-кнопки в fully-manual нет — слот скрыт.
    await expect(page.locator('#record-pending-slot')).toBeHidden();

    // Meta-колонки readonly: № и метка цилиндра — текст, не input.
    const row = page.locator('.lab-journal-body tr').first();
    await expect(row.locator('td[data-key="idx"]')).toHaveText('1');
    await expect(row.locator('td[data-key="cylinder"]')).toContainText('Цилиндр');

    // Все измеримые колонки — редактируемые input'ы (присутствуют в строке;
    // последние колонки журнала могут уходить под горизонтальный скролл,
    // потому проверяем наличие input'а, а не геометрическую видимость).
    for (const key of ['m_g', 'V1_ml', 'V2_ml', 'V_cm3', 'rho_kg_m3']) {
      await expect(row.locator(`input[data-key="${key}"]`)).toHaveCount(1);
    }

    // direct-поля предзаполнены нулями (#commitEmptyManualRow),
    // derived — пустые (ученик считает сам).
    await expect(row.locator('input[data-key="m_g"]')).toHaveValue('0');
    await expect(row.locator('input[data-key="V1_ml"]')).toHaveValue('0');
    await expect(row.locator('input[data-key="V2_ml"]')).toHaveValue('0');
    await expect(row.locator('input[data-key="V_cm3"]')).toHaveValue('');
    await expect(row.locator('input[data-key="rho_kg_m3"]')).toHaveValue('');

    // В fully-manual ✓-кнопки проверки нет (ученик считает без подсказок).
    await expect(row.locator('button.j-check')).toHaveCount(0);
  });

  test('semi-auto → переключение на «Авто» при накопленном pending → commit немедленно', async ({
    page,
  }) => {
    await setup(page);

    await assembleAndDip(page, 'cyl-2');

    // §21 semi-auto (DEFAULT): строки ещё нет, видна pending-плашка «Записать».
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(0);
    await expect(page.locator('#record-pending-slot')).toBeVisible();

    // Переключаем 3-сегментный toggle на «Авто» (fully-auto):
    // обработчик #handleRecordModeChange коммитит накопленный pending сразу.
    await page.locator('#record-mode-slot button[data-mode="fully-auto"]').click();

    // Pending зафиксировался полной строкой, слот скрылся.
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(1);
    await expect(page.locator('#record-pending-slot')).toBeHidden();
  });

  test('semi-auto: detach цилиндра из мензурки до записи → pending сбрасывается', async ({
    page,
  }) => {
    await setup(page);

    await assembleAndDip(page, 'cyl-3');

    // §21 semi-auto: pending накоплен, строки ещё нет.
    await expect(page.locator('#record-pending-slot')).toBeVisible();
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(0);

    // Вынимаем цилиндр из мензурки через крестик (#detach-submerged):
    // #handleDetachSubmerged сбрасывает pending для этого же цилиндра.
    await page.locator('#detach-submerged').click();

    await expect(page.locator('#record-pending-slot')).toBeHidden();
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(0);
  });
});
