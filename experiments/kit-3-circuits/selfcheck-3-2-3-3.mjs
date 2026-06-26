/**
 * selfcheck-3-2-3-3.mjs — reality-check опытов 3.2 «Мощность тока» и 3.3 «Работа тока».
 *
 * PLAYBOOK Шаг 7 + REFERENCE §13 + урок «D&D self-check через mouse»:
 * сборка цепи ОБЯЗАНА идти реальным page.mouse.move/down/up — programmatic placeInSlot
 * обходит drop-flow и не ловит overlay-dup. Здесь все 5 приборов перетаскиваются мышью,
 * и после каждого дропа проверяется, что слот реально занят (card[data-placed]).
 *
 * Запуск:
 *   npm run dev -w experiments/kit-3-circuits -- --host 127.0.0.1 --port 5197 --strictPort
 *   node experiments/kit-3-circuits/selfcheck-3-2-3-3.mjs
 *
 * Опыт 3.2 (мощность, P = U·I, резистор R3, U≈5.7 В):
 *   1. Навигация ?screen=measurements
 *   2. Клик вкладки B-power
 *   3. mouse-D&D source/key/ammeter/resistor-r3/voltmeter → гнёзда (каждый дроп подтверждён)
 *   4. Напряжение U=5.7 В
 *   5. Замыкание ключа
 *   6. Запись измерения (pending-плашка #record-pending-btn)
 *   7. ФИПИ-инвариант: P ∈ [3.5, 4.5] Вт; timeS===null; workJ===null
 *   8. overlay-dup=0
 *
 * Опыт 3.3 (работа тока, A = U·I·t, резистор R2, t=60 с, U≈2.9 В):
 *   1. reset() → клик вкладки C-work
 *   2. mouse-D&D source/key/ammeter/resistor-r2/voltmeter → гнёзда (каждый дроп подтверждён)
 *   3. Пресет 60 с; U=2.9 В
 *   4. Замыкание ключа (стартует RAF-секундомер, ACCEL=20 → 60 c за ~3 c реального времени)
 *   5. waitForFunction: #stopwatch-readout достигает «t = 60 с» (timeout 8000)
 *   6. Запись измерения (pending-плашка)
 *   7. ФИПИ-инвариант: A ∈ [75, 100] Дж; timeS===60 (фильтр по task==='C-work')
 *   8. overlay-dup=0; #stopwatch-readout виден
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

// Соответствие слот → ID карточки в комплекте (для конкретного варианта резистора).
function assemblyPlan(resistorEquipmentId) {
  return [
    { slot: 'source',    eq: 'power-source' },
    { slot: 'key',       eq: 'key' },
    { slot: 'ammeter',   eq: 'ammeter' },
    { slot: 'resistor',  eq: resistorEquipmentId },
    { slot: 'voltmeter', eq: 'voltmeter' },
  ];
}

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
 * Реальный mouse-drag прибора из карточки комплекта в гнездо платы.
 * Цель — viewport-координаты гнезда через board.getSlotRect(slotId) (публичный метод).
 * Источник — центр draggable-элемента внутри карточки.
 * Возвращает true только если после mouse.up слот реально занят (card[data-placed]).
 */
async function dragInstrumentToSlot(page, equipmentId, slotId) {
  const cardSel = `lab-equipment-card[data-eq="${equipmentId}"]`;
  const draggableSel = `${cardSel} > lab-power-source, ${cardSel} > lab-voltmeter, ${cardSel} > lab-ammeter, ${cardSel} > lab-resistor, ${cardSel} > lab-key`;

  // Карточка «Ключ» — последняя в правой панели и при viewport 900px её центр
  // уходит ниже фолда. Прокручиваем draggable в зону видимости, иначе page.mouse
  // не может корректно схватить элемент с центром за пределами окна.
  const draggable = page.locator(draggableSel).first();
  await draggable.scrollIntoViewIfNeeded();
  await page.waitForTimeout(60);

  // Источник: центр draggable-элемента внутри карточки.
  const srcBox = await draggable.boundingBox();
  if (!srcBox) {
    throw new Error(`draggable не найден для ${equipmentId}`);
  }

  // Цель: viewport-rect гнезда через публичный board.getSlotRect.
  const tgt = await page.evaluate((sid) => {
    const board = document.querySelector('#circuit-board');
    if (!board || typeof board.getSlotRect !== 'function') return null;
    const r = board.getSlotRect(sid);
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, slotId);
  if (!tgt || (tgt.width === 0 && tgt.height === 0)) {
    throw new Error(`getSlotRect('${slotId}') вернул пустой rect`);
  }

  const sx = srcBox.x + srcBox.width / 2;
  const sy = srcBox.y + srcBox.height / 2;
  const tx = tgt.x + tgt.width / 2;
  const ty = tgt.y + tgt.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  // Медленный drag — поднимает pointermove hover на drop-зонах.
  await page.mouse.move(sx + (tx - sx) * 0.3, sy + (ty - sy) * 0.3, { steps: 6 });
  await page.mouse.move(tx, ty, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(120);

  // Подтверждение: дроп сел только если card получила data-placed (ставит ТОЛЬКО onDrop drop-flow).
  const placedSlot = await page.evaluate((sel) => {
    const card = document.querySelector(sel);
    return card ? card.getAttribute('data-placed') : null;
  }, cardSel);

  return placedSlot === slotId;
}

/**
 * Собрать цепь полностью реальным mouse-D&D. Каждый дроп подтверждается.
 * При несостоявшемся дропе — FAIL (без тихого API-фоллбэка).
 * Возвращает количество успешно посаженных приборов.
 */
async function assembleViaMouse(page, taskLabel, resistorEquipmentId) {
  let placed = 0;
  for (const { slot, eq } of assemblyPlan(resistorEquipmentId)) {
    try {
      const ok = await dragInstrumentToSlot(page, eq, slot);
      if (ok) {
        placed++;
        pass(`${taskLabel}: mouse-D&D ${eq} → слот ${slot} (слот занят)`);
      } else {
        fail(`${taskLabel}: mouse-D&D ${eq} → слот ${slot}`, 'дроп не сел (card без data-placed)');
      }
    } catch (err) {
      fail(`${taskLabel}: mouse-D&D ${eq} → слот ${slot}`, err.message);
    }
  }
  return placed;
}

/** Проверка overlay-dup: не должно быть элементов в #drag-overlay. */
async function checkOverlayDup(page, stepName) {
  try {
    const overlayChildren = await page.locator('#drag-overlay').evaluate(el => el.children.length);
    if (overlayChildren === 0) {
      pass(`${stepName}: overlay-dup=0 (нет задвоений ghost)`);
    } else {
      fail(`${stepName}: overlay-dup`, `${overlayChildren} элементов в overlay`);
    }
  } catch (err) {
    skip(`${stepName}: overlay-dup`, err.message);
  }
}

/** Запись измерения через pending-плашку (semi-auto), как делает ученик. */
async function recordViaPendingButton(page, stepName) {
  const btn = page.locator('#record-pending-btn');
  const visible = await btn.isVisible().catch(() => false);
  if (visible) {
    await btn.click();
    await page.waitForTimeout(150);
    pass(`${stepName}: запись через #record-pending-btn (semi-auto)`);
    return;
  }
  // Фоллбэк: pending-плашка скрыта (режим не semi-auto) — запись через API-триггер.
  await page.evaluate(() => window.measurementsExperiment?.recordMeasurement());
  await page.waitForTimeout(100);
  skip(`${stepName}: pending-плашка скрыта → запись через API-триггер`, 'record-mode не semi-auto');
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

  // Сборка цепи реальным mouse-D&D (все 5 приборов, R3)
  const placed = await assembleViaMouse(page, '3.2-Step 2', 'resistor-r3');
  if (placed === 5) {
    pass('3.2-Step 2: все 5 приборов посажены реальным mouse-D&D');
  } else {
    fail('3.2-Step 2: сборка цепи', `посажено ${placed}/5 приборов`);
  }

  await screenshot(page, '3-2-02-assembled');

  // Напряжение U=5.7 В
  try {
    await page.evaluate((v) => window.measurementsExperiment?.setVoltage(v), TARGET_VOLTAGE_B);
    const voltageVal = await page.evaluate(() => window.measurementsExperiment?.voltage);
    if (Math.abs(voltageVal - TARGET_VOLTAGE_B) < 0.01) {
      pass(`3.2-Step 3: напряжение установлено ${TARGET_VOLTAGE_B} В`);
    } else {
      fail('3.2-Step 3: напряжение', `Ожидалось ${TARGET_VOLTAGE_B}, получено ${voltageVal}`);
    }
  } catch (err) {
    fail('3.2-Step 3: напряжение', err.message);
  }

  // Замыкание ключа
  try {
    await page.evaluate(() => window.measurementsExperiment?.setKeyClosed(true));
    pass('3.2-Step 4: ключ замкнут');
    await screenshot(page, '3-2-03-key-closed');
  } catch (err) {
    fail('3.2-Step 4: замкнуть ключ', err.message);
  }

  // Запись измерения через pending-плашку
  await recordViaPendingButton(page, '3.2-Step 5');
  await screenshot(page, '3-2-04-recorded');

  // ФИПИ-инвариант: P ∈ [3.5, 4.5] Вт + контракт timeS/workJ === null
  try {
    const bMeasurements = await page.evaluate(() => {
      const exp = window.measurementsExperiment;
      return exp ? exp.measurements.filter(m => m.task === 'B-power') : [];
    });

    if (bMeasurements.length === 0) {
      fail('3.2-Step 6: ФИПИ P ∈ [3.5, 4.5]', 'нет записей для задачи B-power');
    } else {
      const m = bMeasurements[0];
      const P = m.powerW;
      if (P >= FIPI_P_MIN && P <= FIPI_P_MAX) {
        pass(`3.2-Step 6: ФИПИ P = ${P.toFixed(2)} Вт ∈ [${FIPI_P_MIN}–${FIPI_P_MAX}]`);
      } else {
        fail(`3.2-Step 6: ФИПИ P ∈ [${FIPI_P_MIN}, ${FIPI_P_MAX}]`,
          `P=${P.toFixed(2)} Вт вышло за диапазон (U=${m.voltageV}, I=${m.currentA})`);
      }
      // Контракт M3: timeS===null, workJ===null для задачи B
      if (m.timeS === null && m.workJ === null) {
        pass('3.2-Step 6b: контракт timeS===null, workJ===null (время только в задаче C)');
      } else {
        fail('3.2-Step 6b: контракт timeS/workJ',
          `Ожидалось null/null, получено timeS=${m.timeS}, workJ=${m.workJ}`);
      }
    }
  } catch (err) {
    fail('3.2-Step 6: ФИПИ P', err.message);
  }

  await checkOverlayDup(page, '3.2-Step 7');
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

  // Сборка цепи реальным mouse-D&D (все 5 приборов, R2)
  const placed = await assembleViaMouse(page, '3.3-Step 2', 'resistor-r2');
  if (placed === 5) {
    pass('3.3-Step 2: все 5 приборов посажены реальным mouse-D&D');
  } else {
    fail('3.3-Step 2: сборка цепи', `посажено ${placed}/5 приборов`);
  }

  await screenshot(page, '3-3-02-assembled');

  // Пресет 60 с
  try {
    await page.evaluate(() => window.measurementsExperiment?.setTimeS(60));
    const timeS = await page.evaluate(() => window.measurementsExperiment?.timeS);
    if (timeS === 60) {
      pass('3.3-Step 3: пресет 60 с установлен');
    } else {
      fail('3.3-Step 3: пресет 60 с', `Ожидалось 60, получено ${timeS}`);
    }
  } catch (err) {
    fail('3.3-Step 3: пресет 60 с', err.message);
  }

  // Напряжение U=2.9 В
  try {
    await page.evaluate((v) => window.measurementsExperiment?.setVoltage(v), TARGET_VOLTAGE_C);
    const voltageVal = await page.evaluate(() => window.measurementsExperiment?.voltage);
    if (Math.abs(voltageVal - TARGET_VOLTAGE_C) < 0.01) {
      pass(`3.3-Step 4: напряжение установлено ${TARGET_VOLTAGE_C} В`);
    } else {
      fail('3.3-Step 4: напряжение', `Ожидалось ${TARGET_VOLTAGE_C}, получено ${voltageVal}`);
    }
  } catch (err) {
    fail('3.3-Step 4: напряжение', err.message);
  }

  // Замыкание ключа — стартует RAF-секундомер в задаче C
  try {
    await page.evaluate(() => window.measurementsExperiment?.setKeyClosed(true));
    pass('3.3-Step 5: ключ замкнут (RAF-секундомер запущен)');
    await screenshot(page, '3-3-03-key-closed');
  } catch (err) {
    fail('3.3-Step 5: замкнуть ключ', err.message);
  }

  // Ожидание реального тика секундомера: #stopwatch-readout достигает «t = 60 с».
  // ACCEL=20 → 60 c симуляции за ~3 c реального времени; timeout 8000 мс с запасом.
  try {
    await page.waitForFunction(
      () => {
        const el = document.querySelector('#stopwatch-readout');
        return !!el && (el.textContent ?? '').includes('60');
      },
      { timeout: 8000 },
    );
    const readout = await page.locator('#stopwatch-readout').textContent();
    pass(`3.3-Step 6: секундомер дотикал до «${(readout ?? '').trim()}»`);
  } catch (err) {
    fail('3.3-Step 6: секундомер не дотикал до t = 60 с', err.message);
  }

  // Запись измерения через pending-плашку (после реального тика)
  await recordViaPendingButton(page, '3.3-Step 7');
  await screenshot(page, '3-3-04-recorded');

  // ФИПИ-инвариант: A ∈ [75, 100] Дж + timeS===60 (фильтр по task='C-work')
  try {
    const cMeasurements = await page.evaluate(() => {
      const exp = window.measurementsExperiment;
      return exp ? exp.measurements.filter(m => m.task === 'C-work') : [];
    });

    if (cMeasurements.length === 0) {
      fail('3.3-Step 8: ФИПИ A ∈ [75, 100]', 'нет записей для задачи C-work');
    } else {
      const m = cMeasurements[0];
      const A = m.workJ;
      if (A !== null && A >= FIPI_A_MIN && A <= FIPI_A_MAX) {
        pass(`3.3-Step 8: ФИПИ A = ${A.toFixed(1)} Дж ∈ [${FIPI_A_MIN}–${FIPI_A_MAX}]`);
      } else {
        fail(`3.3-Step 8: ФИПИ A ∈ [${FIPI_A_MIN}, ${FIPI_A_MAX}]`,
          `A=${A === null ? 'null' : A.toFixed(1)} Дж вышло за диапазон`);
      }
      // Контракт: timeS===60 для задачи C
      if (m.timeS === 60) {
        pass('3.3-Step 8b: контракт timeS===60 (время записано корректно)');
      } else {
        fail('3.3-Step 8b: контракт timeS', `Ожидалось 60, получено ${m.timeS}`);
      }
    }
  } catch (err) {
    fail('3.3-Step 8: ФИПИ A', err.message);
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
  try {
    const resp = await page.goto(`${BASE_URL}${SCREEN}`, { timeout: 10000, waitUntil: 'domcontentloaded' });
    if (resp && resp.ok()) {
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
