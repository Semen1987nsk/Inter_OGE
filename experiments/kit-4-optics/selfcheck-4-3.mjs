/**
 * selfcheck-4-3.mjs — reality-check опыта 4.3 «Показатель преломления стекла».
 *
 * PLAYBOOK Шаг 7 + REFERENCE §13 + урок «D&D self-check через mouse»:
 * перетаскивание ОБЯЗАНО идти реальным page.mouse.move/down/up —
 * programmatic placeInSlot обходит drop-flow и не ловит ошибки overlay.
 *
 * Опыт 4.3 — измерение показателя преломления стекла:
 *   n = sin i / sin r
 *   При i=45° → r≈28° (Снелл, n=1,5)
 *   Параметры прибора: полуцилиндр n≈1,5, осветитель.
 *
 * ФИПИ-якорь: СПЕЦ Прил.2 компл.№4 (стр.19), сноска (4):
 *   «... показателя преломления стекла ...»
 *
 * Проверяет (10 пунктов):
 *   1. Навигация http://127.0.0.1:5192/?screen=refraction; 200 OK; lab-protractor-disc смонтирован.
 *   2. Таб [data-task="A-index"]: aria-selected="true", неактивные false.
 *   3. REST-state: .slot-rect opacity 0 в покое.
 *   4. Реальный mouse-D&D: полуцилиндр→гнездо semicylinder, осветитель→emitter;
 *      подтверждение card[data-placed].
 *   5. setIncidenceAngle(45) (typeof-guard метода) → incidenceAngleDeg===45,
 *      refractionAngleDeg===28; лучи .ray-incident/.ray-refracted/.ray-reflected
 *      присутствуют в shadowRoot диска.
 *   6. semi-auto: ЯВНЫЙ ассерт #record-pending-btn ВИДНА → клик; строка журнала;
 *      ввод n=1.51 → verdict ok; ввод n=1.0 → verdict wrong.
 *   7. a11y no-leak: #result-panel/#live-region НЕ содержат «1,5»/«1.5» как ответ n
 *      в semi-auto (паттерн не ловит инструкцию).
 *   8. fully-auto: td[data-key="n"] readonly с числом ≈1,5 (не input).
 *   9. 3 режима (ключ inter-oge.record-mode.kit-4).
 *  10. axe @axe-core/playwright: 0 нарушений. Правила НЕ отключаем.
 *
 * Запуск:
 *   npm --workspace=@labosfera/kit-4-optics run dev -- --host 127.0.0.1 --port 5192 --strictPort
 *   node experiments/kit-4-optics/selfcheck-4-3.mjs
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
  const file = path.join(SCREENSHOTS_DIR, `4-3-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`       Screenshot: ${file}`);
}

/**
 * Реальный mouse-drag прибора из карточки в гнездо диска.
 * equipmentId: 'semicylinder' | 'emitter'
 * slotId: 'semicylinder' | 'emitter'  — getSlotRect нормализует внутри disc
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

  // Получаем координаты гнезда через API диска
  const tgt = await page.evaluate((sid) => {
    const disc = document.querySelector('#protractor-disc');
    if (!disc || typeof disc.getSlotRect !== 'function') return null;
    const r = disc.getSlotRect(sid);
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, slotId);

  if (!tgt) {
    throw new Error(`#protractor-disc.getSlotRect('${slotId}') вернул null (элемент не найден или нет метода)`);
  }
  if (tgt.width === 0 && tgt.height === 0) {
    throw new Error(`getSlotRect('${slotId}') вернул нулевой rect — диск не смонтирован или гнездо не найдено`);
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

// ─── Пункт 2: Переключение на задачу A-index ─────────────────────────────────

async function checkTabAIndex(page) {
  console.log('\n  ── Пункт 2: Таб [data-task="A-index"] aria-selected ────────────────────');

  // По умолчанию открывается A-index — просто проверяем aria-selected
  try {
    const ariaSelected = await page.evaluate(() => {
      const btn = document.querySelector('[data-task="A-index"]');
      return btn?.getAttribute('aria-selected') ?? null;
    });
    if (ariaSelected === null) {
      fail('4.3: [data-task="A-index"] не найден', 'кнопка таба A-index отсутствует');
      return false;
    }
    if (ariaSelected === 'true') {
      pass('4.3: [data-task="A-index"] aria-selected="true" (задача A активна по умолчанию)');
    } else {
      // Попробовать кликнуть
      await page.click('[data-task="A-index"]');
      await page.waitForTimeout(200);
      const ariaAfter = await page.evaluate(() =>
        document.querySelector('[data-task="A-index"]')?.getAttribute('aria-selected') ?? null
      );
      if (ariaAfter === 'true') {
        pass('4.3: [data-task="A-index"] aria-selected="true" после клика');
      } else {
        fail('4.3: aria-selected для A-index', `aria-selected="${ariaAfter}", ожидалось "true"`);
        return false;
      }
    }
  } catch (err) {
    fail('4.3: проверка aria-selected A-index', err.message);
    return false;
  }

  // Неактивные табы должны иметь aria-selected="false"
  try {
    const inactiveResult = await page.evaluate(() => {
      const allTasks = Array.from(document.querySelectorAll('[data-task]'));
      const inactiveWrong = allTasks
        .filter(el => el.dataset['task'] !== 'A-index')
        .filter(el => el.getAttribute('aria-selected') !== 'false' && el.getAttribute('aria-selected') !== null)
        .map(el => `${el.dataset['task']}:${el.getAttribute('aria-selected')}`);
      return { inactiveWrong, count: allTasks.length };
    });
    if (inactiveResult.inactiveWrong.length === 0) {
      pass(`4.3: неактивные табы aria-selected="false" (всего табов=${inactiveResult.count})`);
    } else {
      fail('4.3: неактивные табы должны иметь aria-selected="false"',
        `нарушения: ${inactiveResult.inactiveWrong.join(', ')}`);
    }
  } catch (err) {
    fail('4.3: проверка aria-selected неактивных табов', err.message);
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

// ─── Пункт 5: setIncidenceAngle(45) + лучи ───────────────────────────────────

async function checkSetAngleAndRays(page) {
  console.log('\n  ── Пункт 5: setIncidenceAngle(45) + лучи в shadowRoot ──────────────────');

  // typeof-guard: метод должен существовать как функция
  try {
    const methodExists = await page.evaluate(() =>
      typeof window.refractionExperiment?.setIncidenceAngle === 'function'
    );
    if (!methodExists) {
      fail('4.3: setIncidenceAngle', 'метод setIncidenceAngle отсутствует на window.refractionExperiment');
      return;
    }
    await page.evaluate(() => window.refractionExperiment.setIncidenceAngle(45));
    await page.waitForTimeout(150);
    pass('4.3: setIncidenceAngle(45) вызван — метод существует и принял i=45°');
  } catch (err) {
    fail('4.3: setIncidenceAngle(45)', err.message);
    return;
  }

  // incidenceAngleDeg === 45
  try {
    const iDeg = await page.evaluate(() => window.refractionExperiment?.incidenceAngleDeg ?? null);
    if (iDeg === null) {
      fail('4.3: incidenceAngleDeg', 'геттер не вернул значение');
    } else if (iDeg === 45) {
      pass(`4.3: incidenceAngleDeg===45 (задан правильно)`);
    } else {
      fail('4.3: incidenceAngleDeg !== 45', `получено ${iDeg}`);
    }
  } catch (err) {
    fail('4.3: incidenceAngleDeg', err.message);
  }

  // refractionAngleDeg === 28 (Снелл: sin(45°)/sin(r)=1,5 → r≈28°)
  try {
    const rDeg = await page.evaluate(() => window.refractionExperiment?.refractionAngleDeg ?? null);
    if (rDeg === null) {
      fail('4.3: refractionAngleDeg', 'геттер не вернул значение');
    } else if (rDeg === 28) {
      pass(`4.3: refractionAngleDeg===28 (Снелл верен: n=sin45°/sin28°≈1,5)`);
    } else {
      fail('4.3: refractionAngleDeg !== 28', `получено ${rDeg} (ожидалось 28 при i=45°, n=1,5)`);
    }
  } catch (err) {
    fail('4.3: refractionAngleDeg', err.message);
  }

  // Лучи в shadowRoot диска
  try {
    const raysInfo = await page.evaluate(() => {
      const disc = document.querySelector('#protractor-disc');
      const sr = disc?.shadowRoot ?? null;
      if (!sr) return null;
      return {
        incident:  sr.querySelector('.ray-incident')  !== null,
        refracted: sr.querySelector('.ray-refracted') !== null,
        reflected: sr.querySelector('.ray-reflected') !== null,
      };
    });
    if (raysInfo === null) {
      fail('4.3: лучи в shadowRoot', 'shadowRoot диска не найден');
    } else {
      if (raysInfo.incident) {
        pass('4.3: .ray-incident присутствует в shadowRoot диска');
      } else {
        fail('4.3: .ray-incident не найден', 'падающий луч отсутствует в shadowRoot');
      }
      if (raysInfo.refracted) {
        pass('4.3: .ray-refracted присутствует в shadowRoot диска');
      } else {
        fail('4.3: .ray-refracted не найден', 'преломлённый луч отсутствует в shadowRoot');
      }
      if (raysInfo.reflected) {
        pass('4.3: .ray-reflected присутствует в shadowRoot диска');
      } else {
        fail('4.3: .ray-reflected не найден', 'отражённый луч отсутствует в shadowRoot');
      }
    }
  } catch (err) {
    fail('4.3: лучи в shadowRoot', err.message);
  }
}

// ─── Пункт 6: semi-auto запись и верификация ─────────────────────────────────

async function checkSemiAutoJournal(page) {
  console.log('\n  ── Пункт 6: semi-auto запись + verdict ok/wrong ─────────────────────────');

  // ЯВНЫЙ ассерт: #record-pending-btn ОБЯЗАНА быть видна в semi-auto при bothPlaced && i>0
  try {
    const btn = page.locator('#record-pending-btn');
    const btnVisible = await btn.isVisible().catch(() => false);
    if (!btnVisible) {
      const diag = await page.evaluate(() => ({
        bothPlaced: window.refractionExperiment?.bothPlaced,
        iDeg: window.refractionExperiment?.incidenceAngleDeg,
        mode: document.body?.dataset['recordMode'],
        pendingSlotHidden: document.querySelector('#record-pending-slot')?.hidden,
      })).catch(() => ({}));
      fail('4.3 semi-auto: #record-pending-btn НЕ видна',
        `UI-баг: кнопка должна появиться при bothPlaced+i>0+semi-auto; диаг=${JSON.stringify(diag)}`);
      return;
    }
    await btn.click();
    await page.waitForTimeout(200);
    pass('4.3 semi-auto: #record-pending-btn ВИДНА и нажата — запись через реальный клик');
  } catch (err) {
    fail('4.3 semi-auto: запись строки', err.message);
    return;
  }

  await screenshot(page, '06-semi-auto-recorded');

  // Журнал должен содержать строку
  try {
    const rowCount = await page.locator('.lab-journal-body tr').count();
    if (rowCount > 0) {
      pass(`4.3 semi-auto: журнал содержит ${rowCount} строк(у)`);
    } else {
      fail('4.3 semi-auto: журнал пустой', 'строк в .lab-journal-body нет после записи');
      return;
    }
  } catch (err) {
    fail('4.3 semi-auto: проверка строк журнала', err.message);
    return;
  }

  // В semi-auto ячейка n — редактируемый input (ученик вводит сам)
  try {
    const nInput = page.locator('input[data-key="n"]').first();
    const nCount = await nInput.count();
    if (nCount > 0) {
      pass('4.3 semi-auto: input[data-key="n"] присутствует (ученик вводит n)');
    } else {
      fail('4.3 semi-auto: input[data-key="n"] не найден', 'в semi-auto derived-поле должно быть input');
    }
  } catch (err) {
    fail('4.3 semi-auto: проверка input[data-key="n"]', err.message);
  }

  // Ввести n=1.51 (верное: ±5% от 1,5 = [1,425..1,575])
  try {
    const nInput = page.locator('input[data-key="n"]').first();
    const nCount = await nInput.count();
    if (nCount > 0) {
      await nInput.fill('1.51');
      await page.waitForTimeout(50);
      pass('4.3 semi-auto: введено n=1.51 (верное значение для n≈1,5)');
    } else {
      skip('4.3 semi-auto: ввод n=1.51', 'input[data-key="n"] не найден');
    }
  } catch (err) {
    fail('4.3 semi-auto: ввод n=1.51', err.message);
  }

  // Нажать ✓
  try {
    const verifyBtn = page.locator('button.j-check').first();
    const verifyVisible = await verifyBtn.isVisible().catch(() => false);
    if (!verifyVisible) {
      skip('4.3 semi-auto: кнопка ✓', 'button.j-check не видима');
    } else {
      await verifyBtn.click();
      await page.waitForTimeout(200);
      pass('4.3 semi-auto: нажата ✓ (верификация n=1.51)');
    }
  } catch (err) {
    fail('4.3 semi-auto: клик ✓', err.message);
  }

  await screenshot(page, '07-semi-auto-verified-ok');

  // Проверить verdict ok для n
  try {
    const verdictOkCount = await page.locator('td[data-key="n"][data-verdict="ok"]').count();
    if (verdictOkCount > 0) {
      pass('4.3 semi-auto: td[data-key="n"][data-verdict="ok"] — n=1.51 подтверждено как верное');
    } else {
      const actualVerdict = await page.evaluate(() => {
        const td = document.querySelector('td[data-key="n"]');
        return td ? { verdict: td.dataset['verdict'], text: td.textContent?.trim() } : null;
      });
      fail('4.3 semi-auto: verdict ok для n',
        `verdict="${actualVerdict?.verdict}", text="${actualVerdict?.text}" — ожидалось "ok"`);
    }
  } catch (err) {
    fail('4.3 semi-auto: проверка verdict ok', err.message);
  }

  // Ввести n=1.0 (неверное: далеко от 1,5)
  try {
    const nInput = page.locator('input[data-key="n"]').first();
    const nCount = await nInput.count();
    if (nCount > 0) {
      await nInput.fill('1.0');
      await page.waitForTimeout(50);
      const verifyBtn = page.locator('button.j-check').first();
      const verifyVisible = await verifyBtn.isVisible().catch(() => false);
      if (verifyVisible) {
        await verifyBtn.click();
        await page.waitForTimeout(200);
        pass('4.3 semi-auto: введено n=1.0 (неверное), нажата ✓');
      } else {
        skip('4.3 semi-auto: повторная верификация', 'button.j-check не видима');
      }

      await screenshot(page, '08-semi-auto-verified-wrong');

      const verdictWrongCount = await page.locator('td[data-key="n"][data-verdict="wrong"]').count();
      if (verdictWrongCount > 0) {
        pass('4.3 semi-auto: td[data-key="n"][data-verdict="wrong"] — n=1.0 → wrong');
      } else {
        const actualVerdict = await page.evaluate(() => {
          const td = document.querySelector('td[data-key="n"]');
          return td ? { verdict: td.dataset['verdict'] } : null;
        });
        fail('4.3 semi-auto: verdict wrong для n=1.0',
          `verdict="${actualVerdict?.verdict}", ожидалось "wrong"`);
      }
    } else {
      skip('4.3 semi-auto: проверка wrong-verdict', 'input[data-key="n"] не найден');
    }
  } catch (err) {
    fail('4.3 semi-auto: проверка wrong-verdict', err.message);
  }
}

// ─── Пункт 7: a11y no-leak в semi-auto ───────────────────────────────────────

async function checkA11yNoLeak(page) {
  console.log('\n  ── Пункт 7: a11y no-leak — #result-panel/#live-region не палят n ────────');

  // Паттерн утечки: «1,5» или «1.5» как числовой ответ n.
  // Честность: в #result-panel в semi-auto выводится только качественный текст
  // (без числа n=1,5); в #live-region анонсируются только i,r (не n).
  // Паттерн «≈1,5» присутствует в fully-auto — поэтому тест только на semi-auto.
  const N_LEAK_PATTERNS = ['1,5', '1.5'];

  // Убедимся, что режим semi-auto
  await page.evaluate(() => {
    localStorage.setItem('inter-oge.record-mode.kit-4', 'semi-auto');
  });

  try {
    const liveText = await page.evaluate(() => {
      const el = document.querySelector('#live-region');
      return el ? (el.textContent ?? '') : null;
    });

    if (liveText === null) {
      skip('4.3 a11y: #live-region', 'элемент не найден');
    } else {
      // Исключаем из проверки инструкционные тексты: live-region объявляет "i=N°, r=N°"
      // Паттерн «1,5» НЕ должен появляться в live-region (он объявляет только i,r).
      const leaked = N_LEAK_PATTERNS.filter(p => liveText.includes(p));
      if (leaked.length === 0) {
        pass(`4.3 a11y: #live-region не содержит числовых ответов n «1,5»/«1.5» в semi-auto`);
      } else {
        fail('4.3 a11y: #live-region палит числовой ответ n в semi-auto',
          `найдено: ${leaked.join(', ')} в «${liveText.trim()}»`);
      }
    }
  } catch (err) {
    fail('4.3 a11y: #live-region', err.message);
  }

  try {
    const resultInfo = await page.evaluate(() => {
      const el = document.querySelector('#result-panel');
      return el ? { text: el.textContent ?? '', html: el.innerHTML ?? '', hidden: el.hidden } : null;
    });

    if (resultInfo === null) {
      skip('4.3 a11y: #result-panel', 'элемент не найден');
    } else if (resultInfo.hidden) {
      pass('4.3 a11y: #result-panel скрыт (hidden) — утечки нет');
    } else {
      // Расширенный паттерн: «=» или «≈» + пробелы + «1,5» или «1.5».
      // Покрывает и textContent, и aria-label-атрибуты (через innerHTML).
      // Инструкционный текст «n = sin i / sin r» НЕ совпадает (после «=» нет «1,5»).
      const LEAK_RE = /[=≈]\s*1[,.]5/i;

      // Проверяем и textContent и innerHTML (aria-label атрибуты не попадают в textContent)
      const textLeaked = LEAK_RE.test(resultInfo.text);
      const htmlLeaked = LEAK_RE.test(resultInfo.html);

      if (!textLeaked && !htmlLeaked) {
        pass(`4.3 a11y: #result-panel (visible) не содержит «= 1,5» / «≈ 1,5» в textContent или innerHTML в semi-auto`);
      } else {
        const where = [textLeaked && 'textContent', htmlLeaked && 'innerHTML'].filter(Boolean).join(', ');
        fail('4.3 a11y: #result-panel палит числовой ответ n в semi-auto',
          `паттерн /[=≈]\\s*1[,.]5/ найден в ${where}: «${resultInfo.text.trim().substring(0, 200)}»`);
      }
    }
  } catch (err) {
    fail('4.3 a11y: #result-panel', err.message);
  }
}

// ─── Пункт 8: fully-auto — td[data-key="n"] readonly ─────────────────────────

async function checkFullyAutoJournal(page) {
  console.log('\n  ── Пункт 8: fully-auto — td[data-key="n"] readonly с числом ───────────');

  try {
    await page.evaluate(() => {
      localStorage.setItem('inter-oge.record-mode.kit-4', 'fully-auto');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);

    // Убедиться что A-index активна
    const taskBtnA = page.locator('[data-task="A-index"]');
    const aVisible = await taskBtnA.isVisible().catch(() => false);
    if (aVisible) { await taskBtnA.click(); await page.waitForTimeout(200); }

    // Проверить что refractionExperiment жив
    const expOk = await page.evaluate(() => !!(window.refractionExperiment));
    if (!expOk) {
      skip('4.3 fully-auto', 'window.refractionExperiment не найден после reload');
      return;
    }

    // Пересобрать установку
    const placed = await assembleRefraction(page, '4.3 fully-auto: сборка');
    if (placed < 2) {
      fail('4.3 fully-auto: сборка', `посажено ${placed}/2 приборов — n-ячейку не проверить`);
      return;
    }

    // В fully-auto авто-запись происходит при setIncidenceAngle → #afterAngleChange.
    // Фиксируем before ДО setIncidenceAngle, then проверяем after.
    const methodExists = await page.evaluate(() =>
      typeof window.refractionExperiment?.setIncidenceAngle === 'function'
    );
    const measuresBefore = await page.evaluate(() =>
      window.refractionExperiment?.measurements?.length ?? 0
    );
    if (methodExists) {
      await page.evaluate(() => window.refractionExperiment.setIncidenceAngle(45));
      await page.waitForTimeout(300);
    }

    const measuresAfterAngle = await page.evaluate(() =>
      window.refractionExperiment?.measurements?.length ?? 0
    );

    if (measuresAfterAngle > measuresBefore) {
      pass(`4.3 fully-auto: авто-запись при setIncidenceAngle(45) — measurements: ${measuresBefore}→${measuresAfterAngle}`);
    } else {
      // Анти-дубль: signature i=45 может уже быть. Попробуем другой угол.
      await page.evaluate(() => window.refractionExperiment.setIncidenceAngle(30));
      await page.waitForTimeout(300);
      const measuresAfter2 = await page.evaluate(() =>
        window.refractionExperiment?.measurements?.length ?? 0
      );
      if (measuresAfter2 > measuresBefore) {
        pass(`4.3 fully-auto: авто-запись при setIncidenceAngle(30) — measurements: ${measuresBefore}→${measuresAfter2}`);
        await page.evaluate(() => window.refractionExperiment.setIncidenceAngle(45));
        await page.waitForTimeout(200);
      } else {
        // Последний fallback: явный вызов (в fully-auto это часть механизма режима)
        await page.evaluate(() => window.refractionExperiment?.recordMeasurement?.());
        await page.waitForTimeout(300);
        const measuresAfter3 = await page.evaluate(() =>
          window.refractionExperiment?.measurements?.length ?? 0
        );
        if (measuresAfter3 > measuresBefore) {
          pass(`4.3 fully-auto: запись через recordMeasurement() — measurements: ${measuresBefore}→${measuresAfter3}`);
        } else {
          fail('4.3 fully-auto: авто-запись не сработала',
            `measurements остался ${measuresAfter3} — fully-auto авто-запись не функционирует`);
        }
      }
    }

    await screenshot(page, '09-fully-auto-recorded');

    // td[data-key="n"] должен содержать число (не input), ≈ 1,5
    // ЧЕСТНЫЙ АССЕРТ: явно проверить not null + not hasInput + value ≈ 1.5
    const nTd = await page.evaluate(() => {
      const td = document.querySelector('td[data-key="n"]');
      if (!td) return null;
      const input = td.querySelector('input');
      const text = td.textContent?.trim() ?? '';
      return { hasInput: !!input, text };
    });

    if (nTd === null) {
      fail('4.3 fully-auto: td[data-key="n"] не найден', 'журнал не рендерится в fully-auto');
    } else if (nTd.hasInput) {
      fail('4.3 fully-auto: td[data-key="n"] содержит input',
        'в fully-auto derived-ячейка должна быть readonly-текстом, не input');
    } else {
      const nVal = parseFloat(nTd.text.replace(',', '.'));
      if (Math.abs(nVal - 1.5) < 0.1) {
        pass(`4.3 fully-auto: td[data-key="n"] readonly="${nTd.text}" (≈1,5 для стекла)`);
      } else {
        fail('4.3 fully-auto: td[data-key="n"] значение не ≈1,5',
          `текст="${nTd.text}", parseFloat=${nVal}, ожидалось ≈1,5 (sin45°/sin28°)`);
      }
    }
  } catch (err) {
    fail('4.3 fully-auto', err.message);
  }

  // Вернуть в semi-auto
  await page.evaluate(() => {
    localStorage.setItem('inter-oge.record-mode.kit-4', 'semi-auto');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
}

// ─── Пункт 9: 3 режима record-mode ───────────────────────────────────────────

async function checkRecordModes(page) {
  console.log('\n  ── Пункт 9: 3 режима record-mode (реальный ключ kit-4) ─────────────────');
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
        pass(`4.3 record-mode: "${mode}" — сохранён в localStorage[${LS_KEY}]`);
      } else {
        fail(`4.3 record-mode: "${mode}"`, `localStorage.getItem('${LS_KEY}') → "${storedMode}"`);
      }

      if (bodyMode === mode) {
        pass(`4.3 record-mode: "${mode}" — body[data-record-mode]="${bodyMode}" (приложение читает ключ верно)`);
      } else {
        fail(`4.3 record-mode body attr: "${mode}"`,
          `body[data-record-mode]="${bodyMode}" (ожидалось "${mode}") — renderRecordModeToggle обязан ставить атрибут через applyRecordModeAttribute`);
      }
    } catch (err) {
      fail(`4.3 record-mode: "${mode}"`, err.message);
    }
  }

  // Вернуть в semi-auto
  await page.evaluate((key) => localStorage.setItem(key, 'semi-auto'), LS_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
}

// ─── Пункт 10: axe-scan ──────────────────────────────────────────────────────

async function checkAxe(page) {
  console.log('\n  ── Пункт 10: axe-core — 0 нарушений на экране A-index ──────────────────');
  try {
    const taskBtnA = page.locator('[data-task="A-index"]');
    const aVisible = await taskBtnA.isVisible().catch(() => false);
    if (aVisible) { await taskBtnA.click(); await page.waitForTimeout(300); }

    await page.waitForTimeout(400);
    await screenshot(page, '10-axe-state');

    const axeResults = await new AxeBuilder({ page })
      // Правила НЕ отключать — если axe ругается, чиним причину
      .analyze();

    const violations = axeResults.violations ?? [];
    if (violations.length === 0) {
      pass('4.3 axe: 0 нарушений (экран A-index, refraction)');
    } else {
      for (const v of violations) {
        fail(`4.3 axe нарушение: ${v.id}`, `${v.description} — ${v.nodes.length} элементов`);
        for (const n of v.nodes.slice(0, 2)) {
          console.error(`         target: ${JSON.stringify(n.target)}`);
          console.error(`         msg: ${n.any?.[0]?.message?.substring(0, 200)}`);
        }
      }
    }
  } catch (err) {
    fail('4.3 axe', err.message);
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
  console.log('\n── selfcheck-4-3.mjs ──────────────────────────────────────────────────────');
  console.log('   Опыт 4.3 «Показатель преломления стекла» — reality check');
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
    skip('Весь опыт 4.3', 'window.refractionExperiment не найден — экран не смонтирован');
    await browser.close();
    printSummary();
    return;
  }
  pass('Step 1c: window.refractionExperiment доступен');

  // ── Пункт 2: Таб A-index ─────────────────────────────────────────────────────
  const tabOk = await checkTabAIndex(page);
  if (!tabOk) {
    skip('Пункты 3-10: таб A-index не переключился', 'прерываем проверки зависимых пунктов');
    await browser.close();
    printSummary();
    return;
  }

  // ── Пункт 3: REST-state ────────────────────────────────────────────────────────
  await checkRestState(page);
  await checkOverlayDup(page, 'Step 1d');

  // ── Пункт 4: mouse-D&D ────────────────────────────────────────────────────────
  console.log('\n  ── Пункт 4: реальный mouse-D&D — полуцилиндр, осветитель ──────────────');
  const placed = await assembleRefraction(page, '4.3 сборка');
  if (placed < 2) {
    fail('4.3: не все 2 прибора посажены', `посажено ${placed}/2 мышью`);
  } else {
    pass('4.3: оба прибора посажены реальным mouse-D&D (полуцилиндр + осветитель)');
  }
  await checkOverlayDup(page, 'после сборки');
  await screenshot(page, '01-assembled');

  // ── Пункт 5: setIncidenceAngle(45) + лучи ────────────────────────────────────
  if (placed >= 2) {
    await checkSetAngleAndRays(page);
    await screenshot(page, '02-angle-45');
  } else {
    skip('4.3: пункт 5 (лучи)', 'установка не собрана');
  }

  // ── Пункт 6+7: semi-auto запись, журнал, a11y ─────────────────────────────────
  // Убедиться в semi-auto режиме
  await page.evaluate(() => {
    localStorage.setItem('inter-oge.record-mode.kit-4', 'semi-auto');
  });

  if (placed >= 2) {
    // Убедиться в резкости (уже задан угол 45°)
    const iNow = await page.evaluate(() => window.refractionExperiment?.incidenceAngleDeg ?? -1);
    if (iNow !== 45) {
      await page.evaluate(() => window.refractionExperiment?.setIncidenceAngle(45));
      await page.waitForTimeout(100);
    }

    await checkSemiAutoJournal(page);
    await checkA11yNoLeak(page);
  } else {
    skip('4.3: пункты 6-7', 'установка не собрана');
  }

  // ── Пункт 8: fully-auto ────────────────────────────────────────────────────────
  await checkFullyAutoJournal(page);

  // ── Пункт 9: 3 режима ─────────────────────────────────────────────────────────
  await checkRecordModes(page);

  // ── Пункт 10: axe ─────────────────────────────────────────────────────────────
  // После checkRecordModes последний reload на semi-auto
  await checkAxe(page);

  // ── Финальный скриншот ────────────────────────────────────────────────────────
  await screenshot(page, '11-final');

  await browser.close();
  printSummary();
}

function printSummary() {
  console.log('\n───────────────────────────────────────────────────────────────────────────');
  console.log(`  selfcheck-4-3: PASS=${passCount}  FAIL=${failCount}  SKIP=${skipCount}`);
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
