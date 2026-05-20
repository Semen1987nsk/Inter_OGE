// Self-check D&D-механики опыта 1.3 — через РЕАЛЬНОЕ мышиное взаимодействие,
// НЕ через programmatic API (по правилу §13/§26 REFERENCE).
//
// Проверяет:
//   1. Tray содержит 3 карточки (dyno-1, cyl-3, beaker).
//   2. Mouse-drag dyno из card → av-dropzone-dyno: DOM перемещается в mount.
//   3. Mouse-drag cyl-3 → крючок dyno: DOM в cylinder-rig.
//   4. Mouse-drag beaker → под цилиндр: DOM в beaker-mount.
//   5. После полной сборки stepper включается: baseline + 20/40/60 + record.
//   6. Detach-кнопка (×) возвращает компонент в card (parkElement §26).
//   7. REST-state assertion: drop-zones скрыты пока не drag-active.
//   8. drag-overlay-dup защита (§26): после drop в DOM нет «зависших» компонентов.

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const PORT = process.env.AV_PORT || '5174';
const URL = `http://localhost:${PORT}/?screen=archimedes-volume`;

mkdirSync('selfcheck-1-3-dnd-out', { recursive: true });

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
  await page.screenshot({ path: `selfcheck-1-3-dnd-out/${name}.png`, fullPage: false });
}

/** Real mouse drag: from source center → to target center, with intermediate steps. */
async function realDrag(sourceSelector, targetSelector) {
  const source = await page.locator(sourceSelector).boundingBox();
  const target = await page.locator(targetSelector).boundingBox();
  if (!source) throw new Error(`source not found: ${sourceSelector}`);
  if (!target) throw new Error(`target not found: ${targetSelector}`);
  const sx = source.x + source.width / 2;
  const sy = source.y + source.height / 2;
  const tx = target.x + target.width / 2;
  const ty = target.y + target.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  // несколько промежуточных шагов чтобы пройти DRAG_THRESHOLD и активировать drag
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const x = sx + ((tx - sx) * i) / steps;
    const y = sy + ((ty - sy) * i) / steps;
    await page.mouse.move(x, y, { steps: 3 });
  }
  await page.mouse.up();
  await page.waitForTimeout(120);
}

await page.goto(URL, { waitUntil: 'networkidle', timeout: 10000 });
await page.waitForTimeout(500);

// Очистка persisted режима → default semi-auto
await page.evaluate(() => {
  localStorage.setItem('inter-oge.record-mode.kit-1', 'fully-auto');
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);

// ─── Проверка 1: tray + REST-state ──────────────────────────────────
console.log('\n── Проверка 1: tray и REST-state ──');

const initial = await page.evaluate(() => {
  const dropzones = [...document.querySelectorAll('.av-dropzone')];
  const visibleDz = dropzones.filter((el) => {
    const cs = getComputedStyle(el);
    if (el.hasAttribute('hidden')) return false;
    if (cs.display === 'none') return false;
    // Хинт скрыт цветом transparent, но контейнер виден — это нормально.
    return true;
  });
  return {
    cardsCount: document.querySelectorAll('.equipment-panel lab-equipment-card').length,
    dropzonesCount: dropzones.length,
    dropzonesActive: dropzones.filter((d) => d.dataset.dropActive === 'true').length,
    bodyHasDragActive: document.body.classList.contains('has-drag-active'),
    dynoInCard: document.querySelector('#av-card-dyno #av-dyno') !== null,
    cylInCard: document.querySelector('#av-card-cyl #av-cyl') !== null,
    beakerInCard: document.querySelector('#av-card-beaker #av-beaker') !== null,
  };
});
console.log(JSON.stringify(initial, null, 2));

if (initial.cardsCount !== 3) fail(`в tray должно быть 3 карточки, получено ${initial.cardsCount}`);
if (initial.dropzonesCount < 2) fail('drop-zones не найдены');
if (initial.dropzonesActive !== 0) fail(`REST: drop-zones активны без drag (${initial.dropzonesActive})`);
if (initial.bodyHasDragActive) fail('REST: body.has-drag-active установлен без drag');
if (!initial.dynoInCard) fail('dyno должен изначально лежать в карточке');
if (!initial.cylInCard) fail('cyl-3 должен изначально лежать в карточке');
if (!initial.beakerInCard) fail('beaker должен изначально лежать в карточке');

if (errors.length === 0) ok('Tray = 3 карточки, REST-state чистый, компоненты в cards');
await shot('state-0-tray-rest');

// ─── Проверка 2: Mouse-drag dyno → av-dropzone-dyno ──────────────────
console.log('\n── Проверка 2: mouse-drag dyno → dropzone ──');

await realDrag('#av-card-dyno', '#av-dropzone-dyno');

const afterDynoDrop = await page.evaluate(() => ({
  dynoInMount: document.querySelector('#av-dyno-mount #av-dyno') !== null,
  dynoInCard: document.querySelector('#av-card-dyno #av-dyno') !== null,
  staged: window.archimedesVolumeExperiment.getState().staged,
  // §26: проверка drag-overlay-dup — после drop в DOM не должно быть «лишних» dyno
  totalDynoElements: document.querySelectorAll('lab-dynamometer').length,
}));
console.log(JSON.stringify(afterDynoDrop, null, 2));

if (!afterDynoDrop.dynoInMount) fail('после drop dyno НЕ переместился в #av-dyno-mount');
if (afterDynoDrop.dynoInCard) fail('после drop dyno ВСЁ ЕЩЁ в карточке (drag-overlay-dup §26)');
if (!afterDynoDrop.staged.dyno) fail('state.staged.dyno должен быть true');
if (afterDynoDrop.totalDynoElements !== 1)
  fail(`drag-overlay-dup §26: в DOM ${afterDynoDrop.totalDynoElements} lab-dynamometer, ожидалось 1`);

if (errors.length === 0) ok('Mouse-drag dyno: DOM перемещён, нет дублей');
await shot('state-1-dyno-mounted');

// ─── Проверка 3: Mouse-drag cyl-3 → крючок dyno ──────────────────────
console.log('\n── Проверка 3: mouse-drag cyl-3 → крючок dyno ──');

await realDrag('#av-card-cyl', '#av-dyno-mount');

const afterCylDrop = await page.evaluate(() => ({
  cylInRig: document.querySelector('#av-cylinder-rig #av-cyl') !== null,
  cylInCard: document.querySelector('#av-card-cyl #av-cyl') !== null,
  totalCylinders: document.querySelectorAll('lab-metal-weight').length,
  staged: window.archimedesVolumeExperiment.getState().staged,
}));
console.log(JSON.stringify(afterCylDrop, null, 2));

if (!afterCylDrop.cylInRig) fail('cyl не переместился в #av-cylinder-rig');
if (afterCylDrop.cylInCard) fail('cyl всё ещё в карточке');
if (afterCylDrop.totalCylinders !== 1)
  fail(`drag-overlay-dup §26: в DOM ${afterCylDrop.totalCylinders} lab-metal-weight, ожидалось 1`);
if (!afterCylDrop.staged.cyl) fail('state.staged.cyl должен быть true');

if (errors.length === 0) ok('Mouse-drag cyl: DOM перемещён, нет дублей');
await shot('state-2-cyl-attached');

// ─── Проверка 4: Mouse-drag beaker → под цилиндр ──────────────────────
console.log('\n── Проверка 4: mouse-drag beaker → под цилиндр ──');

await realDrag('#av-card-beaker', '#av-dropzone-beaker');

const afterBeakerDrop = await page.evaluate(() => ({
  beakerInMount: document.querySelector('#av-beaker-mount #av-beaker') !== null,
  beakerInCard: document.querySelector('#av-card-beaker #av-beaker') !== null,
  totalBeakers: document.querySelectorAll('lab-beaker').length,
  staged: window.archimedesVolumeExperiment.getState().staged,
}));
console.log(JSON.stringify(afterBeakerDrop, null, 2));

if (!afterBeakerDrop.beakerInMount) fail('beaker не переместился в #av-beaker-mount');
if (afterBeakerDrop.beakerInCard) fail('beaker всё ещё в карточке');
if (afterBeakerDrop.totalBeakers !== 1)
  fail(`drag-overlay-dup §26: в DOM ${afterBeakerDrop.totalBeakers} lab-beaker, ожидалось 1`);
if (!afterBeakerDrop.staged.beaker) fail('state.staged.beaker должен быть true');

if (errors.length === 0) ok('Mouse-drag beaker: DOM перемещён, нет дублей');
await shot('state-3-beaker-placed');

// ─── Проверка 5: АВТО-baseline + drag-by-thread цилиндра ───
// Кнопка baseline убрана из UI (была за нижним краем viewport — фидбек 2026-05-17
// «не опускается цилиндр в стакан»). Теперь pAirN автоматически фиксируется
// при placeBeaker через rAF×2 → calibrate + fixateBaseline.
console.log('\n── Проверка 5: авто-baseline + drag-by-thread (mouse) ──');

// Дай авто-калибровке доиграть rAF×2 chain
await page.evaluate(() => new Promise(r =>
  requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 100)))));

const afterAuto = await page.evaluate(() => ({
  dragTipVisible: !document.querySelector('#av-drag-tip').hidden,
  cylinderCanDrag: document.querySelector('#av-cylinder-rig').dataset.canDrag,
  pAirN: window.archimedesVolumeExperiment.getState().pAirN,
}));
if (afterAuto.pAirN === null) fail('pAirN должен авто-зафиксироваться при placeBeaker (UX-fix)');
if (afterAuto.cylinderCanDrag !== 'true') fail('cylinder-rig data-can-drag должен сразу быть true после авто-baseline');
if (!afterAuto.dragTipVisible) fail('drag-tip должен появиться после авто-baseline');

// Геометрия калибруется динамически: MM_TO_PX вычисляется по реальной body-height.
// Цилиндр body ≈ 122 px (--w-size: 105px), 80 mm → 1.525 px/mm.
// Для +20 мм нужно ~30 px.
async function dragCylinderBy(deltaY) {
  const rig = await page.locator('#av-cylinder-rig').boundingBox();
  const sx = rig.x + rig.width / 2;
  const sy = rig.y + rig.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(sx, sy + (deltaY * i) / steps, { steps: 2 });
  }
  await page.mouse.up();
  await page.waitForTimeout(150);
}

await dragCylinderBy(30); // ≈ 20 мм
const after20 = await page.evaluate(() => window.archimedesVolumeExperiment.getState().hMm);
if (Math.abs(after20 - 20) > 5) fail(`drag на 30px ожидался h≈20, получено ${after20}`);

await dragCylinderBy(30); // дополнительные +20 ≈ 40 мм
const after40 = await page.evaluate(() => window.archimedesVolumeExperiment.getState().hMm);
if (Math.abs(after40 - 40) > 5) fail(`drag на ещё 30px ожидался h≈40, получено ${after40}`);

await dragCylinderBy(30); // +20 = 60 мм
const after60 = await page.evaluate(() => window.archimedesVolumeExperiment.getState().hMm);
if (Math.abs(after60 - 60) > 5) fail(`drag на ещё 30px ожидался h≈60, получено ${after60}`);

const journalRows = await page.evaluate(() => window.archimedesVolumeExperiment.getState().rows.length);
if (journalRows !== 3) fail(`fully-auto: 3 drag'а к снэп-точкам должны дать 3 записи, получено ${journalRows}`);

// Reality-check: уровень воды стабилен (стакан полный, вытеснение
// «переливается» — это реалистично и убирает glitch «вода поднимается
// раньше времени» когда цилиндр ещё в воздухе из-за layout-zazora).
const beakerLevel = await page.evaluate(() =>
  document.querySelector('#av-beaker').getAttribute('level'),
);
const levelN = Number(beakerLevel);
if (levelN < 180) fail(`baseWaterMl должно быть ≥180 (почти полный), получено ${beakerLevel}`);

// Reality-check: НЕТ выделения текста при drag (text-selection bug).
const selText = await page.evaluate(() => window.getSelection().toString());
if (selText.length > 0) fail(`text-selection bug: после drag выделен текст «${selText.slice(0, 40)}»`);

if (errors.length === 0 || (after20 && after40 && after60))
  ok(`drag-by-thread mouse: h ≈ ${after20}→${after40}→${after60} мм, snap к 20/40/60 ФИПИ ✓, уровень воды ${beakerLevel} мл (стабильный, без glitch)`);
await shot('state-4-measured');

// ─── Проверка 6: Detach-кнопка возвращает в card (parkElement §26) ────
console.log('\n── Проверка 6: detach × возвращает в card ──');

await page.click('#av-detach-beaker');
await page.waitForTimeout(150);

const afterDetach = await page.evaluate(() => ({
  beakerInCard: document.querySelector('#av-card-beaker #av-beaker') !== null,
  beakerInMount: document.querySelector('#av-beaker-mount #av-beaker') !== null,
  staged: window.archimedesVolumeExperiment.getState().staged,
  totalBeakers: document.querySelectorAll('lab-beaker').length,
}));
console.log(JSON.stringify(afterDetach, null, 2));

if (!afterDetach.beakerInCard) fail('после detach beaker НЕ вернулся в card (parkElement §26 нарушен)');
if (afterDetach.beakerInMount) fail('после detach beaker всё ещё в mount');
if (afterDetach.staged.beaker) fail('state.staged.beaker должен стать false после detach');
if (afterDetach.totalBeakers !== 1)
  fail(`после detach: в DOM ${afterDetach.totalBeakers} beaker, ожидалось 1`);

if (errors.length === 0 || afterDetach.beakerInCard) ok('Detach × возвращает в card, parkElement §26 работает');
await shot('state-5-beaker-detached');

// ─── Проверка 7: повторный mouse-drag после detach ───────────────────
console.log('\n── Проверка 7: повторный drag после detach ──');

await realDrag('#av-card-beaker', '#av-dropzone-beaker');
const afterReDrop = await page.evaluate(() => ({
  beakerInMount: document.querySelector('#av-beaker-mount #av-beaker') !== null,
  totalBeakers: document.querySelectorAll('lab-beaker').length,
}));
if (!afterReDrop.beakerInMount) fail('после повторного drag beaker не вернулся в mount');
if (afterReDrop.totalBeakers !== 1) fail(`повторный drag: дубль (${afterReDrop.totalBeakers} beaker)`);
if (errors.length === 0) ok('Повторный mouse-drag после detach работает без дублей');

// ─── Проверка 8: Reset очищает всё ───────────────────────────────────
console.log('\n── Проверка 8: Reset ──');

await page.click('#av-reset-btn');
await page.waitForTimeout(200);

const afterReset = await page.evaluate(() => ({
  staged: window.archimedesVolumeExperiment.getState().staged,
  rows: window.archimedesVolumeExperiment.getState().rows.length,
  dynoInCard: document.querySelector('#av-card-dyno #av-dyno') !== null,
  cylInCard: document.querySelector('#av-card-cyl #av-cyl') !== null,
  beakerInCard: document.querySelector('#av-card-beaker #av-beaker') !== null,
}));
if (afterReset.staged.dyno || afterReset.staged.cyl || afterReset.staged.beaker)
  fail(`после reset staged не очищен: ${JSON.stringify(afterReset.staged)}`);
if (afterReset.rows !== 0) fail(`после reset журнал не пуст: ${afterReset.rows} строк`);
if (!afterReset.dynoInCard) fail('после reset dyno не вернулся в card');
if (!afterReset.cylInCard) fail('после reset cyl не вернулся в card');
if (!afterReset.beakerInCard) fail('после reset beaker не вернулся в card');
if (afterReset.staged && !afterReset.staged.dyno && !afterReset.staged.cyl && !afterReset.staged.beaker && afterReset.rows === 0)
  ok('Reset очищает staged + журнал + возвращает все приборы в tray');
await shot('state-6-after-reset');

// ─── Итог ─────────────────────────────────────────────────────────
await browser.close();

console.log('\n══════════════════════════════════════════════════════');
if (errors.length === 0) {
  console.log('✅ ВСЕ D&D ПРОВЕРКИ ОПЫТА 1.3 PASS');
  console.log('• Mouse-drag (НЕ programmatic) работает для всех 3 приборов');
  console.log('• drag-overlay-dup §26 защита работает (нет дублей DOM)');
  console.log('• parkElement-паттерн §26: detach возвращает в card');
  console.log('• REST-state чистый: drop-zones активны только при drag');
  console.log('• Reset возвращает приборы в tray + очищает журнал');
} else {
  console.log(`❌ FAIL: ${errors.length} ошибок`);
  errors.forEach((e) => console.log('  - ' + e));
  process.exit(1);
}
