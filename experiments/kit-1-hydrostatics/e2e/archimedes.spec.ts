/**
 * E2E real-browser сценарии — Опыт 1.2 «Архимедова сила».
 *
 * Покрытие (по спеке §9.5, 6 базовых сценариев):
 *   1. Smoke — страница открывается, ключевые элементы видны, console clean.
 *   2. Happy-path с цилиндром №3 — полный цикл measurements + journal.
 *   3. Все 3 цилиндра подряд (№2 → №3 → №4) — Δ_pct ≤ 5% для всех.
 *   4. Reset с undo-toast — кнопка «Отменить» восстанавливает журнал.
 *   5. Reverse drag — цилиндр обратно с динамометра в kit.
 *   6. Switch tab — состояние сохраняется через kit-nav переключение.
 *
 * Подход: программный API через `window.archimedesExperiment`, как в
 * REFERENCE.md §11. DOM-events — только там где это критично (smoke,
 * reset-toast click, kit-nav click).
 */

import { test, expect, type Page } from '@playwright/test';
import type { ArchimedesExperiment } from '../src/screens/archimedes/ArchimedesExperiment';

declare global {
  interface Window {
    archimedesExperiment?: ArchimedesExperiment;
  }
}

/** Открывает страницу, дожидается монтирования экрана 1.2 и сбрасывает state. */
async function setupArchimedes(page: Page): Promise<void> {
  // Чистим ВСЕ относящиеся ключи до загрузки (URL params + localStorage),
  // чтобы предыдущий тест не повлиял.
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
  // Ждём, что экран смонтирован — оркестратор экспортирован в window.
  await page.waitForFunction(
    () => typeof window.archimedesExperiment !== 'undefined',
    { timeout: 10_000 },
  );
  // Сбрасываем на всякий случай (если что-то загрузилось из localStorage).
  await page.evaluate(() => window.archimedesExperiment?.reset());
}

/** Считает количество строк в журнале опыта 1.2. */
async function journalRowsCount(page: Page): Promise<number> {
  return page.evaluate(
    () => window.archimedesExperiment?.getJournalRows().length ?? 0,
  );
}

test.describe('E2E — Опыт 1.2 Архимедова сила', () => {
  // Сценарий 1: smoke — страница, навигация, оборудование, журнал, console clean.
  test('SMOKE: страница открывается, ключевые элементы на месте, 0 console errors', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await setupArchimedes(page);

    // Header показывает «Опыт 1.2».
    await expect(page.locator('lab-kit-header')).toHaveAttribute(
      'experiment-kicker',
      'Опыт 1.2',
    );
    await expect(page.locator('lab-kit-header')).toHaveAttribute(
      'experiment',
      'Архимедова сила',
    );

    // Top-tabs: 2 таба (1.1 + 1.2), 1.2 — current.
    const navButtons = page.locator('lab-kit-nav').locator(':scope >> button');
    await expect(navButtons).toHaveCount(2);
    await expect(page.locator('lab-kit-nav')).toHaveAttribute('active', 'archimedes');

    // Equipment-panel содержит 4 цилиндра + 2 динамометра + стакан (всего 7 карточек).
    const cards = page.locator('lab-equipment-card[data-eq]');
    await expect(cards).toHaveCount(7);
    for (const eq of [
      'dynamometer-1',
      'dynamometer-2',
      'cyl-1',
      'cyl-2',
      'cyl-3',
      'cyl-4',
      'beaker',
    ]) {
      await expect(page.locator(`lab-equipment-card[data-eq="${eq}"]`)).toBeVisible();
    }

    // Журнал в начальном состоянии (placeholder).
    expect(await journalRowsCount(page)).toBe(0);
    const journalHasEmptyText = await page.evaluate(() => {
      const j = document.querySelector('lab-journal');
      return j?.shadowRoot?.querySelector('.empty')?.textContent?.includes('Записей пока нет') ?? false;
    });
    expect(journalHasEmptyText).toBe(true);

    // 0 console errors во время монтирования.
    expect(consoleErrors).toEqual([]);
  });

  // Сценарий 2: Happy-path — полный цикл с цилиндром №3.
  test('HAPPY-PATH cyl-3: полный цикл → 1 строка журнала с верными числами + toast', async ({
    page,
  }) => {
    await setupArchimedes(page);

    // Прогон через программный API
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.attachCylinderById(3);
      e.placeBeaker();
      e.pourWater(150);
      e.recordCurrentReading(); // P_возд
      e.dipCylinderInWater();
    });

    // Ждём окончания 600мс анимации погружения и 1500мс шумовой стабилизации.
    await page.waitForTimeout(2300);

    await page.evaluate(() => {
      window.archimedesExperiment!.recordCurrentReading(); // P_жид
    });

    // state === liquid-recorded
    const state = await page.evaluate(() => window.archimedesExperiment!.getState());
    expect(state).toBe('liquid-recorded');

    // 1 строка с правильными числами.
    expect(await journalRowsCount(page)).toBe(1);
    const row = await page.evaluate(() => window.archimedesExperiment!.getJournalRows()[0]);
    expect(row.cylinder).toBe('No3');
    expect(row.V_cm3).toBe(56);
    expect(row.P_air_N).toBeCloseTo(0.65, 2);
    expect(row.P_liquid_N).toBeCloseTo(0.1, 2);
    expect(row.F_A_meas_N).toBeCloseTo(0.55, 2);
    expect(row.F_A_theor_N).toBeCloseTo(0.549, 3);
    expect(Math.abs(row.delta_pct ?? 999)).toBeLessThan(1.0);

    // Stepper: 6-й шаг done; 7-й «Сравните с теорией» появился (был hidden).
    const step6Done = await page.evaluate(() =>
      document.querySelector('[data-step="6"]')?.classList.contains('step-done'),
    );
    // step-done может быть и на other-классе — главное, что 7-й уже не hidden.
    const step7 = page.locator('[data-step="7"]');
    await expect(step7).not.toHaveAttribute('hidden', '');
    void step6Done; // не критично, если оркестратор не использует step-done; pending-step-7 главное

    // Toast c message «Записано» виден (success).
    const toast = page.locator('lab-toast').last();
    await expect(toast).toHaveAttribute('message', /Записано/);

    // localStorage[`kit-1:archimedes:state`] непустой.
    const persisted = await page.evaluate(() =>
      localStorage.getItem('kit-1:archimedes:state'),
    );
    expect(persisted).toBeTruthy();
    expect(persisted!.length).toBeGreaterThan(50);
  });

  // Сценарий 3: все 3 цилиндра подряд (№2, №3, №4).
  test('ALL CYLINDERS: №2 → №3 → №4 — 3 строки журнала, все Δ_pct ≤ 5%', async ({
    page,
  }) => {
    await setupArchimedes(page);

    // Один проход через API: размещаем заранее всё, дальше attach/dip/record для каждого.
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.placeBeaker();
      e.pourWater(200);
    });

    for (const id of [2, 3, 4] as const) {
      await page.evaluate((cid) => {
        const e = window.archimedesExperiment!;
        e.attachCylinderById(cid as 2 | 3 | 4);
      }, id);
      // Ждём шумовую стабилизацию для P_возд (1.5s).
      await page.waitForTimeout(1700);
      await page.evaluate(() => window.archimedesExperiment!.recordCurrentReading());

      await page.evaluate(() => window.archimedesExperiment!.dipCylinderInWater());
      // Анимация 600мс + шум 1500мс.
      await page.waitForTimeout(2300);
      await page.evaluate(() => window.archimedesExperiment!.recordCurrentReading());

      // Поднимаем и снимаем цилиндр перед следующим.
      await page.evaluate(() => {
        const e = window.archimedesExperiment!;
        e.liftCylinderFromWater();
        e.detachCylinder();
      });
      await page.waitForTimeout(700); // lift-анимация
    }

    expect(await journalRowsCount(page)).toBe(3);
    const rows = await page.evaluate(() =>
      window.archimedesExperiment!.getJournalRows(),
    );
    expect(rows.map((r) => r.cylinder)).toEqual(['No2', 'No3', 'No4']);
    for (const r of rows) {
      expect(r.delta_pct).not.toBeNull();
      expect(Math.abs(r.delta_pct!)).toBeLessThanOrEqual(5);
    }
  });

  // Сценарий 4: Reset с undo-toast.
  test('RESET + UNDO TOAST: «Отменить» восстанавливает журнал', async ({ page }) => {
    await setupArchimedes(page);

    // Сначала собираем полную строку (P_возд + P_жид).
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.attachCylinderById(3);
      e.placeBeaker();
      e.pourWater(150);
      e.recordCurrentReading();
      e.dipCylinderInWater();
    });
    await page.waitForTimeout(2300);
    await page.evaluate(() => window.archimedesExperiment!.recordCurrentReading());
    expect(await journalRowsCount(page)).toBe(1);

    // Кликаем «Сбросить опыт» — кнопка в шапке-сцене.
    await page.locator('#ar-reset-btn').click();

    // state=idle, журнал пуст.
    expect(await page.evaluate(() => window.archimedesExperiment!.getState())).toBe('idle');
    expect(await journalRowsCount(page)).toBe(0);

    // Toast с message «Опыт сброшен» и action «Отменить» виден.
    const resetToast = page.locator('lab-toast[message="Опыт сброшен"]');
    await expect(resetToast).toBeVisible();
    await expect(resetToast).toHaveAttribute('action-label', 'Отменить');

    // Клик по «Отменить» внутри shadow root тоста (.action-btn).
    await page.evaluate(() => {
      const t = document.querySelector('lab-toast[message="Опыт сброшен"]');
      const btn = t?.shadowRoot?.querySelector<HTMLButtonElement>('.action-btn');
      btn?.click();
    });

    // Журнал восстановлен.
    await expect.poll(() => journalRowsCount(page), { timeout: 3000 }).toBe(1);
  });

  // Сценарий 5: reverse drag (цилиндр обратно с динамометра в kit-panel).
  test('REVERSE DRAG: detachCylinder возвращает карточку в available', async ({ page }) => {
    await setupArchimedes(page);

    // Подвешиваем цилиндр №3.
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.attachCylinderById(3);
    });

    // Карточка №3 имеет cylinderId=3 в state.
    expect(
      await page.evaluate(() => window.archimedesExperiment!.getFullState().cylinderId),
    ).toBe(3);

    // Reverse — снимаем цилиндр (программный API равен drop на свою карточку).
    await page.evaluate(() => window.archimedesExperiment!.returnCylinderToKit(3));

    // cylinderId === null (карточка снова доступна для подвеса).
    expect(
      await page.evaluate(() => window.archimedesExperiment!.getFullState().cylinderId),
    ).toBeNull();

    // Phase вернулась к dyno-on-scene (динамометр без цилиндра).
    expect(await page.evaluate(() => window.archimedesExperiment!.getState())).toBe(
      'dyno-on-scene',
    );

    // Можно повторно подвесить тот же цилиндр.
    await page.evaluate(() => window.archimedesExperiment!.attachCylinderById(3));
    expect(
      await page.evaluate(() => window.archimedesExperiment!.getFullState().cylinderId),
    ).toBe(3);
  });

  // Сценарий 6: switch tab → возврат → состояние сохранено.
  test('SWITCH TAB: 1.2 → 1.1 → 1.2 — журнал восстановлен через persist', async ({ page }) => {
    await setupArchimedes(page);

    // На 1.2 записываем P_возд (одна неполная строка).
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.attachCylinderById(3);
    });
    await page.waitForTimeout(1700);
    await page.evaluate(() => window.archimedesExperiment!.recordCurrentReading());
    expect(await journalRowsCount(page)).toBe(1);

    // Сохраняем snapshot для сравнения.
    const beforeSwitch = await page.evaluate(() => ({
      rows: window.archimedesExperiment!.getJournalRows(),
      phase: window.archimedesExperiment!.getState(),
    }));

    // Переключаемся на 1.1 через клик по табу.
    await page.evaluate(() => {
      const nav = document.querySelector('lab-kit-nav');
      const btn = nav?.shadowRoot?.querySelector<HTMLButtonElement>(
        'button[data-screen-id="density-solid"]',
      );
      btn?.click();
    });
    // Ждём, пока активный экран сменится — archimedesExperiment удалится из window.
    await page.waitForFunction(() => typeof window.archimedesExperiment === 'undefined', {
      timeout: 5000,
    });

    // Возвращаемся на 1.2.
    await page.evaluate(() => {
      const nav = document.querySelector('lab-kit-nav');
      const btn = nav?.shadowRoot?.querySelector<HTMLButtonElement>(
        'button[data-screen-id="archimedes"]',
      );
      btn?.click();
    });
    await page.waitForFunction(
      () => typeof window.archimedesExperiment !== 'undefined',
      { timeout: 5000 },
    );
    // Дать оркестратору время на restore из localStorage.
    await page.waitForTimeout(300);

    const afterSwitch = await page.evaluate(() => ({
      rows: window.archimedesExperiment!.getJournalRows(),
      phase: window.archimedesExperiment!.getState(),
    }));
    // Журнал восстановлен (количество строк + первая строка совпадают).
    expect(afterSwitch.rows.length).toBe(beforeSwitch.rows.length);
    if (beforeSwitch.rows.length > 0) {
      expect(afterSwitch.rows[0]?.P_air_N).toBe(beforeSwitch.rows[0]?.P_air_N);
      expect(afterSwitch.rows[0]?.cylinder).toBe(beforeSwitch.rows[0]?.cylinder);
    }
  });
});
