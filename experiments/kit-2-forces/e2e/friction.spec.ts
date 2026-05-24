import { test, expect, type Page } from '@playwright/test';

/**
 * E2E — опыт 2.3 «Работа силы трения» (Task B) на friction-экране kit-2 (§21 v2).
 *
 * Главный сценарий — happy-path с РЕАЛЬНОЙ мышью (page.mouse.*, не programmatic
 * addItem): собрать установку (брусок + динамометр) → потянуть динамометр вправо
 * до скольжения → дождаться роста пути s → записать → ввести s и work → ✓ ok.
 *
 * Selectors — v2: `.lab-journal-body tr`, `#record-pending-btn`, `.j-verdict--ok`.
 * Старые `#journal-body` / `input.j-*` / `#record-form` устарели и НЕ используются.
 */

const FRICTION_URL = '/?screen=friction';

interface FrictionExperimentApi {
  setActiveTask(task: string): void;
  attachBlock(): boolean;
  attachDynamometerById(id: 'dyno-1' | 'dyno-5'): boolean;
  slideBlockTo(positionMm: number): void;
  applyForce(force: number): void;
  recordMeasurement(): void;
  measurements: ReadonlyArray<{
    frictionForce: number;
    distanceMm: number | null;
    work: number | null;
  }>;
}

async function gotoFriction(page: Page): Promise<void> {
  await page.goto(FRICTION_URL);
  await page.waitForLoadState('networkidle');
  // Дожидаемся, что friction-экран смонтировался (stepper задач виден).
  await expect(page.locator('#steps [data-task="B-work"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(
    () => Boolean((window as unknown as { frictionExperiment?: unknown }).frictionExperiment),
    { timeout: 10_000 },
  );
}

async function setSemiAuto(page: Page): Promise<void> {
  await page.evaluate(() => {
    try {
      localStorage.setItem('inter-oge.record-mode.kit-2', 'semi-auto');
    } catch {
      /* ignore */
    }
  });
}

test.describe('Friction Task B — работа силы трения', () => {
  test('smoke: friction-экран открывается, журнал пуст', async ({ page }) => {
    await gotoFriction(page);
    await expect(page.locator('#journal-empty')).toBeVisible();
    await expect(page.locator('#journal-host')).toBeHidden();
  });

  // Happy-path с РЕАЛЬНОЙ мышью — канонический pointer-жест (desktop). На touch-устройствах
  // тяга корпуса динамометра проверяется отдельно (drag-fidelity), здесь — мышиный pull.
  test('Task B happy-path: реальная тяга динамометра → путь → запись → ✓ work_J', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'Мышиный pull-жест проверяется на desktop; touch-fidelity — отдельный сценарий.',
    );
    await setSemiAuto(page);
    await gotoFriction(page);

    // Переключаемся на Task B.
    await page.locator('#steps [data-task="B-work"]').click();

    // Сборка установки через программный API (drag-сборка покрыта drag-тестами;
    // здесь ключевой жест — РЕАЛЬНАЯ тяга динамометра мышью ниже).
    await page.evaluate(() => {
      const exp = (window as unknown as { frictionExperiment: FrictionExperimentApi })
        .frictionExperiment;
      exp.attachBlock();
      exp.attachDynamometerById('dyno-5');
    });

    // path-readout виден в Task B.
    const readout = page.locator('#path-readout');
    await expect(readout).toBeVisible();
    await expect(page.locator('#path-readout-value')).toHaveText('s = 0,0 см');

    // РЕАЛЬНАЯ мышь: тянем корпус прицепленного динамометра вправо до скольжения.
    // PX_PER_N=100 → ~40 px = 0.4 Н (> порога срыва на поверхности А).
    const dyno = page.locator('.block-mount lab-dynamometer-h');
    await expect(dyno).toBeVisible();
    const box = await dyno.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Плавно тянем вправо несколькими шагами (имитация равномерного движения).
    for (let dx = 8; dx <= 80; dx += 8) {
      await page.mouse.move(startX + dx, startY, { steps: 2 });
      await page.waitForTimeout(30);
    }
    await page.mouse.up();

    // Дожидаемся, что путь стал > 0 (брусок проехал) — читаем из readout-текста.
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const el = document.querySelector('#path-readout-value');
            const t = el?.textContent ?? 's = 0,0 см';
            return parseFloat(
              t.replace('s = ', '').replace(' см', '').replace(',', '.'),
            );
          }),
        { timeout: 8_000 },
      )
      .toBeGreaterThan(0);

    // ready-to-record достигается через 250 ms после срыва. Дожидаемся pending-плашки.
    const pendingBtn = page.locator('#record-pending-btn');
    await expect(pendingBtn).toBeVisible({ timeout: 5_000 });
    await pendingBtn.click();

    // Журнал v2 отрисовал строку.
    const rows = page.locator('.lab-journal-body tr');
    await expect(rows).toHaveCount(1);

    // work_J — derived input в semi-auto. Вводим эталон, считая из state.
    const { F, sCm } = await page.evaluate(() => {
      const exp = (window as unknown as { frictionExperiment: FrictionExperimentApi })
        .frictionExperiment;
      const m = exp.measurements.at(-1)!;
      return { F: m.frictionForce, sCm: (m.distanceMm ?? 0) / 10 };
    });
    expect(sCm).toBeGreaterThan(0);
    const expectedWork = F * (sCm / 100);

    const workInput = page.locator('.lab-journal-body input[data-key="work_J"]');
    await expect(workInput).toBeVisible();
    await workInput.fill(expectedWork.toFixed(3).replace('.', ','));

    // Жмём ✓ и проверяем зелёный вердикт у work_J.
    await page.locator('.lab-journal-body button.j-check').first().click();
    await expect(page.locator('.lab-journal-body td[data-key="work_J"].j-verdict--ok')).toHaveCount(
      1,
    );
  });

  test('Task B: журнал содержит колонки s, см и A, Дж (не μ)', async ({ page }) => {
    await gotoFriction(page);
    await page.locator('#steps [data-task="B-work"]').click();
    await page.evaluate(() => {
      const exp = (window as unknown as { frictionExperiment: FrictionExperimentApi })
        .frictionExperiment;
      exp.attachBlock();
      exp.attachDynamometerById('dyno-5');
      exp.slideBlockTo(200);
      exp.applyForce(0.3);
      exp.recordMeasurement();
    });
    const headers = page.locator('.lab-journal-table th');
    await expect(headers.filter({ hasText: 'A, Дж' })).toHaveCount(1);
    await expect(headers.filter({ hasText: 's, см' })).toHaveCount(1);
    await expect(headers.filter({ hasText: 'μ' })).toHaveCount(0);
  });
});
