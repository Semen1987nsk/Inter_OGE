/**
 * E2E geometry probe — Опыт 1.3 «F_А от объёма погружения».
 *
 * Цель: измерить **реальные DOM-координаты** dynamometer / cylinder / beaker
 * на разных viewport'ах и проверить, что цилиндр НЕ пробивает дно стакана
 * при максимальной submergence depth. Регрессия 2026-05-17:
 * «груз проваливается через дно стакана».
 *
 * Инварианты §31 / §19.13 REFERENCE:
 *   I1.  cyl_bottom_DOM ≤ beaker_bottom_DOM − 4   (НЕ пробивает дно)
 *   I2.  ученик может опустить до h ≥ 60 мм       (методика ФИПИ §2.3.3)
 *   I3.  при ресайзе окна перекалибровка точна    (mmToPx динамический)
 *   I4.  уровень воды поднимается при погружении  (#applyBeakerLevel)
 *   I5.  F_A_meas ≠ F_A_theor (delta_pct≠0)       (зашумлённое P_изм)
 */

import { test, expect, type Page } from '@playwright/test';
import type { ArchimedesVolumeExperiment } from '../src/screens/archimedes-volume/ArchimedesVolumeExperiment';

declare global {
  interface Window {
    archimedesVolumeExperiment?: ArchimedesVolumeExperiment;
  }
}

async function setupArchimedesVolume(page: Page): Promise<void> {
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
  await page.goto('/?screen=archimedes-volume');
  await page.waitForFunction(
    () => typeof window.archimedesVolumeExperiment !== 'undefined',
    { timeout: 10_000 },
  );
  await page.evaluate(() => window.archimedesVolumeExperiment?.reset());
}

interface DipMeasurement {
  cyl: { top: number; bottom: number; height: number };
  beaker: { top: number; bottom: number };
  water: { top: number; bottom: number; columnPx: number };
  hMm: number;
  overlap: number;
  marginAboveBottom: number;
  level: number;
}

async function measure(page: Page): Promise<DipMeasurement> {
  return page.evaluate(() => {
    const cylEl = document.querySelector('#av-cyl') as HTMLElement & {
      getBodyTopY?: () => number;
      getBottomY?: () => number;
    };
    const beakerEl = document.querySelector('#av-beaker') as HTMLElement & {
      getWaterSurfaceY?: () => number;
      getWaterBottomY?: () => number;
    };
    const cylTop = cylEl.getBodyTopY!();
    const cylBottom = cylEl.getBottomY!();
    const waterTop = beakerEl.getWaterSurfaceY!();
    const waterBottom = beakerEl.getWaterBottomY!();
    const bkr = beakerEl.getBoundingClientRect();
    const exp = window.archimedesVolumeExperiment!;
    const state = exp.getState();
    return {
      cyl: { top: cylTop, bottom: cylBottom, height: cylBottom - cylTop },
      beaker: { top: bkr.top, bottom: bkr.bottom },
      water: { top: waterTop, bottom: waterBottom, columnPx: waterBottom - waterTop },
      hMm: state.hMm,
      overlap: cylBottom - waterTop,
      marginAboveBottom: waterBottom - cylBottom,
      level: parseFloat(beakerEl.getAttribute('level') ?? '0'),
    };
  });
}

// Те же 4 viewport'а что в archimedes-dip-geometry.spec.ts (1.2).
const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1280x720', width: 1280, height: 720 },
] as const;

test.describe('1.3 dip-geometry — цилиндр НЕ пробивает дно стакана', () => {
  for (const vp of VIEWPORTS) {
    test(`[${vp.name}] submergeTo(80) → cyl_bottom выше дна с зазором ≥ 4px`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setupArchimedesVolume(page);

      await page.evaluate(() => {
        const e = window.archimedesVolumeExperiment!;
        e.placeDynamometer();
        e.attachCylinder();
        e.placeBeaker(); // авто-фиксирует pAirN через RAF
      });
      // 2 RAF + auto-baseline + setTimeout — нужно подождать.
      // Ждём калибровку (2 RAF + auto-baseline + setAttribute level → transition).
      await page.waitForFunction(
        () => window.archimedesVolumeExperiment?.getState().pAirN !== null,
        { timeout: 5000 },
      );
      await page.waitForTimeout(700);

      // submergeTo(80) — максимум по длине цилиндра. С адаптивным clamp
      // фактическая h ограничится #effectiveMaxHMm, но в любом случае
      // body не должен пройти ниже дна стакана.
      await page.evaluate(() => window.archimedesVolumeExperiment!.submergeTo(80));
      // Анимация water-rect 480ms + cylinder transition 220ms.
      await page.waitForTimeout(700);

      const m = await measure(page);
      test.info().annotations.push({
        type: `measurement-${vp.name}`,
        description: JSON.stringify(m, null, 2),
      });

      // I1: cyl_bottom не пробивает дно (зазор ≥ 4px по SAFETY_BOTTOM_PX=6 - tolerance 2).
      expect(
        m.marginAboveBottom,
        `[${vp.name}] cyl_bottom должен быть выше beaker_bottom; margin=${m.marginAboveBottom.toFixed(1)}px`,
      ).toBeGreaterThanOrEqual(4);

      // overlap должен быть положительным — цилиндр реально в воде.
      expect(m.overlap, `[${vp.name}] overlap = cyl_bot − water_top`).toBeGreaterThan(0);

      await page.screenshot({
        path: `test-results/review-1.3-dip-${vp.name}.png`,
        fullPage: false,
      });
    });

    test(`[${vp.name}] ученик может опустить до h=60 мм (ФИПИ-эталон)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setupArchimedesVolume(page);

      await page.evaluate(() => {
        const e = window.archimedesVolumeExperiment!;
        e.placeDynamometer();
        e.attachCylinder();
        e.placeBeaker();
      });
      // Ждём калибровку (2 RAF + auto-baseline + setAttribute level → transition).
      await page.waitForFunction(
        () => window.archimedesVolumeExperiment?.getState().pAirN !== null,
        { timeout: 5000 },
      );
      await page.waitForTimeout(700);

      // submergeTo(60) — третий эталон ФИПИ.
      await page.evaluate(() => window.archimedesVolumeExperiment!.submergeTo(60));
      await page.waitForTimeout(700);

      const state = await page.evaluate(() => window.archimedesVolumeExperiment!.getState());
      expect(
        state.hMm,
        `[${vp.name}] ученик должен дотянуть до 60 мм без обрезки по дну (effectiveMaxHMm)`,
      ).toBeGreaterThanOrEqual(60);

      const m = await measure(page);
      expect(m.marginAboveBottom, `[${vp.name}] при h=60 зазор до дна`).toBeGreaterThanOrEqual(4);
    });
  }
});

test.describe('1.3 — поднятие воды при погружении (#applyBeakerLevel)', () => {
  test('level повышается от 200 на 0.2 × V_displaced (visual rise factor)', async ({ page }) => {
    await setupArchimedesVolume(page);
    await page.evaluate(() => {
      const e = window.archimedesVolumeExperiment!;
      e.placeDynamometer();
      e.attachCylinder();
      e.placeBeaker();
    });
    await page.waitForTimeout(400);

    const baseLevel = await page.evaluate(() =>
      parseFloat(document.querySelector('#av-beaker')!.getAttribute('level') ?? '0'),
    );
    expect(baseLevel).toBeCloseTo(200, 0);

    // Декоративный rise: 0.2 × V. При h=20: 14×0.2=2.8 → level=202.8.
    await page.evaluate(() => window.archimedesVolumeExperiment!.submergeTo(20));
    await page.waitForTimeout(500);
    const level20 = await page.evaluate(() =>
      parseFloat(document.querySelector('#av-beaker')!.getAttribute('level') ?? '0'),
    );
    expect(level20).toBeCloseTo(202.8, 1);

    // h=60: 42×0.2=8.4 → level=208.4.
    await page.evaluate(() => window.archimedesVolumeExperiment!.submergeTo(60));
    await page.waitForTimeout(500);
    const level60 = await page.evaluate(() =>
      parseFloat(document.querySelector('#av-beaker')!.getAttribute('level') ?? '0'),
    );
    expect(level60).toBeCloseTo(208.4, 1);

    // Возврат на h=0 → level=200.
    await page.evaluate(() => window.archimedesVolumeExperiment!.submergeTo(0));
    await page.waitForTimeout(500);
    const level0 = await page.evaluate(() =>
      parseFloat(document.querySelector('#av-beaker')!.getAttribute('level') ?? '0'),
    );
    expect(level0).toBeCloseTo(200, 1);
  });
});

test.describe('1.3 — воздушный зазор при первой сборке', () => {
  test('после placeBeaker цилиндр висит над водой ~AIR_GAP мм', async ({ page }) => {
    await setupArchimedesVolume(page);
    await page.evaluate(() => {
      const e = window.archimedesVolumeExperiment!;
      e.placeDynamometer();
      e.attachCylinder();
      e.placeBeaker();
    });
    await page.waitForTimeout(900);

    // cyl.bottom должен быть ВЫШЕ waterTop (cyl в воздухе)
    const { gap, hMm } = await page.evaluate(() => {
      const cyl = document.querySelector('#av-cyl') as HTMLElement & {
        getBottomY: () => number;
      };
      const beaker = document.querySelector('#av-beaker') as HTMLElement & {
        getWaterSurfaceY: () => number;
      };
      return {
        gap: beaker.getWaterSurfaceY() - cyl.getBottomY(),
        hMm: window.archimedesVolumeExperiment!.getState().hMm,
      };
    });

    expect(hMm, 'state.hMm = 0 пока air-gap активен').toBe(0);
    expect(gap, 'цилиндр должен быть выше воды (positive gap)').toBeGreaterThan(10);
    expect(gap, 'air-gap не должен быть слишком большим').toBeLessThan(40);
  });

  test('первый submergeTo снимает air-gap (цилиндр в воде)', async ({ page }) => {
    await setupArchimedesVolume(page);
    await page.evaluate(() => {
      const e = window.archimedesVolumeExperiment!;
      e.placeDynamometer();
      e.attachCylinder();
      e.placeBeaker();
    });
    await page.waitForTimeout(900);
    await page.evaluate(() => window.archimedesVolumeExperiment!.submergeTo(40));
    await page.waitForTimeout(700);

    const { gap, hMm } = await page.evaluate(() => {
      const cyl = document.querySelector('#av-cyl') as HTMLElement & {
        getBottomY: () => number;
      };
      const beaker = document.querySelector('#av-beaker') as HTMLElement & {
        getWaterSurfaceY: () => number;
      };
      return {
        gap: beaker.getWaterSurfaceY() - cyl.getBottomY(),
        hMm: window.archimedesVolumeExperiment!.getState().hMm,
      };
    });

    expect(hMm).toBe(40);
    expect(gap, 'после погружения цилиндр ниже воды (negative gap)').toBeLessThan(0);
  });
});

test.describe('1.3 — F_A_meas ≠ F_A_theor (зашумлённое измерение)', () => {
  test('запись в журнале даёт delta_pct ≠ 0 (реальная погрешность измерения)', async ({ page }) => {
    await setupArchimedesVolume(page);
    await page.evaluate(() => {
      const e = window.archimedesVolumeExperiment!;
      e.placeDynamometer();
      e.attachCylinder();
      e.placeBeaker();
    });
    await page.waitForTimeout(400);

    await page.evaluate(() => window.archimedesVolumeExperiment!.submergeTo(40));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.archimedesVolumeExperiment!.recordCurrent());

    const rows = await page.evaluate(() => window.archimedesVolumeExperiment!.getState().rows);
    expect(rows.length).toBe(1);
    const r = rows[0]!;
    const Fmeas = r.values.F_A_meas_N as number;
    const Ftheor = r.values.F_A_theor_N as number;
    const delta = r.values.delta_pct as number;

    // F_A_meas зависит от шума (±DYNO_NOISE_N=0.005). Ftheor стабилен (0.2744 при h=40).
    expect(Ftheor).toBeCloseTo(0.2744, 4);
    // С вероятностью ~1.0 (за исключением ровно нулевого случайного числа)
    // F_A_meas отличается от Ftheor.
    expect(Math.abs(Fmeas - Ftheor)).toBeGreaterThan(0);
    expect(Math.abs(delta)).toBeGreaterThan(0);
    // Но шум ограничен ±DYNO_NOISE_N/Fa × 100%; при Fa=0.274 ⇒ ±0.005/0.274 ≈ ±1.8%.
    expect(Math.abs(delta)).toBeLessThan(5);
  });
});

test.describe('1.3 — ResizeObserver: перекалибровка при ресайзе окна', () => {
  test('после ресайза viewport submergeTo(60) всё ещё корректно ограничен', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await setupArchimedesVolume(page);
    await page.evaluate(() => {
      const e = window.archimedesVolumeExperiment!;
      e.placeDynamometer();
      e.attachCylinder();
      e.placeBeaker();
    });
    await page.waitForTimeout(400);

    // Ресайз вниз — должен сработать ResizeObserver + #calibrateGeometry.
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(300); // debounce 120ms + RAFs

    await page.evaluate(() => window.archimedesVolumeExperiment!.submergeTo(60));
    await page.waitForTimeout(700);

    const m = await measure(page);
    expect(m.marginAboveBottom, 'после ресайза цилиндр НЕ пробивает дно').toBeGreaterThanOrEqual(4);
    expect(m.hMm, 'state.hMm = 60 после submergeTo(60)').toBe(60);
  });
});
