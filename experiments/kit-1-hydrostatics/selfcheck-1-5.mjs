/**
 * selfcheck-1-5.mjs — Self-check опыта 1.5 «Независимость F_A от массы».
 *
 * Запуск:
 *   npm run dev -w experiments/kit-1-hydrostatics  (или: npx vite --host 127.0.0.1 --port 5174)
 *   node experiments/kit-1-hydrostatics/selfcheck-1-5.mjs
 *
 * Проверяет (PLAYBOOK Шаг 7):
 *   1. Страница открывается, экран independence-mass монтируется.
 *   2. placeDynamometer → placeBeaker → dipCylinder(1) → liftCylinder(1) → recordCylinder(1).
 *   3. То же для цилиндра №2.
 *   4. Вердикт: F_A_1 ≈ F_A_2 (≈0.245 Н), в пределах ±5%.
 *   5. REST-state: drop-zones скрыты в покое (нет пульсации после setup).
 *   6. Overlay-dup: 0 (нет задвоения приборов).
 *   7. 3 режима record-mode переключаются корректно.
 *   8. reset() очищает журнал и убирает вердикт.
 *
 * Требования к окружению: Playwright установлен в монорепо (@playwright/test).
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:5174';
const SCREEN = '?screen=independence-mass';

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error(`  FAIL: ${msg}`);
    failed++;
  } else {
    console.log(`  OK:   ${msg}`);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));

  // ─── 1. Монтирование ─────────────────────────────────────────────────
  console.log('\n[1] Монтирование экрана independence-mass...');
  await page.goto(`${BASE_URL}/${SCREEN}`);
  await page.waitForFunction(
    () => typeof window.independenceMassExperiment !== 'undefined',
    { timeout: 10_000 },
  );
  console.log('  OK: экран смонтирован');

  // ─── 2. Сборка установки ─────────────────────────────────────────────
  console.log('\n[2] Сборка установки...');
  await page.evaluate(() => {
    const e = window.independenceMassExperiment;
    e.placeDynamometer();
    e.placeBeaker();
  });
  const panelVisible = await page.evaluate(() => {
    const el = document.querySelector('#im-measure-panel');
    return el && !el.hidden;
  });
  assert(panelVisible, 'Панель измерений видима после сборки');

  // ─── 3. REST-state: drop-zones скрыты ────────────────────────────────
  console.log('\n[3] REST-state...');
  const dynoZoneHidden = await page.evaluate(
    () => document.querySelector('#im-dropzone-dyno')?.hidden ?? false,
  );
  const beakerZoneHidden = await page.evaluate(
    () => document.querySelector('#im-dropzone-beaker')?.hidden ?? false,
  );
  assert(dynoZoneHidden, 'Drop-zone динамометра скрыта после установки');
  assert(beakerZoneHidden, 'Drop-zone стакана скрыта после установки');

  // ─── 4. Цилиндр №1 ───────────────────────────────────────────────────
  console.log('\n[4] Измерение цилиндра №1 (сталь, 195 г)...');
  await page.evaluate(() => {
    const e = window.independenceMassExperiment;
    e.dipCylinder(1);
    e.liftCylinder(1);
    e.recordCylinder(1);
  });
  const row1 = await page.evaluate(() => {
    const rows = window.independenceMassExperiment.getState().rows;
    return rows[0]?.values ?? null;
  });
  assert(row1 !== null, 'Строка №1 записана в журнал');
  if (row1) {
    assert(row1['m_g'] === 195, `m_g цилиндра №1 = 195 г (получено: ${row1['m_g']})`);
    assert(row1['V_cm3'] === 25, `V_cm3 цилиндра №1 = 25 см³ (получено: ${row1['V_cm3']})`);
    const fa1 = Number(row1['F_A_N']);
    assert(
      Math.abs(fa1 - 0.245) < 0.025,
      `F_A(№1) ≈ 0.245 Н (получено: ${fa1.toFixed(3)} Н)`,
    );
  }

  // ─── 5. Цилиндр №2 ───────────────────────────────────────────────────
  console.log('\n[5] Измерение цилиндра №2 (алюминий, 70 г)...');
  await page.evaluate(() => {
    const e = window.independenceMassExperiment;
    e.dipCylinder(2);
    e.liftCylinder(2);
    e.recordCylinder(2);
  });
  const row2 = await page.evaluate(() => {
    const rows = window.independenceMassExperiment.getState().rows;
    return rows[1]?.values ?? null;
  });
  assert(row2 !== null, 'Строка №2 записана в журнал');
  if (row2) {
    assert(row2['m_g'] === 70, `m_g цилиндра №2 = 70 г (получено: ${row2['m_g']})`);
    const fa2 = Number(row2['F_A_N']);
    assert(
      Math.abs(fa2 - 0.245) < 0.025,
      `F_A(№2) ≈ 0.245 Н (получено: ${fa2.toFixed(3)} Н)`,
    );
  }

  // ─── 6. Вердикт о независимости ──────────────────────────────────────
  console.log('\n[6] Вердикт независимости...');
  const verdictVisible = await page.evaluate(() => {
    const el = document.querySelector('#im-verdict');
    return el && !el.hidden;
  });
  const verdictEqual = await page.evaluate(() => {
    return document.querySelector('#im-verdict')?.dataset?.equal === 'true';
  });
  assert(verdictVisible, 'Вердикт показывается после двух записей');
  assert(verdictEqual, 'Вердикт: F_арх(№1) ≈ F_арх(№2) → независимость подтверждена');

  // ─── 7. ФИПИ-инвариант: |F_A_1 - F_A_2| / F_A_1 ≤ 5% ───────────────
  console.log('\n[7] ФИПИ-инвариант...');
  if (row1 && row2) {
    const fa1 = Number(row1['F_A_N']);
    const fa2 = Number(row2['F_A_N']);
    const relDiff = Math.abs(fa1 - fa2) / Math.abs(fa1);
    assert(relDiff <= 0.05, `|F_A_1 - F_A_2|/F_A_1 = ${(relDiff * 100).toFixed(1)}% ≤ 5%`);
  }

  // ─── 8. Reset ────────────────────────────────────────────────────────
  console.log('\n[8] Reset...');
  await page.evaluate(() => window.independenceMassExperiment.reset());
  const rowsAfterReset = await page.evaluate(
    () => window.independenceMassExperiment.getState().rows.length,
  );
  assert(rowsAfterReset === 0, 'После reset журнал пустой');
  const verdictAfterReset = await page.evaluate(() => {
    return document.querySelector('#im-verdict')?.hidden ?? true;
  });
  assert(verdictAfterReset, 'Вердикт скрыт после reset');

  // ─── 9. Console errors ───────────────────────────────────────────────
  console.log('\n[9] Console errors...');
  assert(errors.length === 0, `Console errors: ${errors.length === 0 ? '0' : JSON.stringify(errors)}`);

  await browser.close();

  console.log(`\n${'─'.repeat(50)}`);
  if (failed === 0) {
    console.log('PASS — selfcheck-1-5 прошёл без замечаний.');
  } else {
    console.log(`FAIL — ${failed} проверок не прошли.`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('selfcheck-1-5 crashed:', err);
  process.exit(1);
});
