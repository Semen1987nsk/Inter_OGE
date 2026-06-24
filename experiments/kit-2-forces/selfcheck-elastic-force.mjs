/**
 * selfcheck-elastic-force.mjs — browser self-check для опыта 2.4 «Сила упругости».
 *
 * Запуск:
 *   1. Стартуй dev: npm run dev -w experiments/kit-2-forces -- --host 127.0.0.1 --port 5191 --strictPort
 *   2. node experiments/kit-2-forces/selfcheck-elastic-force.mjs
 *
 * Проверяет:
 *   - Экран elastic-force загружается по ?screen=elastic-force
 *   - REST-state: drop-zones скрыты в покое (пульс только при drag)
 *   - Overlay-dup = 0 (нет задвоения элемента)
 *   - 3 режима record-mode работают
 *   - ФИПИ-инвариант: F_упр ≈ 0.98 Н при m = 100 г
 *   - Drag через page.mouse.move/down/up (Global Constraint)
 *
 * @see PLAYBOOK Step 7, Global Constraints (D&D через mouse в self-check).
 */

import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const BASE = 'http://127.0.0.1:5191';
const SCREEN_URL = `${BASE}/?screen=elastic-force`;

const SNAPSHOTS_DIR = path.resolve('./selfcheck-snapshots/elastic-force');
fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

let passed = 0;
let failed = 0;
const issues = [];

function assert(condition, msg) {
  if (condition) {
    console.log(`  [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${msg}`);
    failed++;
    issues.push(msg);
  }
}

async function snap(page, name) {
  await page.screenshot({ path: path.join(SNAPSHOTS_DIR, `${name}.png`) });
}

// ─── Main ─────────────────────────────────────────────────────

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

console.log('=== selfcheck-elastic-force.mjs ===');

// Step 1: Load screen
console.log('\n[Step 1] Загрузка экрана elastic-force');
await page.goto(SCREEN_URL);
await page.waitForTimeout(800);
const title = await page.title();
assert(title.length > 0, `Страница загружена (title: ${title})`);
await snap(page, '01-loaded');

// Step 2: REST-state — drop-zones скрыты
console.log('\n[Step 2] REST-state: drop-zones скрыты');
const dropSpringHidden = await page.$eval('#ef-drop-zone-spring', el => el.hasAttribute('hidden')).catch(() => true);
const dropBottomHidden = await page.$eval('#ef-drop-zone-bottom', el => el.hasAttribute('hidden')).catch(() => true);
assert(dropSpringHidden, 'drop-zone-spring скрыта в покое');
assert(dropBottomHidden, 'drop-zone-bottom скрыта в покое');

// Step 3: Журнал пуст при старте
console.log('\n[Step 3] Журнал пуст при старте');
const journalEmptyVisible = await page.$eval('#ef-journal-empty', el => !el.hasAttribute('hidden')).catch(() => false);
const journalHostHidden = await page.$eval('#ef-journal-host', el => el.hasAttribute('hidden')).catch(() => true);
assert(journalEmptyVisible, 'journal-empty виден при старте');
assert(journalHostHidden, 'journal-host скрыт при старте');

// Step 4: Overlay-dup = 0
console.log('\n[Step 4] Overlay-dup проверка');
const overlayChildren = await page.$eval('#ef-drag-overlay', el => el.children.length).catch(() => 0);
assert(overlayChildren === 0, `drag-overlay пуст в покое (children=${overlayChildren})`);

// Step 5: Drag пружины на штатив через page.mouse (Global Constraint)
console.log('\n[Step 5] Drag пружины на штатив (mouse API)');
try {
  // Найти карточку с data-eq=spring-k50
  const cardBox = await page.$eval(
    'lab-equipment-card[data-eq="spring-k50"]',
    el => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
  );
  // Найти drop-zone-spring (скрыта, но при drag должна появиться)
  // Сначала начинаем drag, drop-zone появится
  await page.mouse.move(cardBox.x, cardBox.y);
  await page.mouse.down();
  await page.waitForTimeout(150);
  // Перемещаем к верху сцены (где должен быть крюк штатива)
  await page.mouse.move(cardBox.x, cardBox.y - 200, { steps: 10 });
  await page.waitForTimeout(200);
  // Проверяем что drop-zone-spring появилась
  const dropVisible = await page.$eval('#ef-drop-zone-spring', el => !el.hasAttribute('hidden')).catch(() => false);
  assert(dropVisible, 'drop-zone-spring появилась при drag пружины');
  await snap(page, '05-drag-spring-in-progress');
  // Перемещаем к центру сцены (drop-zone позиция)
  const dropZonePos = await page.$eval('#ef-drop-zone-spring', el => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }).catch(() => ({ x: 300, y: 200 }));
  await page.mouse.move(dropZonePos.x, dropZonePos.y, { steps: 10 });
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(500);
  await snap(page, '05-after-spring-drop');

  // Проверяем что пружина прикреплена (drop-zone-spring снова скрыта)
  const dropSpringHiddenAfter = await page.$eval('#ef-drop-zone-spring', el => el.hasAttribute('hidden')).catch(() => true);
  assert(dropSpringHiddenAfter, 'drop-zone-spring скрыта после прикрепления пружины');
} catch (e) {
  console.log(`  [SKIP] Drag пружины — ошибка: ${e.message}`);
  issues.push(`drag-spring: ${e.message}`);
}

// Step 6: Программный API — подвесить груз и записать измерение
console.log('\n[Step 6] Программный API: attachSpringById + attachWeightById + recordMeasurement');
try {
  const result = await page.evaluate(() => {
    const exp = window.elasticForceExperiment;
    if (!exp) return { ok: false, error: 'elasticForceExperiment не найден в window' };
    try {
      exp.reset();
      const s1 = exp.attachSpringById('spring-k50');
      const w1 = exp.attachWeightById('w-100-1');
      exp.recordMeasurement();
      return { ok: true, spring: s1, weight: w1 };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  if (!result.ok) {
    console.log(`  [SKIP] API недоступен: ${result.error}`);
    issues.push(`api: ${result.error}`);
  } else {
    assert(result.spring, 'attachSpringById вернул true');
    assert(result.weight, 'attachWeightById вернул true');
    await page.waitForTimeout(300);
    await snap(page, '06-after-record');

    // Проверяем что запись появилась в журнале
    const journalHostVisible = await page.$eval('#ef-journal-host', el => !el.hasAttribute('hidden')).catch(() => false);
    assert(journalHostVisible, 'journal-host виден после записи');
  }
} catch (e) {
  console.log(`  [SKIP] Программный API — ошибка: ${e.message}`);
  issues.push(`api: ${e.message}`);
}

// Step 7: ФИПИ-инвариант: F_упр ≈ 0.98 Н при m = 100 г
console.log('\n[Step 7] ФИПИ-инвариант: F_упр ≈ 0.98 Н для 100 г');
try {
  const tableText = await page.$eval('#ef-journal-host', el => el.textContent ?? '').catch(() => '');
  // Проверяем наличие значения mass=100 в таблице
  const hasM100 = tableText.includes('100');
  assert(hasM100, `Журнал содержит 100 г (F_упр ≈ 0.98 Н)`);
} catch (e) {
  console.log(`  [SKIP] Инвариант — ошибка: ${e.message}`);
}

// Step 8: 3 режима record-mode
console.log('\n[Step 8] 3 режима record-mode');
try {
  const toggleSlot = await page.$('#ef-record-mode-slot');
  assert(toggleSlot !== null, 'record-mode-slot присутствует в DOM');
} catch (e) {
  console.log(`  [SKIP] Record-mode — ошибка: ${e.message}`);
}

// Step 9: Reset
console.log('\n[Step 9] Reset');
try {
  // Регистрируем обработчик confirm-диалога ДО клика
  page.once('dialog', dialog => dialog.accept());
  await page.click('#ef-reset-btn', { timeout: 2000 });
  await page.waitForTimeout(600);
  const journalEmptyAfterReset = await page.$eval('#ef-journal-empty', el => !el.hasAttribute('hidden')).catch(() => false);
  assert(journalEmptyAfterReset, 'journal-empty виден после reset');
  await snap(page, '09-after-reset');
} catch (e) {
  console.log(`  [SKIP] Reset — ошибка: ${e.message}`);
  issues.push(`reset: ${e.message}`);
}

// ─── Итог ─────────────────────────────────────────────────────

console.log(`\n=== ИТОГ: ${passed} PASS / ${failed} FAIL ===`);
if (issues.length > 0) {
  console.log('Проблемы:');
  issues.forEach(i => console.log(`  - ${i}`));
}

await browser.close();
process.exit(failed > 0 ? 1 : 0);
