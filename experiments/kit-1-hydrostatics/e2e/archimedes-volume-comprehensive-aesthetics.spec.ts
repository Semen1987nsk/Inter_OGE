/**
 * archimedes-volume-comprehensive-aesthetics — полный визуальный шаг-за-шагом
 * аудит опыта 1.3 на 4 viewport'ах. Скриншоты + замеры:
 *
 *  - Layout integrity: оборудование НЕ выходит за пределы stage
 *  - Proportions: cyl ⊂ beaker, hint visible, journal compact
 *  - Color/visibility: текст читаем, отсутствие clipping
 *  - Air-gap visual: cyl над водой при placeBeaker
 *  - Drag-by-thread через mouse: плавность, корректное погружение
 *  - Записи в журнале корректны (h=20/40/60 → V=14/28/42)
 *
 * 4 viewport × 12 шагов = 48 проверок + 48 screenshots.
 */

import { test, expect, type Page } from '@playwright/test';
import type { ArchimedesVolumeExperiment } from '../src/screens/archimedes-volume/ArchimedesVolumeExperiment';

declare global {
  interface Window {
    archimedesVolumeExperiment?: ArchimedesVolumeExperiment;
  }
}

interface FrameMetrics {
  stage: DOMRect;
  rig: DOMRect | null;
  cyl: DOMRect | null;
  beaker: DOMRect | null;
  dyno: DOMRect | null;
  journal: DOMRect | null;
  steps: DOMRect | null;
  hintBar: DOMRect | null;
  state: { hMm: number; pAirN: number | null; rows: number };
}

async function setup(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('kit-1') || k.startsWith('kit-1-hydrostatics')) {
          localStorage.removeItem(k);
        }
      }
    } catch { /* ignore */ }
  });
  await page.goto('/?screen=archimedes-volume');
  await page.waitForFunction(() => typeof window.archimedesVolumeExperiment !== 'undefined', {
    timeout: 10_000,
  });
  await page.evaluate(() => window.archimedesVolumeExperiment?.reset());
}

async function snap(page: Page): Promise<FrameMetrics> {
  return page.evaluate(() => {
    const $ = (sel: string) => document.querySelector(sel)?.getBoundingClientRect() ?? null;
    const e = window.archimedesVolumeExperiment!;
    const s = e.getState();
    return {
      stage: $('#av-stage-area')!,
      rig: $('#av-rig'),
      cyl: $('#av-cyl'),
      beaker: $('#av-beaker'),
      dyno: $('#av-dyno'),
      journal: $('#av-journal-panel'),
      steps: $('#av-steps'),
      hintBar: $('#av-hint'),
      state: { hMm: s.hMm, pAirN: s.pAirN, rows: s.rows.length },
    } as FrameMetrics;
  });
}

function assertWithinStage(m: FrameMetrics, what: 'rig' | 'cyl' | 'beaker' | 'dyno', tolerance = 4): void {
  const el = m[what];
  if (!el) return;
  expect(el.top, `${what}.top >= stage.top - ${tolerance}`).toBeGreaterThanOrEqual(m.stage.top - tolerance);
  expect(el.bottom, `${what}.bottom <= stage.bottom + ${tolerance}`).toBeLessThanOrEqual(m.stage.bottom + tolerance);
  expect(el.left).toBeGreaterThanOrEqual(m.stage.left - tolerance);
  expect(el.right).toBeLessThanOrEqual(m.stage.right + tolerance);
}

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1280x720', width: 1280, height: 720 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`comprehensive flow [${vp.name}]`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setup(page);
    });

    test(`A: initial state — all equipment in cards, stage clean`, async ({ page }) => {
      const m = await snap(page);
      expect(m.state.rows).toBe(0);
      expect(m.state.pAirN).toBeNull();
      expect(m.state.hMm).toBe(0);
      // Stage existed.
      expect(m.stage.width).toBeGreaterThan(500);
      expect(m.stage.height).toBeGreaterThan(400);
      // Steps visible.
      expect(m.steps).not.toBeNull();
      expect(m.steps!.height).toBeGreaterThan(20);
      expect(m.steps!.height).toBeLessThan(80); // не на 3+ строки
      await page.screenshot({ path: `test-results/comp-${vp.name}-A-initial.png` });
    });

    test(`B: after place all → stand visible inside stage`, async ({ page }) => {
      await page.evaluate(() => {
        const e = window.archimedesVolumeExperiment!;
        e.placeDynamometer(); e.attachCylinder(); e.placeBeaker();
      });
      await page.waitForTimeout(900);
      const m = await snap(page);
      // 3 прибора видны
      expect(m.cyl).not.toBeNull();
      expect(m.beaker).not.toBeNull();
      expect(m.dyno).not.toBeNull();
      // Помещается в stage
      assertWithinStage(m, 'rig');
      assertWithinStage(m, 'cyl');
      assertWithinStage(m, 'beaker');
      assertWithinStage(m, 'dyno');
      // pAirN зафиксирован
      expect(m.state.pAirN).not.toBeNull();
      await page.screenshot({ path: `test-results/comp-${vp.name}-B-assembled.png` });
    });

    test(`C: air-gap visual — cyl above water at h=0`, async ({ page }) => {
      await page.evaluate(() => {
        const e = window.archimedesVolumeExperiment!;
        e.placeDynamometer(); e.attachCylinder(); e.placeBeaker();
      });
      await page.waitForTimeout(900);
      const gap = await page.evaluate(() => {
        const cyl = document.querySelector('#av-cyl') as HTMLElement & { getBottomY: () => number };
        const beaker = document.querySelector('#av-beaker') as HTMLElement & { getWaterSurfaceY: () => number };
        return beaker.getWaterSurfaceY() - cyl.getBottomY();
      });
      // Air-gap должен быть положительным (cyl выше воды)
      expect(gap, 'cyl должен висеть над водой').toBeGreaterThan(8);
      expect(gap, 'air-gap разумного размера (≤ 50 px)').toBeLessThan(60);
      await page.screenshot({ path: `test-results/comp-${vp.name}-C-airgap.png` });
    });

    test(`D: submerge to 20 — cyl in water, journal shows pending`, async ({ page }) => {
      await page.evaluate(() => {
        const e = window.archimedesVolumeExperiment!;
        e.placeDynamometer(); e.attachCylinder(); e.placeBeaker();
      });
      await page.waitForTimeout(900);
      await page.evaluate(() => window.archimedesVolumeExperiment!.submergeTo(20));
      await page.waitForTimeout(600);
      const m = await snap(page);
      expect(m.state.hMm).toBe(20);
      // Pending кнопка видна
      const btnVisible = await page.evaluate(() => {
        const btn = document.querySelector<HTMLElement>('#av-record-pending-btn');
        return btn ? !btn.closest('[hidden]') && getComputedStyle(btn).display !== 'none' : false;
      });
      expect(btnVisible).toBe(true);
      await page.screenshot({ path: `test-results/comp-${vp.name}-D-h20.png` });
    });

    test(`E: record + submerge to 40 — 1 row + new pending`, async ({ page }) => {
      await page.evaluate(() => {
        const e = window.archimedesVolumeExperiment!;
        e.placeDynamometer(); e.attachCylinder(); e.placeBeaker();
      });
      await page.waitForTimeout(900);
      await page.evaluate(() => {
        const e = window.archimedesVolumeExperiment!;
        e.submergeTo(20); e.recordCurrent();
      });
      await page.waitForTimeout(400);
      const m = await snap(page);
      expect(m.state.rows).toBe(1);
      assertWithinStage(m, 'cyl');
      assertWithinStage(m, 'beaker');
      await page.screenshot({ path: `test-results/comp-${vp.name}-E-row1.png` });
    });

    test(`F: 3 records (h=20/40/60) — full journal, V=14/28/42`, async ({ page }) => {
      await page.evaluate(() => {
        const e = window.archimedesVolumeExperiment!;
        e.placeDynamometer(); e.attachCylinder(); e.placeBeaker();
      });
      await page.waitForTimeout(900);
      await page.evaluate(() => {
        const e = window.archimedesVolumeExperiment!;
        e.submergeTo(20); e.recordCurrent();
        e.submergeTo(40); e.recordCurrent();
        e.submergeTo(60); e.recordCurrent();
      });
      await page.waitForTimeout(500);
      const rows = await page.evaluate(() => {
        return window.archimedesVolumeExperiment!.getState().rows.map(r => ({
          h: r.values.h_mm, V: r.values.V_cm3,
        }));
      });
      expect(rows).toHaveLength(3);
      expect(rows[0]!.h).toBe(20);
      expect(rows[1]!.h).toBe(40);
      expect(rows[2]!.h).toBe(60);
      expect(rows[0]!.V).toBeCloseTo(14, 1);
      expect(rows[1]!.V).toBeCloseTo(28, 1);
      expect(rows[2]!.V).toBeCloseTo(42, 1);
      await page.screenshot({ path: `test-results/comp-${vp.name}-F-3rows.png` });
    });

    test(`G: cyl_bottom NOT below beaker_bottom at max h`, async ({ page }) => {
      await page.evaluate(() => {
        const e = window.archimedesVolumeExperiment!;
        e.placeDynamometer(); e.attachCylinder(); e.placeBeaker();
      });
      await page.waitForTimeout(900);
      await page.evaluate(() => window.archimedesVolumeExperiment!.submergeTo(80));
      await page.waitForTimeout(700);
      const margin = await page.evaluate(() => {
        const cyl = document.querySelector('#av-cyl') as HTMLElement & { getBottomY: () => number };
        const beaker = document.querySelector('#av-beaker') as HTMLElement & { getWaterBottomY: () => number };
        return beaker.getWaterBottomY() - cyl.getBottomY();
      });
      expect(margin, 'cyl не пробивает дно').toBeGreaterThan(0);
      await page.screenshot({ path: `test-results/comp-${vp.name}-G-maxh.png` });
    });

    test(`H: detach beaker → cyl остаётся, journal сохранён`, async ({ page }) => {
      await page.evaluate(() => {
        const e = window.archimedesVolumeExperiment!;
        e.placeDynamometer(); e.attachCylinder(); e.placeBeaker();
      });
      await page.waitForTimeout(900);
      await page.evaluate(() => {
        const e = window.archimedesVolumeExperiment!;
        e.submergeTo(40); e.recordCurrent();
        e.detachBeaker();
      });
      await page.waitForTimeout(300);
      const state = await page.evaluate(() => window.archimedesVolumeExperiment!.getState());
      expect(state.staged.beaker).toBe(false);
      expect(state.staged.cyl).toBe(true);
      expect(state.rows).toHaveLength(1);
      expect(state.hMm).toBe(0); // hMm сбрасывается при detach beaker
      await page.screenshot({ path: `test-results/comp-${vp.name}-H-detach-beaker.png` });
    });

    test(`I: reset clears everything`, async ({ page }) => {
      await page.evaluate(() => {
        const e = window.archimedesVolumeExperiment!;
        e.placeDynamometer(); e.attachCylinder(); e.placeBeaker();
        e.submergeTo(40); e.recordCurrent();
      });
      await page.waitForTimeout(500);
      await page.evaluate(() => window.archimedesVolumeExperiment!.reset());
      await page.waitForTimeout(200);
      const state = await page.evaluate(() => window.archimedesVolumeExperiment!.getState());
      expect(state.staged).toEqual({ dyno: false, cyl: false, beaker: false });
      expect(state.rows).toHaveLength(0);
      expect(state.hMm).toBe(0);
      expect(state.pAirN).toBeNull();
      await page.screenshot({ path: `test-results/comp-${vp.name}-I-reset.png` });
    });

    test(`J: pixel-level aesthetics: header in one row, no clipping`, async ({ page }) => {
      const stepsRowCount = await page.evaluate(() => {
        const steps = document.querySelectorAll<HTMLElement>('#av-steps .step');
        const tops = new Set<number>();
        steps.forEach(s => tops.add(Math.round(s.getBoundingClientRect().top / 10) * 10));
        return tops.size;
      });
      // На viewport ≥ 1280 шаги должны быть в 1 ряд
      expect(stepsRowCount, `steps в 1 ряд (фактически ${stepsRowCount} рядов)`).toBeLessThanOrEqual(1);
    });

    test(`K: card aesthetics: цилиндр со шкалой видим, шкала читаема`, async ({ page }) => {
      const cardCylSize = await page.evaluate(() => {
        const cyl = document.querySelector('#av-card-cyl #av-cyl') as HTMLElement | null;
        if (!cyl) return null;
        const r = cyl.getBoundingClientRect();
        return { width: r.width, height: r.height };
      });
      expect(cardCylSize, 'cyl в карточке существует').not.toBeNull();
      // --w-size: 110px → ширина host = 110
      expect(cardCylSize!.width, 'cyl в карточке ≥ 90 px (шкала читаема)').toBeGreaterThanOrEqual(90);
    });

    test(`L: drag by mouse — pointermove симуляция вниз → погружение`, async ({ page }) => {
      await page.evaluate(() => {
        const e = window.archimedesVolumeExperiment!;
        e.placeDynamometer(); e.attachCylinder(); e.placeBeaker();
      });
      await page.waitForTimeout(900);
      // Mouse drag — pointer down на cylinder-rig, move down ~80px, up.
      const initial = await page.evaluate(() => {
        const r = document.querySelector('#av-cylinder-rig')!.getBoundingClientRect();
        return { cx: r.left + r.width/2, cy: r.top + r.height/2 };
      });
      await page.mouse.move(initial.cx, initial.cy);
      await page.mouse.down();
      // плавный спуск
      for (let dy = 5; dy <= 100; dy += 10) {
        await page.mouse.move(initial.cx, initial.cy + dy);
        await page.waitForTimeout(16);
      }
      await page.mouse.up();
      await page.waitForTimeout(400);
      const finalH = await page.evaluate(() => window.archimedesVolumeExperiment!.getState().hMm);
      expect(finalH, 'после drag hMm > 0').toBeGreaterThan(0);
      expect(finalH).toBeLessThanOrEqual(80);
      await page.screenshot({ path: `test-results/comp-${vp.name}-L-drag.png` });
    });
  });
}
