/**
 * E2E — Опыт 1.2: «Сдача в роли ученика» через реальный мышиный drag/click.
 *
 * Покрытие багов §19.11.18 (3 шт., все блокировали ученика):
 *
 *   B1: lab-beaker перехватывал pointerdown/click в нижней половине цилиндра
 *       (z-index одинаковый, DOM-order ставил стакан поверх). Ученик не мог
 *       начать drag-by-thread по нижней зоне корпуса.
 *
 *   B2: liftCylinderFromWater сбрасывал phase до 'cyl-attached' даже когда
 *       стакан с водой стоит на сцене → CTA показывал «Записать P возд»,
 *       а не «Записать P жид» при повторном погружении (шаг 4 «Налейте
 *       воду» появлялся снова).
 *
 *   B3: synthetic click после успешного drag → finalizeDrag(dip) →
 *       handleCylinderClick(lift) — мгновенный откат. Ученик «опустил
 *       груз», но через 50 мс state.inWater снова false и CTA «P возд».
 *
 * Подход: реальный page.mouse.move/down/up с дискретными промежуточными
 * шагами, чтобы воспроизвести точно тот же gesture, что у реального
 * ученика в Chrome.
 */

import { test, expect, type Page } from '@playwright/test';
import type { ArchimedesExperiment } from '../src/screens/archimedes/ArchimedesExperiment';

declare global {
  interface Window {
    archimedesExperiment?: ArchimedesExperiment;
  }
}

async function setupArchimedes(page: Page): Promise<void> {
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
  await page.waitForFunction(
    () => typeof window.archimedesExperiment !== 'undefined',
    { timeout: 10_000 },
  );
  await page.evaluate(() => window.archimedesExperiment?.reset());
}

test.describe('E2E — Опыт 1.2: сдача в роли ученика (drag-by-thread)', () => {
  test('B1 z-index: цилиндр перекрывает стакан в overlap-зоне (elementFromPoint=lab-metal-weight)', async ({
    page,
  }) => {
    await setupArchimedes(page);
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.attachCylinderById(3);
      e.recordCurrentReading();
      e.placeBeaker();
      e.pourWater(200);
    });
    // Дать кадр на render.
    await page.waitForTimeout(150);

    const probe = await page.evaluate(() => {
      const cyl = document.querySelector<HTMLElement>('.ar-mount--cylinder')!;
      const beaker = document.querySelector<HTMLElement>('.ar-mount--beaker')!;
      const cylRect = cyl.getBoundingClientRect();
      const cylZ = parseInt(getComputedStyle(cyl).zIndex || '0', 10);
      const beakerZ = parseInt(getComputedStyle(beaker).zIndex || '0', 10);
      const elBottom = document.elementFromPoint(
        cylRect.x + cylRect.width / 2,
        cylRect.bottom - 10,
      );
      return {
        cylZ,
        beakerZ,
        elAtCylBottomTag: elBottom?.tagName ?? null,
      };
    });

    // Цилиндр должен быть выше стакана по stacking — иначе drag блокируется.
    expect(probe.cylZ).toBeGreaterThan(probe.beakerZ);
    expect(probe.elAtCylBottomTag).toBe('LAB-METAL-WEIGHT');
  });

  test('B2 phase regression: lift при стакане с водой → phase=water-poured (через DOM)', async ({
    page,
  }) => {
    await setupArchimedes(page);
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.attachCylinderById(3);
      e.recordCurrentReading();
      e.placeBeaker();
      e.pourWater(200);
      e.dipCylinderInWater();
    });
    await page.waitForTimeout(150);
    expect(
      await page.evaluate(() => window.archimedesExperiment!.getState()),
    ).toBe('cyl-in-water');

    await page.evaluate(() => window.archimedesExperiment!.liftCylinderFromWater());
    await page.waitForTimeout(150);

    const state = await page.evaluate(() => ({
      phase: window.archimedesExperiment!.getState(),
      water: window.archimedesExperiment!.getFullState().waterMl,
    }));
    expect(state.phase).toBe('water-poured');
    expect(state.water).toBe(200);

    // CTA должен показывать «Записать P жид» после повторного dip.
    await page.evaluate(() => window.archimedesExperiment!.dipCylinderInWater());
    await page.waitForTimeout(150);
    const ctaText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(
        (b) =>
          b.textContent?.includes('Записать') &&
          (b as HTMLElement).offsetParent !== null,
      );
      return btns[0]?.textContent?.trim() ?? null;
    });
    expect(ctaText).toContain('P жид');
  });

  test('B3 drag-then-record: ученик тянет цилиндр в воду мышью → запись P_жид доступна и не откатывается', async ({
    page,
  }) => {
    await setupArchimedes(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.attachCylinderById(3);
      e.recordCurrentReading();
      e.placeBeaker();
      e.pourWater(200);
    });
    await page.waitForTimeout(200);

    const start = await page.evaluate(() => {
      const cyl = document.querySelector<HTMLElement>('.ar-mount--cylinder')!;
      const r = cyl.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + 20 };
    });

    // Многоступенчатый drag вниз — имитация плавного жеста ученика.
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (let dy = 0; dy <= 150; dy += 8) {
      await page.mouse.move(start.x, start.y + dy, { steps: 1 });
      await page.waitForTimeout(15);
    }
    await page.mouse.up();
    // Ждём synthetic click + возможный transitionend.
    await page.waitForTimeout(700);

    // ─── Inv1: state точно в воде ─────────────────────────────────
    const afterDrag = await page.evaluate(() => {
      const f = window.archimedesExperiment!.getFullState();
      return { phase: f.phase, inWater: f.inWater, frac: f.submersionFraction };
    });
    expect(afterDrag.phase).toBe('cyl-in-water');
    expect(afterDrag.inWater).toBe(true);
    expect(afterDrag.frac).toBeGreaterThanOrEqual(0.95);

    // ─── Inv2: CTA = «Записать P жид», и она visible ─────────────
    const ctaProbe = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Записать P жид'),
      ) as HTMLButtonElement | undefined;
      return {
        text: btn?.textContent?.trim() ?? null,
        visible: btn ? (btn as HTMLElement).offsetParent !== null : false,
      };
    });
    expect(ctaProbe.text).toContain('P жид');
    expect(ctaProbe.visible).toBe(true);

    // ─── Inv3: запись успевает попасть в журнал ──────────────────
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Записать P жид'),
      ) as HTMLButtonElement | undefined;
      btn?.click();
    });
    await page.waitForTimeout(300);

    const journal = await page.evaluate(() =>
      window.archimedesExperiment!.getJournalRows(),
    );
    expect(journal).toHaveLength(1);
    expect(journal[0]!.cylinder).toBe('No3');
    expect(journal[0]!.P_air_N).toBeCloseTo(0.65, 2);
    expect(journal[0]!.P_liquid_N).toBeCloseTo(0.1, 2);
    // Δ должна быть < 1% (теоретически 0.55 vs 0.549).
    expect(Math.abs(journal[0]!.delta_pct ?? 999)).toBeLessThan(1);
  });
});
