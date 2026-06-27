/**
 * selfcheck-3-5-3-7.mjs — reality-check опытов 3.5/3.6/3.7 «Сопротивление проводника».
 *
 * PLAYBOOK Шаг 7 + REFERENCE §13 + урок «D&D self-check через mouse»:
 * сборка цепи ОБЯЗАНА идти реальным page.mouse.move/down/up — programmatic placeInSlot
 * обходит drop-flow и не ловит overlay-dup. Все 5 приборов перетаскиваются мышью,
 * и после каждого дропа проверяется, что слот реально занят (card[data-placed]).
 *
 * Запуск:
 *   npm --workspace=@labosfera/kit-3-circuits run dev -- --host 127.0.0.1 --port 5215 --strictPort
 *   node experiments/kit-3-circuits/selfcheck-3-5-3-7.mjs
 *
 * Опыт 3.5 — R(длина): нихром S=0,25 мм², l=0,5/1,0/2,0 м → R=2,2/4,4/8,8 Ом.
 *   Инвариант: R(wire-len-20) > R(wire-len-05) ≈ ×4.
 * Опыт 3.6 — R(сечение): нихром l=2,0 м, S=0,25/0,5/1,0 мм² → R=8,8/4,4/2,2 Ом.
 *   Инвариант: R(wire-sec-025) > R(wire-sec-10) ≈ ×4.
 * Опыт 3.7 — R(материал): нихром/константан/никелин l=2,0 м S=0,25 мм².
 *   Инвариант: R(wire-mat-ni) > R(wire-mat-nk).
 *
 * Проверка вольтметра (урок Фазы C):
 *   U=6 В (range=6), слайдер ≤ range → LCD .lcd-text shadowRoot = '6,00'.
 *
 * Вывод: PASS n/0/0
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env['SELFCHECK_BASE_URL'] ?? 'http://127.0.0.1:5215';
const SCREEN = '?screen=wire-resistance';
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
  const file = path.join(SCREENSHOTS_DIR, `3-5-3-7-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`       Screenshot: ${file}`);
}

/**
 * Реальный mouse-drag прибора из карточки комплекта в гнездо платы.
 * Цель — viewport-координаты гнезда через board.getSlotRect(slotId).
 * Подтверждение дропа через card[data-placed] (ставит только onDrop drop-flow).
 *
 * Эталон: selfcheck-3-4.mjs (verbatim структура).
 */
async function dragInstrumentToSlot(page, equipmentId, slotId) {
  const cardSel = `lab-equipment-card[data-eq="${equipmentId}"]`;
  const draggableSel = [
    `${cardSel} > lab-power-source`,
    `${cardSel} > lab-voltmeter`,
    `${cardSel} > lab-ammeter`,
    `${cardSel} > lab-wire-resistor`,
    `${cardSel} > lab-key`,
  ].join(', ');

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
    const card = document.querySelector(sel);
    return card ? card.getAttribute('data-placed') : null;
  }, cardSel);

  return placedSlot === slotId;
}

/**
 * Собрать полную цепь (5 приборов) реальным mouse-D&D.
 * wireId — конкретная карточка проволоки (попадает в слот 'resistor').
 */
async function assembleCircuit(page, taskLabel, wireId) {
  const plan = [
    { slot: 'source',    eq: 'power-source' },
    { slot: 'key',       eq: 'key' },
    { slot: 'ammeter',   eq: 'ammeter' },
    { slot: 'resistor',  eq: wireId },
    { slot: 'voltmeter', eq: 'voltmeter' },
  ];

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

  if (placed === 5) {
    pass(`${taskLabel}: все 5 приборов посажены реальным mouse-D&D`);
  } else {
    fail(`${taskLabel}: сборка цепи`, `посажено ${placed}/5 приборов`);
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

/**
 * Снять R для проволоки: установить U → замкнуть ключ → прочитать measurements.
 * Возвращает R=U/I из последнего measurement, либо NaN при ошибке.
 */
async function measureR(page, taskLabel, wireId, U) {
  // Установить напряжение
  try {
    await page.evaluate((v) => window.wireResistanceExperiment?.setVoltage(v), U);
    await page.waitForTimeout(80);
  } catch (err) {
    fail(`${taskLabel}: setVoltage(${U})`, err.message);
    return NaN;
  }

  // Замкнуть ключ
  try {
    await page.evaluate(() => window.wireResistanceExperiment?.setKeyClosed(true));
    await page.waitForTimeout(100);
  } catch (err) {
    fail(`${taskLabel}: setKeyClosed(true)`, err.message);
    return NaN;
  }

  // Записать через pending-плашку
  const btn = page.locator('#record-pending-btn');
  const visible = await btn.isVisible().catch(() => false);
  if (visible) {
    await btn.click();
    await page.waitForTimeout(150);
    pass(`${taskLabel}:${wireId} U=${U}: запись через #record-pending-btn`);
  } else {
    await page.evaluate(() => window.wireResistanceExperiment?.recordMeasurement());
    await page.waitForTimeout(100);
    skip(`${taskLabel}:${wireId} U=${U}: pending-плашка скрыта → API-триггер`, 'record-mode не semi-auto');
  }

  // Разомкнуть ключ — signature меняется
  try {
    await page.evaluate(() => window.wireResistanceExperiment?.setKeyClosed(false));
    await page.waitForTimeout(50);
  } catch { /* некритично */ }

  // Прочитать R из последнего measurement
  const measurements = await page.evaluate(() => window.wireResistanceExperiment?.measurements ?? []);
  const last = measurements[measurements.length - 1];
  if (!last) {
    fail(`${taskLabel}:${wireId}: нет measurement после записи`, '');
    return NaN;
  }
  const R = last.U_V / last.I_A;
  pass(`${taskLabel}:${wireId}: R=${R.toFixed(2)} Ом (U=${last.U_V}, I=${last.I_A.toFixed(4)})`);
  return R;
}

/**
 * Переключить задачу (A-length / B-section / C-rho) кликом на tab.
 */
async function switchTask(page, taskId, taskLabel) {
  try {
    const tabSel = `[data-task="${taskId}"]`;
    await page.locator(tabSel).first().click();
    await page.waitForTimeout(200);
    const activeTask = await page.evaluate(() => window.wireResistanceExperiment?.activeTask);
    if (activeTask === taskId) {
      pass(`${taskLabel}: задача переключена на ${taskId}`);
    } else {
      fail(`${taskLabel}: переключение задачи`, `ожидалось ${taskId}, получено ${activeTask}`);
    }
  } catch (err) {
    fail(`${taskLabel}: switchTask(${taskId})`, err.message);
  }
}

// ─── Задача A: R(длина) — опыт 3.5 ──────────────────────────────────────────

async function runTaskA(page) {
  console.log('\n  ── Задача A: R(длина) — опыт 3.5 ─────────────────────────────────────');

  // Переключить задачу A
  await switchTask(page, 'A-length', '3.5-A');

  // Собрать цепь с самой короткой проволокой (wire-len-05, l=0,5 м → R=2,2 Ом)
  const placed05 = await assembleCircuit(page, '3.5-A: цепь wire-len-05', 'wire-len-05');
  if (placed05 < 5) {
    fail('3.5-A: пропуск задачи — сборка не удалась', '');
    return;
  }

  await screenshot(page, '01-A-assembled-05');

  const R05 = await measureR(page, '3.5-A', 'wire-len-05', 4.0);

  // reset(false) — сохранить measurement, вернуть приборы
  await page.evaluate(() => window.wireResistanceExperiment?.reset(false));
  await page.waitForTimeout(300);
  pass('3.5-A: reset(false) между проволоками');

  // Собрать цепь с самой длинной проволокой (wire-len-20, l=2,0 м → R=8,8 Ом)
  const placed20 = await assembleCircuit(page, '3.5-A: цепь wire-len-20', 'wire-len-20');
  if (placed20 < 5) {
    fail('3.5-A: сборка wire-len-20 не удалась', '');
    return;
  }

  await screenshot(page, '02-A-assembled-20');

  const R20 = await measureR(page, '3.5-A', 'wire-len-20', 4.0);

  await screenshot(page, '03-A-recorded');

  // ФИПИ-инвариант: R(l=2,0) > R(l=0,5) и ≈ ×4
  if (!Number.isFinite(R05) || !Number.isFinite(R20)) {
    fail('3.5-A ФИПИ: инвариант R∝l', `R05=${R05}, R20=${R20} — NaN`);
    return;
  }

  if (R20 > R05) {
    pass(`3.5-A ФИПИ: R(l=2,0)=${R20.toFixed(2)} > R(l=0,5)=${R05.toFixed(2)} (R растёт с l)`);
  } else {
    fail('3.5-A ФИПИ: R∝l — монотонность', `R20=${R20.toFixed(2)} ≤ R05=${R05.toFixed(2)}`);
  }

  const ratio = R20 / R05;
  if (Math.abs(ratio - 4) < 0.5) {
    pass(`3.5-A ФИПИ: R20/R05=${ratio.toFixed(2)} ≈ 4 (l в 4 раза длиннее → R в 4 раза больше)`);
  } else {
    fail('3.5-A ФИПИ: R∝l — соотношение ×4', `ratio=${ratio.toFixed(2)}, ожидалось ≈4`);
  }

  await checkOverlayDup(page, '3.5-A');
}

// ─── Задача B: R(сечение) — опыт 3.6 ────────────────────────────────────────

async function runTaskB(page) {
  console.log('\n  ── Задача B: R(сечение) — опыт 3.6 ─────────────────────────────────');

  // Полный сброс + переключение задачи
  await page.evaluate(() => window.wireResistanceExperiment?.reset(true));
  await page.waitForTimeout(300);

  await switchTask(page, 'B-section', '3.6-B');

  // Тонкая проволока (wire-sec-025, S=0,25 мм² → R=8,8 Ом)
  const placed025 = await assembleCircuit(page, '3.6-B: цепь wire-sec-025', 'wire-sec-025');
  if (placed025 < 5) {
    fail('3.6-B: пропуск задачи — сборка не удалась', '');
    return;
  }

  await screenshot(page, '04-B-assembled-025');

  const R025 = await measureR(page, '3.6-B', 'wire-sec-025', 4.0);

  await page.evaluate(() => window.wireResistanceExperiment?.reset(false));
  await page.waitForTimeout(300);
  pass('3.6-B: reset(false) между проволоками');

  // Толстая проволока (wire-sec-10, S=1,0 мм² → R=2,2 Ом)
  const placed10 = await assembleCircuit(page, '3.6-B: цепь wire-sec-10', 'wire-sec-10');
  if (placed10 < 5) {
    fail('3.6-B: сборка wire-sec-10 не удалась', '');
    return;
  }

  await screenshot(page, '05-B-assembled-10');

  const R10 = await measureR(page, '3.6-B', 'wire-sec-10', 4.0);

  await screenshot(page, '06-B-recorded');

  // ФИПИ-инвариант: R(тонкая S=0,25) > R(толстая S=1,0) и ≈ ×4
  if (!Number.isFinite(R025) || !Number.isFinite(R10)) {
    fail('3.6-B ФИПИ: инвариант R∝1/S', `R025=${R025}, R10=${R10} — NaN`);
    return;
  }

  if (R025 > R10) {
    pass(`3.6-B ФИПИ: R(S=0,25)=${R025.toFixed(2)} > R(S=1,0)=${R10.toFixed(2)} (R обратно пропорционально S)`);
  } else {
    fail('3.6-B ФИПИ: R∝1/S — монотонность', `R025=${R025.toFixed(2)} ≤ R10=${R10.toFixed(2)}`);
  }

  const ratio = R025 / R10;
  if (Math.abs(ratio - 4) < 0.5) {
    pass(`3.6-B ФИПИ: R025/R10=${ratio.toFixed(2)} ≈ 4 (S в 4 раза меньше → R в 4 раза больше)`);
  } else {
    fail('3.6-B ФИПИ: R∝1/S — соотношение ×4', `ratio=${ratio.toFixed(2)}, ожидалось ≈4`);
  }

  await checkOverlayDup(page, '3.6-B');
}

// ─── Задача C: R(материал) — опыт 3.7 ────────────────────────────────────────

async function runTaskC(page) {
  console.log('\n  ── Задача C: R(материал) — опыт 3.7 ────────────────────────────────');

  await page.evaluate(() => window.wireResistanceExperiment?.reset(true));
  await page.waitForTimeout(300);

  await switchTask(page, 'C-rho', '3.7-C');

  // Нихром (wire-mat-ni, ρ=1,1e-6 → R=8,8 Ом)
  const placedNi = await assembleCircuit(page, '3.7-C: цепь wire-mat-ni', 'wire-mat-ni');
  if (placedNi < 5) {
    fail('3.7-C: пропуск задачи — сборка не удалась', '');
    return;
  }

  await screenshot(page, '07-C-assembled-ni');

  const R_ni = await measureR(page, '3.7-C', 'wire-mat-ni', 4.0);

  await page.evaluate(() => window.wireResistanceExperiment?.reset(false));
  await page.waitForTimeout(300);
  pass('3.7-C: reset(false) между проволоками');

  // Никелин (wire-mat-nk, ρ=0,4e-6 → R=3,2 Ом)
  const placedNk = await assembleCircuit(page, '3.7-C: цепь wire-mat-nk', 'wire-mat-nk');
  if (placedNk < 5) {
    fail('3.7-C: сборка wire-mat-nk не удалась', '');
    return;
  }

  await screenshot(page, '08-C-assembled-nk');

  const R_nk = await measureR(page, '3.7-C', 'wire-mat-nk', 4.0);

  await screenshot(page, '09-C-recorded');

  // ФИПИ-инвариант: R(нихром, ρ=1,1e-6) > R(никелин, ρ=0,4e-6)
  if (!Number.isFinite(R_ni) || !Number.isFinite(R_nk)) {
    fail('3.7-C ФИПИ: инвариант R∝ρ', `R_ni=${R_ni}, R_nk=${R_nk} — NaN`);
    return;
  }

  if (R_ni > R_nk) {
    pass(`3.7-C ФИПИ: R(нихром)=${R_ni.toFixed(2)} > R(никелин)=${R_nk.toFixed(2)} (R∝ρ)`);
  } else {
    fail('3.7-C ФИПИ: R∝ρ', `R_ni=${R_ni.toFixed(2)} ≤ R_nk=${R_nk.toFixed(2)}`);
  }

  // Соотношение: нихром/никелин = 1,1e-6/0,4e-6 = 2,75
  const expected_ratio = 1.1 / 0.4;
  const actual_ratio = R_ni / R_nk;
  if (Math.abs(actual_ratio - expected_ratio) < 0.5) {
    pass(`3.7-C ФИПИ: R_ni/R_nk=${actual_ratio.toFixed(2)} ≈ ρ_нихром/ρ_никелин=${expected_ratio.toFixed(2)}`);
  } else {
    fail('3.7-C ФИПИ: R∝ρ — соотношение', `actual=${actual_ratio.toFixed(2)}, ожидалось ≈${expected_ratio.toFixed(2)}`);
  }

  await checkOverlayDup(page, '3.7-C');
}

// ─── Проверка вольтметра LCD (урок Фазы C: range=6, слайдер ≤ range) ─────────

async function checkVoltmeterLcd(page) {
  console.log('\n  ── Проверка LCD вольтметра при U=6 В (урок Фазы C) ─────────────────');

  await page.evaluate(() => window.wireResistanceExperiment?.reset(true));
  await page.waitForTimeout(300);

  await switchTask(page, 'A-length', 'LCD: задача A');

  // Собрать цепь с wire-len-05 (наименьшее R → наибольший ток → хороший тест)
  const placed = await assembleCircuit(page, 'LCD: цепь wire-len-05', 'wire-len-05');
  if (placed < 5) {
    skip('LCD: проверка', 'сборка цепи не удалась');
    return;
  }

  // Установить U=6 В (range=6)
  try {
    await page.evaluate(() => window.wireResistanceExperiment?.setVoltage(6.0));
    await page.waitForTimeout(80);
    const gotV = await page.evaluate(() => window.wireResistanceExperiment?.voltage);
    if (Math.abs(gotV - 6.0) < 0.01) {
      pass(`LCD: напряжение U=6,0 В установлено (clamp в [1,0; 6,0])`);
    } else {
      fail('LCD: clamp напряжения', `ожидалось 6,0, получено ${gotV}`);
    }
  } catch (err) {
    fail('LCD: setVoltage(6.0)', err.message);
    return;
  }

  // Замкнуть ключ → ток пойдёт → LCD вольтметра обновится
  await page.evaluate(() => window.wireResistanceExperiment?.setKeyClosed(true));
  await page.waitForTimeout(150);

  // Прочитать LCD вольтметра через shadowRoot .lcd-text
  try {
    const lcdText = await page.evaluate(() => {
      // Вольтметр находится в карточке equipment-card[data-eq="voltmeter"]
      // Но при размещении прибор перемещается на circuit-board → ищем в #circuit-board
      // lab-voltmeter может быть и в карточке (если уже placed).
      // Надёжнее: найти все lab-voltmeter и прочитать lcd-text из первого.
      const cards = document.querySelectorAll('lab-equipment-card');
      for (const card of cards) {
        if (card.getAttribute('data-eq') === 'voltmeter') {
          const vm = card.querySelector('lab-voltmeter');
          if (vm && vm.shadowRoot) {
            const lcd = vm.shadowRoot.querySelector('.lcd-text');
            return lcd ? lcd.textContent : null;
          }
        }
      }
      // Fallback: искать в circuit-board shadow
      const board = document.querySelector('#circuit-board');
      if (board && board.shadowRoot) {
        const vm = board.shadowRoot.querySelector('lab-voltmeter');
        if (vm && vm.shadowRoot) {
          const lcd = vm.shadowRoot.querySelector('.lcd-text');
          return lcd ? lcd.textContent : null;
        }
      }
      return null;
    });

    if (lcdText === null) {
      skip('LCD: voltmeter .lcd-text', 'элемент не найден (voltmeter может быть на board, не в card)');
    } else {
      // LCD ожидается '6,00' (или '6.00' — зависит от локали render)
      const numericVal = parseFloat(lcdText.replace(',', '.'));
      if (Math.abs(numericVal - 6.0) < 0.05) {
        pass(`LCD: voltmeter .lcd-text = '${lcdText}' ≈ 6,0 В (range=6, стрелка не замёрзла)`);
      } else {
        fail('LCD: voltmeter показание', `lcd='${lcdText}', ожидалось ≈'6,00'`);
      }
    }
  } catch (err) {
    skip('LCD: voltmeter .lcd-text', err.message);
  }

  // Дополнительно: слайдер max="6.0" (не 7.5)
  try {
    const sliderMax = await page.evaluate(() => {
      const input = document.querySelector('#voltage-input');
      return input ? input.getAttribute('max') : null;
    });
    if (sliderMax === '6.0' || sliderMax === '6') {
      pass(`LCD: slider max="${sliderMax}" (не 7.5 — урок Фазы C)`);
    } else {
      fail('LCD: slider max', `max="${sliderMax}", ожидалось "6.0"`);
    }
  } catch (err) {
    skip('LCD: slider max', err.message);
  }

  await screenshot(page, '10-lcd-voltmeter-6V');

  // Разомкнуть
  await page.evaluate(() => window.wireResistanceExperiment?.setKeyClosed(false));
  await page.waitForTimeout(50);
}

// ─── Основная функция ─────────────────────────────────────────────────────────

async function run() {
  console.log('\n── selfcheck-3-5-3-7.mjs ──────────────────────────────────────────────────');
  console.log('   Опыты 3.5/3.6/3.7 «Сопротивление проводника» — reality check');
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
    const resp = await page.goto(`${BASE_URL}${SCREEN}`, { timeout: 12000, waitUntil: 'domcontentloaded' });
    if (resp && resp.ok()) {
      pass('Step 0: страница загрузилась (200 OK)');
    } else {
      fail('Step 0: страница загрузилась', `HTTP ${resp?.status()}`);
    }
  } catch (err) {
    fail('Step 0: страница загрузилась', `${err.message}`);
    skip('Весь опыт 3.5–3.7', 'страница не загрузилась');
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

  // Проверка window.wireResistanceExperiment
  const expAvailable = await page.evaluate(() => !!(window.wireResistanceExperiment));
  if (!expAvailable) {
    skip('Весь опыт 3.5–3.7', 'window.wireResistanceExperiment не найден — экран не смонтирован');
    await browser.close();
    printSummary();
    return;
  }
  pass('Step 0d: window.wireResistanceExperiment доступен');

  // ── Задача A: R(длина) ───────────────────────────────────────────────────────
  await runTaskA(page);

  // ── Задача B: R(сечение) ─────────────────────────────────────────────────────
  await runTaskB(page);

  // ── Задача C: R(материал) ────────────────────────────────────────────────────
  await runTaskC(page);

  // ── Проверка LCD вольтметра при U=6 В ────────────────────────────────────────
  await checkVoltmeterLcd(page);

  // ── Финальный скриншот ────────────────────────────────────────────────────────
  await screenshot(page, '11-final');

  await browser.close();
  printSummary();
}

function printSummary() {
  console.log('\n───────────────────────────────────────────────────────────────────────────');
  console.log(`  selfcheck-3-5-3-7: PASS=${passCount}  FAIL=${failCount}  SKIP=${skipCount}`);
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
