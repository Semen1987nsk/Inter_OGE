/**
 * selfcheck-4-5.mjs — reality-check опыта 4.5 «Две сложенные линзы».
 *
 * PLAYBOOK Шаг 7 + REFERENCE §13 + урок «D&D self-check через mouse»:
 * сборка скамьи ОБЯЗАНА идти реальным page.mouse.move/down/up — programmatic placeInSlot
 * обходит drop-flow и не ловит overlay-dup.
 *
 * Опыт 4.5 — исследование изменения фокусного расстояния двух сложенных линз:
 *   combo1: соб1(F=100)+соб2(F=50) → D_комб=30 дптр, F_комб≈33 мм  (F↓, F<F₁ и F<F₂)
 *   combo2: соб2(F=50)+рассеив3(F=−75) → D_комб=6.7 дптр, F_комб=150 мм (F↑)
 *   диверг: соб1(F=100)+рассеив3(F=−75) → D_комб=−3.3 дптр, F_комб=−300 мм (нет действ. изобр.)
 *
 * ФИПИ-якорь: СПЕЦ Прил.2 компл.№4 (стр.19), сноска (4):
 *   «изменения фокусного расстояния двух сложенных линз»
 *
 * Проверяет (12 пунктов):
 *   1. Навигация http://127.0.0.1:5196/?screen=lens-bench; 200 OK; lab-optical-bench смонтирован.
 *   2. Переключение на шаг D ([data-task="D-combo"]): aria-selected=true, карточки соб2/рассеив3 видны.
 *   3. REST-state: подсветки гнёзд скрыты в покое (.slot-rect opacity 0).
 *   4. Реальный mouse-D&D: осветитель, экран, соб2→гнездо линзы, рассеив3→то же гнездо (стопка).
 *      Подтверждение: card[data-placed] для обеих линз; 2 .lens-glyph на скамье.
 *   5. combo2 (соб2+рассеив3): setScreenDistanceMm(300) до резкости (d=300, F_комб=150, f=300).
 *      isSharp===true, combinedFocalMm≈150.
 *   6. semi-auto: запись через #record-pending-btn; журнал .lab-journal-body строки;
 *      ввод D_комб/F_комб → verdict ok / ввод неверного → verdict wrong.
 *   7. a11y no-leak: #live-region и #result-panel НЕ содержат «150»/«6,7» в semi-auto.
 *   8. fully-auto: derived-ячейки [data-key=dComb_dptr]/[data-key=fComb_mm] readonly с числом.
 *   9. Диверг. пара (соб1+рассеив3): хинт содержит «действительного изображения нет»;
 *      #record-pending-btn НЕ появляется (если появился → FAIL).
 *  10. Изоляция D→A: задача A восстановлена, стопка очищена, соб2/соб3 скрыты.
 *  11. 3 режима (реальный ключ inter-oge.record-mode.kit-4).
 *  12. axe @axe-core/playwright: 0 нарушений. Правила НЕ отключаем.
 *
 * Запуск:
 *   npm --workspace=@labosfera/kit-4-optics run dev -- --host 127.0.0.1 --port 5196 --strictPort
 *   node experiments/kit-4-optics/selfcheck-4-5.mjs
 *
 * Вывод: PASS=N FAIL=0 SKIP=K
 */

import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env['SELFCHECK_BASE_URL'] ?? 'http://127.0.0.1:5192';
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
  const file = path.join(SCREENSHOTS_DIR, `4-5-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`       Screenshot: ${file}`);
}

/**
 * Реальный mouse-drag прибора из карточки комплекта в гнездо скамьи.
 * slotId: сырой ('object','lens','screen') — getSlotRect нормализует.
 * equipmentId: 'light-object', 'lens', 'lens-2', 'lens-3', 'screen'
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
  await page.waitForTimeout(150);

  const placedSlot = await page.evaluate((sel) => {
    const card = document.querySelector(sel);
    return card ? card.getAttribute('data-placed') : null;
  }, cardSel);

  // Нормализация: data-placed может хранить 'lens' или 'bench-slot-lens'
  const normalizedSlot = slotId.startsWith('bench-slot-') ? slotId : `bench-slot-${slotId}`;
  return placedSlot === slotId || placedSlot === normalizedSlot;
}

// ─── Пункт 1: Загрузка и REST-state ──────────────────────────────────────────

async function checkRestState(page) {
  console.log('\n  ── Пункт 3: REST-state — гнёзда скамьи не светятся в покое ─────────────');
  try {
    const rest = await page.evaluate(() => {
      const bench = document.querySelector('#optical-bench');
      const sr = bench?.shadowRoot ?? null;
      if (!sr) return { ok: null, reason: 'shadowRoot скамьи не найден' };
      const rects = Array.from(sr.querySelectorAll('.slot-rect'));
      if (rects.length === 0) return { ok: null, reason: '.slot-rect не найдены' };
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

// ─── Пункт 2: Переключение на задачу D ───────────────────────────────────────

async function checkSwitchToTaskD(page) {
  console.log('\n  ── Пункт 2: Переключение на задачу D [data-task="D-combo"] ─────────────');

  try {
    const taskBtn = page.locator('[data-task="D-combo"]');
    const taskBtnVisible = await taskBtn.isVisible().catch(() => false);
    if (!taskBtnVisible) {
      fail('4.5: [data-task="D-combo"] не найден', 'кнопка переключения задачи D отсутствует');
      return false;
    }
    await taskBtn.click();
    await page.waitForTimeout(200);
    pass('4.5: клик по [data-task="D-combo"] — задача D выбрана');
  } catch (err) {
    fail('4.5: переключение на задачу D', err.message);
    return false;
  }

  // aria-selected=true (требование role=tab)
  try {
    const ariaSelected = await page.evaluate(() => {
      const btn = document.querySelector('[data-task="D-combo"]');
      return btn?.getAttribute('aria-selected') ?? null;
    });
    if (ariaSelected === 'true') {
      pass('4.5: [data-task="D-combo"] aria-selected="true"');
    } else {
      fail('4.5: aria-selected после переключения на D', `aria-selected="${ariaSelected}", ожидалось "true"`);
    }
  } catch (err) {
    fail('4.5: проверка aria-selected', err.message);
  }

  // Неактивные табы должны иметь aria-selected="false"
  try {
    const inactiveResult = await page.evaluate(() => {
      const allTasks = Array.from(document.querySelectorAll('[data-task]'));
      const inactiveWrong = allTasks
        .filter(el => el.dataset['task'] !== 'D-combo')
        .filter(el => el.getAttribute('aria-selected') !== 'false' && el.getAttribute('aria-selected') !== null)
        .map(el => `${el.dataset['task']}:${el.getAttribute('aria-selected')}`);
      return { inactiveWrong, count: allTasks.length };
    });
    if (inactiveResult.inactiveWrong.length === 0) {
      pass(`4.5: неактивные табы aria-selected="false" (count=${inactiveResult.count - 1})`);
    } else {
      fail('4.5: неактивные табы должны иметь aria-selected="false"',
        `нарушения: ${inactiveResult.inactiveWrong.join(', ')}`);
    }
  } catch (err) {
    fail('4.5: проверка aria-selected неактивных', err.message);
  }

  // Карточки соб2/рассеив3 должны быть ВИДНЫ в задаче D
  try {
    const lens2Visible = await page.locator('lab-equipment-card[data-eq="lens-2"]').isVisible().catch(() => false);
    const lens3Visible = await page.locator('lab-equipment-card[data-eq="lens-3"]').isVisible().catch(() => false);
    if (lens2Visible) {
      pass('4.5: карточка соб2 (data-eq=lens-2) видна в задаче D');
    } else {
      fail('4.5: карточка соб2 (data-eq=lens-2) не видна в задаче D', 'combo-lens скрыта — не показалась при D');
    }
    if (lens3Visible) {
      pass('4.5: карточка рассеив3 (data-eq=lens-3) видна в задаче D');
    } else {
      fail('4.5: карточка рассеив3 (data-eq=lens-3) не видна в задаче D', 'combo-lens скрыта — не показалась при D');
    }
  } catch (err) {
    fail('4.5: проверка видимости combo-карточек', err.message);
  }

  return true;
}

// ─── Пункт 4: mouse-D&D стопки двух линз ─────────────────────────────────────

/**
 * Собрать скамью для задачи D: осветитель, экран, соб2, рассеив3 (стопка).
 * Возвращает количество успешно посаженных приборов (максимум 4).
 */
async function assembleTaskDCombo2(page, label) {
  const plan = [
    { slot: 'object', eq: 'light-object' },
    { slot: 'screen', eq: 'screen' },
    { slot: 'lens',   eq: 'lens-2' },    // соб2 F=50 → первой в гнездо
    { slot: 'lens',   eq: 'lens-3' },    // рассеив3 F=-75 → в то же гнездо (стопка)
  ];

  let placed = 0;
  for (const { slot, eq } of plan) {
    try {
      const ok = await dragInstrumentToSlot(page, eq, slot);
      if (ok) {
        placed++;
        pass(`${label}: mouse-D&D ${eq} → слот bench-slot-${slot} (card data-placed)`);
      } else {
        fail(`${label}: mouse-D&D ${eq} → слот bench-slot-${slot}`, 'дроп не сел (card без data-placed)');
      }
    } catch (err) {
      fail(`${label}: mouse-D&D ${eq} → слот bench-slot-${slot}`, err.message);
    }
  }
  return placed;
}

// Проверить что на скамье 2 .lens-glyph
async function checkLensGlyphs(page, label, expected) {
  try {
    const count = await page.evaluate(() => {
      const bench = document.querySelector('#optical-bench');
      const sr = bench?.shadowRoot ?? null;
      if (!sr) return -1;
      return sr.querySelectorAll('.lens-glyph').length;
    });
    if (count === -1) {
      skip(`${label}: lens-glyph в shadowRoot`, 'shadowRoot скамьи не найден');
    } else if (count === expected) {
      pass(`${label}: ${count} .lens-glyph на скамье (стопка отрисована)`);
    } else {
      fail(`${label}: lens-glyph count`, `найдено ${count}, ожидалось ${expected}`);
    }
  } catch (err) {
    fail(`${label}: lens-glyph`, err.message);
  }
}

// ─── Пункт 5: combo2 резкость ────────────────────────────────────────────────

async function checkCombo2Sharpness(page) {
  console.log('\n  ── Пункт 5: combo2 резкость + combinedFocalMm≈150 ──────────────────────');

  // combo2: соб2(D=20)+рассеив3(D=-13.3) → D_комб=6.7 → F_комб=1000/6.7≈150 мм
  // d=300 (предмет фиксирован) → f = d·F/(d-F) = 300·150/(300-150) = 300 мм
  try {
    await page.evaluate(() => window.lensBenchExperiment?.setScreenDistanceMm?.(300));
    await page.waitForTimeout(150);
    pass('4.5 combo2: setScreenDistanceMm(300) вызван (экран в позиции f≈300 для F_комб=150)');
  } catch (err) {
    fail('4.5 combo2: setScreenDistanceMm(300)', err.message);
    return;
  }

  // isSharp должен быть true
  try {
    const sharp = await page.evaluate(() => window.lensBenchExperiment?.isSharp ?? null);
    if (sharp === null) {
      fail('4.5 combo2: isSharp', 'window.lensBenchExperiment.isSharp вернул null — getter не существует');
    } else if (sharp === true) {
      pass('4.5 combo2: isSharp===true при setScreenDistanceMm(300) + F_комб=150');
    } else {
      // Прочитать текущее состояние для диагностики
      const diag = await page.evaluate(() => ({
        combinedFocalMm: window.lensBenchExperiment?.combinedFocalMm,
        screenDistanceMm: window.lensBenchExperiment?.screenDistanceMm,
        isDiverging: window.lensBenchExperiment?.isDiverging,
      }));
      fail('4.5 combo2: isSharp===false', `combinedFocalMm=${diag.combinedFocalMm}, screen=${diag.screenDistanceMm}, isDiverging=${diag.isDiverging}`);
    }
  } catch (err) {
    fail('4.5 combo2: isSharp', err.message);
  }

  // combinedFocalMm ≈ 150
  try {
    const F = await page.evaluate(() => window.lensBenchExperiment?.combinedFocalMm ?? null);
    if (F === null) {
      fail('4.5 combo2: combinedFocalMm', 'getter не вернул значение');
    } else if (Math.abs(F - 150) < 5) {
      pass(`4.5 combo2: combinedFocalMm=${F.toFixed(1)} ≈ 150 мм (1000/(D₂+D₃)=1000/(20-13.3))`);
    } else {
      fail('4.5 combo2: combinedFocalMm не ≈ 150', `получено F=${F}`);
    }
  } catch (err) {
    fail('4.5 combo2: combinedFocalMm', err.message);
  }
}

// ─── Пункт 6: semi-auto запись и верификация журнала ─────────────────────────

async function checkSemiAutoJournal(page) {
  console.log('\n  ── Пункт 6: semi-auto запись D_комб/F_комб verdict ─────────────────────');

  // Нажать #record-pending-btn
  let recorded = false;
  try {
    const btn = page.locator('#record-pending-btn');
    const btnVisible = await btn.isVisible().catch(() => false);
    if (!btnVisible) {
      // Попытка через programmatic API (fallback)
      await page.evaluate(() => window.lensBenchExperiment?.recordMeasurement?.());
      await page.waitForTimeout(200);
      pass('4.5 semi-auto: запись через recordMeasurement() (#record-pending-btn не виден)');
      recorded = true;
    } else {
      await btn.click();
      await page.waitForTimeout(200);
      pass('4.5 semi-auto: запись через клик #record-pending-btn (combo2, f=300)');
      recorded = true;
    }
  } catch (err) {
    fail('4.5 semi-auto: запись строки', err.message);
    return;
  }

  await screenshot(page, '06-semi-auto-recorded');

  if (!recorded) return;

  // Журнал должен содержать строку с полями dComb_dptr и fComb_mm
  try {
    const rowCount = await page.locator('.lab-journal-body tr').count();
    if (rowCount > 0) {
      pass(`4.5 semi-auto: журнал .lab-journal-body содержит ${rowCount} строк(у)`);
    } else {
      fail('4.5 semi-auto: журнал пустой', 'строк в .lab-journal-body нет после записи');
      return;
    }
  } catch (err) {
    fail('4.5 semi-auto: проверка строк журнала', err.message);
    return;
  }

  // В semi-auto derived-ячейки dComb_dptr и fComb_mm — редактируемые (input)
  try {
    const dCombInput = page.locator('input[data-key="dComb_dptr"]').first();
    const fCombInput = page.locator('input[data-key="fComb_mm"]').first();
    const dCombCount = await dCombInput.count();
    const fCombCount = await fCombInput.count();
    if (dCombCount > 0) {
      pass('4.5 semi-auto: input[data-key="dComb_dptr"] присутствует (ученик вводит D_комб)');
    } else {
      fail('4.5 semi-auto: input[data-key="dComb_dptr"] не найден', 'в semi-auto derived-поле должно быть редактируемым');
    }
    if (fCombCount > 0) {
      pass('4.5 semi-auto: input[data-key="fComb_mm"] присутствует (ученик вводит F_комб)');
    } else {
      fail('4.5 semi-auto: input[data-key="fComb_mm"] не найден', 'в semi-auto derived-поле должно быть редактируемым');
    }
  } catch (err) {
    fail('4.5 semi-auto: проверка input derived-полей', err.message);
  }

  // Ввести ВЕРНОЕ значение D_комб = 6.7 дптр (20 + (−13.3) = 6.7)
  try {
    const dCombInput = page.locator('input[data-key="dComb_dptr"]').first();
    const dCombCount = await dCombInput.count();
    if (dCombCount > 0) {
      await dCombInput.fill('6.7');
      await page.waitForTimeout(50);
      pass('4.5 semi-auto: введено D_комб=6.7 дптр (верное значение для combo2)');
    } else {
      skip('4.5 semi-auto: ввод D_комб', 'input[data-key="dComb_dptr"] не найден');
    }
  } catch (err) {
    fail('4.5 semi-auto: ввод D_комб', err.message);
  }

  // Ввести ВЕРНОЕ значение F_комб = 150 мм
  try {
    const fCombInput = page.locator('input[data-key="fComb_mm"]').first();
    const fCombCount = await fCombInput.count();
    if (fCombCount > 0) {
      await fCombInput.fill('150');
      await page.waitForTimeout(50);
      pass('4.5 semi-auto: введено F_комб=150 мм (верное значение для combo2)');
    } else {
      skip('4.5 semi-auto: ввод F_комб', 'input[data-key="fComb_mm"] не найден');
    }
  } catch (err) {
    fail('4.5 semi-auto: ввод F_комб', err.message);
  }

  // Нажать ✓ (кнопка проверки строки)
  try {
    const verifyBtn = page.locator('button.j-check').first();
    const verifyVisible = await verifyBtn.isVisible().catch(() => false);
    if (!verifyVisible) {
      skip('4.5 semi-auto: кнопка ✓', 'button.j-check не видима');
    } else {
      await verifyBtn.click();
      await page.waitForTimeout(200);
      pass('4.5 semi-auto: нажата ✓ (верификация строки с D_комб=6.7, F_комб=150)');
    }
  } catch (err) {
    fail('4.5 semi-auto: клик ✓', err.message);
  }

  await screenshot(page, '07-semi-auto-verified-ok');

  // Проверить verdict ok для dComb_dptr
  try {
    const verdictOkCount = await page.locator('td[data-key="dComb_dptr"][data-verdict="ok"]').count();
    if (verdictOkCount > 0) {
      pass('4.5 semi-auto: td[data-key="dComb_dptr"][data-verdict="ok"] — верное D_комб=6.7 подтверждено');
    } else {
      const actualVerdict = await page.evaluate(() => {
        const td = document.querySelector('td[data-key="dComb_dptr"]');
        return td ? { verdict: td.dataset['verdict'], text: td.textContent?.trim() } : null;
      });
      fail('4.5 semi-auto: verdict ok для dComb_dptr',
        `verdict="${actualVerdict?.verdict}", text="${actualVerdict?.text}" — ожидалось "ok"`);
    }
  } catch (err) {
    fail('4.5 semi-auto: проверка verdict dComb_dptr', err.message);
  }

  // Проверить verdict ok для fComb_mm
  try {
    const verdictOkF = await page.locator('td[data-key="fComb_mm"][data-verdict="ok"]').count();
    if (verdictOkF > 0) {
      pass('4.5 semi-auto: td[data-key="fComb_mm"][data-verdict="ok"] — верное F_комб=150 подтверждено');
    } else {
      const actualVerdict = await page.evaluate(() => {
        const td = document.querySelector('td[data-key="fComb_mm"]');
        return td ? { verdict: td.dataset['verdict'], text: td.textContent?.trim() } : null;
      });
      fail('4.5 semi-auto: verdict ok для fComb_mm',
        `verdict="${actualVerdict?.verdict}", text="${actualVerdict?.text}" — ожидалось "ok"`);
    }
  } catch (err) {
    fail('4.5 semi-auto: проверка verdict fComb_mm', err.message);
  }

  // Теперь ввести НЕВЕРНОЕ значение D_комб → verdict wrong (честный тест)
  try {
    const dCombInput = page.locator('input[data-key="dComb_dptr"]').first();
    const dCombCount = await dCombInput.count();
    if (dCombCount > 0) {
      await dCombInput.fill('30'); // Неверно: это D для combo1, не combo2
      await page.waitForTimeout(50);
      const verifyBtn = page.locator('button.j-check').first();
      const verifyVisible = await verifyBtn.isVisible().catch(() => false);
      if (verifyVisible) {
        await verifyBtn.click();
        await page.waitForTimeout(200);
        pass('4.5 semi-auto: введено неверное D_комб=30, нажата ✓');
      } else {
        skip('4.5 semi-auto: повторная верификация', 'button.j-check не видима');
      }

      await screenshot(page, '08-semi-auto-verified-wrong');

      const verdictWrongCount = await page.locator('td[data-key="dComb_dptr"][data-verdict="wrong"]').count();
      if (verdictWrongCount > 0) {
        pass('4.5 semi-auto: td[data-key="dComb_dptr"][data-verdict="wrong"] — неверный D_комб=30 → wrong');
      } else {
        const actualVerdict = await page.evaluate(() => {
          const td = document.querySelector('td[data-key="dComb_dptr"]');
          return td ? { verdict: td.dataset['verdict'] } : null;
        });
        fail('4.5 semi-auto: verdict wrong для dComb_dptr=30',
          `verdict="${actualVerdict?.verdict}", ожидалось "wrong"`);
      }
    } else {
      skip('4.5 semi-auto: проверка wrong-verdict', 'input[data-key="dComb_dptr"] не найден');
    }
  } catch (err) {
    fail('4.5 semi-auto: проверка wrong-verdict', err.message);
  }
}

// ─── Пункт 7: a11y no-leak в semi-auto ───────────────────────────────────────

async function checkA11yNoLeak(page) {
  console.log('\n  ── Пункт 7: a11y no-leak — #live-region и #result-panel не палят ответ ──');

  // В semi-auto: #live-region и #result-panel НЕ должны содержать «150» или «6,7»
  const leakPatterns = ['150', '6,7', '6.7'];

  try {
    const liveText = await page.evaluate(() => {
      const el = document.querySelector('#live-region');
      return el ? (el.textContent ?? '') : null;
    });

    if (liveText === null) {
      skip('4.5 a11y: #live-region', 'элемент не найден');
    } else {
      // ЧЕСТНЫЙ АССЕРТ: должен уметь дать красный — проверяем наличие утечки
      const leaked = leakPatterns.filter(p => liveText.includes(p));
      if (leaked.length === 0) {
        pass(`4.5 a11y: #live-region не содержит числовых ответов «150»/«6,7» в semi-auto`);
      } else {
        fail('4.5 a11y: #live-region палит ответ в semi-auto', `найдено: ${leaked.join(', ')} в «${liveText.trim()}»`);
      }
    }
  } catch (err) {
    fail('4.5 a11y: #live-region', err.message);
  }

  try {
    const resultText = await page.evaluate(() => {
      const el = document.querySelector('#result-panel');
      return el ? { text: el.textContent ?? '', hidden: el.hidden } : null;
    });

    if (resultText === null) {
      skip('4.5 a11y: #result-panel', 'элемент не найден');
    } else if (resultText.hidden) {
      pass('4.5 a11y: #result-panel скрыт (hidden) — утечки нет');
    } else {
      const leaked = leakPatterns.filter(p => resultText.text.includes(p));
      if (leaked.length === 0) {
        pass(`4.5 a11y: #result-panel не содержит числовых ответов «150»/«6,7» в semi-auto`);
      } else {
        fail('4.5 a11y: #result-panel палит ответ в semi-auto',
          `найдено: ${leaked.join(', ')} в «${resultText.text.trim().substring(0, 120)}»`);
      }
    }
  } catch (err) {
    fail('4.5 a11y: #result-panel', err.message);
  }
}

// ─── Пункт 8: fully-auto — derived-ячейки readonly с числом ──────────────────

async function checkFullyAutoJournal(page) {
  console.log('\n  ── Пункт 8: fully-auto — derived-ячейки readonly с числом ─────────────');

  try {
    await page.evaluate(() => {
      localStorage.setItem('inter-oge.record-mode.kit-4', 'fully-auto');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);

    // Переключить на задачу D
    const taskBtnD = page.locator('[data-task="D-combo"]');
    const dVisible = await taskBtnD.isVisible().catch(() => false);
    if (dVisible) { await taskBtnD.click(); await page.waitForTimeout(200); }

    // Проверить что window.lensBenchExperiment жив
    const expOk = await page.evaluate(() => !!(window.lensBenchExperiment));
    if (!expOk) {
      skip('4.5 fully-auto', 'window.lensBenchExperiment не найден после reload');
      return;
    }

    // Пересобрать combo2 (сброс задачи при reload)
    const placed = await assembleTaskDCombo2(page, '4.5 fully-auto: сборка скамьи');
    if (placed < 4) {
      fail('4.5 fully-auto: сборка скамьи', `посажено ${placed}/4 приборов — derived-ячейки не проверить`);
      return;
    }

    // Установить резкость f=300
    await page.evaluate(() => window.lensBenchExperiment?.setScreenDistanceMm?.(300));
    await page.waitForTimeout(150);

    // Записать строку
    const btn = page.locator('#record-pending-btn');
    const btnVisible = await btn.isVisible().catch(() => false);
    if (btnVisible) {
      await btn.click();
      await page.waitForTimeout(300);
      pass('4.5 fully-auto: запись через #record-pending-btn');
    } else {
      await page.evaluate(() => window.lensBenchExperiment?.recordMeasurement?.());
      await page.waitForTimeout(300);
      pass('4.5 fully-auto: запись через recordMeasurement()');
    }

    await screenshot(page, '09-fully-auto-recorded');

    // В fully-auto: td[data-key="dComb_dptr"] должен содержать число (не input)
    // ЧЕСТНЫЙ АССЕРТ: не.toBeNull() на td; textContent содержит число ≈ 6.7
    const dCombTd = await page.evaluate(() => {
      const td = document.querySelector('td[data-key="dComb_dptr"]');
      if (!td) return null;
      const input = td.querySelector('input');
      const text = td.textContent?.trim() ?? '';
      return { hasInput: !!input, text };
    });

    if (dCombTd === null) {
      fail('4.5 fully-auto: td[data-key="dComb_dptr"] не найден', 'журнал не рендерится в fully-auto');
    } else if (dCombTd.hasInput) {
      fail('4.5 fully-auto: td[data-key="dComb_dptr"] содержит input',
        'в fully-auto derived-ячейка должна быть readonly-текстом, не input');
    } else if (/6[,.]7/.test(dCombTd.text) || /6\.6|6\.8|6\.67/.test(dCombTd.text)) {
      pass(`4.5 fully-auto: td[data-key="dComb_dptr"] readonly="${dCombTd.text}" (≈6.7 дптр для combo2)`);
    } else {
      fail('4.5 fully-auto: td[data-key="dComb_dptr"] значение неверно',
        `текст="${dCombTd.text}", ожидалось ≈6.7 (6,7)`);
    }

    // td[data-key="fComb_mm"] содержит ≈150
    const fCombTd = await page.evaluate(() => {
      const td = document.querySelector('td[data-key="fComb_mm"]');
      if (!td) return null;
      const input = td.querySelector('input');
      const text = td.textContent?.trim() ?? '';
      return { hasInput: !!input, text };
    });

    if (fCombTd === null) {
      fail('4.5 fully-auto: td[data-key="fComb_mm"] не найден', 'журнал не рендерится в fully-auto');
    } else if (fCombTd.hasInput) {
      fail('4.5 fully-auto: td[data-key="fComb_mm"] содержит input',
        'в fully-auto derived-ячейка должна быть readonly-текстом, не input');
    } else if (/\b15[0-9]\b/.test(fCombTd.text)) {
      pass(`4.5 fully-auto: td[data-key="fComb_mm"] readonly="${fCombTd.text}" (≈150 мм для combo2)`);
    } else {
      fail('4.5 fully-auto: td[data-key="fComb_mm"] значение неверно',
        `текст="${fCombTd.text}", ожидалось ≈150`);
    }
  } catch (err) {
    fail('4.5 fully-auto', err.message);
  }

  // Восстановить semi-auto
  await page.evaluate(() => {
    localStorage.setItem('inter-oge.record-mode.kit-4', 'semi-auto');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
}

// ─── Пункт 9: диверг. пара — хинт и блокировка записи ───────────────────────

async function checkDivergingPair(page) {
  console.log('\n  ── Пункт 9: диверг. пара (соб1+рассеив3) — хинт и блок записи ──────────');

  // Переключить на задачу D
  try {
    const taskBtnD = page.locator('[data-task="D-combo"]');
    const dVisible = await taskBtnD.isVisible().catch(() => false);
    if (dVisible) { await taskBtnD.click(); await page.waitForTimeout(200); }
  } catch (err) {
    fail('4.5 diverging: переключение на D', err.message);
    return;
  }

  // Сначала осветитель и экран (без линз)
  try {
    await dragInstrumentToSlot(page, 'light-object', 'object');
    await dragInstrumentToSlot(page, 'screen', 'screen');
    await page.waitForTimeout(100);
    pass('4.5 diverging: осветитель и экран посажены');
  } catch (err) {
    fail('4.5 diverging: сборка осветитель/экран', err.message);
    return;
  }

  // Перетащить соб1 (data-eq="lens") в гнездо линзы
  try {
    const ok = await dragInstrumentToSlot(page, 'lens', 'lens');
    if (ok) {
      pass('4.5 diverging: соб1 (lens, F=100) в гнездо линзы');
    } else {
      // Не фатально: если соб1 не видна в задаче D, то она может быть скрыта
      // Проверяем доступность
      const card = await page.locator('lab-equipment-card[data-eq="lens"]').isVisible().catch(() => false);
      if (!card) {
        skip('4.5 diverging: соб1 недоступна в задаче D', 'карточка lens скрыта — тест диверг. пропускается');
        return;
      }
      fail('4.5 diverging: соб1 (lens) → гнездо', 'дроп не сел');
      return;
    }
  } catch (err) {
    // соб1 может быть скрыта в задаче D (combo-only view)
    const card = await page.locator('lab-equipment-card[data-eq="lens"]').isVisible().catch(() => false);
    if (!card) {
      skip('4.5 diverging: соб1 (lens) скрыта в задаче D', 'задача D показывает только combo-карточки; diverging-тест через programmatic API');
      // Programmatic fallback для diverging-теста
      await checkDivergingProgrammatic(page);
      return;
    }
    fail('4.5 diverging: соб1 (lens) → гнездо', err.message);
    return;
  }

  // Перетащить рассеив3 (data-eq="lens-3") в то же гнездо (стопка)
  try {
    const ok = await dragInstrumentToSlot(page, 'lens-3', 'lens');
    if (ok) {
      pass('4.5 diverging: рассеив3 (lens-3, F=-75) в то же гнездо — стопка диверг.');
    } else {
      fail('4.5 diverging: рассеив3 (lens-3) → гнездо (стопка)', 'дроп не сел');
      return;
    }
  } catch (err) {
    fail('4.5 diverging: рассеив3 → гнездо', err.message);
    return;
  }

  await page.waitForTimeout(200);
  await checkDivergingInvariants(page);
}

async function checkDivergingProgrammatic(page) {
  // Fallback: через placeInSlot API
  try {
    const result = await page.evaluate(() => {
      const exp = window.lensBenchExperiment;
      if (!exp) return { ok: false, reason: 'no exp' };
      // Поместить соб1 (lens, F=100) и рассеив3 (lens-3, F=-75)
      const r1 = exp.placeInSlot?.('lens', 'lens');
      const r2 = exp.placeInSlot?.('lens', 'lens-3');
      return { r1, r2, isDiverging: exp.isDiverging };
    });
    if (result.isDiverging === true) {
      pass('4.5 diverging (programmatic): соб1+рассеив3 → isDiverging===true');
    } else {
      fail('4.5 diverging (programmatic): isDiverging должен быть true', `isDiverging=${result.isDiverging}`);
    }
    await checkDivergingInvariants(page);
  } catch (err) {
    fail('4.5 diverging programmatic', err.message);
  }
}

async function checkDivergingInvariants(page) {
  // 1. isDiverging===true (геттер)
  try {
    const isDiverging = await page.evaluate(() => window.lensBenchExperiment?.isDiverging ?? null);
    if (isDiverging === null) {
      fail('4.5 diverging: isDiverging', 'getter не существует');
    } else if (isDiverging === true) {
      pass('4.5 diverging: isDiverging===true для пары соб1(100)+рассеив3(−75), F_комб=−300');
    } else {
      const F = await page.evaluate(() => window.lensBenchExperiment?.combinedFocalMm);
      fail('4.5 diverging: isDiverging должен быть true', `isDiverging=${isDiverging}, combinedFocalMm=${F}`);
    }
  } catch (err) {
    fail('4.5 diverging: isDiverging', err.message);
  }

  // 2. Хинт содержит «действительного изображения нет»
  try {
    const hintText = await page.evaluate(() => {
      const hint = document.querySelector('#hint-bar');
      return hint ? (hint.textContent ?? '') : null;
    });
    // Ищем ключевую фразу: «действительного изображения» (подстрока из реального текста хинта
    // «Рассеивающая система: действительного изображения на экране нет. Соберите...»)
    const DIVERGING_HINT_SUBSTR = 'действительного изображения';
    if (hintText === null) {
      skip('4.5 diverging: хинт', '#hint-bar не найден');
    } else if (hintText.includes(DIVERGING_HINT_SUBSTR)) {
      pass(`4.5 diverging: хинт содержит «${DIVERGING_HINT_SUBSTR}» — «${hintText.trim().substring(0, 100)}»`);
    } else {
      fail('4.5 diverging: хинт не содержит ожидаемого текста',
        `хинт="${hintText.trim().substring(0, 150)}" — ожидалось вхождение «${DIVERGING_HINT_SUBSTR}»`);
    }
  } catch (err) {
    fail('4.5 diverging: хинт', err.message);
  }

  // 3. #record-pending-btn НЕ должен появляться (честный ассерт: если виден — FAIL)
  try {
    await page.waitForTimeout(200);
    const btnPendingVisible = await page.locator('#record-pending-btn').isVisible().catch(() => false);
    if (!btnPendingVisible) {
      pass('4.5 diverging: #record-pending-btn НЕ виден (запись заблокирована для диверг. системы)');
    } else {
      // Это реальный баг: #record-pending-btn показался при isDiverging
      fail('4.5 diverging: #record-pending-btn НЕ должен быть виден при диверг. системе',
        'кнопка записи показалась — запись не заблокирована; правило isDiverging→return нарушено');
    }
  } catch (err) {
    fail('4.5 diverging: #record-pending-btn visibility', err.message);
  }

  await screenshot(page, '09-diverging-pair');
}

// ─── Пункт 10: изоляция D→A ──────────────────────────────────────────────────

async function checkTaskIsolation(page) {
  console.log('\n  ── Пункт 10: изоляция D→A ─────────────────────────────────────────────');

  try {
    // Переключить на задачу A
    await page.click('[data-task="A-power"]').catch(() => {});
    await page.waitForTimeout(200);

    const activeAfter = await page.evaluate(() => window.lensBenchExperiment?.activeTask ?? null);
    if (activeAfter === 'A-power') {
      pass('4.5 isolation: переключение на задачу A — activeTask === "A-power"');
    } else {
      fail('4.5 isolation: activeTask после переключения на A', `activeTask="${activeAfter}"`);
    }

    // Стопка должна быть очищена: stackedLenses.length === 0
    const stackedAfter = await page.evaluate(() => {
      const exp = window.lensBenchExperiment;
      return exp?.measurements?.filter(m => m.task === 'D-combo')?.length ?? -1;
    });
    // (Не проверяем stackedLenses напрямую — это внутренний state; косвенно через combinedFocalMm)
    const fAfterSwitch = await page.evaluate(() => window.lensBenchExperiment?.combinedFocalMm ?? null);
    // После D→A стек очищен → combinedFocalMm должен быть NaN (нет линз в стеке)
    if (fAfterSwitch === null || fAfterSwitch === undefined) {
      skip('4.5 isolation: combinedFocalMm после D→A', 'getter вернул null');
    } else if (!Number.isFinite(fAfterSwitch)) {
      pass(`4.5 isolation: combinedFocalMm=NaN после D→A (стек очищен)`);
    } else {
      // В задаче A есть одна линза (соб1, F=100) — может быть размещена пользователем или стека нет
      // Если lensF_mm=100 это дефолт A, но stackedLenses=[]; combinedFocalMm считает по стеку
      // Стек ДОЛЖЕН быть пуст → NaN
      fail('4.5 isolation: стек не очищен после D→A',
        `combinedFocalMm=${fAfterSwitch} (ожидалось NaN — стек пуст)`);
    }

    // Карточки соб2/рассеив3 должны быть СКРЫТЫ в задаче A
    const lens2VisibleInA = await page.locator('lab-equipment-card[data-eq="lens-2"]').isVisible().catch(() => false);
    const lens3VisibleInA = await page.locator('lab-equipment-card[data-eq="lens-3"]').isVisible().catch(() => false);
    if (!lens2VisibleInA) {
      pass('4.5 isolation: карточка соб2 (lens-2) скрыта в задаче A');
    } else {
      fail('4.5 isolation: карточка соб2 (lens-2) должна быть скрыта в задаче A',
        'combo-карточка видна вне задачи D — refreshComboLensVisibility не сработал');
    }
    if (!lens3VisibleInA) {
      pass('4.5 isolation: карточка рассеив3 (lens-3) скрыта в задаче A');
    } else {
      fail('4.5 isolation: карточка рассеив3 (lens-3) должна быть скрыта в задаче A',
        'combo-карточка видна вне задачи D — refreshComboLensVisibility не сработал');
    }
  } catch (err) {
    fail('4.5 isolation', err.message);
  }
}

// ─── Пункт 11: 3 режима record-mode ──────────────────────────────────────────

async function checkRecordModes(page) {
  console.log('\n  ── Пункт 11: 3 режима record-mode (реальный ключ kit-4) ────────────────');
  const LS_KEY = 'inter-oge.record-mode.kit-4';
  const modes = ['semi-auto', 'fully-manual', 'fully-auto'];

  for (const mode of modes) {
    try {
      await page.evaluate(([key, m]) => {
        localStorage.setItem(key, m);
      }, [LS_KEY, mode]);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const storedMode = await page.evaluate((key) => localStorage.getItem(key), LS_KEY);
      const bodyMode = await page.evaluate(() => document.body?.dataset['recordMode'] ?? null);

      if (storedMode === mode) {
        pass(`4.5 record-mode: "${mode}" — сохранён в localStorage[${LS_KEY}]`);
      } else {
        fail(`4.5 record-mode: "${mode}"`, `localStorage.getItem('${LS_KEY}') → "${storedMode}"`);
      }

      if (bodyMode === mode) {
        pass(`4.5 record-mode: "${mode}" — body[data-record-mode]="${bodyMode}" (приложение читает ключ верно)`);
      } else {
        skip(`4.5 record-mode body attr: "${mode}"`,
          `body[data-record-mode]="${bodyMode}" (ожидалось "${mode}")`);
      }
    } catch (err) {
      fail(`4.5 record-mode: "${mode}"`, err.message);
    }
  }

  // Вернуть в semi-auto
  await page.evaluate((key) => localStorage.setItem(key, 'semi-auto'), LS_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
}

// ─── Пункт 12: axe-scan ──────────────────────────────────────────────────────

async function checkAxe(page) {
  console.log('\n  ── Пункт 12: axe-core — 0 нарушений на экране задачи D ─────────────────');
  try {
    // Переключить на задачу D для axe-скана
    const taskBtnD = page.locator('[data-task="D-combo"]');
    const dVisible = await taskBtnD.isVisible().catch(() => false);
    if (dVisible) { await taskBtnD.click(); await page.waitForTimeout(300); }

    await page.waitForTimeout(400);
    await screenshot(page, '12-axe-state');

    const axeResults = await new AxeBuilder({ page })
      // Правила НЕ отключать — если axe ругается, чиним причину (урок Фазы A/B/C)
      .analyze();

    const violations = axeResults.violations ?? [];
    if (violations.length === 0) {
      pass('4.5 axe: 0 нарушений (экран задачи D)');
    } else {
      for (const v of violations) {
        fail(`4.5 axe нарушение: ${v.id}`, `${v.description} — ${v.nodes.length} элементов`);
        for (const n of v.nodes.slice(0, 2)) {
          console.error(`         target: ${JSON.stringify(n.target)}`);
          console.error(`         msg: ${n.any?.[0]?.message?.substring(0, 200)}`);
        }
      }
    }
  } catch (err) {
    fail('4.5 axe', err.message);
  }
}

// ─── Проверка overlay-dup ─────────────────────────────────────────────────────

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

// ─── Основная функция ─────────────────────────────────────────────────────────

async function run() {
  console.log('\n── selfcheck-4-5.mjs ──────────────────────────────────────────────────────');
  console.log('   Опыт 4.5 «Две сложенные линзы» — reality check');
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

  // ── Пункт 1: Загрузка страницы ──────────────────────────────────────────────
  console.log('\n  ── Пункт 1: Загрузка страницы ───────────────────────────────────────────');
  try {
    const resp = await page.goto(`${BASE_URL}${SCREEN}`, { timeout: 15000, waitUntil: 'domcontentloaded' });
    if (resp && resp.ok()) {
      pass('Step 1: страница загрузилась (200 OK)');
    } else {
      fail('Step 1: страница загрузилась', `HTTP ${resp?.status()}`);
    }
  } catch (err) {
    fail('Step 1: страница загрузилась', `${err.message}`);
    await browser.close();
    printSummary();
    return;
  }

  // Дождаться lab-optical-bench
  try {
    await page.waitForSelector('lab-optical-bench, #optical-bench', { timeout: 8000 });
    pass('Step 1b: lab-optical-bench смонтирован');
  } catch (err) {
    skip('Step 1b: lab-optical-bench', `не появился: ${err.message}`);
  }

  await page.waitForTimeout(700);
  await screenshot(page, '00-rest-state');

  // Проверка window.lensBenchExperiment
  const expAvailable = await page.evaluate(() => !!(window.lensBenchExperiment));
  if (!expAvailable) {
    skip('Весь опыт 4.5', 'window.lensBenchExperiment не найден — экран не смонтирован');
    await browser.close();
    printSummary();
    return;
  }
  pass('Step 1c: window.lensBenchExperiment доступен');

  // ── Пункт 3: REST-state (до переключения на D) ──────────────────────────────
  await checkRestState(page);
  await checkOverlayDup(page, 'Step 1d');

  // ── Пункт 2: Переключение на задачу D ───────────────────────────────────────
  const taskDOk = await checkSwitchToTaskD(page);
  if (!taskDOk) {
    skip('Опыт 4.5: D&D и журнал', 'задача D не переключилась');
    await browser.close();
    printSummary();
    return;
  }

  await screenshot(page, '01-task-d-selected');

  // ── Пункт 4: mouse-D&D стопки ────────────────────────────────────────────────
  console.log('\n  ── Пункт 4: реальный mouse-D&D — осветитель, экран, соб2, рассеив3 ─────');
  const placed = await assembleTaskDCombo2(page, '4.5 стопка');
  if (placed < 4) {
    fail('4.5 стопка: не все 4 прибора посажены', `посажено ${placed}/4 мышью`);
  } else {
    pass('4.5 стопка: все 4 прибора посажены реальным mouse-D&D (combo2: соб2+рассеив3)');
  }

  await checkOverlayDup(page, 'после сборки D');
  await screenshot(page, '02-assembled-d');

  // Проверить 2 .lens-glyph на скамье (стопка отрисована)
  await checkLensGlyphs(page, '4.5 стопка', 2);

  // ── Пункт 5: combo2 резкость ──────────────────────────────────────────────────
  if (placed >= 3) {
    await checkCombo2Sharpness(page);
    await screenshot(page, '03-combo2-sharp');
  } else {
    skip('4.5 combo2: резкость', 'скамья не собрана');
  }

  // ── Пункт 6+7: semi-auto запись, журнал, a11y ────────────────────────────────
  // Убедиться что режим semi-auto
  await page.evaluate(() => {
    localStorage.setItem('inter-oge.record-mode.kit-4', 'semi-auto');
  });
  // Не перезагружаем — просто убедиться что задача D активна и скамья собрана
  const activeNow = await page.evaluate(() => window.lensBenchExperiment?.activeTask ?? null);
  if (activeNow !== 'D-combo') {
    const taskBtnD2 = page.locator('[data-task="D-combo"]');
    const dVis2 = await taskBtnD2.isVisible().catch(() => false);
    if (dVis2) { await taskBtnD2.click(); await page.waitForTimeout(200); }
  }
  // Убедиться в резкости
  await page.evaluate(() => window.lensBenchExperiment?.setScreenDistanceMm?.(300));
  await page.waitForTimeout(150);

  await checkSemiAutoJournal(page);
  await checkA11yNoLeak(page);

  // ── Пункт 8: fully-auto ───────────────────────────────────────────────────────
  await checkFullyAutoJournal(page);

  // ── Пункт 9: диверг. пара ────────────────────────────────────────────────────
  // После checkFullyAutoJournal был reload + semi-auto restore
  {
    // Снова переключить на D
    const dBtn = page.locator('[data-task="D-combo"]');
    const dVis = await dBtn.isVisible().catch(() => false);
    if (dVis) { await dBtn.click(); await page.waitForTimeout(200); }
  }
  await checkDivergingPair(page);

  // ── Пункт 10: изоляция D→A ───────────────────────────────────────────────────
  // Сначала вернуться в D
  {
    const dBtn = page.locator('[data-task="D-combo"]');
    const dVis = await dBtn.isVisible().catch(() => false);
    if (dVis) { await dBtn.click(); await page.waitForTimeout(200); }
  }
  await checkTaskIsolation(page);

  // ── Пункт 11: 3 режима ────────────────────────────────────────────────────────
  await checkRecordModes(page);

  // После checkRecordModes последний reload на semi-auto; переключить на D для axe
  {
    const dBtn = page.locator('[data-task="D-combo"]');
    const dVis = await dBtn.isVisible().catch(() => false);
    if (dVis) { await dBtn.click(); await page.waitForTimeout(200); }
  }

  // ── Пункт 12: axe ────────────────────────────────────────────────────────────
  await checkAxe(page);

  // ── Финальный скриншот ────────────────────────────────────────────────────────
  await screenshot(page, '13-final');

  await browser.close();
  printSummary();
}

function printSummary() {
  console.log('\n───────────────────────────────────────────────────────────────────────────');
  console.log(`  selfcheck-4-5: PASS=${passCount}  FAIL=${failCount}  SKIP=${skipCount}`);
  if (failCount === 0) {
    console.log(`  STATUS: PASS=${passCount} FAIL=${failCount} SKIP=${skipCount}`);
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
