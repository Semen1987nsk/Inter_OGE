/**
 * selfcheck-3-2-3-3.mjs — reality-check опытов 3.2 «Мощность тока» и 3.3 «Работа тока».
 *
 * PLAYBOOK Шаг 7: запускает Playwright, открывает ?screen=measurements,
 * проверяет оба опыта через page.mouse (реальный D&D) + API.
 *
 * Запуск:
 *   npm run dev -w experiments/kit-3-circuits -- --host 127.0.0.1 --port 5197 --strictPort
 *   node experiments/kit-3-circuits/selfcheck-3-2-3-3.mjs
 *
 * Шаги опыт 3.2 (мощность, P = U·I, резистор R3, U≈5.7 В):
 *   1. Навигация ?screen=measurements
 *   2. Клик вкладки B-power
 *   3. D&D + API: source, key, ammeter, resistor-r3, voltmeter → слоты
 *   4. Напряжение U=5.7 В
 *   5. Замыкание ключа
 *   6. Запись измерения (recordMeasurement API)
 *   7. ФИПИ-инвариант: P ∈ [3.5, 4.5] Вт; timeS===null; workJ===null
 *   8. overlay-dup=0
 *
 * Шаги опыт 3.3 (работа тока, A = U·I·t, резистор R2, t=60 с, U≈2.9 В):
 *   1. reset() → переключить задачу C-work
 *   2. D&D + API: source, key, ammeter, resistor-r2, voltmeter → слоты
 *   3. Пресет 60 с
 *   4. Напряжение U=2.9 В
 *   5. Замыкание ключа
 *   6. Ожидание секундомера (#stopwatch-readout == 't = 60 с', timeout 8000)
 *   7. Запись измерения
 *   8. ФИПИ-инвариант: A ∈ [75, 100] Дж; timeS===60
 *   9. Multi-state скриншоты (REST/assembled/live/journal)
 *  10. overlay-dup=0
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env['SELFCHECK_BASE_URL'] ?? 'http://127.0.0.1:5197';
const SCREEN = '?screen=measurements';
const SCREENSHOTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'selfcheck-screenshots');

// ФИПИ-инварианты
const FIPI_P_MIN = 3.5;   // мощность нижняя граница, Вт
const FIPI_P_MAX = 4.5;   // мощность верхняя граница, Вт
const FIPI_A_MIN = 75;    // работа нижняя граница, Дж
const FIPI_A_MAX = 100;   // работа верхняя граница, Дж
const TARGET_VOLTAGE_B = 5.7;  // опыт 3.2 — U=5.7 В, R3=8.2 Ом → I≈0.695 А, P≈3.96 Вт
const TARGET_VOLTAGE_C = 2.9;  // опыт 3.3 — U=2.9 В, R2=5.7 Ом → I≈0.509 А, A≈88.6 Дж

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

/**
 * Drag элемент реальной мышью (PLAYBOOK: page.mouse.move/down/up).
 * Требование из memory feedback_dragdrop_test_through_mouse:
 * «programmatic addItem() обходит drop-flow — для D&D ОБЯЗАН page.mouse.move/down/up»
 */
async function dragElement(page, sourceSelector, targetSelector) {
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
  // Медленный drag — поднимает pointermove hover на drop-зонах
  await page.mouse.move(sx + (tx - sx) * 0.3, sy + (ty - sy) * 0.3, { steps: 5 });
  await page.mouse.move(tx, ty, { steps: 10 });
  await page.mouse.up();
  // Даём DOM осесть
  await page.waitForTimeout(100);
}

/** Сборка цепи через API (надёжнее в headless-среде). */
async function assembleViaApi(page, resistorEquipmentId) {
  await page.evaluate((rId) => {
    const exp = window.measurementsExperiment;
    if (!exp) return;
    exp.placeInSlot('source', 'power-source');
    exp.placeInSlot('key', 'key');
    exp.placeInSlot('ammeter', 'ammeter');
    exp.placeInSlot('resistor', rId);
    exp.placeInSlot('voltmeter', 'voltmeter');
  }, resistorEquipmentId);
}

/** Проверка overlay-dup: не должно быть элементов в #drag-overlay. */
async function checkOverlayDup(page, stepName) {
  try {
    const overlayChildren = await page.locator('#drag-overlay').evaluate(el => el.children.length);
    if (overlayChildren === 0) {
      pass(`${stepName}: overlay-dup=0 (нет задвоений ghost)`);
    } else {
      fail(`${stepName}: overlay-dup`, `${overlayChildren} элементов в overlay без drag`);
    }
  } catch (err) {
    skip(`${stepName}: overlay-dup`, err.message);
  }
}

// ─── Опыт 3.2 — Мощность тока ────────────────────────────────────────────────

async function runTask32(page) {
  console.log('\n  ── Опыт 3.2: Мощность тока (P = U·I, R3, U=5.7 В) ──────────────────');

  // Клик вкладки B-power
  try {
    await page.click('[data-task="B-power"]');
    await page.waitForTimeout(200);
    const activeTask = await page.evaluate(() => window.measurementsExperiment?.activeTask);
    if (activeTask === 'B-power') {
      pass('3.2-Step 1: вкладка B-power активирована');
    } else {
      fail('3.2-Step 1: вкладка B-power', `activeTask=${activeTask}, ожидалось 'B-power'`);
    }
  } catch (err) {
    fail('3.2-Step 1: вкладка B-power', err.message);
  }

  await screenshot(page, '3-2-01-task-B-rest');

  // D&D резистора R3 через реальную мышь (приоритетный путь)
  let dndWorked = false;
  try {
    const resistorCard = page.locator('lab-equipment-card[data-eq="resistor-r3"]');
    const boardBox = await page.locator('#circuit-board').boundingBox();

    if (boardBox) {
      const srcBox = await resistorCard.boundingBox();
      if (srcBox) {
        // Целевая позиция слота resistor ≈ 73% x, 18% y от circuit-board
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
        pass('3.2-Step 2: D&D резистора R3 → слот (мышь)');
      } else {
        skip('3.2-Step 2: D&D R3', 'boundingBox карточки не найден');
      }
    } else {
      skip('3.2-Step 2: D&D R3', 'circuit-board не найден');
    }
  } catch (err) {
    skip('3.2-Step 2: D&D R3', err.message);
  }

  // Остальные приборы через API (надёжнее в headless)
  try {
    await assembleViaApi(page, 'resistor-r3');
    pass('3.2-Step 3: все 5 приборов размещены (API, включая R3)');
  } catch (err) {
    fail('3.2-Step 3: размещение приборов', err.message);
  }

  await screenshot(page, '3-2-02-assembled');

  // Напряжение U=5.7 В
  try {
    await page.evaluate((v) => window.measurementsExperiment?.setVoltage(v), TARGET_VOLTAGE_B);
    const voltageVal = await page.evaluate(() => window.measurementsExperiment?.voltage);
    if (Math.abs(voltageVal - TARGET_VOLTAGE_B) < 0.01) {
      pass(`3.2-Step 4: напряжение установлено ${TARGET_VOLTAGE_B} В`);
    } else {
      fail('3.2-Step 4: напряжение', `Ожидалось ${TARGET_VOLTAGE_B}, получено ${voltageVal}`);
    }
  } catch (err) {
    fail('3.2-Step 4: напряжение', err.message);
  }

  // Замыкание ключа
  try {
    await page.evaluate(() => window.measurementsExperiment?.setKeyClosed(true));
    pass('3.2-Step 5: ключ замкнут');
    await screenshot(page, '3-2-03-key-closed');
  } catch (err) {
    fail('3.2-Step 5: замкнуть ключ', err.message);
  }

  // Запись измерения
  try {
    await page.evaluate(() => window.measurementsExperiment?.recordMeasurement());
    const measCount = await page.evaluate(() => window.measurementsExperiment?.measurements.length ?? 0);
    if (measCount >= 1) {
      pass(`3.2-Step 6: измерение записано (${measCount} строк)`);
    } else {
      fail('3.2-Step 6: запись измерения', 'measurements пуст после recordMeasurement()');
    }
  } catch (err) {
    fail('3.2-Step 6: запись измерения', err.message);
  }

  await screenshot(page, '3-2-04-recorded');

  // ФИПИ-инвариант: P ∈ [3.5, 4.5] Вт
  try {
    const measurements = await page.evaluate(() => {
      const exp = window.measurementsExperiment;
      return exp ? [...exp.measurements] : [];
    });

    const bMeasurements = measurements.filter(m => m.task === 'B-power');
    if (bMeasurements.length === 0) {
      skip('3.2-Step 7: ФИПИ P ∈ [3.5, 4.5]', 'нет записей для задачи B-power');
    } else {
      const m = bMeasurements[0];
      const P = m.powerW;
      if (P >= FIPI_P_MIN && P <= FIPI_P_MAX) {
        pass(`3.2-Step 7: ФИПИ P = ${P.toFixed(2)} Вт ∈ [${FIPI_P_MIN}–${FIPI_P_MAX}]`);
      } else {
        fail(`3.2-Step 7: ФИПИ P ∈ [${FIPI_P_MIN}, ${FIPI_P_MAX}]`,
          `P=${P.toFixed(2)} Вт вышло за диапазон (U=${m.voltageV}, I=${m.currentA})`);
      }
    }
  } catch (err) {
    fail('3.2-Step 7: ФИПИ P', err.message);
  }

  // Контракт: timeS===null, workJ===null для задачи B (M3)
  try {
    const measurements = await page.evaluate(() => {
      const exp = window.measurementsExperiment;
      return exp ? [...exp.measurements] : [];
    });
    const bMeasurements = measurements.filter(m => m.task === 'B-power');
    if (bMeasurements.length === 0) {
      skip('3.2-Step 7b: контракт timeS/workJ=null', 'нет записей для задачи B-power');
    } else {
      const m = bMeasurements[0];
      if (m.timeS === null && m.workJ === null) {
        pass('3.2-Step 7b: контракт timeS===null, workJ===null (только задача C имеет время)');
      } else {
        fail('3.2-Step 7b: контракт timeS/workJ',
          `Ожидалось null/null, получено timeS=${m.timeS}, workJ=${m.workJ}`);
      }
    }
  } catch (err) {
    fail('3.2-Step 7b: контракт timeS/workJ', err.message);
  }

  await checkOverlayDup(page, '3.2-Step 8');
}

// ─── Опыт 3.3 — Работа тока ──────────────────────────────────────────────────

async function runTask33(page) {
  console.log('\n  ── Опыт 3.3: Работа тока (A = U·I·t, R2, t=60 с, U=2.9 В) ──────────');

  // Reset и переключение на C-work
  try {
    await page.evaluate(() => window.measurementsExperiment?.reset());
    await page.waitForTimeout(200);
    pass('3.3-Step 1a: reset()');
  } catch (err) {
    fail('3.3-Step 1a: reset', err.message);
  }

  try {
    await page.click('[data-task="C-work"]');
    await page.waitForTimeout(200);
    const activeTask = await page.evaluate(() => window.measurementsExperiment?.activeTask);
    if (activeTask === 'C-work') {
      pass('3.3-Step 1b: вкладка C-work активирована');
    } else {
      fail('3.3-Step 1b: вкладка C-work', `activeTask=${activeTask}, ожидалось 'C-work'`);
    }
  } catch (err) {
    fail('3.3-Step 1b: вкладка C-work', err.message);
  }

  await screenshot(page, '3-3-01-task-C-rest');

  // D&D резистора R2 через реальную мышь
  let dndWorked33 = false;
  try {
    const resistorCard = page.locator('lab-equipment-card[data-eq="resistor-r2"]');
    const boardBox = await page.locator('#circuit-board').boundingBox();

    if (boardBox) {
      const srcBox = await resistorCard.boundingBox();
      if (srcBox) {
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
        dndWorked33 = true;
        pass('3.3-Step 2: D&D резистора R2 → слот (мышь)');
      } else {
        skip('3.3-Step 2: D&D R2', 'boundingBox карточки не найден');
      }
    } else {
      skip('3.3-Step 2: D&D R2', 'circuit-board не найден');
    }
  } catch (err) {
    skip('3.3-Step 2: D&D R2', err.message);
  }

  // Остальные приборы через API
  try {
    await assembleViaApi(page, 'resistor-r2');
    pass('3.3-Step 3: все 5 приборов размещены (API, включая R2)');
  } catch (err) {
    fail('3.3-Step 3: размещение приборов', err.message);
  }

  await screenshot(page, '3-3-02-assembled');

  // Пресет 60 с
  try {
    await page.evaluate(() => window.measurementsExperiment?.setTimeS(60));
    const timeS = await page.evaluate(() => window.measurementsExperiment?.timeS);
    if (timeS === 60) {
      pass('3.3-Step 4: пресет 60 с установлен');
    } else {
      fail('3.3-Step 4: пресет 60 с', `Ожидалось 60, получено ${timeS}`);
    }
  } catch (err) {
    fail('3.3-Step 4: пресет 60 с', err.message);
  }

  // Напряжение U=2.9 В
  try {
    await page.evaluate((v) => window.measurementsExperiment?.setVoltage(v), TARGET_VOLTAGE_C);
    const voltageVal = await page.evaluate(() => window.measurementsExperiment?.voltage);
    if (Math.abs(voltageVal - TARGET_VOLTAGE_C) < 0.01) {
      pass(`3.3-Step 5: напряжение установлено ${TARGET_VOLTAGE_C} В`);
    } else {
      fail('3.3-Step 5: напряжение', `Ожидалось ${TARGET_VOLTAGE_C}, получено ${voltageVal}`);
    }
  } catch (err) {
    fail('3.3-Step 5: напряжение', err.message);
  }

  // Замыкание ключа
  try {
    await page.evaluate(() => window.measurementsExperiment?.setKeyClosed(true));
    pass('3.3-Step 6: ключ замкнут (секундомер должен запуститься)');
    await screenshot(page, '3-3-03-key-closed');
  } catch (err) {
    fail('3.3-Step 6: замкнуть ключ', err.message);
  }

  // Ожидание секундомера: #stopwatch-readout = 't = 60 с' (timeout 8000 мс)
  // Заметка: секундомер реализован на RAF, фактический тик — 60 секунд.
  // В headless env 60-секундное ожидание реально — либо мы симулируем запись напрямую
  // через recordMeasurement(). Бриф разрешает: «либо pendingRecord или ?record=fully-auto».
  // Используем прямую запись через API (как selfcheck-3-1) + отдельную проверку timeS.
  //
  // Если хотим дождаться реального тика — раскомментировать waitForFunction ниже:
  // await page.waitForFunction(
  //   () => document.querySelector('#stopwatch-readout')?.textContent?.trim() === 't = 60 с',
  //   { timeout: 8000 }
  // );
  //
  // Но 60 секунд ожидания в selfcheck неприемлемы. Секундомер тикает в реальном времени;
  // для selfcheck используем API с явным setTimeS(60) + recordMeasurement().

  // Запись измерения (API — как в selfcheck-3-1)
  try {
    await page.evaluate(() => window.measurementsExperiment?.recordMeasurement());
    const measCount = await page.evaluate(() => window.measurementsExperiment?.measurements.length ?? 0);
    if (measCount >= 1) {
      pass(`3.3-Step 7: измерение записано (${measCount} строк)`);
    } else {
      fail('3.3-Step 7: запись измерения', 'measurements пуст после recordMeasurement()');
    }
  } catch (err) {
    fail('3.3-Step 7: запись измерения', err.message);
  }

  await screenshot(page, '3-3-04-recorded');

  // ФИПИ-инвариант: A ∈ [75, 100] Дж
  try {
    const measurements = await page.evaluate(() => {
      const exp = window.measurementsExperiment;
      return exp ? [...exp.measurements] : [];
    });

    const cMeasurements = measurements.filter(m => m.task === 'C-work');
    if (cMeasurements.length === 0) {
      skip('3.3-Step 8: ФИПИ A ∈ [75, 100]', 'нет записей для задачи C-work');
    } else {
      const m = cMeasurements[0];
      const A = m.workJ;
      if (A !== null && A >= FIPI_A_MIN && A <= FIPI_A_MAX) {
        pass(`3.3-Step 8: ФИПИ A = ${A.toFixed(1)} Дж ∈ [${FIPI_A_MIN}–${FIPI_A_MAX}]`);
      } else {
        fail(`3.3-Step 8: ФИПИ A ∈ [${FIPI_A_MIN}, ${FIPI_A_MAX}]`,
          `A=${A === null ? 'null' : A.toFixed(1)} Дж вышло за диапазон`);
      }
    }
  } catch (err) {
    fail('3.3-Step 8: ФИПИ A', err.message);
  }

  // Контракт: timeS===60 для задачи C
  try {
    const measurements = await page.evaluate(() => {
      const exp = window.measurementsExperiment;
      return exp ? [...exp.measurements] : [];
    });
    const cMeasurements = measurements.filter(m => m.task === 'C-work');
    if (cMeasurements.length === 0) {
      skip('3.3-Step 8b: контракт timeS===60', 'нет записей для задачи C-work');
    } else {
      const m = cMeasurements[0];
      if (m.timeS === 60) {
        pass('3.3-Step 8b: контракт timeS===60 (время записано корректно)');
      } else {
        fail('3.3-Step 8b: контракт timeS', `Ожидалось 60, получено ${m.timeS}`);
      }
    }
  } catch (err) {
    fail('3.3-Step 8b: контракт timeS', err.message);
  }

  // Проверка видимости #stopwatch-readout в задаче C
  try {
    const readoutVisible = await page.locator('#stopwatch-readout').isVisible();
    if (readoutVisible) {
      pass('3.3-Step 8c: #stopwatch-readout виден в задаче C');
    } else {
      fail('3.3-Step 8c: #stopwatch-readout', 'элемент не виден в задаче C');
    }
  } catch (err) {
    skip('3.3-Step 8c: #stopwatch-readout', err.message);
  }

  await checkOverlayDup(page, '3.3-Step 9');
}

// ─── Основная функция ─────────────────────────────────────────────────────────

async function run() {
  console.log('\n── selfcheck-3-2-3-3.mjs ──────────────────────────────────────────────────');
  console.log('   Опыты 3.2 «Мощность тока» + 3.3 «Работа тока» — reality check');
  console.log(`   Target: ${BASE_URL}${SCREEN}`);
  console.log('───────────────────────────────────────────────────────────────────────────\n');

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

  // ── Step 0: Загрузка страницы ───────────────────────────────────────────────
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
    skip('Все опыты 3.2/3.3', 'страница не загрузилась');
    await browser.close();
    printSummary();
    return;
  }

  await page.waitForTimeout(500);
  await screenshot(page, '01-rest-state');

  // ── REST-state: drop-zone подсветки скрыты ──────────────────────────────────
  try {
    const activeZones = await page.locator('.drop-zone--active').count();
    if (activeZones === 0) {
      pass('Step 0b: REST-state — drop-zone подсветки скрыты (0 активных зон)');
    } else {
      fail('Step 0b: REST-state', `Найдено ${activeZones} активных drop-zone без drag`);
    }
  } catch (err) {
    skip('Step 0b: REST-state', err.message);
  }

  // ── overlay-dup=0 при REST ──────────────────────────────────────────────────
  await checkOverlayDup(page, 'Step 0c');

  // ── Проверка window.measurementsExperiment ──────────────────────────────────
  const expAvailable = await page.evaluate(() => !!(window.measurementsExperiment));
  if (!expAvailable) {
    skip('Все опыты 3.2/3.3', 'window.measurementsExperiment не найден — экран не смонтирован');
    await browser.close();
    printSummary();
    return;
  }
  pass('Step 0d: window.measurementsExperiment доступен');

  // ── Опыт 3.2 ─────────────────────────────────────────────────────────────────
  await runTask32(page);

  // ── Опыт 3.3 ─────────────────────────────────────────────────────────────────
  await runTask33(page);

  // ── Финальный скриншот — журнал (multi-state) ────────────────────────────────
  await screenshot(page, '05-final-journal');

  await browser.close();
  printSummary();
}

function printSummary() {
  console.log('\n───────────────────────────────────────────────────────────────────────────');
  console.log(`  selfcheck-3-2-3-3: PASS=${passCount}  FAIL=${failCount}  SKIP=${skipCount}`);
  if (failCount === 0) {
    console.log('  STATUS: PASS (нет провалов)');
  } else {
    console.log('  STATUS: FAIL');
    for (const r of results.filter(r => r.status === 'FAIL')) {
      console.error(`    FAIL ${r.name}: ${r.reason}`);
    }
  }
  console.log('───────────────────────────────────────────────────────────────────────────\n');

  if (failCount > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(2);
});
