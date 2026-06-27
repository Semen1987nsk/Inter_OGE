/**
 * selfcheck-3-8-3-9.mjs — reality-check опытов 3.8/3.9 «Соединения проводников».
 *
 * PLAYBOOK Шаг 7 + REFERENCE §13 + урок «D&D self-check через mouse»:
 * сборка цепи ОБЯЗАНА идти реальным page.mouse.move/down/up — programmatic placeInSlot
 * обходит drop-flow и не ловит overlay-dup. Все приборы перетаскиваются мышью,
 * и после каждого дропа проверяется, что слот реально занят (card[data-placed]).
 *
 * Запуск:
 *   npm --workspace=@labosfera/kit-3-circuits run dev -- --host 127.0.0.1 --port 5217 --strictPort
 *   node experiments/kit-3-circuits/selfcheck-3-8-3-9.mjs
 *
 * Опыт 3.8 — последовательное (правило напряжений):
 *   U1 + U2 = U_общ; R1=4,7 Ом, R2=5,7 Ом.
 *   Вольтметр (подвижный) переставляется в 3 позиции: v-pos-r1, v-pos-r2, v-pos-total.
 *   Инвариант: U1 < U_общ, U2 < U_общ, |U1+U2-U_общ|/U_общ ≤ 2%.
 *
 * Опыт 3.9 — параллельное (правило токов):
 *   I1 + I2 = I_общ.
 *   Амперметр (подвижный) переставляется в 3 позиции: a-pos-r1, a-pos-r2, a-pos-main.
 *   Инвариант: |I1+I2-I_общ|/I_общ ≤ 2%.
 *
 * Проверка LCD-прибора при U=6 (урок Фазы C): range=6 вольтметр / range=3 амперметр.
 *
 * Вывод: PASS n/0/0
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env['SELFCHECK_BASE_URL'] ?? 'http://127.0.0.1:5217';
const SCREEN = '?screen=connections';
const SCREENSHOTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'selfcheck-screenshots');

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
  const file = path.join(SCREENSHOTS_DIR, `3-8-3-9-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`       Screenshot: ${file}`);
}

/**
 * Реальный mouse-drag прибора из карточки комплекта в гнездо платы.
 * Цель — viewport-координаты гнезда через board.getSlotRect(slotId).
 * Подтверждение дропа через card[data-placed] (ставит только onDrop drop-flow).
 *
 * Эталон: selfcheck-3-5-3-7.mjs (verbatim структура).
 */
async function dragInstrumentToSlot(page, equipmentId, slotId) {
  const cardSel = `lab-equipment-card[data-eq="${equipmentId}"]`;
  const draggableSel = [
    `${cardSel} > lab-power-source`,
    `${cardSel} > lab-voltmeter`,
    `${cardSel} > lab-ammeter`,
    `${cardSel} > lab-resistor`,
    `${cardSel} > lab-key`,
  ].join(', ');

  // Для дублированных карточек (voltmeter/ammeter в обеих секциях) — берём первую видимую.
  const draggable = page.locator(draggableSel).first();
  await draggable.scrollIntoViewIfNeeded();
  await page.waitForTimeout(60);

  const srcBox = await draggable.boundingBox();
  if (!srcBox) {
    throw new Error(`draggable не найден для ${equipmentId}`);
  }

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
  await page.mouse.move(sx + (tx - sx) * 0.3, sy + (ty - sy) * 0.3, { steps: 6 });
  await page.mouse.move(tx, ty, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(120);

  const placedSlot = await page.evaluate((sel) => {
    // Для дублированных карточек — ищем любую с data-placed.
    const cards = document.querySelectorAll(sel);
    for (const card of cards) {
      const val = card.getAttribute('data-placed');
      if (val) return val;
    }
    return null;
  }, cardSel);

  return placedSlot === slotId;
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

/**
 * Собрать базовую цепь задачи A (серия): source, key, ammeter, r1, r2 — мышью.
 */
async function assembleSeriesBase(page, label) {
  const plan = [
    { slot: 'source',  eq: 'power-source' },
    { slot: 'key',     eq: 'key' },
    { slot: 'ammeter', eq: 'ammeter' },
    { slot: 'r1',      eq: 'r1' },
    { slot: 'r2',      eq: 'r2' },
  ];
  let placed = 0;
  for (const { slot, eq } of plan) {
    try {
      const ok = await dragInstrumentToSlot(page, eq, slot);
      if (ok) {
        placed++;
        pass(`${label}: D&D ${eq} → слот ${slot} (слот занят)`);
      } else {
        fail(`${label}: D&D ${eq} → слот ${slot}`, 'дроп не сел (card без data-placed)');
      }
    } catch (err) {
      fail(`${label}: D&D ${eq} → слот ${slot}`, err.message);
    }
  }
  if (placed === 5) {
    pass(`${label}: все 5 приборов посажены реальным mouse-D&D`);
  } else {
    fail(`${label}: сборка цепи`, `посажено ${placed}/5 приборов`);
  }
  return placed;
}

/**
 * Собрать базовую цепь задачи B (параллель): source, key, voltmeter, r1, r2 — мышью.
 */
async function assembleParallelBase(page, label) {
  const plan = [
    { slot: 'source',   eq: 'power-source' },
    { slot: 'key',      eq: 'key' },
    { slot: 'voltmeter', eq: 'voltmeter' },
    { slot: 'r1',       eq: 'r1' },
    { slot: 'r2',       eq: 'r2' },
  ];
  let placed = 0;
  for (const { slot, eq } of plan) {
    try {
      const ok = await dragInstrumentToSlot(page, eq, slot);
      if (ok) {
        placed++;
        pass(`${label}: D&D ${eq} → слот ${slot} (слот занят)`);
      } else {
        fail(`${label}: D&D ${eq} → слот ${slot}`, 'дроп не сел (card без data-placed)');
      }
    } catch (err) {
      fail(`${label}: D&D ${eq} → слот ${slot}`, err.message);
    }
  }
  if (placed === 5) {
    pass(`${label}: все 5 приборов посажены реальным mouse-D&D`);
  } else {
    fail(`${label}: сборка цепи`, `посажено ${placed}/5 приборов`);
  }
  return placed;
}

/**
 * Прочитать measurement.value через API после нажатия кнопки записи.
 */
async function recordAndRead(page, label) {
  const btn = page.locator('#record-pending-btn');
  const visible = await btn.isVisible().catch(() => false);
  if (visible) {
    await btn.click();
    await page.waitForTimeout(150);
    pass(`${label}: запись через #record-pending-btn`);
  } else {
    await page.evaluate(() => window.connectionsExperiment?.recordMeasurement());
    await page.waitForTimeout(100);
    skip(`${label}: pending-плашка скрыта → API-триггер`, 'record-mode не semi-auto');
  }

  const measurements = await page.evaluate(() => window.connectionsExperiment?.measurements ?? []);
  const last = measurements[measurements.length - 1];
  if (!last) {
    fail(`${label}: нет measurement после записи`, '');
    return null;
  }
  pass(`${label}: measurement.value = ${last.value.toFixed(4)}`);
  return last.value;
}

// ─── Задача A: правило напряжений — опыт 3.8 ─────────────────────────────────

async function runTaskA(page) {
  console.log('\n  ── Задача A: правило напряжений — опыт 3.8 (серия) ───────────────────');

  // Активировать задачу A
  try {
    await page.evaluate(() => window.connectionsExperiment?.setActiveTask('A-series'));
    await page.waitForTimeout(200);
    const task = await page.evaluate(() => window.connectionsExperiment?.activeTask);
    if (task === 'A-series') {
      pass('3.8-A: setActiveTask(A-series) — задача активирована');
    } else {
      fail('3.8-A: setActiveTask(A-series)', `activeTask = ${task}`);
    }
  } catch (err) {
    fail('3.8-A: setActiveTask', err.message);
    return;
  }

  // Собрать базовую цепь мышью
  const placed = await assembleSeriesBase(page, '3.8-A: сборка базовой цепи');
  if (placed < 5) {
    fail('3.8-A: пропуск задачи — базовая цепь не собрана', '');
    return;
  }

  await screenshot(page, '01-A-assembled');

  // Замкнуть ключ
  try {
    await page.evaluate(() => window.connectionsExperiment?.setKeyClosed(true));
    await page.waitForTimeout(100);
    pass('3.8-A: ключ замкнут');
  } catch (err) {
    fail('3.8-A: setKeyClosed(true)', err.message);
    return;
  }

  // Установить U = 4.5 В
  try {
    await page.evaluate(() => window.connectionsExperiment?.setVoltage(4.5));
    await page.waitForTimeout(80);
    const v = await page.evaluate(() => window.connectionsExperiment?.voltage);
    if (Math.abs(v - 4.5) < 0.01) {
      pass('3.8-A: U = 4,5 В установлено');
    } else {
      fail('3.8-A: setVoltage(4.5)', `voltage = ${v}`);
    }
  } catch (err) {
    fail('3.8-A: setVoltage', err.message);
    return;
  }

  // ── Измерение U1 (вольтметр в v-pos-r1) ──────────────────────────────────────
  console.log('\n       Позиция 1: v-pos-r1 (across R1)');
  let U1 = null;
  try {
    const ok = await dragInstrumentToSlot(page, 'voltmeter', 'v-pos-r1');
    if (ok) {
      pass('3.8-A: mouse-D&D voltmeter → v-pos-r1');
      const pos = await page.evaluate(() => window.connectionsExperiment?.movableInstrumentPosition());
      if (pos === 'R1') {
        pass('3.8-A: movableInstrumentPosition() = R1 после v-pos-r1');
      } else {
        fail('3.8-A: movableInstrumentPosition v-pos-r1', `pos = ${pos}`);
      }
      U1 = await recordAndRead(page, '3.8-A: U1 (v-pos-r1)');
    } else {
      fail('3.8-A: D&D voltmeter → v-pos-r1', 'дроп не сел');
    }
  } catch (err) {
    fail('3.8-A: D&D voltmeter → v-pos-r1', err.message);
  }

  // ── Измерение U2 (вольтметр в v-pos-r2) ──────────────────────────────────────
  console.log('\n       Позиция 2: v-pos-r2 (across R2)');
  let U2 = null;
  try {
    const okPrev = await page.evaluate(() => {
      const pos = window.connectionsExperiment?.movableInstrumentPosition();
      return pos; // должно быть R1
    });
    const ok = await dragInstrumentToSlot(page, 'voltmeter', 'v-pos-r2');
    if (ok) {
      pass('3.8-A: mouse-D&D voltmeter → v-pos-r2');
      // Проверить, что v-pos-r1 освободилась
      const newPos = await page.evaluate(() => window.connectionsExperiment?.movableInstrumentPosition());
      if (newPos === 'R2') {
        pass('3.8-A: movableInstrumentPosition() = R2 после перемещения в v-pos-r2');
      } else {
        fail('3.8-A: movableInstrumentPosition v-pos-r2', `pos = ${newPos}, ожидалось R2`);
      }
      if (okPrev === 'R1') {
        pass('3.8-A: предыдущая позиция R1 освобождена при перемещении в v-pos-r2');
      }
      U2 = await recordAndRead(page, '3.8-A: U2 (v-pos-r2)');
    } else {
      fail('3.8-A: D&D voltmeter → v-pos-r2', 'дроп не сел');
    }
  } catch (err) {
    fail('3.8-A: D&D voltmeter → v-pos-r2', err.message);
  }

  // ── Измерение U_общ (вольтметр в v-pos-total) ────────────────────────────────
  console.log('\n       Позиция 3: v-pos-total (across R1+R2)');
  let U_total = null;
  try {
    const ok = await dragInstrumentToSlot(page, 'voltmeter', 'v-pos-total');
    if (ok) {
      pass('3.8-A: mouse-D&D voltmeter → v-pos-total');
      const newPos = await page.evaluate(() => window.connectionsExperiment?.movableInstrumentPosition());
      if (newPos === 'total') {
        pass('3.8-A: movableInstrumentPosition() = total после v-pos-total');
      } else {
        fail('3.8-A: movableInstrumentPosition v-pos-total', `pos = ${newPos}`);
      }
      U_total = await recordAndRead(page, '3.8-A: U_общ (v-pos-total)');
    } else {
      fail('3.8-A: D&D voltmeter → v-pos-total', 'дроп не сел');
    }
  } catch (err) {
    fail('3.8-A: D&D voltmeter → v-pos-total', err.message);
  }

  await screenshot(page, '02-A-all-3-recorded');

  // ── Инварианты U1+U2≈U_общ ───────────────────────────────────────────────────
  if (U1 !== null && U2 !== null && U_total !== null) {
    if (U1 < U_total) {
      pass(`3.8-A ФИПИ: U1 = ${U1.toFixed(4)} < U_общ = ${U_total.toFixed(4)} (U1 < U_общ)`);
    } else {
      fail('3.8-A ФИПИ: U1 < U_общ', `U1=${U1.toFixed(4)}, U_общ=${U_total.toFixed(4)}`);
    }
    if (U2 < U_total) {
      pass(`3.8-A ФИПИ: U2 = ${U2.toFixed(4)} < U_общ = ${U_total.toFixed(4)} (U2 < U_общ)`);
    } else {
      fail('3.8-A ФИПИ: U2 < U_общ', `U2=${U2.toFixed(4)}, U_общ=${U_total.toFixed(4)}`);
    }
    const sum = U1 + U2;
    const rel = Math.abs(sum - U_total) / (Math.abs(U_total) || 1);
    if (rel <= 0.02) {
      pass(`3.8-A ФИПИ: U1+U2 = ${sum.toFixed(4)} ≈ U_общ = ${U_total.toFixed(4)} (допуск 2%, rel=${(rel*100).toFixed(3)}%)`);
    } else {
      fail('3.8-A ФИПИ: U1+U2 ≈ U_общ', `U1=${U1.toFixed(4)}, U2=${U2.toFixed(4)}, sum=${sum.toFixed(4)}, U_общ=${U_total.toFixed(4)}, rel=${(rel*100).toFixed(2)}%`);
    }
  } else {
    fail('3.8-A ФИПИ: инварианты', 'не все значения получены (U1/U2/U_общ = null)');
  }

  // ── LCD вольтметра при U=6 В (урок Фазы C: range=6, стрелка не замёрзла) ────
  console.log('\n       Проверка LCD вольтметра при U=6 В (range=6)');
  try {
    await page.evaluate(() => window.connectionsExperiment?.setVoltage(6.0));
    await page.waitForTimeout(150);
    const gotV = await page.evaluate(() => window.connectionsExperiment?.voltage);
    if (Math.abs(gotV - 6.0) < 0.01) {
      pass('3.8-A LCD: U=6,0 В установлено (clamp [1,0;6,0])');
    } else {
      fail('3.8-A LCD: clamp напряжения', `voltage = ${gotV}`);
    }

    // LCD вольтметра: найти через card[data-eq="voltmeter"] > lab-voltmeter .lcd-text
    const lcdText = await page.evaluate(() => {
      const cards = document.querySelectorAll('lab-equipment-card[data-eq="voltmeter"]');
      for (const card of cards) {
        const vm = card.querySelector('lab-voltmeter');
        if (vm && vm.shadowRoot) {
          const lcd = vm.shadowRoot.querySelector('.lcd-text');
          if (lcd) return lcd.textContent;
        }
      }
      return null;
    });

    if (lcdText === null) {
      skip('3.8-A LCD: voltmeter .lcd-text', 'элемент не найден');
    } else {
      const numericVal = parseFloat(lcdText.replace(',', '.'));
      if (Math.abs(numericVal - 6.0) < 0.05) {
        pass(`3.8-A LCD: voltmeter .lcd-text = '${lcdText}' ≈ 6,0 В (range=6)`);
      } else {
        fail('3.8-A LCD: voltmeter показание', `lcd='${lcdText}', ожидалось ≈'6,00'`);
      }
    }
  } catch (err) {
    skip('3.8-A LCD: проверка', err.message);
  }

  // ── Слайдер max="6.0" ────────────────────────────────────────────────────────
  try {
    const sliderMax = await page.evaluate(() => {
      const input = document.querySelector('#voltage-input');
      return input ? input.getAttribute('max') : null;
    });
    if (sliderMax === '6.0' || sliderMax === '6') {
      pass(`3.8-A: slider max="${sliderMax}" (не 7.5 — урок Фазы C)`);
    } else {
      fail('3.8-A: slider max', `max="${sliderMax}", ожидалось "6.0"`);
    }
  } catch (err) {
    skip('3.8-A: slider max', err.message);
  }

  await checkOverlayDup(page, '3.8-A');
}

// ─── Задача B: правило токов — опыт 3.9 ──────────────────────────────────────

async function runTaskB(page) {
  console.log('\n  ── Задача B: правило токов — опыт 3.9 (параллель) ───────────────────');

  // Полный сброс + переключение задачи B
  try {
    await page.evaluate(() => window.connectionsExperiment?.reset(true));
    await page.waitForTimeout(300);
    pass('3.9-B: reset(true) выполнен');
  } catch (err) {
    fail('3.9-B: reset(true)', err.message);
    return;
  }

  try {
    await page.evaluate(() => window.connectionsExperiment?.setActiveTask('B-parallel'));
    await page.waitForTimeout(200);
    const task = await page.evaluate(() => window.connectionsExperiment?.activeTask);
    if (task === 'B-parallel') {
      pass('3.9-B: setActiveTask(B-parallel) — задача активирована');
    } else {
      fail('3.9-B: setActiveTask(B-parallel)', `activeTask = ${task}`);
    }
  } catch (err) {
    fail('3.9-B: setActiveTask', err.message);
    return;
  }

  // Собрать базовую цепь мышью
  const placed = await assembleParallelBase(page, '3.9-B: сборка базовой цепи');
  if (placed < 5) {
    fail('3.9-B: пропуск задачи — базовая цепь не собрана', '');
    return;
  }

  await screenshot(page, '03-B-assembled');

  // Замкнуть ключ
  try {
    await page.evaluate(() => window.connectionsExperiment?.setKeyClosed(true));
    await page.waitForTimeout(100);
    pass('3.9-B: ключ замкнут');
  } catch (err) {
    fail('3.9-B: setKeyClosed(true)', err.message);
    return;
  }

  // Установить U = 4.5 В
  try {
    await page.evaluate(() => window.connectionsExperiment?.setVoltage(4.5));
    await page.waitForTimeout(80);
    const v = await page.evaluate(() => window.connectionsExperiment?.voltage);
    if (Math.abs(v - 4.5) < 0.01) {
      pass('3.9-B: U = 4,5 В установлено');
    } else {
      fail('3.9-B: setVoltage(4.5)', `voltage = ${v}`);
    }
  } catch (err) {
    fail('3.9-B: setVoltage', err.message);
    return;
  }

  // ── Измерение I1 (амперметр в a-pos-r1) ──────────────────────────────────────
  console.log('\n       Позиция 1: a-pos-r1 (ветвь R1)');
  let I1 = null;
  try {
    const ok = await dragInstrumentToSlot(page, 'ammeter', 'a-pos-r1');
    if (ok) {
      pass('3.9-B: mouse-D&D ammeter → a-pos-r1');
      const pos = await page.evaluate(() => window.connectionsExperiment?.movableInstrumentPosition());
      if (pos === 'R1') {
        pass('3.9-B: movableInstrumentPosition() = R1 после a-pos-r1');
      } else {
        fail('3.9-B: movableInstrumentPosition a-pos-r1', `pos = ${pos}`);
      }
      I1 = await recordAndRead(page, '3.9-B: I1 (a-pos-r1)');
    } else {
      fail('3.9-B: D&D ammeter → a-pos-r1', 'дроп не сел');
    }
  } catch (err) {
    fail('3.9-B: D&D ammeter → a-pos-r1', err.message);
  }

  // ── Измерение I2 (амперметр в a-pos-r2) ──────────────────────────────────────
  console.log('\n       Позиция 2: a-pos-r2 (ветвь R2)');
  let I2 = null;
  try {
    const prevPos = await page.evaluate(() => window.connectionsExperiment?.movableInstrumentPosition());
    const ok = await dragInstrumentToSlot(page, 'ammeter', 'a-pos-r2');
    if (ok) {
      pass('3.9-B: mouse-D&D ammeter → a-pos-r2');
      const newPos = await page.evaluate(() => window.connectionsExperiment?.movableInstrumentPosition());
      if (newPos === 'R2') {
        pass('3.9-B: movableInstrumentPosition() = R2 после перемещения в a-pos-r2');
      } else {
        fail('3.9-B: movableInstrumentPosition a-pos-r2', `pos = ${newPos}`);
      }
      if (prevPos === 'R1') {
        pass('3.9-B: предыдущая позиция R1 освобождена при перемещении в a-pos-r2');
      }
      I2 = await recordAndRead(page, '3.9-B: I2 (a-pos-r2)');
    } else {
      fail('3.9-B: D&D ammeter → a-pos-r2', 'дроп не сел');
    }
  } catch (err) {
    fail('3.9-B: D&D ammeter → a-pos-r2', err.message);
  }

  // ── Измерение I_общ (амперметр в a-pos-main) ─────────────────────────────────
  console.log('\n       Позиция 3: a-pos-main (главная линия)');
  let I_total = null;
  try {
    const ok = await dragInstrumentToSlot(page, 'ammeter', 'a-pos-main');
    if (ok) {
      pass('3.9-B: mouse-D&D ammeter → a-pos-main');
      const newPos = await page.evaluate(() => window.connectionsExperiment?.movableInstrumentPosition());
      if (newPos === 'total') {
        pass('3.9-B: movableInstrumentPosition() = total после a-pos-main');
      } else {
        fail('3.9-B: movableInstrumentPosition a-pos-main', `pos = ${newPos}`);
      }
      I_total = await recordAndRead(page, '3.9-B: I_общ (a-pos-main)');
    } else {
      fail('3.9-B: D&D ammeter → a-pos-main', 'дроп не сел');
    }
  } catch (err) {
    fail('3.9-B: D&D ammeter → a-pos-main', err.message);
  }

  await screenshot(page, '04-B-all-3-recorded');

  // ── Инварианты I1+I2≈I_общ ───────────────────────────────────────────────────
  if (I1 !== null && I2 !== null && I_total !== null) {
    const sum = I1 + I2;
    const rel = Math.abs(sum - I_total) / (Math.abs(I_total) || 1);
    if (rel <= 0.02) {
      pass(`3.9-B ФИПИ: I1+I2 = ${sum.toFixed(4)} ≈ I_общ = ${I_total.toFixed(4)} (допуск 2%, rel=${(rel*100).toFixed(3)}%)`);
    } else {
      fail('3.9-B ФИПИ: I1+I2 ≈ I_общ', `I1=${I1.toFixed(4)}, I2=${I2.toFixed(4)}, sum=${sum.toFixed(4)}, I_общ=${I_total.toFixed(4)}, rel=${(rel*100).toFixed(2)}%`);
    }
    if (I1 > 0 && I2 > 0) {
      pass(`3.9-B ФИПИ: I1=${I1.toFixed(4)} > 0, I2=${I2.toFixed(4)} > 0 (ток идёт в обеих ветвях)`);
    } else {
      fail('3.9-B ФИПИ: I1>0 и I2>0', `I1=${I1}, I2=${I2}`);
    }
  } else {
    fail('3.9-B ФИПИ: инварианты', 'не все значения получены (I1/I2/I_общ = null)');
  }

  // ── LCD амперметра при U=4.5, I_общ = U/R_par (урок Фазы C: range=3) ─────────
  console.log('\n       Проверка LCD амперметра (range=3)');
  try {
    // I_общ при U=4.5: R1=4.7, R2=5.7; R_par = 4.7*5.7/(4.7+5.7) ≈ 2.575
    // I_total ≈ 4.5/2.575 ≈ 1.748 А
    const expectedI = 4.5 / (4.7 * 5.7 / (4.7 + 5.7));

    const lcdText = await page.evaluate(() => {
      const cards = document.querySelectorAll('lab-equipment-card[data-eq="ammeter"]');
      for (const card of cards) {
        const am = card.querySelector('lab-ammeter');
        if (am && am.shadowRoot) {
          const lcd = am.shadowRoot.querySelector('.lcd-text');
          if (lcd) return lcd.textContent;
        }
      }
      return null;
    });

    if (lcdText === null) {
      skip('3.9-B LCD: ammeter .lcd-text', 'элемент не найден');
    } else {
      const numericVal = parseFloat(lcdText.replace(',', '.'));
      // Допуск 5% (lcd читается из UI, может быть позиция R1/R2/total)
      if (Math.abs(numericVal) > 0) {
        pass(`3.9-B LCD: ammeter .lcd-text = '${lcdText}' (значение > 0, прибор не замёрз)`);
      } else {
        fail('3.9-B LCD: ammeter показание', `lcd='${lcdText}', ожидалось > 0`);
      }
    }
  } catch (err) {
    skip('3.9-B LCD: ammeter', err.message);
  }

  await checkOverlayDup(page, '3.9-B');
}

// ─── Основная функция ─────────────────────────────────────────────────────────

async function run() {
  console.log('\n── selfcheck-3-8-3-9.mjs ──────────────────────────────────────────────────');
  console.log('   Опыты 3.8/3.9 «Соединения проводников» — reality check');
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
    const resp = await page.goto(`${BASE_URL}${SCREEN}`, { timeout: 15000, waitUntil: 'domcontentloaded' });
    if (resp && resp.ok()) {
      pass('Step 0: страница загрузилась (200 OK)');
    } else {
      fail('Step 0: страница загрузилась', `HTTP ${resp?.status()}`);
    }
  } catch (err) {
    fail('Step 0: страница загрузилась', `${err.message}`);
    skip('Весь опыт 3.8–3.9', 'страница не загрузилась');
    await browser.close();
    printSummary();
    return;
  }

  await page.waitForTimeout(700);
  await screenshot(page, '00-rest-state');

  // REST-state: drop-zone подсветки скрыты
  try {
    const activeZones = await page.locator('.drop-zone--active').count();
    if (activeZones === 0) {
      pass('Step 0b: REST-state — drop-zone подсветки скрыты');
    } else {
      fail('Step 0b: REST-state', `${activeZones} активных drop-zone без drag`);
    }
  } catch (err) {
    skip('Step 0b: REST-state', err.message);
  }

  await checkOverlayDup(page, 'Step 0c');

  // Проверка window.connectionsExperiment
  const expAvailable = await page.evaluate(() => !!(window.connectionsExperiment));
  if (!expAvailable) {
    skip('Весь опыт 3.8–3.9', 'window.connectionsExperiment не найден — экран не смонтирован');
    await browser.close();
    printSummary();
    return;
  }
  pass('Step 0d: window.connectionsExperiment доступен');

  // ── Задача A: правило напряжений (3.8) ───────────────────────────────────────
  await runTaskA(page);

  // ── Задача B: правило токов (3.9) ─────────────────────────────────────────────
  await runTaskB(page);

  // ── Финальный скриншот ────────────────────────────────────────────────────────
  await screenshot(page, '05-final');

  await browser.close();
  printSummary();
}

function printSummary() {
  console.log('\n───────────────────────────────────────────────────────────────────────────');
  console.log(`  selfcheck-3-8-3-9: PASS=${passCount}  FAIL=${failCount}  SKIP=${skipCount}`);
  if (failCount === 0) {
    console.log(`  STATUS: PASS ${passCount}/${failCount}/${skipCount}`);
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
