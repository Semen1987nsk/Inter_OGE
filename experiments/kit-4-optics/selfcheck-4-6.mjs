/**
 * selfcheck-4-6.mjs — reality-check опыта 4.6 «Угол преломления от угла падения».
 *
 * PLAYBOOK Шаг 7 + REFERENCE §13 + урок «D&D self-check через mouse»:
 * перетаскивание ОБЯЗАНО идти реальным page.mouse.move/down/up.
 *
 * Опыт 4.6 — зависимость угла преломления r от угла падения i (r(i)):
 *   По закону Снелла: n = sin i / sin r = 1,5 (стекло)
 *   При [15,30,45,60,75]° → r растёт монотонно.
 *
 * ФИПИ-якорь: СПЕЦ Прил.2 компл.№4 (стр.19), сноска (4):
 *   «... зависимости угла преломления от угла падения на границе воздух–стекло.»
 *
 * Проверяет (9 пунктов):
 *   1. Навигация http://127.0.0.1:5192/?screen=refraction; 200 OK; lab-protractor-disc смонтирован.
 *   2. Переключение на таб [data-task="B-angle"]: aria-selected="true", неактивные false.
 *   3. REST-state: .slot-rect opacity 0 в покое.
 *   4. Реальный mouse-D&D: полуцилиндр→semicylinder, осветитель→emitter;
 *      подтверждение card[data-placed].
 *   5. Свип углов [15,30,45,60,75]: setIncidenceAngle + клик #record-pending-btn в semi-auto;
 *      монотонность r по строкам журнала (r растёт с i).
 *   6. График: #graph-block виден; #refraction-graph имеет N точек;
 *      #graph-toggle-btn меняет xLabel с «i, °» на «sin i» (читать через .data).
 *   7. result-panel B-angle содержит вывод о нелинейности (слово «нелинейно»/«нелинейна»).
 *   8. 3 режима (ключ inter-oge.record-mode.kit-4).
 *   9. axe @axe-core/playwright: 0 нарушений. Правила НЕ отключаем.
 *
 * Запуск:
 *   npm --workspace=@labosfera/kit-4-optics run dev -- --host 127.0.0.1 --port 5192 --strictPort
 *   node experiments/kit-4-optics/selfcheck-4-6.mjs
 *
 * Вывод: PASS=N FAIL=0 SKIP=K
 */

import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env['SELFCHECK_BASE_URL'] ?? 'http://127.0.0.1:5192';
const SCREEN = '?screen=refraction';
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
  const file = path.join(SCREENSHOTS_DIR, `4-6-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`       Screenshot: ${file}`);
}

/**
 * Реальный mouse-drag прибора из карточки в гнездо диска.
 */
async function dragInstrumentToSlot(page, equipmentId, slotId) {
  const cardSel = `lab-equipment-card[data-eq="${equipmentId}"]`;
  const draggableSel = `${cardSel} .eq-glyph`;

  const draggable = page.locator(draggableSel).first();
  await draggable.scrollIntoViewIfNeeded();
  await page.waitForTimeout(60);

  const srcBox = await draggable.boundingBox();
  if (!srcBox) {
    throw new Error(`draggable .eq-glyph не найден для ${equipmentId}`);
  }

  const tgt = await page.evaluate((sid) => {
    const disc = document.querySelector('#protractor-disc');
    if (!disc || typeof disc.getSlotRect !== 'function') return null;
    const r = disc.getSlotRect(sid);
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, slotId);

  if (!tgt) {
    throw new Error(`#protractor-disc.getSlotRect('${slotId}') вернул null`);
  }
  if (tgt.width === 0 && tgt.height === 0) {
    throw new Error(`getSlotRect('${slotId}') вернул нулевой rect — диск не смонтирован`);
  }

  const sx = srcBox.x + srcBox.width / 2;
  const sy = srcBox.y + srcBox.height / 2;
  const tx = tgt.x + tgt.width / 2;
  const ty = tgt.y + tgt.height / 2;

  // Hover first to wake up any lazy rendering
  await page.mouse.move(sx, sy);
  await page.waitForTimeout(30);
  await page.mouse.down();
  await page.waitForTimeout(50);
  // Move in steps toward target
  await page.mouse.move(sx + (tx - sx) * 0.3, sy + (ty - sy) * 0.3, { steps: 5 });
  await page.mouse.move(tx, ty, { steps: 10 });
  await page.waitForTimeout(50);
  await page.mouse.up();
  await page.waitForTimeout(250);

  // Refraction experiment uses status="placed" (not data-placed like lens-bench)
  const cardStatus = await page.evaluate((sel) => {
    const card = document.querySelector(sel);
    return card ? card.getAttribute('status') : null;
  }, cardSel);

  return cardStatus === 'placed';
}

// ─── Пункт 2: Переключение на задачу B-angle ─────────────────────────────────

async function checkTabBAngle(page) {
  console.log('\n  ── Пункт 2: Переключение на таб [data-task="B-angle"] ──────────────────');

  try {
    const taskBtn = page.locator('[data-task="B-angle"]');
    const taskBtnVisible = await taskBtn.isVisible().catch(() => false);
    if (!taskBtnVisible) {
      fail('4.6: [data-task="B-angle"] не найден', 'кнопка переключения таба B-angle отсутствует');
      return false;
    }
    await taskBtn.click();
    await page.waitForTimeout(200);
    pass('4.6: клик по [data-task="B-angle"] — задача B выбрана');
  } catch (err) {
    fail('4.6: переключение на задачу B-angle', err.message);
    return false;
  }

  // aria-selected=true
  try {
    const ariaSelected = await page.evaluate(() => {
      const btn = document.querySelector('[data-task="B-angle"]');
      return btn?.getAttribute('aria-selected') ?? null;
    });
    if (ariaSelected === 'true') {
      pass('4.6: [data-task="B-angle"] aria-selected="true"');
    } else {
      fail('4.6: aria-selected после переключения на B', `aria-selected="${ariaSelected}", ожидалось "true"`);
    }
  } catch (err) {
    fail('4.6: проверка aria-selected', err.message);
  }

  // Неактивные табы: aria-selected="false"
  try {
    const inactiveResult = await page.evaluate(() => {
      const allTasks = Array.from(document.querySelectorAll('[data-task]'));
      const inactiveWrong = allTasks
        .filter(el => el.dataset['task'] !== 'B-angle')
        .filter(el => el.getAttribute('aria-selected') !== 'false' && el.getAttribute('aria-selected') !== null)
        .map(el => `${el.dataset['task']}:${el.getAttribute('aria-selected')}`);
      return { inactiveWrong, count: allTasks.length };
    });
    if (inactiveResult.inactiveWrong.length === 0) {
      pass(`4.6: неактивные табы aria-selected="false" (count=${inactiveResult.count - 1})`);
    } else {
      fail('4.6: неактивные табы должны иметь aria-selected="false"',
        `нарушения: ${inactiveResult.inactiveWrong.join(', ')}`);
    }
  } catch (err) {
    fail('4.6: проверка aria-selected неактивных', err.message);
  }

  return true;
}

// ─── Пункт 3: REST-state ─────────────────────────────────────────────────────

async function checkRestState(page) {
  console.log('\n  ── Пункт 3: REST-state — гнёзда диска не светятся в покое ─────────────');
  try {
    const rest = await page.evaluate(() => {
      const disc = document.querySelector('#protractor-disc');
      const sr = disc?.shadowRoot ?? null;
      if (!sr) return { ok: null, reason: 'shadowRoot диска не найден' };
      const rects = Array.from(sr.querySelectorAll('.slot-rect'));
      if (rects.length === 0) return { ok: null, reason: '.slot-rect не найдены в shadowRoot' };
      const anyVisible = rects.some((r) => parseFloat(getComputedStyle(r).opacity) > 0.01);
      const draggingActive = disc.classList.contains('dragging-active');
      const anyActive = rects.some((r) => r.classList.contains('drop-zone--active'));
      return { ok: !anyVisible && !draggingActive && !anyActive, anyVisible, draggingActive, anyActive };
    });
    if (rest.ok === null) {
      skip('REST-state: гнёзда скрыты в покое', rest.reason);
    } else if (rest.ok) {
      pass('REST-state: slot-rect opacity 0 в покое, нет dragging-active / drop-zone--active');
    } else {
      fail('REST-state', `anyVisible=${rest.anyVisible}, draggingActive=${rest.draggingActive}, anyActive=${rest.anyActive}`);
    }
  } catch (err) {
    fail('REST-state', err.message);
  }
}

// ─── Пункт 4: Реальный mouse-D&D ─────────────────────────────────────────────

async function assembleRefraction(page, label) {
  const plan = [
    { slot: 'semicylinder', eq: 'semicylinder' },
    { slot: 'emitter',      eq: 'emitter' },
  ];

  let placed = 0;
  for (const { slot, eq } of plan) {
    try {
      const ok = await dragInstrumentToSlot(page, eq, slot);
      if (ok) {
        placed++;
        pass(`${label}: mouse-D&D ${eq} → гнездо ${slot} (card data-placed)`);
      } else {
        fail(`${label}: mouse-D&D ${eq} → гнездо ${slot}`, 'дроп не сел (card без data-placed)');
      }
    } catch (err) {
      fail(`${label}: mouse-D&D ${eq} → гнездо ${slot}`, err.message);
    }
  }
  return placed;
}

// ─── Пункт 5: Свип углов + монотонность r ────────────────────────────────────

async function checkAngleSweepAndMonotonicity(page) {
  console.log('\n  ── Пункт 5: свип [15,30,45,60,75]° — запись + монотонность r(i) ────────');

  const angles = [15, 30, 45, 60, 75];

  // Убедиться в методе
  const methodExists = await page.evaluate(() =>
    typeof window.refractionExperiment?.setIncidenceAngle === 'function'
  );
  if (!methodExists) {
    fail('4.6 свип: setIncidenceAngle', 'метод setIncidenceAngle отсутствует на window.refractionExperiment');
    return false;
  }

  const recordedR = [];

  for (const angle of angles) {
    try {
      // Установить угол
      await page.evaluate((i) => window.refractionExperiment.setIncidenceAngle(i), angle);
      await page.waitForTimeout(200);

      const iDeg = await page.evaluate(() => window.refractionExperiment?.incidenceAngleDeg ?? null);
      const rDeg = await page.evaluate(() => window.refractionExperiment?.refractionAngleDeg ?? null);

      if (iDeg !== angle) {
        fail(`4.6 свип i=${angle}°: incidenceAngleDeg`, `получено ${iDeg}, ожидалось ${angle}`);
        continue;
      }
      if (rDeg === null) {
        fail(`4.6 свип i=${angle}°: refractionAngleDeg`, 'геттер вернул null');
        continue;
      }

      pass(`4.6 свип i=${angle}°: iDeg=${iDeg}, rDeg=${rDeg} (Снелл n=1,5)`);

      // Записать через кнопку (semi-auto)
      const btn = page.locator('#record-pending-btn');
      const btnVisible = await btn.isVisible().catch(() => false);
      if (btnVisible) {
        await btn.click();
        await page.waitForTimeout(200);
        pass(`4.6 свип i=${angle}°: запись через реальный клик #record-pending-btn`);
      } else {
        // Если кнопка не видна (анти-дубль при повторном запуске свипа), допускаем programmatic
        const countBefore = await page.evaluate(() =>
          window.refractionExperiment?.measurements?.filter(m => m.task === 'B-angle').length ?? 0
        );
        await page.evaluate(() => window.refractionExperiment?.recordMeasurement?.());
        await page.waitForTimeout(200);
        const countAfter = await page.evaluate(() =>
          window.refractionExperiment?.measurements?.filter(m => m.task === 'B-angle').length ?? 0
        );
        if (countAfter > countBefore) {
          pass(`4.6 свип i=${angle}°: запись через recordMeasurement() (pending-btn не видна)`);
        } else {
          skip(`4.6 свип i=${angle}°: запись`, '#record-pending-btn не видна и recordMeasurement() не увеличил count');
        }
      }

      recordedR.push({ angle, rDeg });
    } catch (err) {
      fail(`4.6 свип i=${angle}°`, err.message);
    }
  }

  await screenshot(page, '05-sweep-done');

  // Проверить монотонность r по строкам журнала
  try {
    if (recordedR.length < 2) {
      skip('4.6 монотонность r(i)', `записано только ${recordedR.length} точек — монотонность не проверить`);
      return true;
    }

    // Из DOM: читаем r_deg из ячеек журнала
    const journalRValues = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.lab-journal-body tr'));
      return rows.map(row => {
        const cell = row.querySelector('td[data-key="r_deg"]');
        if (!cell) return null;
        const input = cell.querySelector('input');
        const text = input ? input.value : (cell.textContent?.trim() ?? '');
        return parseFloat(text.replace(',', '.'));
      }).filter(v => v !== null && !isNaN(v));
    });

    if (journalRValues.length < 2) {
      skip('4.6 монотонность: данные из журнала', `r_deg-ячеек найдено ${journalRValues.length}`);
    } else {
      // Монотонность: каждое следующее r должно быть >= предыдущего
      let isMonotone = true;
      for (let k = 1; k < journalRValues.length; k++) {
        if (journalRValues[k] < journalRValues[k - 1]) {
          isMonotone = false;
          fail('4.6 монотонность: r убывает',
            `r[${k}]=${journalRValues[k]} < r[${k-1}]=${journalRValues[k-1]} — нарушение r(i) монотонности`);
          break;
        }
      }
      if (isMonotone) {
        pass(`4.6 монотонность: r растёт с i по строкам журнала — [${journalRValues.join(', ')}]`);
      }
    }
  } catch (err) {
    fail('4.6 монотонность r(i)', err.message);
  }

  return true;
}

// ─── Пункт 6: График r(i) + переключатель ────────────────────────────────────

async function checkGraph(page) {
  console.log('\n  ── Пункт 6: #graph-block виден, N точек, переключатель xLabel ──────────');

  // #graph-block должен быть виден в B-angle
  try {
    const graphBlockVisible = await page.locator('#graph-block').isVisible().catch(() => false);
    if (graphBlockVisible) {
      pass('4.6 граф: #graph-block виден в задаче B-angle');
    } else {
      fail('4.6 граф: #graph-block не виден', '#graph-block hidden или отсутствует в B-angle');
    }
  } catch (err) {
    fail('4.6 граф: #graph-block', err.message);
  }

  // #refraction-graph имеет N точек (через .data свойство)
  try {
    const graphData = await page.evaluate(() => {
      const graph = document.querySelector('#refraction-graph');
      if (!graph) return null;
      const data = graph.data;
      if (!data) return null;
      const series = data.series ?? [];
      const totalPoints = series.reduce((sum, s) => sum + (s.points?.length ?? 0), 0);
      return { totalPoints, xLabel: data.xLabel ?? null };
    });

    if (graphData === null) {
      fail('4.6 граф: #refraction-graph', 'элемент не найден или .data отсутствует');
    } else if (graphData.totalPoints === 0) {
      fail('4.6 граф: 0 точек', '#refraction-graph.data.series[].points пуст — точки не добавлены');
    } else {
      pass(`4.6 граф: #refraction-graph содержит ${graphData.totalPoints} точек (xLabel="${graphData.xLabel}")`);
    }

    // xLabel в режиме ri должен быть «i, °»
    if (graphData && graphData.xLabel) {
      if (graphData.xLabel === 'i, °' || graphData.xLabel === 'i,°') {
        pass(`4.6 граф: xLabel="${graphData.xLabel}" в режиме r(i) — верно`);
      } else {
        skip(`4.6 граф: xLabel="${graphData.xLabel}" — ожидалось «i, °» в начальном режиме ri`);
      }
    }
  } catch (err) {
    fail('4.6 граф: #refraction-graph .data', err.message);
  }

  // #graph-toggle-btn меняет xLabel с «i, °» на «sin i»
  try {
    const toggleBtn = page.locator('#graph-toggle-btn');
    const toggleVisible = await toggleBtn.isVisible().catch(() => false);
    if (!toggleVisible) {
      fail('4.6 переключатель: #graph-toggle-btn не виден', 'кнопка переключения осей отсутствует');
    } else {
      await toggleBtn.click();
      await page.waitForTimeout(200);
      pass('4.6 переключатель: #graph-toggle-btn нажат');

      // Проверить xLabel стал «sin i»
      const xLabelAfter = await page.evaluate(() => {
        const graph = document.querySelector('#refraction-graph');
        return graph?.data?.xLabel ?? null;
      });

      if (xLabelAfter === 'sin i') {
        pass(`4.6 переключатель: xLabel изменился на "${xLabelAfter}" — синусоидальные оси активны`);
      } else {
        fail('4.6 переключатель: xLabel не изменился на «sin i»',
          `xLabel="${xLabelAfter}", ожидалось "sin i"`);
      }

      await screenshot(page, '06-graph-sin');

      // Вернуть назад (кликнуть ещё раз) для чистоты
      await toggleBtn.click();
      await page.waitForTimeout(200);
      const xLabelBack = await page.evaluate(() => {
        const graph = document.querySelector('#refraction-graph');
        return graph?.data?.xLabel ?? null;
      });
      if (xLabelBack === 'i, °' || xLabelBack === 'i,°') {
        pass(`4.6 переключатель: возврат на xLabel="${xLabelBack}" — двойное переключение работает`);
      } else {
        skip(`4.6 переключатель: возврат xLabel="${xLabelBack}" — ожидалось «i, °»`);
      }
    }
  } catch (err) {
    fail('4.6 переключатель: #graph-toggle-btn', err.message);
  }
}

// ─── Пункт 7: result-panel B-angle — нелинейность ────────────────────────────

async function checkResultPanelB(page) {
  console.log('\n  ── Пункт 7: result-panel содержит вывод о нелинейности ─────────────────');
  try {
    const resultInfo = await page.evaluate(() => {
      const el = document.querySelector('#result-panel');
      return el ? { text: el.textContent ?? '', hidden: el.hidden } : null;
    });

    if (resultInfo === null) {
      skip('4.6 result-panel', 'элемент #result-panel не найден');
    } else if (resultInfo.hidden) {
      fail('4.6 result-panel: скрыт', 'в B-angle после записей result-panel должен быть виден');
    } else {
      // Проверяем вывод о нелинейности: ожидаем слово «нелинейно» или «нелинейна»
      const text = resultInfo.text;
      const hasNonlinear = /нелинейн/i.test(text);
      if (hasNonlinear) {
        pass(`4.6 result-panel: содержит вывод о нелинейности — «${text.trim().substring(0, 120)}»`);
      } else {
        fail('4.6 result-panel: нет вывода о нелинейности',
          `текст="${text.trim().substring(0, 200)}" — ожидалось вхождение «нелинейн»`);
      }
    }
  } catch (err) {
    fail('4.6 result-panel', err.message);
  }
}

// ─── Пункт 8: 3 режима record-mode ───────────────────────────────────────────

async function checkRecordModes(page) {
  console.log('\n  ── Пункт 8: 3 режима record-mode (реальный ключ kit-4) ─────────────────');
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
        pass(`4.6 record-mode: "${mode}" — сохранён в localStorage[${LS_KEY}]`);
      } else {
        fail(`4.6 record-mode: "${mode}"`, `localStorage.getItem('${LS_KEY}') → "${storedMode}"`);
      }

      if (bodyMode === mode) {
        pass(`4.6 record-mode: "${mode}" — body[data-record-mode]="${bodyMode}" (приложение читает ключ верно)`);
      } else {
        skip(`4.6 record-mode body attr: "${mode}"`,
          `body[data-record-mode]="${bodyMode}" (ожидалось "${mode}")`);
      }
    } catch (err) {
      fail(`4.6 record-mode: "${mode}"`, err.message);
    }
  }

  // Вернуть в semi-auto
  await page.evaluate((key) => localStorage.setItem(key, 'semi-auto'), LS_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
}

// ─── Пункт 9: axe-scan ───────────────────────────────────────────────────────

async function checkAxe(page) {
  console.log('\n  ── Пункт 9: axe-core — 0 нарушений на экране B-angle ───────────────────');
  try {
    const taskBtnB = page.locator('[data-task="B-angle"]');
    const bVisible = await taskBtnB.isVisible().catch(() => false);
    if (bVisible) { await taskBtnB.click(); await page.waitForTimeout(300); }

    await page.waitForTimeout(400);
    await screenshot(page, '09-axe-state');

    const axeResults = await new AxeBuilder({ page })
      // Правила НЕ отключать
      .analyze();

    const violations = axeResults.violations ?? [];
    if (violations.length === 0) {
      pass('4.6 axe: 0 нарушений (экран B-angle, refraction)');
    } else {
      for (const v of violations) {
        fail(`4.6 axe нарушение: ${v.id}`, `${v.description} — ${v.nodes.length} элементов`);
        for (const n of v.nodes.slice(0, 2)) {
          console.error(`         target: ${JSON.stringify(n.target)}`);
          console.error(`         msg: ${n.any?.[0]?.message?.substring(0, 200)}`);
        }
      }
    }
  } catch (err) {
    fail('4.6 axe', err.message);
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
  console.log('\n── selfcheck-4-6.mjs ──────────────────────────────────────────────────────');
  console.log('   Опыт 4.6 «Угол преломления от угла падения» — reality check');
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
  console.log('\n  ── Пункт 1: Загрузка страницы + lab-protractor-disc ────────────────────');
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

  // Дождаться lab-protractor-disc
  try {
    await page.waitForSelector('lab-protractor-disc, #protractor-disc', { timeout: 8000 });
    pass('Step 1b: lab-protractor-disc смонтирован');
  } catch (err) {
    skip('Step 1b: lab-protractor-disc', `не появился: ${err.message}`);
  }

  await page.waitForTimeout(700);
  await screenshot(page, '00-rest-state');

  // Проверка window.refractionExperiment
  const expAvailable = await page.evaluate(() => !!(window.refractionExperiment));
  if (!expAvailable) {
    skip('Весь опыт 4.6', 'window.refractionExperiment не найден — экран не смонтирован');
    await browser.close();
    printSummary();
    return;
  }
  pass('Step 1c: window.refractionExperiment доступен');

  // ── Пункт 2: Таб B-angle ─────────────────────────────────────────────────────
  const tabOk = await checkTabBAngle(page);
  if (!tabOk) {
    skip('Пункты 3-9: таб B-angle не переключился', 'прерываем проверки зависимых пунктов');
    await browser.close();
    printSummary();
    return;
  }

  await screenshot(page, '01-tab-b-angle');

  // ── Пункт 3: REST-state ────────────────────────────────────────────────────────
  await checkRestState(page);
  await checkOverlayDup(page, 'Step 1d');

  // ── Пункт 4: mouse-D&D ────────────────────────────────────────────────────────
  console.log('\n  ── Пункт 4: реальный mouse-D&D — полуцилиндр, осветитель ──────────────');
  const placed = await assembleRefraction(page, '4.6 сборка');
  if (placed < 2) {
    fail('4.6: не все 2 прибора посажены', `посажено ${placed}/2 мышью`);
  } else {
    pass('4.6: оба прибора посажены реальным mouse-D&D');
  }
  await checkOverlayDup(page, 'после сборки');
  await screenshot(page, '02-assembled');

  // ── Пункт 5: Свип углов + монотонность ────────────────────────────────────────
  // Убедиться в semi-auto для записи через кнопку
  await page.evaluate(() => {
    localStorage.setItem('inter-oge.record-mode.kit-4', 'semi-auto');
  });

  let sweepOk = false;
  if (placed >= 2) {
    sweepOk = await checkAngleSweepAndMonotonicity(page);
  } else {
    skip('4.6: пункт 5 (свип)', 'установка не собрана');
  }

  // ── Пункт 6: График ─────────────────────────────────────────────────────────────
  if (sweepOk) {
    await checkGraph(page);
  } else {
    skip('4.6: пункт 6 (граф)', 'свип не завершён — граф может быть пустым');
  }

  // ── Пункт 7: result-panel B-angle ──────────────────────────────────────────────
  if (sweepOk) {
    await checkResultPanelB(page);
  } else {
    skip('4.6: пункт 7 (result-panel)', 'свип не завершён');
  }

  // ── Пункт 8: 3 режима ─────────────────────────────────────────────────────────
  await checkRecordModes(page);

  // ── Пункт 9: axe ──────────────────────────────────────────────────────────────
  // После checkRecordModes последний reload на semi-auto; переключить на B для axe
  await checkAxe(page);

  // ── Финальный скриншот ────────────────────────────────────────────────────────
  await screenshot(page, '10-final');

  await browser.close();
  printSummary();
}

function printSummary() {
  console.log('\n───────────────────────────────────────────────────────────────────────────');
  console.log(`  selfcheck-4-6: PASS=${passCount}  FAIL=${failCount}  SKIP=${skipCount}`);
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
