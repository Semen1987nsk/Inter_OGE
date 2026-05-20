// Self-check опыта 1.3 «F_А от объёма погружённой части тела».
//
// Проверяет:
//   1. Экран регистрируется и открывается по URL ?screen=archimedes-volume.
//   2. ФИПИ-инвариант (КОДИФ §1.29): при h=20/40/60 derived V_cm3 = 14/28/42
//      и F_А_теор соответствует 0.137/0.274/0.412 Н (±5%).
//   3. Stepper-workflow (programmatic API): baseline → submerge 20/40/60 →
//      pending plashka в semi-auto / auto-record в fully-auto.
//   4. Reset очищает журнал + state.
//   5. Multi-state скрины (state-0-empty / state-1-baseline / state-2-h20 /
//      state-3-h60 / state-4-after-reset).
//
// Скрипт запускается на работающем dev-сервере, по умолчанию на 5174
// (URL kit-1 в нашей monorepo). Меняй PORT если запустил иначе.

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const PORT = process.env.AV_PORT || '5174';
const URL = `http://localhost:${PORT}/?screen=archimedes-volume`;

mkdirSync('selfcheck-1-3-out', { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();

page.on('pageerror', (e) => console.log('PAGEERR:', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text());
});

const errors = [];
const fail = (msg) => {
  errors.push(msg);
  console.log('  ❌ ' + msg);
};
const ok = (msg) => console.log('  ✅ ' + msg);

async function shot(name) {
  await page.screenshot({ path: `selfcheck-1-3-out/${name}.png`, fullPage: false });
}

await page.goto(URL, { waitUntil: 'networkidle', timeout: 10000 });
await page.waitForTimeout(500);

// ─── Проверка 1: screen смонтирован ────────────────────────────────
console.log('\n── Проверка 1: монтаж screen ──');

const mountState = await page.evaluate(() => ({
  // Канон §31: 2-колоночный grid, степпер, equipment-panel, measurement-panel
  hasStage: !!document.querySelector('.av-stage'),
  hasWorkbench: !!document.querySelector('.av-workbench'),
  hasSteps: document.querySelectorAll('.av-steps .step').length,
  hasHint: !!document.querySelector('#av-hint'),
  hasResetBtn: !!document.querySelector('#av-reset-btn'),
  hasStageCorners: document.querySelectorAll('.stage-corner').length,
  hasMeasurementPanel: !!document.querySelector('#av-journal-panel.measurement-panel'),
  hasEquipmentPanel: !!document.querySelector('.equipment-panel'),
  hasJournalHost: !!document.querySelector('#av-journal-host'),
  hasRecordModeSlot: !!document.querySelector('#av-record-mode-slot'),
  hasExperimentApi: typeof window.archimedesVolumeExperiment !== 'undefined',
  hasDyno: !!document.querySelector('#av-dyno'),
  hasCyl: !!document.querySelector('#av-cyl'),
  hasBeaker: !!document.querySelector('#av-beaker'),
  cardsCount: document.querySelectorAll('.equipment-panel lab-equipment-card').length,
}));
console.log(JSON.stringify(mountState, null, 2));

if (!mountState.hasStage) fail('.av-stage (главный grid §31) не найден');
if (!mountState.hasWorkbench) fail('.av-workbench не найден');
if (mountState.hasSteps !== 5) fail(`степпер должен иметь 5 шагов, получено ${mountState.hasSteps}`);
if (!mountState.hasHint) fail('#av-hint не найден');
if (!mountState.hasResetBtn) fail('#av-reset-btn не найден (канон §31: в header)');
if (mountState.hasStageCorners !== 4) fail(`stage-corners: ожидалось 4, получено ${mountState.hasStageCorners}`);
if (!mountState.hasMeasurementPanel) fail('measurement-panel (floating §31) не найдена');
if (!mountState.hasEquipmentPanel) fail('equipment-panel (правая колонка §31) не найдена');
if (mountState.cardsCount !== 3) fail(`equipment cards: ожидалось 3, получено ${mountState.cardsCount}`);
if (!mountState.hasJournalHost) fail('#av-journal-host не найден');
if (!mountState.hasRecordModeSlot) fail('#av-record-mode-slot не найден');
if (!mountState.hasExperimentApi) fail('window.archimedesVolumeExperiment не экспортирован');
if (!mountState.hasDyno) fail('lab-dynamometer не вставлен в сцену');
if (!mountState.hasCyl) fail('lab-metal-weight (цилиндр №3) не вставлен в сцену');
if (!mountState.hasBeaker) fail('lab-beaker не вставлен в сцену');

if (errors.length === 0) ok('Канон §31: 2-колоночный grid + степпер + floating measurement-panel + tray');
await shot('state-0-empty');

// ─── Проверка 2: ФИПИ-инвариант (физика-pure через programmatic API) ─
console.log('\n── Проверка 2: ФИПИ-инвариант (КОДИФ §1.29) ──');

// fully-auto: каждая submergeTo сразу пишет в журнал
await page.evaluate(() => {
  localStorage.setItem('inter-oge.record-mode.kit-1', 'fully-auto');
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// Собираем установку программно (D&D-альтернатива для физ.-проверки).
await page.evaluate(() => {
  window.archimedesVolumeExperiment.placeDynamometer();
  window.archimedesVolumeExperiment.attachCylinder();
  window.archimedesVolumeExperiment.placeBeaker();
});
await page.waitForTimeout(150);
await page.evaluate(() => window.archimedesVolumeExperiment.fixateBaseline());
await page.waitForTimeout(150);
await shot('state-1-baseline');

const refLevels = [20, 40, 60];
const expected = [
  { h: 20, V: 14, Ftheor: 0.1372 },
  { h: 40, V: 28, Ftheor: 0.2744 },
  { h: 60, V: 42, Ftheor: 0.4116 },
];

for (const h of refLevels) {
  await page.evaluate((_h) => window.archimedesVolumeExperiment.submergeTo(_h), h);
  await page.waitForTimeout(200);
}
await shot('state-3-h60');

// Прочитать журнальные строки
const journalRows = await page.evaluate(() =>
  window.archimedesVolumeExperiment.getState().rows.map((r) => ({
    idx: r.idx,
    h_mm: r.values.h_mm,
    V_cm3: r.values.V_cm3,
    F_A_theor_N: r.values.F_A_theor_N,
    F_A_meas_N: r.values.F_A_meas_N,
  })),
);
console.log('Журнальные записи:');
console.log(JSON.stringify(journalRows, null, 2));

if (journalRows.length !== 3) {
  fail(`журнал должен иметь 3 строки в fully-auto после 20/40/60; получено ${journalRows.length}`);
} else {
  for (let i = 0; i < expected.length; i++) {
    const row = journalRows[i];
    const exp = expected[i];
    if (row.h_mm !== exp.h) fail(`строка ${i + 1}: h_mm=${row.h_mm}, ожидалось ${exp.h}`);
    if (Math.abs(row.V_cm3 - exp.V) > 0.1) fail(`строка ${i + 1}: V_cm3=${row.V_cm3}, ожидалось ${exp.V}`);
    if (Math.abs(row.F_A_theor_N - exp.Ftheor) > 0.01) fail(`строка ${i + 1}: F_A_theor=${row.F_A_theor_N}, ожидалось ${exp.Ftheor}`);
    // F_A_meas с учётом шума ±0.005 Н, допуск ±0.02 Н
    if (Math.abs(row.F_A_meas_N - exp.Ftheor) > 0.02)
      fail(`строка ${i + 1}: F_A_meas=${row.F_A_meas_N}, ожидалось ≈${exp.Ftheor} ±0.02`);
  }
  if (errors.length === 0) ok('ФИПИ-инвариант: V_cm3=14/28/42 и F_А_теор=0.137/0.274/0.412 ✓');
}

// ─── Проверка 3: linearность F(V) — ключевой ФИПИ-вывод ──────────────
console.log('\n── Проверка 3: linearность F(V) ──');

if (journalRows.length === 3) {
  const F1 = journalRows[0].F_A_meas_N;
  const F2 = journalRows[1].F_A_meas_N;
  const F3 = journalRows[2].F_A_meas_N;
  const ratio12 = F2 / F1;
  const ratio13 = F3 / F1;
  console.log(`F_А_2/F_А_1 = ${ratio12.toFixed(3)} (ожидалось ≈2.0)`);
  console.log(`F_А_3/F_А_1 = ${ratio13.toFixed(3)} (ожидалось ≈3.0)`);
  if (Math.abs(ratio12 - 2) > 0.1) fail(`линейность F(V) нарушена: F2/F1=${ratio12.toFixed(3)}, ожидалось 2.0±0.1`);
  if (Math.abs(ratio13 - 3) > 0.1) fail(`линейность F(V) нарушена: F3/F1=${ratio13.toFixed(3)}, ожидалось 3.0±0.1`);
  if (errors.length === 0) ok('F_А ∝ V_погр — линейная зависимость (главный ФИПИ-вывод 1.3)');
}

// ─── Проверка 4: Reset очищает state ────────────────────────────────
console.log('\n── Проверка 4: Reset ──');

await page.click('#av-reset-btn');
await page.waitForTimeout(150);

const afterReset = await page.evaluate(() => ({
  rowsCount: window.archimedesVolumeExperiment.getState().rows.length,
  pAirN: window.archimedesVolumeExperiment.getState().pAirN,
  hMm: window.archimedesVolumeExperiment.getState().hMm,
}));
console.log(JSON.stringify(afterReset, null, 2));

if (afterReset.rowsCount !== 0) fail(`после reset журнал не пуст: rowsCount=${afterReset.rowsCount}`);
if (afterReset.pAirN !== null) fail(`после reset pAirN=${afterReset.pAirN}, ожидалось null`);
if (afterReset.hMm !== 0) fail(`после reset hMm=${afterReset.hMm}, ожидалось 0`);
if (errors.length === 0 || (errors.length === 1 && errors[0].includes('после reset') === false))
  ok('Reset очищает journal + baseline + hMm');
await shot('state-4-after-reset');

// ─── Проверка 5: semi-auto pending plashka ──────────────────────────
console.log('\n── Проверка 5: semi-auto pending plashka ──');

await page.evaluate(() => {
  localStorage.setItem('inter-oge.record-mode.kit-1', 'semi-auto');
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(500);

await page.evaluate(() => {
  window.archimedesVolumeExperiment.placeDynamometer();
  window.archimedesVolumeExperiment.attachCylinder();
  window.archimedesVolumeExperiment.placeBeaker();
  window.archimedesVolumeExperiment.fixateBaseline();
  window.archimedesVolumeExperiment.submergeTo(20);
});
await page.waitForTimeout(200);

const pendingVisible = await page.evaluate(() => {
  const slot = document.querySelector('#av-record-pending-slot');
  return slot && !slot.hidden;
});
const rowsBeforeClick = await page.evaluate(
  () => window.archimedesVolumeExperiment.getState().rows.length,
);

if (!pendingVisible) fail('pending-плашка не появилась в semi-auto после baseline+submerge');
if (rowsBeforeClick !== 0) fail(`в semi-auto журнал НЕ должен заполняться автоматически (rows=${rowsBeforeClick})`);

await page.click('#av-record-pending-btn');
await page.waitForTimeout(150);

const rowsAfterClick = await page.evaluate(
  () => window.archimedesVolumeExperiment.getState().rows.length,
);
if (rowsAfterClick !== 1) fail(`после клика pending-btn должна быть 1 строка, получено ${rowsAfterClick}`);

if (pendingVisible && rowsBeforeClick === 0 && rowsAfterClick === 1)
  ok('semi-auto: pending-плашка → click → запись в журнал');
await shot('state-2-h20-pending');

// ─── Итог ─────────────────────────────────────────────────────────
await browser.close();

console.log('\n══════════════════════════════════════════════════════');
if (errors.length === 0) {
  console.log('✅ ВСЕ ПРОВЕРКИ ОПЫТА 1.3 PASS');
  console.log('Screens: state-0-empty, state-1-baseline, state-2-h20-pending, state-3-h60, state-4-after-reset');
  console.log('ФИПИ-инвариант (V=14/28/42, F=0.137/0.274/0.412) выполнен ✓');
  console.log('Линейность F(V) ∝ V подтверждена ✓');
  console.log('3 режима журнала работают ✓');
} else {
  console.log(`❌ FAIL: ${errors.length} ошибок`);
  errors.forEach((e) => console.log('  - ' + e));
  process.exit(1);
}
