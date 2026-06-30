/**
 * selfcheck-4-1.mjs — reality-check опыта 4.1 «Оптическая сила собирающей линзы».
 *
 * PLAYBOOK Шаг 7 + REFERENCE §13 + урок «D&D self-check через mouse»:
 * сборка скамьи ОБЯЗАНА идти реальным page.mouse.move/down/up — programmatic placeInSlot
 * обходит drop-flow и не ловит overlay-dup. Все три прибора (осветитель/линза/экран)
 * перетаскиваются мышью, и после каждого дропа проверяется card[data-placed].
 *
 * Запуск:
 *   npm --workspace=@labosfera/kit-4-optics run dev -- --host 127.0.0.1 --port 5230 --strictPort
 *   node experiments/kit-4-optics/selfcheck-4-1.mjs
 *
 * Опыт 4.1 — Измерение оптической силы собирающей линзы:
 *   d=300 мм, линза F=100 мм → f=imageDistance(100,300)=150 мм;
 *   Ученик двигает экран до резкости (плоскость изображения).
 *   F = d·f/(d+f) = 300·150/(300+150) = 100 мм.
 *   D = 1/F[м] = 1/0,100 = 10,0 дптр.
 *   Инвариант (tolerance 5%): F≈100, D≈10.
 *
 * ФИПИ-якорь: СПЕЦ Прил.2 компл.№4 (стр.19), сноска (4):
 *   «измерение оптической силы собирающей линзы, фокусного расстояния...»
 *
 * Вывод: PASS n/0/0
 *
 * ПРИМЕЧАНИЕ ПО СЛОТАМ:
 *   getSlotRect(id) принимает как сырой 'object' так и 'bench-slot-object' (нормализует).
 *   data-placed хранит сырой slotId ('object','lens','screen') — без префикса bench-slot-.
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env['SELFCHECK_BASE_URL'] ?? 'http://127.0.0.1:5230';
const SCREEN = '?screen=lens-bench';
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
  const file = path.join(SCREENSHOTS_DIR, `4-1-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`       Screenshot: ${file}`);
}

/**
 * Реальный mouse-drag прибора из карточки комплекта в гнездо скамьи.
 * Цель — viewport-координаты гнезда через bench.getSlotRect(slotId).
 *
 * slotId: сырой ('object','lens','screen') — getSlotRect нормализует, а data-placed тоже сырой.
 *
 * Эталон: selfcheck-3-8-3-9.mjs (verbatim структура).
 */
async function dragInstrumentToSlot(page, equipmentId, slotId) {
  const cardSel = `lab-equipment-card[data-eq="${equipmentId}"]`;
  const draggableSel = [
    `${cardSel} > lab-light-object`,
    `${cardSel} > lab-lens`,
    `${cardSel} > lab-screen`,
  ].join(', ');

  const draggable = page.locator(draggableSel).first();
  await draggable.scrollIntoViewIfNeeded();
  await page.waitForTimeout(60);

  const srcBox = await draggable.boundingBox();
  if (!srcBox) {
    throw new Error(`draggable не найден для ${equipmentId}`);
  }

  // getSlotRect принимает сырой slotId ('object') или полный ('bench-slot-object')
  const tgt = await page.evaluate((sid) => {
    const bench = document.querySelector('#optical-bench');
    if (!bench || typeof bench.getSlotRect !== 'function') return null;
    const r = bench.getSlotRect(sid);
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

  // data-placed хранит сырой slotId (без bench-slot-), выставляется в #recordPlacement
  const placedSlot = await page.evaluate((sel) => {
    const card = document.querySelector(sel);
    return card ? card.getAttribute('data-placed') : null;
  }, cardSel);

  // slotId сырой ('object'), data-placed тоже сырой — прямое сравнение корректно
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
 * Собрать скамью (3 прибора) реальным mouse-D&D:
 *   light-object → object (слот скамьи, raw id)
 *   lens         → lens
 *   screen       → screen
 */
async function assembleBench(page, label) {
  const plan = [
    { slot: 'object', eq: 'light-object' },
    { slot: 'lens',   eq: 'lens' },
    { slot: 'screen', eq: 'screen' },
  ];

  let placed = 0;
  for (const { slot, eq } of plan) {
    try {
      const ok = await dragInstrumentToSlot(page, eq, slot);
      if (ok) {
        placed++;
        pass(`${label}: mouse-D&D ${eq} → слот bench-slot-${slot} (слот занят)`);
      } else {
        fail(`${label}: mouse-D&D ${eq} → слот bench-slot-${slot}`, 'дроп не сел (card без data-placed)');
      }
    } catch (err) {
      fail(`${label}: mouse-D&D ${eq} → слот bench-slot-${slot}`, err.message);
    }
  }

  if (placed === 3) {
    pass(`${label}: все 3 прибора посажены реальным mouse-D&D`);
  } else {
    fail(`${label}: сборка скамьи`, `посажено ${placed}/3 приборов`);
  }

  return placed;
}

/**
 * pure-физика (без DOM) — формула линзы: f = d*F/(d-F).
 * Зеркало LensModel.imageDistance — только для инвариантных проверок в selfcheck.
 */
function imageDistance(F_mm, d_mm) {
  if (Math.abs(d_mm - F_mm) < 0.001) return Infinity;
  return (d_mm * F_mm) / (d_mm - F_mm);
}

/**
 * focalFromDistances: F = d*f/(d+f).
 * Зеркало LensModel.focalFromDistances — для assertion инварианта.
 */
function focalFromDistances(d_mm, f_mm) {
  return (d_mm * f_mm) / (d_mm + f_mm);
}

/**
 * opticalPower: D = 1/F_m [дптр].
 * Аргумент в метрах (как в контракте LensModel.opticalPower).
 */
function opticalPower(F_m) {
  return 1 / F_m;
}

// ─── Опыт 4.1: d=300, линза F=100, найти резкость и записать строку ──────────

async function runTask41(page) {
  console.log('\n  ── Опыт 4.1: Оптическая сила линзы (d=300, F=100) ──────────────────────');

  // Шаг 1: Собрать скамью мышью
  const placed = await assembleBench(page, '4.1: сборка скамьи');
  if (placed < 3) {
    fail('4.1: пропуск — скамья не собрана', '');
    return;
  }

  await screenshot(page, '01-assembled');

  // Шаг 2: Установить d=300 мм (предмет → линза)
  try {
    await page.evaluate(() => window.lensBenchExperiment?.setObjectDistanceMm(300));
    await page.waitForTimeout(100);
    pass('4.1: setObjectDistanceMm(300) — предмет установлен в d=300 мм');
  } catch (err) {
    fail('4.1: setObjectDistanceMm(300)', err.message);
    return;
  }

  // Шаг 3: Сдвинуть экран до резкости в плоскость изображения (f=150 мм) ЧЕРЕЗ СЛАЙДЕР.
  // imageDistance(F=100, d=300) = 300*100/(300-100) = 150 мм.
  const F_mm = 100;
  const d_mm = 300;
  const imagePlane_mm = imageDistance(F_mm, d_mm); // = 150

  try {
    const moved = await page.evaluate((f) => {
      const slider = document.querySelector('#screen-slider');
      if (!slider) return false;
      slider.value = String(f);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }, imagePlane_mm);
    if (!moved) throw new Error('#screen-slider не найден');
    await page.waitForTimeout(120);
    pass(`4.1: #screen-slider → ${imagePlane_mm} мм — экран в плоскости изображения (двинут слайдером)`);
  } catch (err) {
    fail(`4.1: слайдер экрана → ${imagePlane_mm}`, err.message);
    return;
  }

  await screenshot(page, '02-screen-at-focus');

  // Шаг 4: Проверить резкость через get isSharp
  try {
    const isSharp = await page.evaluate(() => window.lensBenchExperiment?.isSharp ?? null);
    if (isSharp === true) {
      pass('4.1: get isSharp === true (экран в плоскости изображения F=100,d=300→f=150)');
    } else {
      fail('4.1: резкость в плоскости изображения', `isSharp=${isSharp}, ожидалось true`);
    }
  } catch (err) {
    fail('4.1: проверка резкости (get isSharp)', err.message);
  }

  // Шаг 5: Ориентация изображения (d>F → 'inverted')
  try {
    const orientation = await page.evaluate(() => window.lensBenchExperiment?.imageOrientation ?? null);
    if (orientation === 'inverted') {
      pass('4.1: get imageOrientation === "inverted" (d=300 > F=100 → реальное перевёрнутое — ФИПИ инвариант)');
    } else {
      fail('4.1: ориентация изображения', `imageOrientation='${orientation}', ожидалось 'inverted'`);
    }
  } catch (err) {
    fail('4.1: ориентация (get imageOrientation)', err.message);
  }

  // Шаг 6: Записать строку
  const btn = page.locator('#record-pending-btn');
  const visible = await btn.isVisible().catch(() => false);
  if (visible) {
    await btn.click();
    await page.waitForTimeout(200);
    pass('4.1: запись через #record-pending-btn');
  } else {
    await page.evaluate(() => window.lensBenchExperiment?.recordMeasurement?.());
    await page.waitForTimeout(150);
    pass('4.1: запись через recordMeasurement() (record-mode не semi-auto)');
  }

  // Шаг 7: Прочитать последнюю строку журнала
  const measurements = await page.evaluate(() => window.lensBenchExperiment?.measurements ?? []);
  const last = measurements[measurements.length - 1];
  if (!last) {
    fail('4.1: нет measurement после записи', '');
    return;
  }

  const { d_mm: rec_d, f_mm: rec_f, F_mm: rec_F, D_dptr: rec_D } = last;
  pass(`4.1: строка журнала: d=${rec_d} мм, f=${rec_f} мм, F=${rec_F?.toFixed ? rec_F.toFixed(1) : rec_F} мм, D=${rec_D?.toFixed ? rec_D.toFixed(2) : rec_D} дптр`);

  await screenshot(page, '03-recorded');

  // Шаг 8: Инварианты ФИПИ — F≈100 мм, D≈10 дптр

  // Инвариант: F = focalFromDistances(d, f) ≈ 100 мм (tolerance 5%)
  if (rec_d != null && rec_f != null) {
    const F_computed = focalFromDistances(rec_d, rec_f);
    const relF = Math.abs(F_computed - F_mm) / F_mm;
    if (relF <= 0.05) {
      pass(`4.1 ФИПИ: F=d·f/(d+f)=${F_computed.toFixed(1)} мм ≈ 100 мм (rel=${(relF * 100).toFixed(2)}% ≤ 5%)`);
    } else {
      fail('4.1 ФИПИ: инвариант F≈100', `F_computed=${F_computed.toFixed(2)} мм, rel=${(relF * 100).toFixed(2)}% > 5%`);
    }
  } else {
    fail('4.1 ФИПИ: инвариант F', 'rec_d или rec_f = null в строке журнала');
  }

  // Инвариант: D = 1/F_м ≈ 10 дптр (tolerance 8%)
  if (rec_F != null) {
    const D_computed = opticalPower(rec_F / 1000);
    const relD = Math.abs(D_computed - 10) / 10;
    if (relD <= 0.08) {
      pass(`4.1 ФИПИ: D=1/F=${D_computed.toFixed(2)} дптр ≈ 10 дптр (rel=${(relD * 100).toFixed(2)}% ≤ 8%)`);
    } else {
      fail('4.1 ФИПИ: инвариант D≈10', `D_computed=${D_computed.toFixed(3)} дптр, rel=${(relD * 100).toFixed(2)}% > 8%`);
    }
  } else {
    fail('4.1 ФИПИ: инвариант D', 'rec_F = null в строке журнала');
  }

  // Инвариант: d_mm=300 ±1%
  if (rec_d != null) {
    const relD300 = Math.abs(rec_d - 300) / 300;
    if (relD300 <= 0.01) {
      pass(`4.1: d_mm=${rec_d} ≈ 300 мм (выставлено)`);
    } else {
      fail('4.1: d_mm в строке', `d_mm=${rec_d}, ожидалось 300`);
    }
  }

  // Инвариант: f_mm=150 ±1%
  if (rec_f != null) {
    const relF150 = Math.abs(rec_f - imagePlane_mm) / imagePlane_mm;
    if (relF150 <= 0.01) {
      pass(`4.1: f_mm=${rec_f} ≈ ${imagePlane_mm} мм (экран в плоскости изображения)`);
    } else {
      fail('4.1: f_mm в строке', `f_mm=${rec_f}, ожидалось ≈${imagePlane_mm}`);
    }
  }

  await checkOverlayDup(page, '4.1 после записи');
}

// ─── Проверка REST-state ──────────────────────────────────────────────────────

async function checkRestState(page) {
  console.log('\n  ── REST-state: гнёзда скамьи не светятся в покое ───────────────────────');
  try {
    const rest = await page.evaluate(() => {
      const bench = document.querySelector('#optical-bench');
      const sr = bench?.shadowRoot ?? null;
      if (!sr) return { ok: null, reason: 'shadowRoot скамьи не найден' };
      const rects = Array.from(sr.querySelectorAll('.slot-rect'));
      if (rects.length === 0) return { ok: null, reason: '.slot-rect не найдены' };
      // В покое: opacity 0 у всех slot-rect, и хост НЕ в dragging-active.
      const anyVisible = rects.some((r) => parseFloat(getComputedStyle(r).opacity) > 0.01);
      const dragging = bench.classList.contains('dragging-active');
      const anyActive = rects.some((r) => r.classList.contains('drop-zone--active'));
      return { ok: !anyVisible && !dragging && !anyActive, anyVisible, dragging, anyActive };
    });
    if (rest.ok === null) {
      skip('REST-state: гнёзда скрыты в покое', rest.reason);
    } else if (rest.ok) {
      pass('REST-state: slot-rect opacity 0 в покое, нет dragging-active / drop-zone--active');
    } else {
      fail('REST-state', `anyVisible=${rest.anyVisible}, dragging=${rest.dragging}, anyActive=${rest.anyActive}`);
    }
  } catch (err) {
    fail('REST-state', err.message);
  }
}

// ─── Проверка ray overlay (opt-in) ───────────────────────────────────────────

async function checkRayOverlay(page) {
  console.log('\n  ── Ray overlay: по умолчанию скрыт, после клика появляется ─────────────');

  // По умолчанию overlay скрыт (урок В4 — opt-in).
  // M6 reality-check: проверяем РЕАЛЬНЫЙ computed display, а не только атрибут hidden.
  // svg[hidden]{display:none} таргетит <svg>, НЕ внутреннюю группу .ray-overlay-group —
  // нужен явный [hidden]{display:none}, иначе лучи видны всегда, а кнопка «Лучи» ничего не делает.
  const readOverlay = () =>
    page.evaluate(() => {
      const bench = document.querySelector('#optical-bench');
      const sr = bench?.shadowRoot ?? null;
      if (!sr) return null;
      const overlayEl = sr.querySelector('.ray-overlay-group');
      if (!overlayEl) return null;
      return {
        hasHidden: overlayEl.hasAttribute('hidden'),
        display: getComputedStyle(overlayEl).display,
      };
    });

  try {
    const off = await readOverlay();
    if (off === null) {
      fail('ray-overlay: элемент .ray-overlay-group не найден', 'shadow DOM скамьи');
    } else if (off.hasHidden && off.display === 'none') {
      pass(`ray-overlay: по умолчанию скрыт — computed display='none' (М6, opt-in урок В4)`);
    } else if (off.hasHidden && off.display !== 'none') {
      // именно баг M6: hidden есть, а CSS его не применяет → лучи видны всегда.
      fail('ray-overlay: M6 — внутренняя группа НЕ скрыта',
        `hidden="" есть, но computed display='${off.display}' (ожидалось 'none'; нужно [hidden]{display:none})`);
    } else {
      fail('ray-overlay: должен быть скрыт по умолчанию', `hasHidden=${off.hasHidden}, display='${off.display}'`);
    }
  } catch (err) {
    fail('ray-overlay: check default (computed display)', err.message);
  }

  // Кликнуть КАНОН-кнопку #ray-overlay-btn и проверить, что computed display стал НЕ 'none'.
  try {
    const toggleBtn = page.locator('#ray-overlay-btn');
    const btnVisible = await toggleBtn.isVisible().catch(() => false);
    if (!btnVisible) {
      fail('ray-overlay: кнопка #ray-overlay-btn не найдена', 'канон id');
      return;
    }
    await toggleBtn.click();
    await page.waitForTimeout(150);

    const on = await readOverlay();
    if (on === null) {
      fail('ray-overlay: после клика', '.ray-overlay-group не найден');
    } else if (!on.hasHidden && on.display !== 'none') {
      pass(`ray-overlay: после клика виден — computed display='${on.display}' (≠ none)`);
    } else {
      fail('ray-overlay: после клика', `hasHidden=${on.hasHidden}, computed display='${on.display}' (ожидалось hidden снят и display ≠ none)`);
    }

    // Вернуть в исходное состояние и подтвердить, что снова display='none'.
    await toggleBtn.click();
    await page.waitForTimeout(100);
    const offAgain = await readOverlay();
    if (offAgain && offAgain.hasHidden && offAgain.display === 'none') {
      pass(`ray-overlay: повторный клик снова скрыл — computed display='none'`);
    } else {
      fail('ray-overlay: повторное скрытие', `hasHidden=${offAgain?.hasHidden}, display='${offAgain?.display}'`);
    }
  } catch (err) {
    fail('ray-overlay: toggle-test (computed display)', err.message);
  }
}

// ─── Основная функция ─────────────────────────────────────────────────────────

async function run() {
  console.log('\n── selfcheck-4-1.mjs ──────────────────────────────────────────────────────');
  console.log('   Опыт 4.1 «Оптическая сила собирающей линзы» — reality check');
  console.log(`   Target: ${BASE_URL}${SCREEN}`);
  console.log('   ФИПИ: СПЕЦ Прил.2 компл.№4 (стр.19), сноска (4)');
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
    skip('Весь опыт 4.1', 'страница не загрузилась');
    await browser.close();
    printSummary();
    return;
  }

  await page.waitForTimeout(700);
  await screenshot(page, '00-rest-state');

  // REST-state проверка
  await checkRestState(page);

  // overlay-dup в покое
  await checkOverlayDup(page, 'Step 0c');

  // Проверка window.lensBenchExperiment
  const expAvailable = await page.evaluate(() => !!(window.lensBenchExperiment));
  if (!expAvailable) {
    skip('Весь опыт 4.1', 'window.lensBenchExperiment не найден — экран не смонтирован');
    await browser.close();
    printSummary();
    return;
  }
  pass('Step 0d: window.lensBenchExperiment доступен');

  // ── Опыт 4.1 ─────────────────────────────────────────────────────────────────
  await runTask41(page);

  // ── Ray overlay (opt-in, урок В4) ─────────────────────────────────────────────
  await checkRayOverlay(page);

  // ── Финальный скриншот ────────────────────────────────────────────────────────
  await screenshot(page, '04-final');

  await browser.close();
  printSummary();
}

function printSummary() {
  console.log('\n───────────────────────────────────────────────────────────────────────────');
  console.log(`  selfcheck-4-1: PASS=${passCount}  FAIL=${failCount}  SKIP=${skipCount}`);
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
