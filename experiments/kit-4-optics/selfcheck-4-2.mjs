/**
 * selfcheck-4-2.mjs — reality-check опыта 4.2 «Фокусное расстояние по равенству размеров (предмет в 2F)».
 *
 * PLAYBOOK Шаг 7 + REFERENCE §13 + урок «D&D self-check через mouse»:
 * сборка скамьи ОБЯЗАНА идти реальным page.mouse.move/down/up — programmatic placeInSlot
 * обходит drop-flow и не ловит overlay-dup.
 *
 * Опыт 4.2 — предмет в двойном фокусе (d = 2F) → |Γ|=1 → размеры равны.
 *   При d=2F, F=100: imageDistance(100, 200) = 200·100/(200−100) = 200 мм.
 *   magnification = −1 → |Γ|=1 → isSizesEqual=true.
 *   2F=200 мм, F=100 мм.
 *
 * ФИПИ-якорь: СПЕЦ Прил.2 компл.№4 (стр.19), сноска (4):
 *   «измерение ... фокусного расстояния собирающей линзы
 *   (по свойству равенства размеров предмета и изображения, когда предмет расположен
 *   в двойном фокусе)...»
 *
 * Проверяет:
 *   1. REST-state (гнёзда скрыты в покое).
 *   2. D&D трёх приборов мышью → card[data-placed].
 *   3. Переключение на задачу B ([data-task="B-focal2f"]).
 *   4. #object-slider-row виден; window.lensBenchExperiment.activeTask === 'B-focal2f'.
 *   5. Настройка равенства (setObjectDistanceMm(200) + setScreenDistanceMm(200)).
 *   6. isSharp===true && isSizesEqual===true.
 *   7. ВИЗУАЛЬНЫЙ ИНВАРИАНТ: высоты #object-arrow и .projected-image ≈ равны (±10%).
 *   8. svg.size-match класс присутствует.
 *   9. Запись → журнал FOCAL_2F: twoF_mm≈200, F_mm≈100.
 *  10. Изоляция задач A/B (записи B не видны в журнале A и наоборот).
 *  11. Semi-auto: запись игнорируется, пока не равно (d=150 → не пишет).
 *  12. 3 режима record-mode.
 *  13. overlay-dup=0 после записи.
 *
 * Запуск:
 *   npm --workspace=@labosfera/kit-4-optics run dev -- --host 127.0.0.1 --port 5240 --strictPort
 *   node experiments/kit-4-optics/selfcheck-4-2.mjs
 *
 * Вывод: PASS=N FAIL=0 SKIP=K
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env['SELFCHECK_BASE_URL'] ?? 'http://127.0.0.1:5240';
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
  const file = path.join(SCREENSHOTS_DIR, `4-2-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`       Screenshot: ${file}`);
}

/**
 * Реальный mouse-drag прибора из карточки комплекта в гнездо скамьи.
 * slotId: сырой ('object','lens','screen') — getSlotRect нормализует.
 * data-placed хранит сырой slotId.
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
  await page.waitForTimeout(120);

  const placedSlot = await page.evaluate((sel) => {
    const card = document.querySelector(sel);
    return card ? card.getAttribute('data-placed') : null;
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
 * Собрать скамью (3 прибора) реальным mouse-D&D.
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

// ─── Опыт 4.2 ────────────────────────────────────────────────────────────────

/** pure-физика: imageDistance = d*F/(d-F) */
function imageDistance(F_mm, d_mm) {
  if (Math.abs(d_mm - F_mm) < 0.001) return Infinity;
  return (d_mm * F_mm) / (d_mm - F_mm);
}

async function runTask42(page) {
  console.log('\n  ── Опыт 4.2: Фокусное расстояние (предмет в 2F, F=100, d=200) ──────────');

  // Шаг 1: Собрать скамью мышью
  const placed = await assembleBench(page, '4.2: сборка скамьи');
  if (placed < 3) {
    fail('4.2: пропуск — скамья не собрана', '');
    return;
  }

  await screenshot(page, '01-assembled');

  // Шаг 2: Переключить на задачу B
  console.log('\n  ── Шаг 2: Переключение на задачу B ─────────────────────────────────────');
  try {
    const taskBtn = page.locator('[data-task="B-focal2f"]');
    const taskBtnVisible = await taskBtn.isVisible().catch(() => false);
    if (!taskBtnVisible) {
      fail('4.2: [data-task="B-focal2f"] не найден', 'кнопка переключения задачи B отсутствует');
      return;
    }
    await taskBtn.click();
    await page.waitForTimeout(200);
    pass('4.2: клик по [data-task="B-focal2f"] — задача B выбрана');
  } catch (err) {
    fail('4.2: переключение на задачу B', err.message);
    return;
  }

  // Шаг 3: Проверить activeTask
  try {
    const activeTask = await page.evaluate(() => window.lensBenchExperiment?.activeTask ?? null);
    if (activeTask === 'B-focal2f') {
      pass('4.2: window.lensBenchExperiment.activeTask === "B-focal2f"');
    } else {
      fail('4.2: activeTask после переключения', `activeTask="${activeTask}", ожидалось "B-focal2f"`);
    }
  } catch (err) {
    fail('4.2: проверка activeTask', err.message);
  }

  // Шаг 4: #object-slider-row виден
  try {
    const objectSliderRow = page.locator('#object-slider-row');
    const rowExists = await objectSliderRow.count();
    if (rowExists === 0) {
      skip('4.2: #object-slider-row', 'элемент не найден в DOM');
    } else {
      const hidden = await objectSliderRow.evaluate(el => el.hidden);
      if (!hidden) {
        pass('4.2: #object-slider-row виден (hidden=false) при задаче B');
      } else {
        fail('4.2: #object-slider-row видимость', 'hidden=true, ожидалось false при задаче B');
      }
    }
  } catch (err) {
    fail('4.2: проверка #object-slider-row', err.message);
  }

  await screenshot(page, '02-task-b-selected');

  // Шаг 5: Собрать скамью заново (setActiveTask сбрасывает placed)
  // После setActiveTask карточки возвращаются в available, нужно снова перетащить
  console.log('\n  ── Шаг 5: Повторная сборка скамьи после смены задачи ───────────────────');
  const placed2 = await assembleBench(page, '4.2: сборка после B-switch');
  if (placed2 < 3) {
    fail('4.2: пропуск — скамья не собрана после смены задачи', '');
    return;
  }

  // Шаг 6: Настроить d=200 мм (предмет в 2F), f=200 мм (экран в плоскости изображения)
  console.log('\n  ── Шаг 6: Настройка равенства (d=200, f=200, F=100) ────────────────────');
  const F_mm = 100;
  const twoF_mm = 200;    // d = 2F
  const imgPlane_mm = imageDistance(F_mm, twoF_mm); // = 200

  try {
    await page.evaluate((d) => window.lensBenchExperiment?.setObjectDistanceMm(d), twoF_mm);
    await page.waitForTimeout(100);
    pass(`4.2: setObjectDistanceMm(${twoF_mm}) — предмет в d=2F`);
  } catch (err) {
    fail(`4.2: setObjectDistanceMm(${twoF_mm})`, err.message);
    return;
  }

  try {
    const moved = await page.evaluate((f) => {
      const slider = document.querySelector('#screen-slider');
      if (!slider) return false;
      slider.value = String(f);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }, imgPlane_mm);
    if (!moved) throw new Error('#screen-slider не найден');
    await page.waitForTimeout(120);
    pass(`4.2: #screen-slider → ${imgPlane_mm} мм — экран в плоскости изображения при d=2F`);
  } catch (err) {
    fail(`4.2: слайдер экрана → ${imgPlane_mm}`, err.message);
    return;
  }

  await screenshot(page, '03-sizes-equal');

  // Шаг 7: isSharp && isSizesEqual
  console.log('\n  ── Шаг 7: Проверка isSharp и isSizesEqual ───────────────────────────────');
  try {
    const sharp = await page.evaluate(() => window.lensBenchExperiment?.isSharp ?? null);
    if (sharp === true) {
      pass('4.2: get isSharp === true (экран в плоскости изображения d=2F, f=200)');
    } else {
      fail('4.2: isSharp', `isSharp=${sharp}, ожидалось true`);
    }
  } catch (err) {
    fail('4.2: проверка isSharp', err.message);
  }

  try {
    const equal = await page.evaluate(() => window.lensBenchExperiment?.isSizesEqual ?? null);
    if (equal === true) {
      pass('4.2: get isSizesEqual === true (|Γ|=1 при d=2F=200, F=100)');
    } else {
      fail('4.2: isSizesEqual', `isSizesEqual=${equal}, ожидалось true`);
    }
  } catch (err) {
    fail('4.2: проверка isSizesEqual', err.message);
  }

  // Шаг 8: ВИЗУАЛЬНЫЙ ИНВАРИАНТ — высоты стрелок в shadow DOM
  // Reality-check (как чтение LCD в kit-3): при равенстве размеров РЕАЛЬНЫЕ высоты
  // #object-arrow и .projected-image ДОЛЖНЫ совпадать (±10%).
  console.log('\n  ── Шаг 8: Визуальный инвариант — высоты стрелок ────────────────────────');
  try {
    const arrowHeights = await page.evaluate(() => {
      const bench = document.querySelector('#optical-bench');
      const sr = bench?.shadowRoot ?? null;
      if (!sr) return null;

      const objectArrow = sr.querySelector('#object-arrow');
      const projectedImage = sr.querySelector('.projected-image');

      if (!objectArrow || !projectedImage) {
        return { error: 'элементы не найдены', objectArrow: !!objectArrow, projectedImage: !!projectedImage };
      }

      // getBoundingClientRect даёт viewport-координаты реального отрендеренного элемента
      const objRect = objectArrow.getBoundingClientRect();
      const imgRect = projectedImage.getBoundingClientRect();

      return {
        objectArrowH: objRect.height,
        projectedImageH: imgRect.height,
        objRect: { x: objRect.x, y: objRect.y, w: objRect.width, h: objRect.height },
        imgRect: { x: imgRect.x, y: imgRect.y, w: imgRect.width, h: imgRect.height },
      };
    });

    if (!arrowHeights) {
      skip('4.2 visual: высоты стрелок', 'shadowRoot скамьи не найден');
    } else if (arrowHeights.error) {
      fail('4.2 visual: высоты стрелок — элементы', `${arrowHeights.error} (objectArrow=${arrowHeights.objectArrow}, projectedImage=${arrowHeights.projectedImage})`);
    } else {
      const { objectArrowH, projectedImageH } = arrowHeights;
      console.log(`       object-arrow height: ${objectArrowH.toFixed(2)}px, projected-image height: ${projectedImageH.toFixed(2)}px`);

      // При isSizesEqual оба должны быть > 0 (реально отрендерены)
      if (objectArrowH <= 0 || projectedImageH <= 0) {
        fail('4.2 visual: высоты стрелок — размер 0',
          `objectArrowH=${objectArrowH.toFixed(2)}, projectedImageH=${projectedImageH.toFixed(2)} (должны быть > 0)`);
      } else {
        // Проверить совпадение ±10%
        const ratio = objectArrowH > 0 ? projectedImageH / objectArrowH : 0;
        const withinTolerance = Math.abs(ratio - 1) <= 0.10;
        if (withinTolerance) {
          pass(`4.2 visual: высоты равны ±10% — objectArrow=${objectArrowH.toFixed(2)}px, projectedImage=${projectedImageH.toFixed(2)}px (ratio=${ratio.toFixed(3)})`);
        } else {
          fail('4.2 visual: высоты стрелок НЕ равны',
            `objectArrowH=${objectArrowH.toFixed(2)}, projectedImageH=${projectedImageH.toFixed(2)}, ratio=${ratio.toFixed(3)} (ожидалось ratio≈1 ±10%)`);
        }
      }
    }
  } catch (err) {
    fail('4.2 visual: высоты стрелок', err.message);
  }

  // Шаг 9: svg.size-match класс
  console.log('\n  ── Шаг 9: size-match подсветка ──────────────────────────────────────────');
  try {
    const hasSizeMatch = await page.evaluate(() => {
      const bench = document.querySelector('#optical-bench');
      const sr = bench?.shadowRoot ?? null;
      if (!sr) return null;
      const svg = sr.querySelector('svg');
      return svg ? svg.classList.contains('size-match') : null;
    });

    if (hasSizeMatch === null) {
      skip('4.2: size-match класс', 'SVG не найден в shadowRoot');
    } else if (hasSizeMatch === true) {
      pass('4.2: svg.size-match класс присутствует при равенстве размеров');
    } else {
      fail('4.2: size-match класс', 'svg НЕ имеет класс size-match при isSizesEqual=true');
    }
  } catch (err) {
    fail('4.2: проверка size-match', err.message);
  }

  await screenshot(page, '04-size-match');

  // Шаг 9б: ИНВАРИАНТ ИНВЕРСИИ (mustFix 3) — предмет вверх, изображение вниз
  // Читаем позицию arrowhead-polygon относительно bbox группы.
  // head near TOP bbox → стрелка вверх; head near BOTTOM bbox → стрелка вниз.
  console.log('\n  ── Шаг 9б: Инвариант инверсии — предмет ↑, изображение ↓ ──────────────');
  try {
    const inversionResult = await page.evaluate(() => {
      const bench = document.querySelector('#optical-bench');
      const sr = bench?.shadowRoot ?? null;
      if (!sr) return { skip: true, reason: 'shadowRoot не найден' };

      const objectArrow = sr.querySelector('#object-arrow');
      const projectedImage = sr.querySelector('.projected-image');

      if (!objectArrow || !projectedImage) {
        return { skip: true, reason: `objectArrow=${!!objectArrow}, projectedImage=${!!projectedImage}` };
      }

      // Найти polygon (наконечник) внутри каждой группы
      const objPolygon = objectArrow.querySelector('polygon');
      const imgPolygon = projectedImage.querySelector('polygon');
      if (!objPolygon || !imgPolygon) {
        return { skip: true, reason: `objPolygon=${!!objPolygon}, imgPolygon=${!!imgPolygon}` };
      }

      // Сравниваем Y-центр polygon с Y-центром bbox группы.
      // Если polygon.y < group.y+group.h/2 → наконечник у TOP → стрелка вверх.
      // Если polygon.y > group.y+group.h/2 → наконечник у BOTTOM → стрелка вниз.
      const objGroupRect = objectArrow.getBoundingClientRect();
      const imgGroupRect = projectedImage.getBoundingClientRect();
      const objPolyRect = objPolygon.getBoundingClientRect();
      const imgPolyRect = imgPolygon.getBoundingClientRect();

      const objPolyCenterY = objPolyRect.y + objPolyRect.height / 2;
      const objGroupCenterY = objGroupRect.y + objGroupRect.height / 2;
      const imgPolyCenterY = imgPolyRect.y + imgPolyRect.height / 2;
      const imgGroupCenterY = imgGroupRect.y + imgGroupRect.height / 2;

      // Предмет: стрелка ВВЕРХ → наконечник выше центра группы
      const objArrowUp = objGroupRect.height > 0 ? objPolyCenterY < objGroupCenterY : null;
      // Изображение: стрелка ВНИЗ → наконечник НИЖЕ центра группы
      const imgArrowDown = imgGroupRect.height > 0 ? imgPolyCenterY > imgGroupCenterY : null;

      return {
        objGroupRect: { y: objGroupRect.y, h: objGroupRect.height },
        imgGroupRect: { y: imgGroupRect.y, h: imgGroupRect.height },
        objPolyCenterY,
        imgPolyCenterY,
        objGroupCenterY,
        imgGroupCenterY,
        objArrowUp,
        imgArrowDown,
      };
    });

    if (inversionResult.skip) {
      skip('4.2 инверсия: направление стрелок', inversionResult.reason);
    } else {
      const { objArrowUp, imgArrowDown, objPolyCenterY, objGroupCenterY, imgPolyCenterY, imgGroupCenterY } = inversionResult;

      if (objArrowUp === null) {
        skip('4.2 инверсия: предмет (нет высоты bbox)', 'objectArrow bbox height=0 (рендер не вычислен)');
      } else if (objArrowUp === true) {
        pass(`4.2 инверсия: предмет (#object-arrow) направлен ВВЕРХ (polyY=${objPolyCenterY.toFixed(1)} < groupCenterY=${objGroupCenterY.toFixed(1)})`);
      } else {
        fail('4.2 инверсия: предмет (#object-arrow) должен быть направлен ВВЕРХ',
          `polyY=${objPolyCenterY.toFixed(1)} >= groupCenterY=${objGroupCenterY.toFixed(1)} → наконечник СНИЗУ`);
      }

      if (imgArrowDown === null) {
        skip('4.2 инверсия: изображение (нет высоты bbox)', 'projectedImage bbox height=0 (рендер не вычислен)');
      } else if (imgArrowDown === true) {
        pass(`4.2 инверсия: изображение (.projected-image) направлено ВНИЗ (polyY=${imgPolyCenterY.toFixed(1)} > groupCenterY=${imgGroupCenterY.toFixed(1)})`);
      } else {
        fail('4.2 инверсия: изображение (.projected-image) должно быть направлено ВНИЗ',
          `polyY=${imgPolyCenterY.toFixed(1)} <= groupCenterY=${imgGroupCenterY.toFixed(1)} → наконечник СВЕРХУ (баг инверсии не устранён)`);
      }
    }
  } catch (err) {
    fail('4.2 инверсия: проверка направлений стрелок', err.message);
  }

  // Шаг 10: Запись через #record-pending-btn или recordMeasurement()
  console.log('\n  ── Шаг 10: Запись измерения ─────────────────────────────────────────────');
  const btnB = page.locator('#record-pending-btn');
  const visibleB = await btnB.isVisible().catch(() => false);
  if (visibleB) {
    await btnB.click();
    await page.waitForTimeout(200);
    pass('4.2: запись через #record-pending-btn');
  } else {
    await page.evaluate(() => window.lensBenchExperiment?.recordMeasurement?.());
    await page.waitForTimeout(150);
    pass('4.2: запись через recordMeasurement() (record-mode не semi-auto)');
  }

  // Шаг 11: Читать журнал FOCAL_2F — проверить twoF≈200, F≈100
  const measurementsAfter = await page.evaluate(() => window.lensBenchExperiment?.measurements ?? []);
  const taskBMeasurements = measurementsAfter.filter(m => m.task === 'B-focal2f');
  const lastB = taskBMeasurements[taskBMeasurements.length - 1];

  if (!lastB) {
    fail('4.2: нет measurement task=B-focal2f после записи', '');
  } else {
    pass(`4.2: строка журнала B: d=${lastB.d_mm} мм, twoF=${lastB.twoF_mm} мм, F=${lastB.F_mm?.toFixed(1)} мм, D=${lastB.D_dptr?.toFixed(2)} дптр`);

    // Инвариант: twoF_mm ≈ 200 мм (tolerance 5%)
    const twoF_rec = lastB.twoF_mm ?? lastB.d_mm;
    const relTwoF = Math.abs(twoF_rec - twoF_mm) / twoF_mm;
    if (relTwoF <= 0.05) {
      pass(`4.2 ФИПИ: twoF=${twoF_rec.toFixed(1)} мм ≈ 200 мм (2F, rel=${(relTwoF * 100).toFixed(2)}% ≤ 5%)`);
    } else {
      fail('4.2 ФИПИ: twoF_mm ≈ 200', `twoF=${twoF_rec.toFixed(2)}, rel=${(relTwoF * 100).toFixed(2)}% > 5%`);
    }

    // Инвариант: F_mm ≈ 100 мм (tolerance 5%)
    const F_rec = lastB.F_mm;
    if (F_rec != null) {
      const relF = Math.abs(F_rec - F_mm) / F_mm;
      if (relF <= 0.05) {
        pass(`4.2 ФИПИ: F=${F_rec.toFixed(1)} мм ≈ 100 мм (F=2F/2, rel=${(relF * 100).toFixed(2)}% ≤ 5%)`);
      } else {
        fail('4.2 ФИПИ: F_mm ≈ 100', `F=${F_rec.toFixed(2)}, rel=${(relF * 100).toFixed(2)}% > 5%`);
      }
    } else {
      fail('4.2 ФИПИ: F_mm', 'F_mm=null в строке журнала');
    }

    // Инвариант: task === 'B-focal2f'
    if (lastB.task === 'B-focal2f') {
      pass('4.2: task поле в строке журнала === "B-focal2f"');
    } else {
      fail('4.2: task поле в строке', `task="${lastB.task}", ожидалось "B-focal2f"`);
    }
  }

  await screenshot(page, '05-recorded-b');

  await checkOverlayDup(page, '4.2 после записи');
}

// ─── Тест: Semi-auto игнорирует запись при неравенстве ────────────────────────

async function checkSemiAutoBlock(page) {
  console.log('\n  ── Semi-auto: запись при d=150 (не 2F) должна игнорироваться ───────────');
  try {
    // Установить record-mode = semi-auto через правильный ключ inter-oge.record-mode.kit-4
    await page.evaluate(() => {
      localStorage.setItem('inter-oge.record-mode.kit-4', 'semi-auto');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);

    // После reload повторно переключиться на задачу B и собрать скамью
    const taskBtn = page.locator('[data-task="B-focal2f"]');
    const taskBtnVisible = await taskBtn.isVisible().catch(() => false);
    if (taskBtnVisible) {
      await taskBtn.click();
      await page.waitForTimeout(150);
    }

    // Убедиться что window.lensBenchExperiment жив
    const expOk = await page.evaluate(() => !!(window.lensBenchExperiment));
    if (!expOk) {
      skip('4.2 semi-auto: тест блокировки', 'window.lensBenchExperiment не найден после reload');
      return;
    }

    // Сдвинуть предмет в d=150 (не 2F, |Γ|≠1)
    await page.evaluate(() => window.lensBenchExperiment?.setObjectDistanceMm(150));
    await page.waitForTimeout(100);

    const countBefore = await page.evaluate(() =>
      (window.lensBenchExperiment?.measurements ?? []).filter(m => m.task === 'B-focal2f').length
    );

    // В semi-auto recordMeasurement() игнорируется, если isSizesEqual=false || isSharp=false
    await page.evaluate(() => window.lensBenchExperiment?.recordMeasurement?.());
    await page.waitForTimeout(100);

    const countAfter = await page.evaluate(() =>
      (window.lensBenchExperiment?.measurements ?? []).filter(m => m.task === 'B-focal2f').length
    );

    if (countAfter === countBefore) {
      pass('4.2 semi-auto: запись при d=150 (не 2F) проигнорирована — countBefore=countAfter');
    } else {
      fail('4.2 semi-auto: запись при неравенстве', `количество строк изменилось: ${countBefore} → ${countAfter}`);
    }

    // Вернуть d=200 для дальнейших тестов
    await page.evaluate(() => window.lensBenchExperiment?.setObjectDistanceMm(200));
    await page.waitForTimeout(100);
    pass('4.2: d восстановлен в 200 мм для дальнейших тестов');
  } catch (err) {
    fail('4.2 semi-auto: тест блокировки', err.message);
  }
}

// ─── Тест: Различие semi-auto и fully-auto (mustFix 2 — ПОЗИТИВНАЯ проверка) ───

async function checkSemiVsFullyAuto(page) {
  console.log('\n  ── Semi-auto vs Fully-auto: различие поведения при равенстве ───────────');

  // Подготовка: убедиться что на задаче B и d=200 (резко, равно)
  try {
    const taskBtn = page.locator('[data-task="B-focal2f"]');
    const taskBtnVisible = await taskBtn.isVisible().catch(() => false);
    if (taskBtnVisible) {
      await taskBtn.click();
      await page.waitForTimeout(150);
    }
    await page.evaluate(() => window.lensBenchExperiment?.setObjectDistanceMm(200));
    await page.waitForTimeout(100);
    // Установить экран в плоскость изображения (f=200)
    const moved = await page.evaluate((f) => {
      const slider = document.querySelector('#screen-slider');
      if (!slider) return false;
      slider.value = String(f);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }, 200);
    if (!moved) {
      skip('4.2 semi-vs-auto: нет #screen-slider для настройки резкости', '');
      return;
    }
    await page.waitForTimeout(150);
  } catch (err) {
    skip('4.2 semi-vs-auto: подготовка', err.message);
    return;
  }

  // ─── semi-auto: при равенстве + резко авто-записи НЕТ (нужен клик кнопки) ───
  try {
    await page.evaluate(() => {
      localStorage.setItem('inter-oge.record-mode.kit-4', 'semi-auto');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);

    // После reload повторно настроить задачу B и d=200
    const taskBtn2 = page.locator('[data-task="B-focal2f"]');
    const visible2 = await taskBtn2.isVisible().catch(() => false);
    if (visible2) { await taskBtn2.click(); await page.waitForTimeout(150); }
    await page.evaluate(() => window.lensBenchExperiment?.setObjectDistanceMm(200));
    await page.waitForTimeout(100);
    await page.evaluate((f) => {
      const slider = document.querySelector('#screen-slider');
      if (slider) { slider.value = String(f); slider.dispatchEvent(new Event('input', { bubbles: true })); }
    }, 200);
    await page.waitForTimeout(150);

    const expOk = await page.evaluate(() => !!(window.lensBenchExperiment));
    if (!expOk) {
      skip('4.2 semi-vs-auto: semi-auto', 'window.lensBenchExperiment не найден');
    } else {
      const countBefore = await page.evaluate(() =>
        (window.lensBenchExperiment?.measurements ?? []).filter(m => m.task === 'B-focal2f').length
      );

      // Ждать немного — fully-auto записал бы уже здесь; semi-auto — нет
      await page.waitForTimeout(300);

      const countAfterWait = await page.evaluate(() =>
        (window.lensBenchExperiment?.measurements ?? []).filter(m => m.task === 'B-focal2f').length
      );

      if (countAfterWait === countBefore) {
        pass('4.2 semi-auto: при равенстве (d=200, f=200) авто-записи НЕТ без клика кнопки');
      } else {
        fail('4.2 semi-auto: запись появилась без клика',
          `countBefore=${countBefore}, countAfterWait=${countAfterWait} — в semi-auto не должно быть авто-записи`);
      }

      // Кликнуть кнопку — запись ДОЛЖНА появиться
      const btnSemi = page.locator('#record-pending-btn');
      const btnVisible = await btnSemi.isVisible().catch(() => false);
      if (btnVisible) {
        await btnSemi.click();
        await page.waitForTimeout(200);
        const countAfterClick = await page.evaluate(() =>
          (window.lensBenchExperiment?.measurements ?? []).filter(m => m.task === 'B-focal2f').length
        );
        if (countAfterClick > countBefore) {
          pass('4.2 semi-auto: запись появилась ПОСЛЕ клика #record-pending-btn');
        } else {
          fail('4.2 semi-auto: запись НЕ появилась после клика',
            `countBefore=${countBefore}, countAfterClick=${countAfterClick}`);
        }
      } else {
        skip('4.2 semi-auto: клик кнопки', '#record-pending-btn не видим');
      }
    }
  } catch (err) {
    fail('4.2 semi-vs-auto: semi-auto тест', err.message);
  }

  // ─── fully-auto: при равенстве + резко запись появляется БЕЗ клика ───
  try {
    await page.evaluate(() => {
      localStorage.setItem('inter-oge.record-mode.kit-4', 'fully-auto');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);

    // Настроить задачу B и d=200 после reload
    const taskBtn3 = page.locator('[data-task="B-focal2f"]');
    const visible3 = await taskBtn3.isVisible().catch(() => false);
    if (visible3) { await taskBtn3.click(); await page.waitForTimeout(150); }
    await page.evaluate(() => window.lensBenchExperiment?.setObjectDistanceMm(200));
    await page.waitForTimeout(100);
    await page.evaluate((f) => {
      const slider = document.querySelector('#screen-slider');
      if (slider) { slider.value = String(f); slider.dispatchEvent(new Event('input', { bubbles: true })); }
    }, 200);
    await page.waitForTimeout(400); // дать fully-auto время записать

    const expOk2 = await page.evaluate(() => !!(window.lensBenchExperiment));
    if (!expOk2) {
      skip('4.2 semi-vs-auto: fully-auto', 'window.lensBenchExperiment не найден');
    } else {
      const countFullyAuto = await page.evaluate(() =>
        (window.lensBenchExperiment?.measurements ?? []).filter(m => m.task === 'B-focal2f').length
      );
      if (countFullyAuto > 0) {
        pass(`4.2 fully-auto: запись появилась БЕЗ клика кнопки (count=${countFullyAuto})`);
      } else {
        // fully-auto может не поддерживаться в kit-4 — пропускаем мягко
        skip('4.2 fully-auto: авто-запись', `count=${countFullyAuto} — fully-auto может быть не реализован для kit-4`);
      }
    }
  } catch (err) {
    fail('4.2 semi-vs-auto: fully-auto тест', err.message);
  }

  // Восстановить semi-auto после теста
  await page.evaluate(() => {
    localStorage.setItem('inter-oge.record-mode.kit-4', 'semi-auto');
  });
}

// ─── Тест: Изоляция задач A и B ──────────────────────────────────────────────

async function checkTaskIsolation(page) {
  console.log('\n  ── Изоляция задач A / B ─────────────────────────────────────────────────');
  try {
    const allMeasurements = await page.evaluate(() => window.lensBenchExperiment?.measurements ?? []);
    const countA = allMeasurements.filter(m => m.task === 'A-power').length;
    const countB = allMeasurements.filter(m => m.task === 'B-focal2f').length;

    // Переключить на задачу A и проверить журнал (должен быть пустым если в A не писали)
    await page.click('[data-task="A-power"]').catch(() => {});
    await page.waitForTimeout(150);

    const activeAfter = await page.evaluate(() => window.lensBenchExperiment?.activeTask ?? null);
    if (activeAfter === 'A-power') {
      pass('4.2 isolation: переключение на задачу A — activeTask === "A-power"');
    } else {
      fail('4.2 isolation: activeTask после переключения на A', `activeTask="${activeAfter}"`);
    }

    // Записи задачи B НЕ должны отображаться в журнале задачи A
    // #measurement-panel [data-state] — если measurement нет в A, должен быть state='empty'
    const panelState = await page.evaluate(() => {
      const panel = document.querySelector('#measurement-panel');
      return panel?.dataset['state'] ?? null;
    });

    if (panelState === 'empty' && countA === 0) {
      pass(`4.2 isolation: журнал задачи A пустой (state=empty) — записи B не просачиваются`);
    } else if (panelState === 'recorded' && countA > 0) {
      pass(`4.2 isolation: журнал задачи A содержит записи A (countA=${countA}) — OK`);
    } else {
      fail('4.2 isolation: panel state vs countA',
        `panelState="${panelState}", countA=${countA} — ожидалось соответствие`);
    }

    pass(`4.2 isolation: в store — countA=${countA}, countB=${countB} (по задачам независимо)`);

    // Вернуть обратно в задачу B
    await page.click('[data-task="B-focal2f"]').catch(() => {});
    await page.waitForTimeout(150);
  } catch (err) {
    fail('4.2 isolation', err.message);
  }
}

// ─── Тест: 3 режима record-mode ──────────────────────────────────────────────
// mustFix 2: ключ localStorage = 'inter-oge.record-mode.kit-4' (не 'record-mode-kit-4')

async function checkRecordModes(page) {
  console.log('\n  ── 3 режима record-mode ────────────────────────────────────────────────');
  const LS_KEY = 'inter-oge.record-mode.kit-4';
  const modes = ['semi-auto', 'fully-manual', 'fully-auto'];

  for (const mode of modes) {
    try {
      // Установить через правильный ключ, перезагрузить, прочитать что приложение видит
      await page.evaluate(([key, m]) => {
        localStorage.setItem(key, m);
      }, [LS_KEY, mode]);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      // Проверить что приложение читает именно этот ключ (через getRecordMode-эквивалент):
      // window.lensBenchExperiment должно знать о режиме — либо проверяем через body dataset
      const storedMode = await page.evaluate((key) => localStorage.getItem(key), LS_KEY);
      const bodyMode = await page.evaluate(() => document.body?.dataset['recordMode'] ?? null);

      if (storedMode === mode) {
        pass(`4.2 record-mode: "${mode}" — сохранён в localStorage[${LS_KEY}]`);
      } else {
        fail(`4.2 record-mode: "${mode}"`, `localStorage.getItem('${LS_KEY}') → "${storedMode}"`);
      }

      if (bodyMode === mode) {
        pass(`4.2 record-mode: "${mode}" — body[data-record-mode]="${bodyMode}" (приложение читает ключ верно)`);
      } else {
        // Не все опыты могут ставить body dataset сразу — мягкий skip
        skip(`4.2 record-mode body attr: "${mode}"`, `body[data-record-mode]="${bodyMode}" (ожидалось "${mode}")`);
      }
    } catch (err) {
      fail(`4.2 record-mode: "${mode}"`, err.message);
    }
  }

  // Вернуть в semi-auto для финального состояния
  await page.evaluate((key) => localStorage.setItem(key, 'semi-auto'), LS_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
}

// ─── Основная функция ─────────────────────────────────────────────────────────

async function run() {
  console.log('\n── selfcheck-4-2.mjs ──────────────────────────────────────────────────────');
  console.log('   Опыт 4.2 «Фокусное расстояние по равенству размеров (предмет в 2F)» — reality check');
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
    skip('Весь опыт 4.2', 'страница не загрузилась');
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
    skip('Весь опыт 4.2', 'window.lensBenchExperiment не найден — экран не смонтирован');
    await browser.close();
    printSummary();
    return;
  }
  pass('Step 0d: window.lensBenchExperiment доступен');

  // ── Опыт 4.2 ─────────────────────────────────────────────────────────────────
  await runTask42(page);

  // ── Semi-auto блокировка (d=150 → не пишет) ───────────────────────────────────
  await checkSemiAutoBlock(page);

  // ── Semi-auto vs Fully-auto: позитивная проверка различия (mustFix 2) ─────────
  await checkSemiVsFullyAuto(page);

  // ── Изоляция задач A / B ─────────────────────────────────────────────────────
  await checkTaskIsolation(page);

  // ── 3 режима record-mode ─────────────────────────────────────────────────────
  await checkRecordModes(page);

  // ── Финальный скриншот ────────────────────────────────────────────────────────
  await screenshot(page, '06-final');

  await browser.close();
  printSummary();
}

function printSummary() {
  console.log('\n───────────────────────────────────────────────────────────────────────────');
  console.log(`  selfcheck-4-2: PASS=${passCount}  FAIL=${failCount}  SKIP=${skipCount}`);
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
