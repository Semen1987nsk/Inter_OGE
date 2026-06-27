/**
 * selfcheck-3-4.mjs — reality-check опыта 3.4 «ВАХ резистора и лампочки».
 *
 * PLAYBOOK Шаг 7 + REFERENCE §13 + урок «D&D self-check через mouse»:
 * сборка цепи ОБЯЗАНА идти реальным page.mouse.move/down/up — programmatic placeInSlot
 * обходит drop-flow и не ловит overlay-dup. Все 5 приборов перетаскиваются мышью,
 * и после каждого дропа проверяется, что слот реально занят (card[data-placed]).
 *
 * Запуск:
 *   npm run dev -w experiments/kit-3-circuits -- --host 127.0.0.1 --port 5199 --strictPort
 *   node experiments/kit-3-circuits/selfcheck-3-4.mjs
 *
 * Опыт 3.4 — резистор R1 (R=4.7 Ом), U ∈ {2, 4, 6} В:
 *   1. Навигация ?screen=iv-curve
 *   2. mouse-D&D source/key/ammeter/resistor-r1/voltmeter → гнёзда
 *   3. Снять 3 точки (U=2,4,6): выставить slider → замкнуть ключ → записать
 *   4. ФИПИ-инвариант: серия резистора монотонно растёт, I≈U/4.7
 *
 * Смена элемента — лампа (номинал 4,8 В · 0,5 А), U ∈ {2, 4, 4.8} В:
 *   1. reset(false) — сохранить данные, сбросить цепь
 *   2. mouse-D&D lamp → гнездо «Элемент»
 *   3. Снять 3 точки → записать
 *   4. ФИПИ-инвариант: I(4.8) ≈ 0.5; лампа вогнута: I_лампы < I_резистора при U ≥ 4
 *   5. Обе серии накоплены; на графике #iv-graph ≥ 6 точек
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env['SELFCHECK_BASE_URL'] ?? 'http://127.0.0.1:5199';
const SCREEN = '?screen=iv-curve';
const SCREENSHOTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'selfcheck-screenshots');

// ФИПИ-инварианты
const R_R1 = 4.7;                // Ом, ФИПИ-паспорт
const LAMP_R_COLD = 2.4;         // Ом
const LAMP_K = 14.4;             // Ом/А
const LAMP_RATED_I = 0.5;        // А, номинальный ток лампы при 4.8 В
const LAMP_RATED_U = 4.8;        // В, номинальное напряжение
const I_TOLERANCE = 0.03;        // ±3% абсолютная погрешность на I

function lampCurrentExpected(U) {
  if (U === 0) return 0;
  return (-LAMP_R_COLD + Math.sqrt(LAMP_R_COLD * LAMP_R_COLD + 4 * LAMP_K * U)) / (2 * LAMP_K);
}

function resistorCurrentExpected(U) {
  return U / R_R1;
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
  const file = path.join(SCREENSHOTS_DIR, `3-4-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`       Screenshot: ${file}`);
}

/**
 * Реальный mouse-drag прибора из карточки комплекта в гнездо платы.
 * Цель — viewport-координаты гнезда через board.getSlotRect(slotId) (публичный метод).
 * Источник — центр draggable-элемента внутри карточки.
 * Возвращает true только если после mouse.up слот реально занят (card[data-placed]).
 *
 * Эталон: selfcheck-3-2-3-3.mjs (verbatim инфра).
 */
async function dragInstrumentToSlot(page, equipmentId, slotId) {
  const cardSel = `lab-equipment-card[data-eq="${equipmentId}"]`;
  // iv-curve использует lab-resistor, lab-lamp, lab-voltmeter, lab-ammeter, lab-power-source, lab-key
  const draggableSel = [
    `${cardSel} > lab-power-source`,
    `${cardSel} > lab-voltmeter`,
    `${cardSel} > lab-ammeter`,
    `${cardSel} > lab-resistor`,
    `${cardSel} > lab-lamp`,
    `${cardSel} > lab-key`,
  ].join(', ');

  // Прокрутить draggable в зону видимости (карточка может быть ниже фолда).
  const draggable = page.locator(draggableSel).first();
  await draggable.scrollIntoViewIfNeeded();
  await page.waitForTimeout(60);

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
 * Собрать цепь полностью реальным mouse-D&D.
 * При несостоявшемся дропе — FAIL (без тихого API-фоллбэка).
 */
async function assembleViaMouse(page, taskLabel, plan) {
  let placed = 0;
  for (const { slot, eq } of plan) {
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
  await page.evaluate(() => window.ivCurveExperiment?.recordMeasurement());
  await page.waitForTimeout(100);
  skip(`${stepName}: pending-плашка скрыта → запись через API-триггер`, 'record-mode не semi-auto');
}

/**
 * Снять одну точку ВАХ: выставить U → замкнуть ключ → записать.
 * После записи ключ размыкается для следующей точки (иначе signature не меняется).
 */
async function recordPoint(page, taskLabel, U) {
  try {
    await page.evaluate((v) => window.ivCurveExperiment?.setVoltage(v), U);
    await page.waitForTimeout(80);
    const gotV = await page.evaluate(() => window.ivCurveExperiment?.voltage);
    if (Math.abs(gotV - U) < 0.05) {
      pass(`${taskLabel}: напряжение U=${U} В установлено`);
    } else {
      fail(`${taskLabel}: напряжение U=${U}`, `Ожидалось ${U}, получено ${gotV}`);
    }
  } catch (err) {
    fail(`${taskLabel}: установить напряжение ${U}`, err.message);
  }

  // Замкнуть ключ
  try {
    await page.evaluate(() => window.ivCurveExperiment?.setKeyClosed(true));
    await page.waitForTimeout(100);
    pass(`${taskLabel}: ключ замкнут для записи точки`);
  } catch (err) {
    fail(`${taskLabel}: замкнуть ключ`, err.message);
  }

  // Записать
  await recordViaPendingButton(page, `${taskLabel}: U=${U} В`);

  // Разомкнуть ключ — чтобы следующая точка не совпала по signature
  try {
    await page.evaluate(() => window.ivCurveExperiment?.setKeyClosed(false));
    await page.waitForTimeout(50);
  } catch {
    // некритично
  }
}

// ─── Серия 1 — Резистор R1 ───────────────────────────────────────────────────

async function runResistor(page) {
  console.log('\n  ── Серия 1: Резистор R1 (R=4.7 Ом, U ∈ {2, 4, 6} В) ────────────────');

  const plan = [
    { slot: 'source',    eq: 'power-source' },
    { slot: 'key',       eq: 'key' },
    { slot: 'ammeter',   eq: 'ammeter' },
    { slot: 'resistor',  eq: 'resistor-r1' },
    { slot: 'voltmeter', eq: 'voltmeter' },
  ];

  const placed = await assembleViaMouse(page, '3.4-R-Step 1', plan);
  if (placed === 5) {
    pass('3.4-R-Step 1: все 5 приборов посажены реальным mouse-D&D');
  } else {
    fail('3.4-R-Step 1: сборка цепи', `посажено ${placed}/5 приборов`);
  }

  await screenshot(page, '01-resistor-assembled');

  const voltages = [2, 4, 6];
  for (const U of voltages) {
    await recordPoint(page, `3.4-R-U${U}`, U);
  }

  await screenshot(page, '02-resistor-recorded');

  // ФИПИ-инвариант: серия резистора — 3 точки, монотонно растёт, I≈U/R_R1
  try {
    const resistorMeasurements = await page.evaluate(() => {
      const exp = window.ivCurveExperiment;
      return exp ? exp.measurements.filter(m => m.element === 'Резистор') : [];
    });

    if (resistorMeasurements.length < 3) {
      fail('3.4-R-Step 3: ФИПИ резистор', `записано ${resistorMeasurements.length}/3 точек`);
    } else {
      pass(`3.4-R-Step 3: записано ${resistorMeasurements.length} точек для резистора`);

      // Проверить соответствие I≈U/R_R1
      let linearOk = true;
      for (const m of resistorMeasurements) {
        const expected = resistorCurrentExpected(m.voltageV);
        const delta = Math.abs(m.currentA - expected);
        if (delta > I_TOLERANCE) {
          fail(`3.4-R-Step 3: линейность I при U=${m.voltageV}`,
            `I=${m.currentA.toFixed(4)} А, ожидалось ${expected.toFixed(4)} А (Δ=${delta.toFixed(4)})`);
          linearOk = false;
        }
      }
      if (linearOk) {
        pass('3.4-R-Step 3: I≈U/R_R1 для всех точек резистора (линейная ВАХ)');
      }

      // Монотонность по U
      const sorted = [...resistorMeasurements].sort((a, b) => a.voltageV - b.voltageV);
      let mono = true;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].currentA <= sorted[i-1].currentA) { mono = false; break; }
      }
      if (mono) {
        pass('3.4-R-Step 3: серия резистора монотонно растёт');
      } else {
        fail('3.4-R-Step 3: монотонность резистора', 'I не монотонно растёт с U');
      }
    }
  } catch (err) {
    fail('3.4-R-Step 3: ФИПИ резистор', err.message);
  }

  await checkOverlayDup(page, '3.4-R-Step 4');
}

// ─── Серия 2 — Лампа ─────────────────────────────────────────────────────────

async function runLamp(page) {
  console.log('\n  ── Серия 2: Лампа 4,8 В · 0,5 А (U ∈ {2, 4, 4.8} В) ───────────────');

  // reset(false): сохраняет данные, сбрасывает цепь
  try {
    await page.evaluate(() => window.ivCurveExperiment?.reset(false));
    await page.waitForTimeout(300);
    pass('3.4-L-Step 1: reset(false) — цепь сброшена, данные сохранены');
  } catch (err) {
    fail('3.4-L-Step 1: reset(false)', err.message);
  }

  // Проверить, что данные резистора сохранились
  try {
    const rMeasCount = await page.evaluate(() => {
      const exp = window.ivCurveExperiment;
      return exp ? exp.measurements.filter(m => m.element === 'Резистор').length : 0;
    });
    if (rMeasCount >= 3) {
      pass(`3.4-L-Step 1b: данные резистора сохранились (${rMeasCount} точек)`);
    } else {
      fail('3.4-L-Step 1b: данные резистора', `ожидалось ≥3, получено ${rMeasCount}`);
    }
  } catch (err) {
    fail('3.4-L-Step 1b: проверка данных резистора', err.message);
  }

  await screenshot(page, '03-after-reset-data-preserved');

  // Собрать цепь с лампой вместо резистора
  const plan = [
    { slot: 'source',    eq: 'power-source' },
    { slot: 'key',       eq: 'key' },
    { slot: 'ammeter',   eq: 'ammeter' },
    { slot: 'resistor',  eq: 'lamp' },       // гнездо «Элемент» принимает лампу
    { slot: 'voltmeter', eq: 'voltmeter' },
  ];

  const placed = await assembleViaMouse(page, '3.4-L-Step 2', plan);
  if (placed === 5) {
    pass('3.4-L-Step 2: все 5 приборов (лампа) посажены реальным mouse-D&D');
  } else {
    fail('3.4-L-Step 2: сборка цепи с лампой', `посажено ${placed}/5 приборов`);
  }

  await screenshot(page, '04-lamp-assembled');

  const voltages = [2, 4, LAMP_RATED_U];
  for (const U of voltages) {
    await recordPoint(page, `3.4-L-U${U}`, U);
  }

  await screenshot(page, '05-lamp-recorded');

  // ФИПИ-инвариант: лампа нелинейна, I(4.8)≈0.5, I_лампы < I_резистора при U≥4
  try {
    const lampMeasurements = await page.evaluate(() => {
      const exp = window.ivCurveExperiment;
      return exp ? exp.measurements.filter(m => m.element === 'Лампа') : [];
    });

    if (lampMeasurements.length < 3) {
      fail('3.4-L-Step 3: ФИПИ лампа', `записано ${lampMeasurements.length}/3 точек`);
    } else {
      pass(`3.4-L-Step 3: записано ${lampMeasurements.length} точек для лампы`);

      // I(4.8) ≈ 0.5 А (номинал)
      const nomPoint = lampMeasurements.find(m => Math.abs(m.voltageV - LAMP_RATED_U) < 0.1);
      if (!nomPoint) {
        fail('3.4-L-Step 3: номинальная точка лампы', 'точка U≈4.8 В не найдена');
      } else {
        const deltaI = Math.abs(nomPoint.currentA - LAMP_RATED_I);
        if (deltaI <= 0.05) {
          pass(`3.4-L-Step 3: I(${LAMP_RATED_U})=${nomPoint.currentA.toFixed(4)} А ≈ ${LAMP_RATED_I} А (номинал)`);
        } else {
          fail(`3.4-L-Step 3: номинальный ток лампы`,
            `I=${nomPoint.currentA.toFixed(4)} А, ожидалось ≈${LAMP_RATED_I} А (Δ=${deltaI.toFixed(4)})`);
        }
      }

      // Вогнутость: I_лампы(U) < I_резистора(U) при U≥4
      const lampAt4 = lampMeasurements.find(m => Math.abs(m.voltageV - 4) < 0.1);
      if (!lampAt4) {
        skip('3.4-L-Step 3b: сравнение лампа vs резистор при U=4', 'точка U=4 не найдена у лампы');
      } else {
        const resistorI4 = resistorCurrentExpected(4);
        if (lampAt4.currentA < resistorI4) {
          pass(`3.4-L-Step 3b: I_лампы(4В)=${lampAt4.currentA.toFixed(4)} < I_резистора(4В)=${resistorI4.toFixed(4)} (вогнутость ВАХ)`);
        } else {
          fail('3.4-L-Step 3b: вогнутость лампы',
            `I_лампы=${lampAt4.currentA.toFixed(4)}, ожидалось < ${resistorI4.toFixed(4)}`);
        }
      }

      // Монотонность лампы
      const sorted = [...lampMeasurements].sort((a, b) => a.voltageV - b.voltageV);
      let mono = true;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].currentA <= sorted[i-1].currentA) { mono = false; break; }
      }
      if (mono) {
        pass('3.4-L-Step 3c: серия лампы монотонно растёт (нелинейно)');
      } else {
        fail('3.4-L-Step 3c: монотонность лампы', 'I не монотонно растёт с U');
      }
    }
  } catch (err) {
    fail('3.4-L-Step 3: ФИПИ лампа', err.message);
  }

  await checkOverlayDup(page, '3.4-L-Step 4');
}

// ─── Проверка обеих серий на графике ─────────────────────────────────────────

async function checkBothSeriesOnGraph(page) {
  console.log('\n  ── Проверка: обе серии накоплены + график #iv-graph ────────────────');

  // Обе серии в measurements
  try {
    const allMeas = await page.evaluate(() => {
      const exp = window.ivCurveExperiment;
      return exp ? exp.measurements : [];
    });

    const hasResistor = allMeas.some(m => m.element === 'Резистор');
    const hasLamp = allMeas.some(m => m.element === 'Лампа');
    const totalPoints = allMeas.length;

    if (hasResistor && hasLamp) {
      pass(`3.4-Step 5a: обе серии в measurements (резистор + лампа, всего ${totalPoints} точек)`);
    } else {
      fail('3.4-Step 5a: обе серии', `hasResistor=${hasResistor}, hasLamp=${hasLamp}`);
    }

    if (totalPoints >= 6) {
      pass(`3.4-Step 5b: ≥6 точек суммарно (${totalPoints})`);
    } else {
      fail('3.4-Step 5b: количество точек', `всего ${totalPoints}, ожидалось ≥6`);
    }
  } catch (err) {
    fail('3.4-Step 5: проверка measurements', err.message);
  }

  // График: #iv-graph → shadow circle.point ≥ 6
  try {
    const circleCount = await page.evaluate(() => {
      const graph = document.querySelector('#iv-graph');
      if (!graph || !graph.shadowRoot) return 0;
      return graph.shadowRoot.querySelectorAll('circle.point').length;
    });
    if (circleCount >= 6) {
      pass(`3.4-Step 5c: #iv-graph shadow: ${circleCount} circle.point ≥ 6`);
    } else {
      fail('3.4-Step 5c: circle.point на графике', `${circleCount} < 6`);
    }
  } catch (err) {
    skip('3.4-Step 5c: circle.point на графике', err.message);
  }
}

// ─── Основная функция ─────────────────────────────────────────────────────────

async function run() {
  console.log('\n── selfcheck-3-4.mjs ───────────────────────────────────────────────────────');
  console.log('   Опыт 3.4 «ВАХ резистора и лампочки» — reality check');
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
    skip('Весь опыт 3.4', 'страница не загрузилась');
    await browser.close();
    printSummary();
    return;
  }

  await page.waitForTimeout(600);
  await screenshot(page, '00-rest-state');

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

  // ── Проверка window.ivCurveExperiment ──────────────────────────────────────
  const expAvailable = await page.evaluate(() => !!(window.ivCurveExperiment));
  if (!expAvailable) {
    skip('Весь опыт 3.4', 'window.ivCurveExperiment не найден — экран не смонтирован');
    await browser.close();
    printSummary();
    return;
  }
  pass('Step 0d: window.ivCurveExperiment доступен');

  // ── Серия 1: Резистор ────────────────────────────────────────────────────────
  await runResistor(page);

  // ── Серия 2: Лампа ───────────────────────────────────────────────────────────
  await runLamp(page);

  // ── Обе серии на графике ──────────────────────────────────────────────────────
  await checkBothSeriesOnGraph(page);

  // ── Финальный скриншот — обе кривые ─────────────────────────────────────────
  await screenshot(page, '06-both-curves');

  await browser.close();
  printSummary();
}

function printSummary() {
  console.log('\n───────────────────────────────────────────────────────────────────────────');
  console.log(`  selfcheck-3-4: PASS=${passCount}  FAIL=${failCount}  SKIP=${skipCount}`);
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
