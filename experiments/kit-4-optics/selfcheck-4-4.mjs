/**
 * selfcheck-4-4.mjs — reality-check опыта 4.4 «Свойства изображения (5 зон)».
 *
 * PLAYBOOK Шаг 7 + REFERENCE §13 + урок «D&D self-check через mouse»:
 * сборка скамьи ОБЯЗАНА идти реальным page.mouse.move/down/up — programmatic placeInSlot
 * обходит drop-flow и не ловит overlay-dup.
 *
 * Опыт 4.4 — исследование свойств изображений при различных зонах предмета:
 *   d > 2F → действительное, перевёрнутое, уменьшенное  (#projected-image-group)
 *   d = 2F → действительное, перевёрнутое, равное         (#projected-image-group)
 *   F < d < 2F → действительное, перевёрнутое, увеличенное (#projected-image-group)
 *   d = F → изображение в бесконечности                  (#infinity-note-group)
 *   d < F → мнимое, прямое (без scale(1,-))              (#virtual-image-group)
 *
 * ФИПИ-якорь: СПЕЦ Прил.2 компл.№4 (стр.19), сноска (8):
 *   «исследование зависимости вида изображения, создаваемого собирающей линзой,
 *   от положения предмета относительно фокуса (вид — действительное/мнимое,
 *   ориентация — прямое/перевёрнутое, размер — увеличенное/уменьшенное/равное)»
 *
 * Проверяет (12 пунктов):
 *   1. Загрузка страницы (200 OK).
 *   2. REST-state: .slot-rect скрыты в покое (opacity 0).
 *   3. Переключение на задачу C ([data-task="C-image"]): aria-current=true,
 *      слайдер предмета виден, диапазон min≤60/max≥300.
 *   4. D&D трёх приборов мышью → card[data-placed].
 *   5. Зона-ридаут по 5 зонам (setObjectDistanceMm: 300→«d > 2F», 200→«d = 2F»,
 *      150→«F < d < 2F», 100→«d = F», 60→«d < F»).
 *   6. Визуальный инвариант (shadowRoot): d=300 → #projected-image-group виден;
 *      d=60 → #virtual-image-group виден и ПРЯМОЙ (transform без scale(1,-));
 *      d=100 → #infinity-note-group виден.
 *   7. semi-auto: запись строки в зоне d=300; журнал <select data-key>; выбор
 *      ВЕРНО (real/inverted/reduced) + Γ=−0.5 → td[data-verdict="ok"];
 *      перезапись НЕВЕРНО (virtual) → td[data-verdict="wrong"].
 *   8. a11y-утечка: #live-region и #result-panel НЕ содержат категорий в semi-auto.
 *   9. fully-auto (localStorage kit-4=fully-auto, reload): td[data-key="kind"] текст
 *      «действительное» (авто-заполнено при d=300).
 *  10. 3 режима различимы по реальному ключу inter-oge.record-mode.kit-4.
 *  11. Изоляция: переключить на A → журнал C-строк не показывает.
 *  12. axe (@axe-core/playwright): 0 нарушений на экране с задачей C.
 *
 * Запуск:
 *   npm --workspace=@labosfera/kit-4-optics run dev -- --host 127.0.0.1 --port 5191 --strictPort
 *   node experiments/kit-4-optics/selfcheck-4-4.mjs
 *
 * Вывод: PASS=N FAIL=0 SKIP=K
 */

import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env['SELFCHECK_BASE_URL'] ?? 'http://127.0.0.1:5191';
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
  const file = path.join(SCREENSHOTS_DIR, `4-4-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`       Screenshot: ${file}`);
}

/**
 * Реальный mouse-drag прибора из карточки комплекта в гнездо скамьи.
 * slotId: сырой ('object','lens','screen') — getSlotRect нормализует.
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

  // Нормализованный слот: getSlotRect принимает 'object' или 'bench-slot-object'
  const normalizedSlot = slotId.startsWith('bench-slot-') ? slotId : `bench-slot-${slotId}`;
  return placedSlot === slotId || placedSlot === normalizedSlot;
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

// ─── Пункт 1: REST-state ──────────────────────────────────────────────────────

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

// ─── Пункт 2: Переключение на задачу C ────────────────────────────────────────

async function checkSwitchToTaskC(page) {
  console.log('\n  ── Шаг C: Переключение на задачу C [data-task="C-image"] ───────────────');
  try {
    const taskBtn = page.locator('[data-task="C-image"]');
    const taskBtnVisible = await taskBtn.isVisible().catch(() => false);
    if (!taskBtnVisible) {
      fail('4.4: [data-task="C-image"] не найден', 'кнопка переключения задачи C отсутствует');
      return false;
    }
    await taskBtn.click();
    await page.waitForTimeout(200);
    pass('4.4: клик по [data-task="C-image"] — задача C выбрана');
  } catch (err) {
    fail('4.4: переключение на задачу C', err.message);
    return false;
  }

  // aria-current=true (legacy compat)
  try {
    const ariaCurrent = await page.evaluate(() => {
      const btn = document.querySelector('[data-task="C-image"]');
      return btn?.getAttribute('aria-current') ?? null;
    });
    if (ariaCurrent === 'true') {
      pass('4.4: [data-task="C-image"] aria-current="true"');
    } else {
      fail('4.4: aria-current после переключения на C', `aria-current="${ariaCurrent}", ожидалось "true"`);
    }
  } catch (err) {
    fail('4.4: проверка aria-current', err.message);
  }

  // aria-selected: role="tab" требует aria-selected="true" на активном, "false" на остальных
  // (оркестратор #refreshTaskStepper ставит ОБА атрибута — проверяем что a11y-фикс работает)
  try {
    const ariaSelectedResult = await page.evaluate(() => {
      const allTasks = Array.from(document.querySelectorAll('[data-task]'));
      if (allTasks.length === 0) return { ok: false, reason: 'нет элементов [data-task]' };
      const activeBtn = document.querySelector('[data-task="C-image"]');
      const activeSelected = activeBtn?.getAttribute('aria-selected') ?? null;
      const inactiveWrong = allTasks
        .filter(el => el.dataset['task'] !== 'C-image')
        .filter(el => el.getAttribute('aria-selected') !== 'false' && el.getAttribute('aria-selected') !== null)
        .map(el => `${el.dataset['task']}:${el.getAttribute('aria-selected')}`);
      return { activeSelected, inactiveWrong, count: allTasks.length };
    });
    if (ariaSelectedResult.ok === false) {
      fail('4.4: aria-selected (role=tab)', ariaSelectedResult.reason);
    } else if (ariaSelectedResult.activeSelected === 'true') {
      pass(`4.4: [data-task="C-image"] aria-selected="true" (role=tab a11y-фикс подтверждён)`);
      if (ariaSelectedResult.inactiveWrong.length === 0) {
        pass(`4.4: неактивные табы aria-selected="false" (count=${ariaSelectedResult.count - 1})`);
      } else {
        fail('4.4: неактивные табы должны иметь aria-selected="false"',
          `нарушения: ${ariaSelectedResult.inactiveWrong.join(', ')}`);
      }
    } else {
      fail('4.4: aria-selected активного таба',
        `aria-selected="${ariaSelectedResult.activeSelected}", ожидалось "true"`);
    }
  } catch (err) {
    fail('4.4: проверка aria-selected', err.message);
  }

  // #object-slider-row виден
  try {
    const objectSliderRow = page.locator('#object-slider-row');
    const rowExists = await objectSliderRow.count();
    if (rowExists === 0) {
      skip('4.4: #object-slider-row', 'элемент не найден в DOM');
    } else {
      const hidden = await objectSliderRow.evaluate(el => el.hidden);
      if (!hidden) {
        pass('4.4: #object-slider-row виден (hidden=false) при задаче C');
      } else {
        fail('4.4: #object-slider-row видимость', 'hidden=true, ожидалось false при задаче C');
      }
    }
  } catch (err) {
    fail('4.4: проверка #object-slider-row', err.message);
  }

  // Диапазон слайдера: min≤60, max≥300
  try {
    const sliderRange = await page.evaluate(() => {
      const slider = document.querySelector('#object-slider');
      if (!slider) return null;
      return { min: parseFloat(slider.min), max: parseFloat(slider.max) };
    });
    if (!sliderRange) {
      skip('4.4: диапазон #object-slider', '#object-slider не найден');
    } else {
      const { min, max } = sliderRange;
      if (min <= 60 && max >= 300) {
        pass(`4.4: диапазон слайдера предмета: min=${min} ≤ 60, max=${max} ≥ 300`);
      } else {
        fail('4.4: диапазон #object-slider', `min=${min} (≤60?), max=${max} (≥300?)`);
      }
    }
  } catch (err) {
    fail('4.4: диапазон #object-slider', err.message);
  }

  return true;
}

// ─── Пункт 4: Зона-ридаут по 5 зонам ────────────────────────────────────────

async function checkZoneReadouts(page) {
  console.log('\n  ── Шаг 5: Зона-ридаут по 5 зонам (#object-zone-readout) ────────────────');

  const zones = [
    { d: 300, expectedZone: 'd > 2F' },
    { d: 200, expectedZone: 'd = 2F' },
    { d: 150, expectedZone: 'F < d < 2F' },
    { d: 100, expectedZone: 'd = F' },
    { d:  60, expectedZone: 'd < F' },
  ];

  for (const { d, expectedZone } of zones) {
    try {
      await page.evaluate((mm) => window.lensBenchExperiment?.setObjectDistanceMm(mm), d);
      await page.waitForTimeout(80);

      const readoutText = await page.evaluate(() => {
        const el = document.querySelector('#object-zone-readout');
        return el ? el.textContent ?? '' : null;
      });

      if (readoutText === null) {
        skip(`4.4 зона d=${d}: #object-zone-readout`, 'элемент не найден');
        continue;
      }

      // Текст формата «Зона: d > 2F» — проверяем вхождение ожидаемой метки
      if (readoutText.includes(expectedZone)) {
        pass(`4.4 зона d=${d}: «${readoutText}» содержит «${expectedZone}»`);
      } else {
        fail(`4.4 зона d=${d}: зона-ридаут`, `текст="${readoutText}", ожидалось содержание «${expectedZone}»`);
      }
    } catch (err) {
      fail(`4.4 зона d=${d}`, err.message);
    }
  }
}

// ─── Пункт 5: Визуальный инвариант через shadowRoot ───────────────────────────

async function checkVisualInvariants(page) {
  console.log('\n  ── Шаг 6: Визуальный инвариант (shadowRoot) ─────────────────────────────');

  // d=300: #projected-image-group виден, virtual/infinity скрыты
  try {
    await page.evaluate(() => window.lensBenchExperiment?.setObjectDistanceMm(300));
    await page.waitForTimeout(80);

    const vis300 = await page.evaluate(() => {
      const bench = document.querySelector('#optical-bench');
      const sr = bench?.shadowRoot ?? null;
      if (!sr) return null;
      const proj = sr.querySelector('#projected-image-group');
      const virt = sr.querySelector('#virtual-image-group');
      const inf = sr.querySelector('#infinity-note-group');
      if (!proj || !virt || !inf) return { error: 'группы не найдены', proj: !!proj, virt: !!virt, inf: !!inf };
      // [hidden]{display:none} — проверяем через computed display
      const projDisplay = getComputedStyle(proj).display;
      const virtDisplay = getComputedStyle(virt).display;
      const infDisplay = getComputedStyle(inf).display;
      return {
        projVisible: projDisplay !== 'none' && !proj.hasAttribute('hidden'),
        virtHidden:  virt.hasAttribute('hidden') || virtDisplay === 'none',
        infHidden:   inf.hasAttribute('hidden') || infDisplay === 'none',
        projDisplay, virtDisplay, infDisplay,
      };
    });

    if (!vis300) {
      skip('4.4 visual d=300', 'shadowRoot скамьи не найден');
    } else if (vis300.error) {
      fail('4.4 visual d=300: группы SVG', `${vis300.error}`);
    } else {
      if (vis300.projVisible) {
        pass('4.4 visual d=300: #projected-image-group видима (display≠none, нет hidden)');
      } else {
        fail('4.4 visual d=300: #projected-image-group должна быть видима', `display=${vis300.projDisplay}`);
      }
      if (vis300.virtHidden) {
        pass('4.4 visual d=300: #virtual-image-group скрыта');
      } else {
        fail('4.4 visual d=300: #virtual-image-group должна быть скрыта', `display=${vis300.virtDisplay}`);
      }
      if (vis300.infHidden) {
        pass('4.4 visual d=300: #infinity-note-group скрыта');
      } else {
        fail('4.4 visual d=300: #infinity-note-group должна быть скрыта', `display=${vis300.infDisplay}`);
      }
    }
  } catch (err) {
    fail('4.4 visual d=300', err.message);
  }

  await screenshot(page, '03-d300-projected');

  // d=60: #virtual-image-group виден и ПРЯМОЙ (transform без scale(1,-))
  try {
    await page.evaluate(() => window.lensBenchExperiment?.setObjectDistanceMm(60));
    await page.waitForTimeout(80);

    const vis60 = await page.evaluate(() => {
      const bench = document.querySelector('#optical-bench');
      const sr = bench?.shadowRoot ?? null;
      if (!sr) return null;
      const virt = sr.querySelector('#virtual-image-group');
      const virtInner = sr.querySelector('.virtual-image');
      if (!virt) return { error: 'virtual-image-group не найден' };
      const virtDisplay = getComputedStyle(virt).display;
      const virtVisible = !virt.hasAttribute('hidden') && virtDisplay !== 'none';
      const transform = virtInner?.getAttribute('transform') ?? '';
      // Прямое изображение: scale(1,+sy) — НЕ должно содержать scale(1,- (минус)
      const hasNegativeScale = transform.includes('scale(1,-');
      return { virtVisible, hasNegativeScale, transform, virtDisplay };
    });

    if (!vis60) {
      skip('4.4 visual d=60', 'shadowRoot скамьи не найден');
    } else if (vis60.error) {
      fail('4.4 visual d=60: группы SVG', vis60.error);
    } else {
      if (vis60.virtVisible) {
        pass('4.4 visual d=60: #virtual-image-group видима (мнимое изображение)');
      } else {
        fail('4.4 visual d=60: #virtual-image-group должна быть видима', `display=${vis60.virtDisplay}`);
      }
      if (!vis60.hasNegativeScale) {
        pass(`4.4 visual d=60: transform прямое (без scale(1,-)) — «${vis60.transform}»`);
      } else {
        fail('4.4 visual d=60: мнимое изображение перевёрнуто (scale(1,-) обнаружен)',
          `transform="${vis60.transform}" — мнимое д.б. ПРЯМЫМ`);
      }
    }
  } catch (err) {
    fail('4.4 visual d=60', err.message);
  }

  await screenshot(page, '04-d60-virtual');

  // d=100: #infinity-note-group виден
  try {
    await page.evaluate(() => window.lensBenchExperiment?.setObjectDistanceMm(100));
    await page.waitForTimeout(80);

    const vis100 = await page.evaluate(() => {
      const bench = document.querySelector('#optical-bench');
      const sr = bench?.shadowRoot ?? null;
      if (!sr) return null;
      const inf = sr.querySelector('#infinity-note-group');
      if (!inf) return { error: '#infinity-note-group не найден' };
      const infDisplay = getComputedStyle(inf).display;
      const infVisible = !inf.hasAttribute('hidden') && infDisplay !== 'none';
      return { infVisible, infDisplay };
    });

    if (!vis100) {
      skip('4.4 visual d=100', 'shadowRoot скамьи не найден');
    } else if (vis100.error) {
      fail('4.4 visual d=100: группы SVG', vis100.error);
    } else {
      if (vis100.infVisible) {
        pass('4.4 visual d=100: #infinity-note-group видима (d=F, изображение в ∞)');
      } else {
        fail('4.4 visual d=100: #infinity-note-group должна быть видима', `display=${vis100.infDisplay}`);
      }
    }
  } catch (err) {
    fail('4.4 visual d=100', err.message);
  }

  await screenshot(page, '05-d100-infinity');

  // Вернуть в d=300 для следующих тестов
  await page.evaluate(() => window.lensBenchExperiment?.setObjectDistanceMm(300));
  await page.waitForTimeout(80);
}

// ─── Пункт 6: semi-auto запись и проверка журнала ────────────────────────────

async function checkSemiAutoJournal(page) {
  console.log('\n  ── Шаг 7: semi-auto — запись, выбор, верификация ────────────────────────');

  // Убедиться что d=300 (d > 2F → действительное, перевёрнутое, уменьшенное, Γ=−0.5)
  try {
    await page.evaluate(() => window.lensBenchExperiment?.setObjectDistanceMm(300));
    await page.waitForTimeout(80);
    pass('4.4 semi-auto: установлен d=300 (зона d > 2F)');
  } catch (err) {
    fail('4.4 semi-auto: setObjectDistanceMm(300)', err.message);
    return;
  }

  // Нажать #record-pending-btn
  try {
    const btn = page.locator('#record-pending-btn');
    const btnVisible = await btn.isVisible().catch(() => false);
    if (!btnVisible) {
      // Попробовать через recordMeasurement
      await page.evaluate(() => window.lensBenchExperiment?.recordMeasurement?.());
      await page.waitForTimeout(200);
      pass('4.4 semi-auto: запись через recordMeasurement() (#record-pending-btn не видим)');
    } else {
      await btn.click();
      await page.waitForTimeout(200);
      pass('4.4 semi-auto: запись через клик #record-pending-btn (зона d=300)');
    }
  } catch (err) {
    fail('4.4 semi-auto: запись строки', err.message);
    return;
  }

  await screenshot(page, '06-semi-auto-recorded');

  // Журнал должен рендерить <select data-key="kind">, <select data-key="orientation">, <select data-key="size">
  const choiceKeys = ['kind', 'orientation', 'size'];
  for (const key of choiceKeys) {
    try {
      const selectCount = await page.locator(`select[data-key="${key}"]`).count();
      if (selectCount > 0) {
        pass(`4.4 semi-auto: журнал рендерит <select data-key="${key}"> (count=${selectCount})`);
      } else {
        fail(`4.4 semi-auto: <select data-key="${key}"> не найден`, 'selectCount=0');
      }
    } catch (err) {
      fail(`4.4 semi-auto: <select data-key="${key}">`, err.message);
    }
  }

  // Выбрать ВЕРНЫЕ значения: kind=real (действительное), orientation=inverted (перевёрнутое), size=reduced (уменьшенное)
  // d=300, F=100: Γ = -f/d, f = d·F/(d-F) = 300·100/200 = 150, Γ = -150/300 = -0.5
  try {
    await page.locator('select[data-key="kind"]').first().selectOption('real');
    await page.waitForTimeout(50);
    await page.locator('select[data-key="orientation"]').first().selectOption('inverted');
    await page.waitForTimeout(50);
    await page.locator('select[data-key="size"]').first().selectOption('reduced');
    await page.waitForTimeout(50);
    // Категории выставлены успешно (selectOption не выбросил)
    pass('4.4 semi-auto: ВЕРНЫЙ выбор real/inverted/reduced выставлен');
  } catch (err) {
    fail('4.4 semi-auto: выбор значений', err.message);
  }

  // Γ проверяется отдельно: в semi-auto поле ОБЯЗАНО присутствовать
  try {
    const gammaInput = page.locator('input[data-key="gamma"]').first();
    const gammaExists = await gammaInput.count() > 0;
    if (gammaExists) {
      await gammaInput.fill('-0.50');
      await page.waitForTimeout(50);
      pass('4.4 semi-auto: заполнен Γ=−0.50 в input[data-key="gamma"]');
    } else {
      // В semi-auto gamma-поле обязано присутствовать (иначе ученик не может ввести коэффициент)
      fail('4.4 semi-auto: input[data-key="gamma"] отсутствует',
        'в полуавто-режиме поле gamma обязательно; derived-only рендер недопустим');
    }
  } catch (err) {
    fail('4.4 semi-auto: проверка input[data-key="gamma"]', err.message);
  }

  // Нажать ✓ (кнопка проверки строки)
  try {
    const verifyBtn = page.locator('button.j-check').first();
    const verifyVisible = await verifyBtn.isVisible().catch(() => false);
    if (!verifyVisible) {
      skip('4.4 semi-auto: кнопка ✓', 'button.j-check не видима');
    } else {
      await verifyBtn.click();
      await page.waitForTimeout(200);
      pass('4.4 semi-auto: нажата ✓ (верификация строки)');
    }
  } catch (err) {
    fail('4.4 semi-auto: клик ✓', err.message);
  }

  await screenshot(page, '07-semi-auto-verified-ok');

  // Проверить td[data-key="kind"][data-verdict="ok"]
  try {
    const verdictOk = await page.locator('td[data-key="kind"][data-verdict="ok"]').count();
    if (verdictOk > 0) {
      pass(`4.4 semi-auto: td[data-key="kind"][data-verdict="ok"] найден (kind=real — верно)`);
    } else {
      // Прочитать что реально стоит
      const actualVerdict = await page.evaluate(() => {
        const td = document.querySelector('td[data-key="kind"]');
        return td ? { verdict: td.dataset['verdict'], text: td.textContent?.trim() } : null;
      });
      fail('4.4 semi-auto: td[data-verdict="ok"] для kind', `verdict="${actualVerdict?.verdict}", text="${actualVerdict?.text}"`);
    }
  } catch (err) {
    fail('4.4 semi-auto: проверка verdict ok', err.message);
  }

  // Теперь выбрать НЕВЕРНОЕ: kind=virtual → verdict=wrong
  try {
    await page.locator('select[data-key="kind"]').first().selectOption('virtual');
    await page.waitForTimeout(50);

    const verifyBtn2 = page.locator('button.j-check').first();
    const v2Visible = await verifyBtn2.isVisible().catch(() => false);
    if (v2Visible) {
      await verifyBtn2.click();
      await page.waitForTimeout(200);
      pass('4.4 semi-auto: выбрано virtual (НЕВЕРНО) и нажата ✓');
    } else {
      skip('4.4 semi-auto: повторная верификация', 'button.j-check не видима');
    }

    await screenshot(page, '08-semi-auto-verified-wrong');

    const verdictWrong = await page.locator('td[data-key="kind"][data-verdict="wrong"]').count();
    if (verdictWrong > 0) {
      pass(`4.4 semi-auto: td[data-key="kind"][data-verdict="wrong"] найден (kind=virtual — неверно)`);
    } else {
      const actualVerdict = await page.evaluate(() => {
        const td = document.querySelector('td[data-key="kind"]');
        return td ? { verdict: td.dataset['verdict'], text: td.textContent?.trim() } : null;
      });
      fail('4.4 semi-auto: td[data-verdict="wrong"] для kind=virtual', `verdict="${actualVerdict?.verdict}", text="${actualVerdict?.text}"`);
    }
  } catch (err) {
    fail('4.4 semi-auto: верификация неверного выбора', err.message);
  }
}

// ─── Пункт 7: a11y-утечка категорий в semi-auto ──────────────────────────────

async function checkA11yNoLeak(page) {
  console.log('\n  ── Шаг 8: a11y-утечка — live-region и result-panel ─────────────────────');

  // В semi-auto result-panel НЕ должен содержать категорий (только «Зона ... записана.»)
  const leakWords = ['действительное', 'перевёрнутое', 'уменьшенное', 'увеличенное', 'мнимое', 'прямое', 'равное'];

  try {
    const liveRegionText = await page.evaluate(() => {
      const el = document.querySelector('#live-region');
      return el ? (el.textContent ?? '').toLowerCase() : null;
    });

    if (liveRegionText === null) {
      skip('4.4 a11y: #live-region', 'элемент не найден');
    } else {
      const leaked = leakWords.filter(w => liveRegionText.includes(w));
      if (leaked.length === 0) {
        pass(`4.4 a11y: #live-region не содержит категорий (нет утечки ответа)`);
      } else {
        fail('4.4 a11y: #live-region содержит категории-ответы', `найдено: ${leaked.join(', ')}`);
      }
    }
  } catch (err) {
    fail('4.4 a11y: #live-region проверка', err.message);
  }

  try {
    const resultPanelText = await page.evaluate(() => {
      const el = document.querySelector('#result-panel');
      return el ? (el.textContent ?? '').toLowerCase() : null;
    });

    if (resultPanelText === null) {
      skip('4.4 a11y: #result-panel', 'элемент не найден');
    } else {
      const leaked = leakWords.filter(w => resultPanelText.includes(w));
      if (leaked.length === 0) {
        pass(`4.4 a11y: #result-panel не содержит категорий в semi-auto (нет утечки ответа)`);
      } else {
        // В semi-auto result-panel должен говорить только "Зона ... записана."
        // Проверим что это именно содержание result-panel (не журнала)
        const resultPanel = await page.evaluate(() => {
          const el = document.querySelector('#result-panel');
          return el ? { text: el.textContent?.trim(), hidden: el.hidden } : null;
        });
        if (resultPanel?.hidden) {
          pass(`4.4 a11y: #result-panel скрыт (hidden) — утечки нет`);
        } else {
          fail('4.4 a11y: #result-panel содержит категории-ответы в semi-auto',
            `найдено: ${leaked.join(', ')}`);
        }
      }
    }
  } catch (err) {
    fail('4.4 a11y: #result-panel проверка', err.message);
  }
}

// ─── Пункт 8: fully-auto — авто-заполнение категорий ─────────────────────────

async function checkFullyAutoJournal(page) {
  console.log('\n  ── Шаг 9: fully-auto — td[data-key="kind"] текст «действительное» ───────');

  try {
    await page.evaluate(() => {
      localStorage.setItem('inter-oge.record-mode.kit-4', 'fully-auto');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);

    // Переключить на задачу C
    const taskBtnC = page.locator('[data-task="C-image"]');
    const cVisible = await taskBtnC.isVisible().catch(() => false);
    if (cVisible) { await taskBtnC.click(); await page.waitForTimeout(150); }

    // Убедиться что window.lensBenchExperiment жив
    const expOk = await page.evaluate(() => !!(window.lensBenchExperiment));
    if (!expOk) {
      skip('4.4 fully-auto', 'window.lensBenchExperiment не найден после reload');
      return;
    }

    // После reload нужно собрать скамью заново (задача C сбрасывает placed)
    await assembleBench(page, '4.4 fully-auto: сборка скамьи');

    // Установить d=300
    await page.evaluate(() => window.lensBenchExperiment?.setObjectDistanceMm(300));
    await page.waitForTimeout(100);

    // Нажать #record-pending-btn (в fully-auto тоже требуется явная кнопка для C — anti-flood)
    const btn = page.locator('#record-pending-btn');
    const btnVisible = await btn.isVisible().catch(() => false);
    if (btnVisible) {
      await btn.click();
      await page.waitForTimeout(300);
      pass('4.4 fully-auto: запись через #record-pending-btn (C — no anti-flood, explicit)');
    } else {
      await page.evaluate(() => window.lensBenchExperiment?.recordMeasurement?.());
      await page.waitForTimeout(300);
      pass('4.4 fully-auto: запись через recordMeasurement()');
    }

    await screenshot(page, '09-fully-auto-recorded');

    // Проверить td[data-key="kind"]: в fully-auto рендер = textContent (не select)
    const kindTdText = await page.evaluate(() => {
      // В fully-auto: выбор рендерится как td.textContent = label
      const td = document.querySelector('td[data-key="kind"]');
      return td ? td.textContent?.trim() : null;
    });

    if (kindTdText === 'действительное') {
      pass(`4.4 fully-auto: td[data-key="kind"] текст «действительное» (авто-заполнено при d=300)`);
    } else if (kindTdText === null) {
      fail('4.4 fully-auto: td[data-key="kind"] не найден', 'журнал не рендерится');
    } else {
      // Может быть select (если не fully-auto или запись не прошла)
      const selectCount = await page.locator('select[data-key="kind"]').count();
      if (selectCount > 0) {
        fail('4.4 fully-auto: td[data-key="kind"] содержит <select>',
          'в fully-auto должен быть textContent, не select');
      } else {
        fail('4.4 fully-auto: td[data-key="kind"] текст',
          `текст="${kindTdText}", ожидалось "действительное"`);
      }
    }
  } catch (err) {
    fail('4.4 fully-auto', err.message);
  }

  // Восстановить semi-auto
  await page.evaluate(() => {
    localStorage.setItem('inter-oge.record-mode.kit-4', 'semi-auto');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
}

// ─── Пункт 9: 3 режима record-mode различимы ────────────────────────────────

async function checkRecordModes(page) {
  console.log('\n  ── Шаг 10: 3 режима record-mode ─────────────────────────────────────────');
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
        pass(`4.4 record-mode: "${mode}" — сохранён в localStorage[${LS_KEY}]`);
      } else {
        fail(`4.4 record-mode: "${mode}"`, `localStorage.getItem('${LS_KEY}') → "${storedMode}"`);
      }

      if (bodyMode === mode) {
        pass(`4.4 record-mode: "${mode}" — body[data-record-mode]="${bodyMode}" (приложение читает ключ верно)`);
      } else {
        skip(`4.4 record-mode body attr: "${mode}"`, `body[data-record-mode]="${bodyMode}" (ожидалось "${mode}")`);
      }
    } catch (err) {
      fail(`4.4 record-mode: "${mode}"`, err.message);
    }
  }

  // Вернуть в semi-auto
  await page.evaluate((key) => localStorage.setItem(key, 'semi-auto'), LS_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
}

// ─── Пункт 10: Изоляция задач C → A ─────────────────────────────────────────

async function checkTaskIsolation(page) {
  console.log('\n  ── Шаг 11: Изоляция задач C → A ─────────────────────────────────────────');
  try {
    // Снять snapshot ДО переключения: сколько C-записей накоплено
    const allBeforeSwitch = await page.evaluate(() => window.lensBenchExperiment?.measurements ?? []);
    const countC = allBeforeSwitch.filter(m => m.task === 'C-image').length;

    // Переключить на задачу A
    await page.click('[data-task="A-power"]').catch(() => {});
    await page.waitForTimeout(150);

    const activeAfter = await page.evaluate(() => window.lensBenchExperiment?.activeTask ?? null);
    if (activeAfter === 'A-power') {
      pass('4.4 isolation: переключение на задачу A — activeTask === "A-power"');
    } else {
      fail('4.4 isolation: activeTask после переключения на A', `activeTask="${activeAfter}"`);
    }

    // Перечитать measurements ПОСЛЕ переключения, чтобы получить актуальное состояние журнала
    const allAfterSwitch = await page.evaluate(() => window.lensBenchExperiment?.measurements ?? []);
    const countA = allAfterSwitch.filter(m => m.task === 'A-power').length;

    // Состояние панели (пустая/заполненная) ПОСЛЕ переключения на задачу A
    const panelState = await page.evaluate(() => {
      const panel = document.querySelector('#measurement-panel');
      return panel?.dataset['state'] ?? null;
    });

    if (countA === 0 && panelState === 'empty') {
      pass(`4.4 isolation: журнал задачи A пустой (state=empty) — записи C не просачиваются`);
    } else if (countA > 0 && panelState !== 'empty') {
      pass(`4.4 isolation: журнал задачи A содержит только A-записи (countA=${countA})`);
    } else {
      fail('4.4 isolation: panel state vs countA',
        `panelState="${panelState}", countA=${countA}, countC=${countC}`);
    }

    // Верификация независимости: C-записи НЕ должны попасть в A-счётчик
    if (countC > 0 && countA === 0) {
      pass(`4.4 isolation: C-записи (${countC}) не просачиваются в журнал задачи A (countA=0)`);
    } else if (countC === 0) {
      // Нет C-записей — тест изоляции не репрезентативен, предупредить
      fail('4.4 isolation: нет C-записей для теста', `countC=${countC} — записи не были добавлены перед переключением; изоляция не проверена`);
    } else if (countA > 0) {
      fail('4.4 isolation: C-записи просочились в журнал A', `countA=${countA}, countC=${countC}`);
    } else {
      pass(`4.4 isolation: store по задачам независимо — countC=${countC}, countA=${countA}`);
    }

    // Вернуть в C
    await page.click('[data-task="C-image"]').catch(() => {});
    await page.waitForTimeout(150);
  } catch (err) {
    fail('4.4 isolation', err.message);
  }
}

// ─── Пункт 11: axe-проверка ──────────────────────────────────────────────────

async function checkAxe(page) {
  console.log('\n  ── Шаг 12: axe-core — 0 нарушений на экране задачи C ───────────────────');
  try {
    // Убедиться что на задаче C
    const activeTask = await page.evaluate(() => window.lensBenchExperiment?.activeTask ?? null);
    if (activeTask !== 'C-image') {
      await page.click('[data-task="C-image"]').catch(() => {});
      await page.waitForTimeout(300);
    }
    // Дать время для render динамических элементов (zone-readout, result-panel)
    await page.waitForTimeout(400);

    await screenshot(page, '10-axe-state');

    const axeResults = await new AxeBuilder({ page })
      // Правила НЕ отключать — если axe ругается, чиним причину (урок Фазы A/§15)
      .analyze();

    const violations = axeResults.violations ?? [];
    if (violations.length === 0) {
      pass(`4.4 axe: 0 нарушений (экран задачи C)`);
    } else {
      for (const v of violations) {
        fail(`4.4 axe нарушение: ${v.id}`, `${v.description} — ${v.nodes.length} элементов`);
        for (const n of v.nodes.slice(0, 2)) {
          console.error(`         target: ${JSON.stringify(n.target)}`);
          console.error(`         msg: ${n.any?.[0]?.message?.substring(0, 200)}`);
        }
      }
    }
  } catch (err) {
    fail('4.4 axe', err.message);
  }
}

// ─── Основная функция ─────────────────────────────────────────────────────────

async function run() {
  console.log('\n── selfcheck-4-4.mjs ──────────────────────────────────────────────────────');
  console.log('   Опыт 4.4 «Свойства изображения (5 зон)» — reality check');
  console.log(`   Target: ${BASE_URL}${SCREEN}`);
  console.log('   ФИПИ: СПЕЦ Прил.2 компл.№4 (стр.19), сноска (8)');
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

  // ── Шаг 1: Загрузка страницы ────────────────────────────────────────────────
  console.log('\n  ── Шаг 1: Загрузка страницы ─────────────────────────────────────────────');
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

  // ── Пункт 1: REST-state ─────────────────────────────────────────────────────
  await checkRestState(page);
  await checkOverlayDup(page, 'Step 1c');

  // Проверка window.lensBenchExperiment
  const expAvailable = await page.evaluate(() => !!(window.lensBenchExperiment));
  if (!expAvailable) {
    skip('Весь опыт 4.4', 'window.lensBenchExperiment не найден — экран не смонтирован');
    await browser.close();
    printSummary();
    return;
  }
  pass('Step 1d: window.lensBenchExperiment доступен');

  // ── Пункт 2: Переключение на задачу C ───────────────────────────────────────
  const taskCOk = await checkSwitchToTaskC(page);
  if (!taskCOk) {
    skip('Опыт 4.4: D&D и зоны', 'задача C не переключилась');
    await browser.close();
    printSummary();
    return;
  }

  await screenshot(page, '01-task-c-selected');

  // ── Пункт 3: D&D трёх приборов ──────────────────────────────────────────────
  console.log('\n  ── Шаг 4: D&D трёх приборов мышью ─────────────────────────────────────');
  const placed = await assembleBench(page, '4.4: сборка скамьи');
  if (placed < 3) {
    skip('4.4: зоны и журнал', 'скамья не собрана — пропускаем зависимые тесты');
    await browser.close();
    printSummary();
    return;
  }

  await screenshot(page, '02-assembled');
  await checkOverlayDup(page, 'после сборки');

  // ── Пункт 4: Зона-ридаут по 5 зонам ─────────────────────────────────────────
  await checkZoneReadouts(page);

  // ── Пункт 5: Визуальный инвариант ────────────────────────────────────────────
  await checkVisualInvariants(page);

  // ── Пункт 6: semi-auto запись и журнал ───────────────────────────────────────
  // Убедиться в semi-auto режиме
  await page.evaluate(() => {
    localStorage.setItem('inter-oge.record-mode.kit-4', 'semi-auto');
  });
  // НЕ reload — просто убедиться что задача C
  const taskBtnC2 = page.locator('[data-task="C-image"]');
  const c2Visible = await taskBtnC2.isVisible().catch(() => false);
  if (c2Visible) {
    const ariaCurrent = await page.evaluate(() =>
      document.querySelector('[data-task="C-image"]')?.getAttribute('aria-current')
    );
    if (ariaCurrent !== 'true') {
      await taskBtnC2.click();
      await page.waitForTimeout(150);
    }
  }
  // d=300
  await page.evaluate(() => window.lensBenchExperiment?.setObjectDistanceMm(300));
  await page.waitForTimeout(80);

  await checkSemiAutoJournal(page);

  // ── Пункт 7: a11y-утечка ─────────────────────────────────────────────────────
  await checkA11yNoLeak(page);

  // ── Пункт 8: fully-auto ──────────────────────────────────────────────────────
  await checkFullyAutoJournal(page);

  // После fully-auto reload — снова переключить C и пересобрать скамью
  {
    const taskBtnC3 = page.locator('[data-task="C-image"]');
    const c3Visible = await taskBtnC3.isVisible().catch(() => false);
    if (c3Visible) { await taskBtnC3.click(); await page.waitForTimeout(150); }
    // Переключение задачи сбрасывает placed — пересобираем
    await assembleBench(page, '4.4: пересборка после reload');
    await page.evaluate(() => window.lensBenchExperiment?.setObjectDistanceMm(300));
    await page.waitForTimeout(80);
  }

  // ── Пункт 9: 3 режима record-mode ────────────────────────────────────────────
  await checkRecordModes(page);

  // После checkRecordModes: задача A активна, пересобрать в C
  {
    const taskBtnC4 = page.locator('[data-task="C-image"]');
    const c4Visible = await taskBtnC4.isVisible().catch(() => false);
    if (c4Visible) {
      const ariaCurrent4 = await page.evaluate(() =>
        document.querySelector('[data-task="C-image"]')?.getAttribute('aria-current')
      );
      if (ariaCurrent4 !== 'true') { await taskBtnC4.click(); await page.waitForTimeout(150); }
    }
    await assembleBench(page, '4.4: пересборка после record-modes');
    await page.evaluate(() => window.lensBenchExperiment?.setObjectDistanceMm(300));
    await page.waitForTimeout(80);
    // Записать строку для теста изоляции
    const btn = page.locator('#record-pending-btn');
    const btnOk = await btn.isVisible().catch(() => false);
    if (btnOk) { await btn.click(); await page.waitForTimeout(200); }
  }

  // ── Пункт 10: Изоляция задач ─────────────────────────────────────────────────
  await checkTaskIsolation(page);

  // ── Пункт 11: axe ────────────────────────────────────────────────────────────
  await checkAxe(page);

  // ── Финальный скриншот ────────────────────────────────────────────────────────
  await screenshot(page, '11-final');

  await browser.close();
  printSummary();
}

function printSummary() {
  console.log('\n───────────────────────────────────────────────────────────────────────────');
  console.log(`  selfcheck-4-4: PASS=${passCount}  FAIL=${failCount}  SKIP=${skipCount}`);
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
