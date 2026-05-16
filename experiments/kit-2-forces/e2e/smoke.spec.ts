import { test, expect } from '@playwright/test';

/**
 * Smoke-тест: главная страница kit-2 загружается без ошибок,
 * рендерит шапку и хотя бы одну equipment-card. Минимальный гейт
 * чтобы CI не падал на «No tests found» — детальные сценарии
 * добавляются по мере необходимости.
 */
test('главная загружается без ошибок и показывает рабочее место', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`PAGE: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`);
  });

  await page.goto('/');
  await expect(page).toHaveTitle(/Комплект|Силы|ЛАБОСФЕРА/i);
  await page.waitForLoadState('networkidle');

  // Хотя бы одно оборудование на сцене
  const cards = page.locator('lab-equipment-card');
  await expect(cards.first()).toBeVisible({ timeout: 5_000 });

  expect(errors, `Ошибки в консоли:\n${errors.join('\n')}`).toEqual([]);
});
