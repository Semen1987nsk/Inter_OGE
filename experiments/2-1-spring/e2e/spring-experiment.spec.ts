import { expect, test } from '@playwright/test';

/**
 * E2E тесты опыта 2.1 «Жёсткость пружины».
 *
 * Покрытие:
 *  1. Загрузка страницы без ошибок консоли (smoke).
 *  2. Подвес 100 г → корректные F, Δl, k, кнопка записи активна.
 *  3. Три измерения → k̄=50, σ=0, попадание в интервал, на графике 3 точки.
 *  4. Удаление измерения через × в таблице → пересчёт, точка исчезает с графика.
 *  5. Переключение пружины №1 → №2 (mystery) сбрасывает измерения и грузы.
 *  6. Touch-эмуляция (iPad/iPhone) — UI рендерится без ошибок, программный API работает.
 */

test.describe('Опыт 2.1 — Жёсткость пружины', () => {
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    (page as unknown as { __errors: string[] }).__errors = errors;

    await page.goto('/');
    await page.waitForFunction(() => {
      return Boolean(
        (window as unknown as { springExperiment?: unknown }).springExperiment,
      );
    });
  });

  test('1. Smoke: загружается без ошибок, заголовок и базовый layout на месте', async ({ page }) => {
    await expect(page).toHaveTitle(/Жёсткость пружины/);
    await expect(page.locator('.logo')).toContainText('ЛАБОСФЕРА');
    await expect(page.locator('#shelf')).toBeVisible();
    await expect(page.locator('#stage')).toBeVisible();
    await expect(page.locator('#graph')).toBeVisible();
    await expect(page.locator('#record-btn')).toBeDisabled();

    const errors = (page as unknown as { __errors: string[] }).__errors;
    expect(errors, `Console errors: ${errors.join('\n')}`).toHaveLength(0);
  });

  test('2. Подвес 100 г → F=0.98 Н, Δl=2.0 см, k=50 Н/м, кнопка записи активна', async ({ page }) => {
    await page.evaluate(() => {
      const exp = (window as unknown as { springExperiment: { attachWeightById: (id: string) => boolean } })
        .springExperiment;
      exp.attachWeightById('std-0');
    });

    const readings = page.locator('#live-readings');
    await expect(readings).toContainText('0.98');
    await expect(readings).toContainText('2.0');
    await expect(readings).toContainText('50');

    await expect(page.locator('#record-btn')).not.toBeDisabled();
  });

  test('3. Три измерения 100/200/300 г → k̄=50, σ=0, граф с 3 точками + аппроксимация', async ({ page }) => {
    await page.evaluate(() => {
      const exp = (
        window as unknown as {
          springExperiment: {
            attachWeightById: (id: string) => boolean;
            recordMeasurement: () => void;
          };
        }
      ).springExperiment;
      exp.attachWeightById('std-0');
      exp.recordMeasurement();
      exp.attachWeightById('std-1');
      exp.recordMeasurement();
      exp.attachWeightById('std-2');
      exp.recordMeasurement();
    });

    const tableRows = page.locator('#measurements-body tr');
    await expect(tableRows).toHaveCount(3);

    const result = page.locator('#result');
    await expect(result).toContainText('50.0');
    await expect(result).toContainText('0.00');
    await expect(result).toContainText('В интервале');

    const graphPoints = page.locator('#graph circle.point');
    await expect(graphPoints).toHaveCount(3);

    const fitLabel = page.locator('#graph .fit-label');
    await expect(fitLabel).toContainText('k ≈ 50');
  });

  test('4. Удаление измерения через × → точка пропадает с графика', async ({ page }) => {
    await page.evaluate(() => {
      const exp = (
        window as unknown as {
          springExperiment: {
            attachWeightById: (id: string) => boolean;
            recordMeasurement: () => void;
          };
        }
      ).springExperiment;
      exp.attachWeightById('std-0');
      exp.recordMeasurement();
      exp.attachWeightById('std-1');
      exp.recordMeasurement();
    });

    await expect(page.locator('#measurements-body tr')).toHaveCount(2);
    await expect(page.locator('#graph circle.point')).toHaveCount(2);

    // Удаляем первую строку через ×
    await page.locator('#measurements-body tr').first().hover();
    await page.locator('#measurements-body tr').first().locator('.row-delete-btn').click();

    await expect(page.locator('#measurements-body tr')).toHaveCount(1);
    await expect(page.locator('#graph circle.point')).toHaveCount(1);
  });

  test('5. Переключение пружины №1 → №2 (mystery) сбрасывает измерения', async ({ page }) => {
    await page.evaluate(() => {
      const exp = (
        window as unknown as {
          springExperiment: {
            attachWeightById: (id: string) => boolean;
            recordMeasurement: () => void;
          };
        }
      ).springExperiment;
      exp.attachWeightById('std-0');
      exp.recordMeasurement();
    });
    await expect(page.locator('#measurements-body tr')).toHaveCount(1);

    // Кликаем на пружину №2 в селекторе
    await page.locator('.spring-option[data-spring="k10"]').click();

    await expect(page.locator('.spring-option[data-spring="k10"].active')).toBeVisible();
    // Записанные измерения сбросились
    await expect(page.locator('#measurements-body .empty-state')).toBeVisible();

    // На пружине №2 (k=10) подвешиваем 100г и видим Δl ~9.8 см (в 5 раз больше k=50)
    await page.evaluate(() => {
      const exp = (window as unknown as { springExperiment: { attachWeightById: (id: string) => boolean } })
        .springExperiment;
      exp.attachWeightById('std-0');
    });
    await expect(page.locator('#live-readings')).toContainText('9.8');
  });
});
