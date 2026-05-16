import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Аудит доступности через axe-core.
 *
 * Проверяет:
 *  - WCAG 2.1 AA (включает контрасты, ARIA, семантику, фокус)
 *  - Нарушений быть НЕ должно ни одного на главной странице.
 *  - Нарушений быть НЕ должно после взаимодействия (3 измерения).
 */

test.describe('A11y — WCAG 2.1 AA', () => {
  test('Главная страница — 0 violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => {
      return Boolean(
        (window as unknown as { springExperiment?: unknown }).springExperiment,
      );
    });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  test('После 3 измерений — 0 violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => {
      return Boolean(
        (window as unknown as { springExperiment?: unknown }).springExperiment,
      );
    });

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

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });
});

function formatViolations(violations: ReadonlyArray<{ id: string; help: string; nodes: ReadonlyArray<{ html: string }> }>): string {
  if (violations.length === 0) return 'no violations';
  return violations
    .map((v) => `[${v.id}] ${v.help}\n  ${v.nodes.map((n) => n.html).slice(0, 3).join('\n  ')}`)
    .join('\n\n');
}
