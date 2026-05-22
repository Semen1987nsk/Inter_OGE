/**
 * E2E geometry probe — Опыт 1.2 «Архимед».
 *
 * Цель: измерить **реальные DOM-координаты** dynamometer / cylinder / beaker
 * после полного happy-path с 200 мл воды, и проверить инварианты §19.13
 * REFERENCE «реалистичное погружение»:
 *
 *   I1.  cyl_top_DOM > water_top_DOM + 5         (цилиндр НЕ выглядывает над водой)
 *   I2.  cyl_bottom_DOM < beaker_bottom_DOM - 8  (цилиндр НЕ касается дна)
 *   I3.  overlap = cyl_bottom − water_top ≥ 50px (полное визуальное погружение)
 *
 * При нарушении inv'ов тест печатает диагностический объект, чтобы было
 * видно фактические числа и подкрутить DIP_Y_OFFSET_PX / --w-size.
 *
 * Также проверяет видимость трёх .detach-btn в каждом state и поведение clicks.
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

interface DipMeasurement {
  cyl: { top: number; bottom: number; left: number; right: number; height: number };
  beaker: { top: number; bottom: number; left: number; right: number };
  water: { top: number; svgY: number; svgHeight: number };
  dyno: { top: number; bottom: number };
  overlap: number;
  cyl_above_water: boolean;
  cyl_below_bottom: boolean;
}

async function measureDipGeometry(page: Page): Promise<DipMeasurement> {
  return page.evaluate(() => {
    const cylHost = document.querySelector('#ar-cylinder-host')!;
    const beakerHost = document.querySelector('#ar-beaker-host')!;
    const dynoHost = document.querySelector('#ar-dyno-host')!;
    const beaker = beakerHost.querySelector('lab-beaker') as HTMLElement & {
      getWaterSurfaceY?: () => number;
    };
    const cylEl = cylHost.querySelector('lab-metal-weight') as HTMLElement & {
      getBodyTopY?: () => number;
      getBottomY?: () => number;
    };
    const beakerSvg = beaker.shadowRoot!.querySelector('svg.frame')! as SVGSVGElement;
    const waterRect = beaker.shadowRoot!.querySelector('#bk-water')! as SVGRectElement;

    const cyl = cylHost.getBoundingClientRect();
    const bkr = beakerHost.getBoundingClientRect();
    const dno = dynoHost.getBoundingClientRect();
    const svgRect = beakerSvg.getBoundingClientRect();

    const svgScaleY = svgRect.height / 130;
    const svgYAttr = parseFloat(waterRect.getAttribute('y') ?? '0');
    const svgHAttr = parseFloat(waterRect.getAttribute('height') ?? '0');
    const waterTopDom = svgRect.top + svgYAttr * svgScaleY;

    // §19.11.16: clamp в `#computeDipOffset` теперь по **body** (без тени
    // и крюка сверху), а не host. Поэтому инварианты тоже по body.
    const bodyTop = cylEl.getBodyTopY ? cylEl.getBodyTopY() : cyl.top;
    const bodyBottom = cylEl.getBottomY ? cylEl.getBottomY() : cyl.bottom;
    const beaker_top = bkr.top;
    const beaker_bot = bkr.bottom;

    return {
      cyl: {
        top: bodyTop,
        bottom: bodyBottom,
        left: cyl.left,
        right: cyl.right,
        height: bodyBottom - bodyTop,
      },
      beaker: { top: beaker_top, bottom: beaker_bot, left: bkr.left, right: bkr.right },
      water: { top: waterTopDom, svgY: svgYAttr, svgHeight: svgHAttr },
      dyno: { top: dno.top, bottom: dno.bottom },
      overlap: bodyBottom - waterTopDom,
      cyl_above_water: bodyTop > waterTopDom + 5,
      cyl_below_bottom: bodyBottom < beaker_bot - 8,
    };
  });
}

// ── 4 viewport'а для адаптивного DIP §19.11.14 ──
// На каждом из них инварианты I1..I3 ДОЛЖНЫ проходить. Раньше (до фикса)
// при viewport 1366×768 цилиндр пробивал дно стакана, потому что
// DIP_Y_OFFSET_PX был жёстко 312 — а сцена короче. Теперь #computeDipOffset
// читает реальные DOM-координаты и адаптируется.
const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1280x720', width: 1280, height: 720 },
] as const;

test.describe('E2E geometry — реалистичное погружение (адаптивный DIP §19.11.14)', () => {
  for (const vp of VIEWPORTS) {
    test(`GEO-1 [${vp.name}]: cyl-3 + 200ml + dip → cyl под водой, не пробивает дно`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setupArchimedes(page);
      // Этап A: подвешиваем цилиндр в воздухе, измеряем base position
      await page.evaluate(() => {
        const e = window.archimedesExperiment!;
        e.placeDynamometer(1);
        e.attachCylinderById(3);
        e.placeBeaker();
        e.pourWater(200);
      });
      await page.waitForTimeout(800); // beaker + dyno стабилизировались
      const inAir = await measureDipGeometry(page);
      test.info().annotations.push({
        type: `measurement-air-${vp.name}`,
        description: JSON.stringify(inAir, null, 2),
      });
      console.log(`GEO-1 [${vp.name}] BEFORE dip (in air):`, JSON.stringify(inAir, null, 2));

      // Этап B: погружаем
      await page.evaluate(() => {
        window.archimedesExperiment!.recordCurrentReading();
        window.archimedesExperiment!.dipCylinderInWater();
      });
      await page.waitForTimeout(2300);

      const m = await measureDipGeometry(page);
      // Также добавляем computed-transform для диагностики.
      const transforms = await page.evaluate(() => {
        const cyl = document.querySelector('#ar-cylinder-host')!;
        const dyno = document.querySelector('#ar-dyno-host')!;
        return {
          cyl: {
            inlineTransform: (cyl as HTMLElement).style.transform,
            computedTransform: window.getComputedStyle(cyl).transform,
            inlineTop: (cyl as HTMLElement).style.top,
          },
          dyno: {
            inlineTransform: (dyno as HTMLElement).style.transform,
            computedTransform: window.getComputedStyle(dyno).transform,
          },
        };
      });
      console.log(`GEO-1 [${vp.name}] transforms after dip:`, JSON.stringify(transforms, null, 2));
      // Печатаем для диагностики — видно в test-output даже если тест прошёл.
      test.info().annotations.push({
        type: `measurement-${vp.name}`,
        description: JSON.stringify(m, null, 2),
      });
      console.log(
        `GEO-1 [${vp.name}] AFTER dip:`,
        JSON.stringify(
          {
            cyl_top: m.cyl.top,
            cyl_bot: m.cyl.bottom,
            water_top: m.water.top,
            beaker_bot: m.beaker.bottom,
            overlap: m.overlap,
            margin_above_water: m.cyl.top - m.water.top,
            margin_above_bottom: m.beaker.bottom - m.cyl.bottom,
          },
          null,
          2,
        ),
      );

      // I1: cyl_top ниже воды (cyl верх скрыт водой как минимум на 5px).
      expect(
        m.cyl_above_water,
        `[${vp.name}] cyl должен быть ниже water_top + 5; margin_above_water=${(m.cyl.top - m.water.top).toFixed(1)}`,
      ).toBe(true);
      // I2: cyl_bottom выше дна стакана (как минимум на 8px зазор).
      expect(
        m.cyl_below_bottom,
        `[${vp.name}] cyl должен быть выше beaker_bottom - 8; margin_above_bottom=${(m.beaker.bottom - m.cyl.bottom).toFixed(1)}`,
      ).toBe(true);
      // I3: overlap ≥ 50px (только для viewport'ов где есть запас высоты —
      // на 1280×720 стакан мелкий, гарантируем минимум 30px).
      const minOverlap = vp.height >= 800 ? 50 : 30;
      expect(
        m.overlap,
        `[${vp.name}] overlap = cyl_bottom - water_top должен быть ≥ ${minOverlap}px`,
      ).toBeGreaterThanOrEqual(minOverlap);

      // Сохраняем скриншот для визуального ревью пользователем (review screenshot).
      await page.screenshot({
        path: `test-results/review-archimedes-dip-200ml-${vp.name}.png`,
        fullPage: false,
      });
    });
  }
});

test.describe('E2E geometry — banner + dose-picker', () => {

  test('GEO-2: при 100мл воды (мало) — banner с предупреждением виден после pour', async ({
    page,
  }) => {
    await setupArchimedes(page);
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.attachCylinderById(3);
      e.placeBeaker();
      e.pourWater(100);
    });
    const banner = await page.locator('#ar-banner-text').textContent();
    expect(banner ?? '').toMatch(/Воды мало|до 200/i);
  });

  test('GEO-3: dose-button 200ml имеет data-recommended', async ({ page }) => {
    await setupArchimedes(page);
    const recommendedCount = await page.locator('.dose-btn[data-recommended]').count();
    expect(recommendedCount).toBe(1);
    const recommendedDose = await page.locator('.dose-btn[data-recommended]').getAttribute('data-dose');
    expect(recommendedDose).toBe('200');
    // Открываем dose-picker (placeBeaker → click по стакану на сцене).
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.placeBeaker();
    });
    await page.locator('#ar-beaker-host lab-beaker').click();
    await page.waitForTimeout(150);
    await page.screenshot({
      path: 'test-results/review-archimedes-dose-picker.png',
      fullPage: false,
    });
  });
});

test.describe('E2E detach-buttons — discoverability §15.4 + §19.11.15 always-visible', () => {
  test('DETACH-1: dyno → cyl → beaker — все 3 крестика ВСЕГДА видны, click каскадно снимает', async ({
    page,
  }) => {
    await setupArchimedes(page);
    // На idle — 0 крестиков (сцена пуста).
    expect(await page.locator('.detach-btn:not([hidden])').count()).toBe(0);

    // Поставили dyno → ar-detach-dyno виден.
    await page.evaluate(() => window.archimedesExperiment!.placeDynamometer(1));
    await expect(page.locator('#ar-detach-dyno')).toBeVisible();

    // Подвесили cyl-3 → ar-detach-cyl виден, ar-detach-dyno ОСТАЁТСЯ виден
    // (§19.11.15: крестик не зависит от наличия зависимых приборов; click
    // на dyno с цилиндром каскадно снимет оба).
    await page.evaluate(() => window.archimedesExperiment!.attachCylinderById(3));
    await expect(page.locator('#ar-detach-cyl')).toBeVisible();
    await expect(page.locator('#ar-detach-dyno')).toBeVisible();

    // Поставили beaker → ar-detach-beaker виден; все 3 крестика на сцене.
    await page.evaluate(() => window.archimedesExperiment!.placeBeaker());
    await expect(page.locator('#ar-detach-beaker')).toBeVisible();
    await expect(page.locator('#ar-detach-dyno')).toBeVisible();
    await expect(page.locator('#ar-detach-cyl')).toBeVisible();
    expect(await page.locator('.detach-btn:not([hidden])').count()).toBe(3);
    // Review: скриншот «3 крестика на сцене».
    await page.screenshot({
      path: 'test-results/review-archimedes-3-detach-buttons.png',
      fullPage: false,
    });

    // Записали несколько журнальных строк через P_возд: журнал НЕ должен очищаться при detach.
    await page.evaluate(() => window.archimedesExperiment!.recordCurrentReading());
    const beforeRows = await page.evaluate(
      () => window.archimedesExperiment!.getJournalRows().length,
    );
    expect(beforeRows).toBeGreaterThan(0);

    // Click по детач-цилиндра → cylinderId=null, журнал ПРЕЖНИЙ.
    await page.locator('#ar-detach-cyl').click();
    expect(
      await page.evaluate(() => window.archimedesExperiment!.getFullState().cylinderId),
    ).toBeNull();
    expect(
      await page.evaluate(() => window.archimedesExperiment!.getJournalRows().length),
    ).toBe(beforeRows);

    // Цилиндра нет → его крестик скрыт; крестики dyno и beaker остаются.
    await expect(page.locator('#ar-detach-cyl')).toBeHidden();
    await expect(page.locator('#ar-detach-dyno')).toBeVisible();
    await expect(page.locator('#ar-detach-beaker')).toBeVisible();
    await page.locator('#ar-detach-dyno').click();
    expect(
      await page.evaluate(() => window.archimedesExperiment!.getFullState().dynoRange),
    ).toBeNull();

    // Beaker → click по своему крестику.
    await page.locator('#ar-detach-beaker').click();
    expect(
      await page.evaluate(() => window.archimedesExperiment!.getFullState().beakerOnScene),
    ).toBe(false);

    // Журнал по-прежнему не очищен.
    expect(
      await page.evaluate(() => window.archimedesExperiment!.getJournalRows().length),
    ).toBe(beforeRows);
  });

  test('DETACH-2: базовая opacity нейтральная ~0.32 (§15.4), видима без hover', async ({ page }) => {
    await setupArchimedes(page);
    await page.evaluate(() => window.archimedesExperiment!.placeDynamometer(1));
    const opacity = await page.locator('#ar-detach-dyno').evaluate(
      (el) => window.getComputedStyle(el).opacity,
    );
    // §15.4 (2026-05-14): крестик НЕЙТРАЛЬНЫЙ (серый, base 0.32) — не «кричит»
    // как раньше (красный → впечатление «ошибка/выделено»). Эталон 1.1
    // (.detach-btn) использует те же 0.32 — паритет. Discoverability =
    // присутствует (не hidden / не 0) + растёт до 0.85 на hover. Раньше тест
    // ждал ≥0.5 (§19.11.15), что противоречило §15.4 и эталону 1.1.
    const o = parseFloat(opacity);
    expect(o).toBeGreaterThanOrEqual(0.3); // присутствует, дискаверабл
    expect(o).toBeLessThan(0.85); // это base-состояние, не hover
  });

  test('DETACH-3: цилиндр в воде → ВСЕ 3 крестика видны (§19.11.15 always-visible)', async ({
    page,
  }) => {
    // Раньше: при inWater крестики cyl и beaker скрывались. Это нарушало
    // принцип «крестик всегда виден» и принцип «полная имитация» (в реале
    // можно убрать стакан со стола, цилиндр останется на нити). Переписан
    // по §19.11.15: крестики видны → click каскадно снимает зависимости.
    await setupArchimedes(page);
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.attachCylinderById(3);
      e.placeBeaker();
      e.pourWater(200);
      e.dipCylinderInWater();
    });
    await page.waitForTimeout(900);
    // Все 3 крестика видны.
    await expect(page.locator('#ar-detach-dyno')).toBeVisible();
    await expect(page.locator('#ar-detach-cyl')).toBeVisible();
    await expect(page.locator('#ar-detach-beaker')).toBeVisible();
  });

  test('DETACH-4: cyl в воде → click detach-beaker → каскад: lift+remove, цилиндр висит', async ({
    page,
  }) => {
    await setupArchimedes(page);
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.attachCylinderById(3);
      e.placeBeaker();
      e.pourWater(200);
      e.dipCylinderInWater();
    });
    await page.waitForTimeout(900);
    await page.locator('#ar-detach-beaker').click();
    await page.waitForTimeout(300);
    // Стакан убран, цилиндр висит на динамометре в воздухе (полная имитация).
    expect(
      await page.evaluate(() => window.archimedesExperiment!.getFullState().beakerOnScene),
    ).toBe(false);
    expect(
      await page.evaluate(() => window.archimedesExperiment!.getFullState().inWater),
    ).toBe(false);
    expect(
      await page.evaluate(() => window.archimedesExperiment!.getFullState().cylinderId),
    ).toBe(3);
  });

  test('DETACH-5: cyl в воде → click detach-dyno → каскад: lift+detach+remove dyno', async ({
    page,
  }) => {
    await setupArchimedes(page);
    await page.evaluate(() => {
      const e = window.archimedesExperiment!;
      e.placeDynamometer(1);
      e.attachCylinderById(3);
      e.placeBeaker();
      e.pourWater(200);
      e.dipCylinderInWater();
    });
    await page.waitForTimeout(900);
    await page.locator('#ar-detach-dyno').click();
    await page.waitForTimeout(300);
    expect(
      await page.evaluate(() => window.archimedesExperiment!.getFullState().dynoRange),
    ).toBeNull();
    expect(
      await page.evaluate(() => window.archimedesExperiment!.getFullState().cylinderId),
    ).toBeNull();
    // Стакан остаётся на столе.
    expect(
      await page.evaluate(() => window.archimedesExperiment!.getFullState().beakerOnScene),
    ).toBe(true);
  });
});
