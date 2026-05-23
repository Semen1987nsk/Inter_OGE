/**
 * E2E real-browser drag&drop — Опыт 1.1 «Плотность твёрдого тела».
 *
 * Запускается через Playwright против Vite dev-сервера (port 5174).
 * Покрытие: критические пути ученического workflow + edge cases drag,
 * которые happy-dom не ловит (CSS layout, реальный pointer события,
 * визуальная корректность позиций).
 */

import { test, expect, type Page } from '@playwright/test';

/** Симулирует drag через нативные pointer events. Источник scrollIntoView'ится
 *  перед взятием bbox для карточек в правой панели (beaker в РАСХОДНЫХ
 *  бывает ниже viewport). Для overlay-источников на сцене scrollIntoView
 *  пропускаем — у них infinite-анимация (underwater-waver) и Playwright
 *  бесконечно ждёт «стабильности». */
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
  // Микропауза, чтобы Store успел отрендерить новую DOM (журнал v2 и пр)
  await page.waitForTimeout(50);
}

async function setupExperiment(page: Page): Promise<void> {
  await page.goto('/');
  // Ждём, пока экран опыта смонтирован (карточка весов появилась)
  await page.waitForSelector('lab-equipment-card[data-eq="balance"]', { timeout: 10_000 });
  // Сбросим, если localStorage сохранил предыдущий state
  await page.locator('#reset-btn').click();
}

test.describe('E2E — Опыт 1.1 Плотность', () => {
  test('happy-path: цилиндр-1 (сталь) полный workflow → запись в журнале', async ({ page }) => {
    await setupExperiment(page);

    // Шаг 1: весы и мензурка на сцену
    await dragFromTo(page, 'lab-equipment-card[data-eq="balance"]', '[data-dropzone-id="balance"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cylinder"]', '[data-dropzone-id="cylinder"]');
    await expect(page.locator('#balance')).toBeVisible();
    await expect(page.locator('#cylinder')).toBeVisible();

    // Шаг 2: налить воду
    await dragFromTo(page, 'lab-equipment-card[data-eq="beaker"]', '[data-dropzone-id="cylinder"]');

    // Шаг 3: цилиндр на весы
    await dragFromTo(page, 'lab-equipment-card[data-eq="cyl-1"]', '[data-dropzone-id="balance"]');
    await expect(page.locator('#balance')).toHaveAttribute('mass-g', '195');

    // Шаг 4: цилиндр в мензурку — карточка cyl-1 placed, тащим overlay со сцены
    await dragFromTo(page, '#weight-on-balance', '[data-dropzone-id="cylinder"]');

    // §21 v2 (semi-auto = default): измерение копится как pending — ученик
    // жмёт «Записать в журнал», программа пишет m/V₁/V₂. Без клика строки нет.
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(0); // regression: не авто-запись
    await page.locator('#record-pending-btn').click();

    // Журнал: 1 запись с верными m, V₁, V₂
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(1);
    const cells = await page.locator('.lab-journal-body tr td').allTextContents();
    expect(cells[2]).toBe('195');
    expect(cells[3]).toBe('100');
    expect(cells[4]).toBe('125');

    // Шаг 5: ученик заполняет V и ρ, нажимает ✓ → verdict OK.
    // §21 v2: каждая derived-колонка (V_cm3, ρ) получает свой вердикт —
    // обе верны (V=25=V₂−V₁; ρ=7800=m/V·1000 для стали) → ровно 2 «ok».
    await page.locator('.lab-journal-body tr input[data-key="V_cm3"]').fill('25');
    await page.locator('.lab-journal-body tr input[data-key="rho_kg_m3"]').fill('7800');
    await page.locator('.lab-journal-body tr button.j-check').click();
    await expect(page.locator('.j-verdict--ok')).toHaveCount(2);
  });

  test('drag overlay-цилиндра с весов в мензурку = одна непрерывная операция', async ({
    page,
  }) => {
    await setupExperiment(page);
    await dragFromTo(page, 'lab-equipment-card[data-eq="balance"]', '[data-dropzone-id="balance"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cylinder"]', '[data-dropzone-id="cylinder"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="beaker"]', '[data-dropzone-id="cylinder"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cyl-2"]', '[data-dropzone-id="balance"]');
    // Теперь overlay активен
    await expect(page.locator('#weight-on-balance')).toBeVisible();
    await expect(page.locator('#weight-on-balance')).toHaveAttribute('data-draggable', 'cyl-2');

    // Drag overlay → мензурка (не возвращаясь к карточке)
    await dragFromTo(page, '#weight-on-balance', '[data-dropzone-id="cylinder"]');

    // §21 v2: pending → запись по клику (строки до клика быть не должно).
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(0);
    await page.locator('#record-pending-btn').click();
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(1);
    await expect(page.locator('#weight-on-balance')).toBeHidden();
    await expect(page.locator('#weight-in-cylinder')).toBeVisible();
  });

  test('пустая мензурка: cyl-3 после массы → запись V₁=0, V₂=Vцил', async ({ page }) => {
    await setupExperiment(page);
    await dragFromTo(page, 'lab-equipment-card[data-eq="balance"]', '[data-dropzone-id="balance"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cylinder"]', '[data-dropzone-id="cylinder"]');
    // Без beaker — мензурка пустая
    await dragFromTo(page, 'lab-equipment-card[data-eq="cyl-3"]', '[data-dropzone-id="balance"]');
    // После placement карточка placed → второй шаг через overlay-balance
    await dragFromTo(page, '#weight-on-balance', '[data-dropzone-id="cylinder"]');
    // §21 v2: pending → запись по клику (строки до клика быть не должно).
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(0);
    await page.locator('#record-pending-btn').click();
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(1);
    const cells = await page.locator('.lab-journal-body tr td').allTextContents();
    expect(cells[2]).toBe('66');  // m cyl-3 = 66g
    expect(cells[3]).toBe('0');   // V₁ = 0 (пустая)
    expect(cells[4]).toBe('56');  // V₂ = 0 + 56 (пластик)
  });

  test('drag-ghost не имеет «иероглифов» — внутри настоящий цилиндр', async ({ page }) => {
    await setupExperiment(page);
    const card = page.locator('lab-equipment-card[data-eq="cyl-1"]').first();
    const box = await card.boundingBox();
    if (!box) throw new Error('cyl-1 card not found');
    const sx = box.x + box.width / 2;
    const sy = box.y + box.height / 2;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + 50, sy + 50, { steps: 5 });
    // Проверяем содержимое drag-ghost
    const ghostTag = await page.evaluate(
      () => document.querySelector('.density-drag-ghost')?.firstElementChild?.tagName,
    );
    expect(ghostTag).toBe('LAB-METAL-WEIGHT');
    await page.mouse.up();
  });

  test('detach-кнопки: ровно один X на каждом приборе', async ({ page }) => {
    await setupExperiment(page);
    await dragFromTo(page, 'lab-equipment-card[data-eq="balance"]', '[data-dropzone-id="balance"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cylinder"]', '[data-dropzone-id="cylinder"]');
    // Без груза: красные крестики видны
    await expect(page.locator('#detach-balance')).toBeVisible();
    await expect(page.locator('#detach-weight')).toBeHidden();
    await expect(page.locator('#detach-cylinder')).toBeVisible();
    await expect(page.locator('#detach-submerged')).toBeHidden();

    // Кладём груз на весы → красный исчезает, золотой появляется
    await dragFromTo(page, 'lab-equipment-card[data-eq="cyl-1"]', '[data-dropzone-id="balance"]');
    await expect(page.locator('#detach-balance')).toBeHidden();
    await expect(page.locator('#detach-weight')).toBeVisible();
  });

  test('reset из любой точки → чистый стол, журнал пуст', async ({ page }) => {
    await setupExperiment(page);
    await dragFromTo(page, 'lab-equipment-card[data-eq="balance"]', '[data-dropzone-id="balance"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cylinder"]', '[data-dropzone-id="cylinder"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="beaker"]', '[data-dropzone-id="cylinder"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cyl-1"]', '[data-dropzone-id="balance"]');
    await dragFromTo(page, '#weight-on-balance', '[data-dropzone-id="cylinder"]');
    // §21 v2: pending → запись по клику (строки до клика быть не должно).
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(0);
    await page.locator('#record-pending-btn').click();
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(1);
    await page.locator('#reset-btn').click();
    await expect(page.locator('.lab-journal-body tr')).toHaveCount(0);
    await expect(page.locator('#balance')).toBeHidden();
    await expect(page.locator('#cylinder')).toBeHidden();
  });

  test('нон-draggable клики (нить, соль, динамометры) не ставят прибор', async ({ page }) => {
    await setupExperiment(page);
    for (const eq of ['dyno-1', 'dyno-5', 'thread', 'salt']) {
      await page.locator(`lab-equipment-card[data-eq="${eq}"]`).first().click();
    }
    await expect(page.locator('#balance')).toBeHidden();
    await expect(page.locator('#cylinder')).toBeHidden();
  });

  test('RETURN-TO-KIT: drag прибора со сцены на свою карточку убирает в комплект', async ({
    page,
  }) => {
    await setupExperiment(page);
    // Полный сбор
    await dragFromTo(page, 'lab-equipment-card[data-eq="balance"]', '[data-dropzone-id="balance"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cylinder"]', '[data-dropzone-id="cylinder"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="beaker"]', '[data-dropzone-id="cylinder"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cyl-1"]', '[data-dropzone-id="balance"]');
    // Карточка cyl-1 placed (пустая ячейка)
    await expect(page.locator('lab-equipment-card[data-eq="cyl-1"]')).toHaveAttribute(
      'status',
      'placed',
    );
    // Возвращаем цилиндр в свою ячейку drag-ом
    await dragFromTo(page, '#weight-on-balance', '[data-dropzone-id="card-cyl-1"]');
    await expect(page.locator('lab-equipment-card[data-eq="cyl-1"]')).toHaveAttribute(
      'status',
      'available',
    );
    await expect(page.locator('#weight-on-balance')).toBeHidden();

    // Возвращаем мензурку с водой → drag в card-cylinder
    await dragFromTo(page, '#cylinder', '[data-dropzone-id="card-cylinder"]');
    await expect(page.locator('#cylinder')).toBeHidden();
    await expect(page.locator('lab-equipment-card[data-eq="cylinder"]')).toHaveAttribute(
      'status',
      'available',
    );

    // Весы тоже
    await dragFromTo(page, '#balance', '[data-dropzone-id="card-balance"]');
    await expect(page.locator('#balance')).toBeHidden();
    await expect(page.locator('lab-equipment-card[data-eq="balance"]')).toHaveAttribute(
      'status',
      'available',
    );
  });

  test('REVERSE: цилиндр из мензурки drag-ом обратно на весы', async ({ page }) => {
    await setupExperiment(page);
    await dragFromTo(page, 'lab-equipment-card[data-eq="balance"]', '[data-dropzone-id="balance"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cylinder"]', '[data-dropzone-id="cylinder"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="beaker"]', '[data-dropzone-id="cylinder"]');
    await dragFromTo(page, 'lab-equipment-card[data-eq="cyl-1"]', '[data-dropzone-id="balance"]');
    // После placement карточка placed — второй шаг через overlay-balance.
    await dragFromTo(page, '#weight-on-balance', '[data-dropzone-id="cylinder"]');
    // Цилиндр в мензурке
    await expect(page.locator('#weight-in-cylinder')).toBeVisible();
    await expect(page.locator('#weight-in-cylinder')).toHaveAttribute('data-draggable', 'cyl-1');

    // Drag overlay-cylinder → весы (RTL — "вынул и поставил обратно")
    await dragFromTo(page, '#weight-in-cylinder', '[data-dropzone-id="balance"]');
    await expect(page.locator('#weight-in-cylinder')).toBeHidden();
    await expect(page.locator('#weight-on-balance')).toBeVisible();

    // А теперь снова в воду — туда-сюда сколько хочешь
    await dragFromTo(page, '#weight-on-balance', '[data-dropzone-id="cylinder"]');
    await expect(page.locator('#weight-in-cylinder')).toBeVisible();
    await dragFromTo(page, '#weight-in-cylinder', '[data-dropzone-id="balance"]');
    await expect(page.locator('#weight-on-balance')).toBeVisible();
  });
});
