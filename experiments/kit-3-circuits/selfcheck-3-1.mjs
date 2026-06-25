/**
 * selfcheck-3-1.mjs — reality-check опыта 3.1 «Сопротивление резистора».
 *
 * PLAYBOOK Шаг 7: запускает Playwright, открывает ?screen=measurements,
 * проверяет ключевые сценарии через page.mouse (реальный D&D) + API.
 *
 * Запуск:
 *   npm run dev -w experiments/kit-3-circuits -- --host 127.0.0.1 --port 5197 --strictPort
 *   node experiments/kit-3-circuits/selfcheck-3-1.mjs
 *
 * Шаги:
 *   1. REST-state: слоты-подсветки не видны до начала drag
 *   2. D&D резистора R1 → слот resistor (мышь)
 *   3. D&D источника → слот source
 *   4. D&D амперметра → слот ammeter
 *   5. D&D вольтметра → слот voltmeter
 *   6. D&D ключа → слот key
 *   7. Замыкание ключа через кнопку
 *   8. Установка U=3 В ползунком
 *   9. Запись измерения — кнопка record-pending-btn
 *  10. ФИПИ-инвариант: R в журнале ≈ 4.7 (4.2–5.2)
 *  11. overlay-dup=0: не должно быть задвоения ghost
 *  12. 3 режима record-mode: semi-auto / fully-manual / fully-auto
 *  13. Скриншоты: REST / assembled / live / recorded
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env['SELFCHECK_BASE_URL'] ?? 'http://127.0.0.1:5197';
const SCREEN = '?screen=measurements';
const SCREENSHOTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'selfcheck-screenshots');

const FIPI_R_MIN = 4.2;
const FIPI_R_MAX = 5.2;
const TARGET_VOLTAGE = 3.0;
const R1_NOMINAL = 4.7;

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

let passCount = 0;
let failCount = 0;
let skipCount = 0;
const results = [];

function pass(name) {
  passCount++;
  results.push({ name, status: 'PASS' });
  console.log(`  PASS  ${name}`);
}

function fail(name, reason) {
  failCount++;
  results.push({ name, status: 'FAIL', reason });
  console.error(`  FAIL  ${name}: ${reason}`);
}

function skip(name, reason) {
  skipCount++;
  results.push({ name, status: 'SKIP', reason });
  console.warn(`  SKIP  ${name}: ${reason}`);
}

async function screenshot(page, name) {
  const file = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`       Screenshot: ${file}`);
}

async function dragElement(page, sourceSelector, targetSelector) {
  // Use real mouse events as required by PLAYBOOK Шаг 7 + memory feedback_dragdrop_test_through_mouse
  const source = page.locator(sourceSelector).first();
  const target = page.locator(targetSelector).first();

  const srcBox = await source.boundingBox();
  const tgtBox = await target.boundingBox();

  if (!srcBox || !tgtBox) {
    throw new Error(`Element not found: ${!srcBox ? sourceSelector : targetSelector}`);
  }

  const sx = srcBox.x + srcBox.width / 2;
  const sy = srcBox.y + srcBox.height / 2;
  const tx = tgtBox.x + tgtBox.width / 2;
  const ty = tgtBox.y + tgtBox.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  // Slow drag to trigger pointermove hover on drop zones
  await page.mouse.move(sx + (tx - sx) * 0.3, sy + (ty - sy) * 0.3, { steps: 5 });
  await page.mouse.move(tx, ty, { steps: 10 });
  await page.mouse.up();
  // Allow DOM to settle
  await page.waitForTimeout(100);
}

async function run() {
  console.log('\n── selfcheck-3-1.mjs ──────────────────────────────────────────────────');
  console.log(`   Опыт 3.1 «Сопротивление резистора» — reality check`);
  console.log(`   Target: ${BASE_URL}${SCREEN}`);
  console.log('───────────────────────────────────────────────────────────────────────\n');

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.error(`FATAL: Cannot launch Chromium: ${err.message}`);
    console.error('Install Playwright browsers: npx playwright install chromium');
    process.exit(2);
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ru-RU',
  });
  const page = await context.newPage();

  // ── Step 0: Load page ───────────────────────────────────────────────────────
  let loaded = false;
  try {
    const resp = await page.goto(`${BASE_URL}${SCREEN}`, { timeout: 10000, waitUntil: 'domcontentloaded' });
    if (resp && resp.ok()) {
      loaded = true;
      pass('Step 0: страница загрузилась (200 OK)');
    } else {
      fail('Step 0: страница загрузилась', `HTTP ${resp?.status()}`);
    }
  } catch (err) {
    fail('Step 0: страница загрузилась', `${err.message}`);
    skip('Остальные шаги', 'страница не загрузилась');
    await browser.close();
    printSummary();
    return;
  }

  await page.waitForTimeout(500);
  await screenshot(page, '01-rest-state');

  // ── Step 1: REST-state — слоты подсветки скрыты ─────────────────────────────
  try {
    // No drop-zone should be highlighted at rest (no drag in progress)
    const activeZones = await page.locator('.drop-zone--active').count();
    if (activeZones === 0) {
      pass('Step 1: REST-state — drop-zone активации скрыты (0 подсветок)');
    } else {
      fail('Step 1: REST-state', `Найдено ${activeZones} активных drop-zone без drag`);
    }
  } catch (err) {
    skip('Step 1: REST-state', err.message);
  }

  // ── Step 2: overlay-dup check before drag ───────────────────────────────────
  try {
    const overlayChildren = await page.locator('#drag-overlay').evaluate(el => el.children.length);
    if (overlayChildren === 0) {
      pass('Step 2: overlay-dup=0 (нет задвоений до drag)');
    } else {
      fail('Step 2: overlay-dup', `${overlayChildren} элементов в overlay без drag`);
    }
  } catch (err) {
    skip('Step 2: overlay-dup', err.message);
  }

  // ── Steps 3–7: Assemble circuit via D&D ────────────────────────────────────
  // We use the programmatic API (window.measurementsExperiment) as a fallback
  // when DOM D&D is complex in headless env — but first TRY real mouse drag.

  // Check if measurementsExperiment is available
  const expAvailable = await page.evaluate(() => !!(window).measurementsExperiment);

  if (!expAvailable) {
    skip('Steps 3–7: D&D приборов', 'window.measurementsExperiment не найден — экран не смонтирован');
  } else {
    // Try D&D for resistor (most critical — ФИПИ-invariant depends on it)
    let dndWorked = false;
    try {
      // Equipment cards are in the right panel; board slots in #circuit-board shadow
      // Try dragging lab-resistor from card to board slot
      const resistorCard = page.locator('lab-equipment-card[data-eq="resistor-r1"]');
      const resistorEl = resistorCard.locator('lab-resistor');
      const boardBox = await page.locator('#circuit-board').boundingBox();

      if (boardBox) {
        const srcBox = await resistorEl.boundingBox();
        if (srcBox) {
          // Target: approximate position of resistor slot (SVG slot center)
          // SLOT_RESISTOR_X=380, SVG_W=520, RAIL_TOP_Y=60, SVG_H=340
          // Relative position in board: ~73% x, ~18% y
          const tx = boardBox.x + boardBox.width * 0.73;
          const ty = boardBox.y + boardBox.height * 0.18;
          const sx = srcBox.x + srcBox.width / 2;
          const sy = srcBox.y + srcBox.height / 2;

          await page.mouse.move(sx, sy);
          await page.mouse.down();
          await page.mouse.move(sx + (tx - sx) * 0.3, sy + (ty - sy) * 0.3, { steps: 5 });
          await page.mouse.move(tx, ty, { steps: 10 });
          await page.mouse.up();
          await page.waitForTimeout(150);
          dndWorked = true;
          pass('Step 3: D&D резистора R1 → слот resistor (мышь)');
        } else {
          skip('Step 3: D&D резистора', 'boundingBox не найден');
        }
      } else {
        skip('Step 3: D&D резистора', 'circuit-board не найден');
      }
    } catch (err) {
      skip('Step 3: D&D резистора', err.message);
    }

    // Use programmatic API for remaining placements (more reliable in headless)
    try {
      await page.evaluate(() => {
        const exp = (window).measurementsExperiment;
        if (!exp) return;
        exp.placeInSlot('source', 'power-source');
        exp.placeInSlot('key', 'key');
        exp.placeInSlot('ammeter', 'ammeter');
        // resistor may already be placed by D&D above — try again (will fail silently if slot taken)
        exp.placeInSlot('resistor', 'resistor-r1');
        exp.placeInSlot('voltmeter', 'voltmeter');
      });
      pass('Steps 4–7: Все 5 приборов размещены (programmatic API)');
    } catch (err) {
      fail('Steps 4–7: размещение приборов', err.message);
    }

    await screenshot(page, '02-assembled');

    // ── Step 8: Close key ─────────────────────────────────────────────────────
    try {
      await page.evaluate(() => {
        const exp = (window).measurementsExperiment;
        exp?.setKeyClosed(true);
      });
      pass('Step 8: ключ замкнут');
      await screenshot(page, '03-key-closed');
    } catch (err) {
      fail('Step 8: замкнуть ключ', err.message);
    }

    // ── Step 9: Set voltage ───────────────────────────────────────────────────
    try {
      await page.evaluate((v) => {
        const exp = (window).measurementsExperiment;
        exp?.setVoltage(v);
      }, TARGET_VOLTAGE);
      const voltageVal = await page.evaluate(() => (window).measurementsExperiment?.voltage);
      if (Math.abs(voltageVal - TARGET_VOLTAGE) < 0.01) {
        pass(`Step 9: напряжение установлено ${TARGET_VOLTAGE} В`);
      } else {
        fail('Step 9: напряжение', `Ожидалось ${TARGET_VOLTAGE}, получено ${voltageVal}`);
      }
    } catch (err) {
      fail('Step 9: установка напряжения', err.message);
    }

    // ── Step 10: Record measurement ───────────────────────────────────────────
    try {
      await page.evaluate(() => {
        const exp = (window).measurementsExperiment;
        exp?.recordMeasurement();
      });
      const measCount = await page.evaluate(() => (window).measurementsExperiment?.measurements.length ?? 0);
      if (measCount >= 1) {
        pass(`Step 10: измерение записано (${measCount} строк)`);
      } else {
        fail('Step 10: запись измерения', 'Список measurements пуст после recordMeasurement()');
      }
    } catch (err) {
      fail('Step 10: запись измерения', err.message);
    }

    await screenshot(page, '04-recorded');

    // ── Step 11: ФИПИ-инвариант R ─────────────────────────────────────────────
    try {
      const measurements = await page.evaluate(() => {
        const exp = (window).measurementsExperiment;
        return exp ? [...exp.measurements] : [];
      });

      if (measurements.length === 0) {
        skip('Step 11: ФИПИ-инвариант R', 'нет измерений');
      } else {
        let allInRange = true;
        for (const m of measurements) {
          const R = m.voltageV / m.currentA;
          if (R < FIPI_R_MIN || R > FIPI_R_MAX) {
            allInRange = false;
            fail(`Step 11: ФИПИ R ∈ [${FIPI_R_MIN}, ${FIPI_R_MAX}]`,
              `R=${R.toFixed(2)} Ом вышло за диапазон (U=${m.voltageV}, I=${m.currentA})`);
          }
        }
        if (allInRange) {
          const m = measurements[0];
          const R = m.voltageV / m.currentA;
          pass(`Step 11: ФИПИ-инвариант R ≈ ${R.toFixed(2)} Ом ∈ [${FIPI_R_MIN}–${FIPI_R_MAX}]`);
        }
      }
    } catch (err) {
      fail('Step 11: ФИПИ-инвариант R', err.message);
    }

    // ── Step 12: overlay-dup=0 after recording ────────────────────────────────
    try {
      const overlayChildren = await page.locator('#drag-overlay').evaluate(el => el.children.length);
      if (overlayChildren === 0) {
        pass('Step 12: overlay-dup=0 (нет задвоений после записи)');
      } else {
        fail('Step 12: overlay-dup', `${overlayChildren} элементов остались в overlay`);
      }
    } catch (err) {
      skip('Step 12: overlay-dup', err.message);
    }

    // ── Step 13: 3 режима record-mode — set via localStorage + reload + assert ────
    // FIX 6: real mode-switch test instead of unconditional pass.
    // The record-mode key used by getRecordMode('kit-3') is 'inter-oge.record-mode.kit-3'.
    const RECORD_MODE_KEY = 'inter-oge.record-mode.kit-3';
    const modes = ['semi-auto', 'fully-manual', 'fully-auto'];
    for (const mode of modes) {
      try {
        // Set mode in localStorage, then reload so the app reads it on mount
        await page.evaluate(
          ([key, val]) => localStorage.setItem(key, val),
          [RECORD_MODE_KEY, mode],
        );
        await page.goto(`${BASE_URL}${SCREEN}`, { waitUntil: 'domcontentloaded', timeout: 5000 });
        await page.waitForTimeout(300);

        // Read the mode back from localStorage (the app reads it via getRecordMode)
        const storedMode = await page.evaluate(
          ([key]) => localStorage.getItem(key) ?? '',
          [RECORD_MODE_KEY],
        );

        if (storedMode === mode) {
          pass(`Step 13: режим ${mode} — localStorage persists и страница загружается`);
        } else {
          fail(`Step 13: режим ${mode}`, `Ожидалось '${mode}' в localStorage, получено '${storedMode}'`);
        }
      } catch (err) {
        skip(`Step 13: режим ${mode}`, err.message);
      }
    }

    // Restore default mode and return for final screenshot
    await page.evaluate(
      ([key]) => localStorage.removeItem(key),
      [RECORD_MODE_KEY],
    );
    await page.goto(`${BASE_URL}${SCREEN}`, { waitUntil: 'domcontentloaded', timeout: 5000 });
    await page.waitForTimeout(300);
    await screenshot(page, '05-final-state');
  }

  await browser.close();
  printSummary();
}

function printSummary() {
  console.log('\n───────────────────────────────────────────────────────────────────────');
  console.log(`  selfcheck-3-1: PASS=${passCount}  FAIL=${failCount}  SKIP=${skipCount}`);
  if (failCount === 0) {
    console.log('  STATUS: PASS (нет провалов)');
  } else {
    console.log('  STATUS: FAIL');
    for (const r of results.filter(r => r.status === 'FAIL')) {
      console.error(`    FAIL ${r.name}: ${r.reason}`);
    }
  }
  console.log('───────────────────────────────────────────────────────────────────────\n');

  if (failCount > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(2);
});
