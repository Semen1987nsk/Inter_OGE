// Self-check legacy 2-1-spring (localhost:5173) — chain-based реализация.
// Multi-state + REST-state assertion + mental walkthrough.

import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'selfcheck-screens';
mkdirSync(OUT, { recursive: true });

const URL = 'http://localhost:5173/';
const violations = [];
const walkthrough = [];

function log(msg, isError = false) {
  const prefix = isError ? '❌' : '✓';
  console.log(`${prefix} ${msg}`);
  if (isError) violations.push(msg);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();

page.on('pageerror', (e) => log(`PAGE ERROR: ${e.message}`, true));
page.on('console', (msg) => {
  if (msg.type() === 'error') log(`CONSOLE ERR: ${msg.text()}`, true);
});

const HIDE_AT_REST = ['.drop-zone', '.attached-eq.snap-target'];

async function assertRestState(stateName) {
  const visible = await page.evaluate((sels) => {
    const found = [];
    for (const sel of sels) {
      for (const el of document.querySelectorAll(sel)) {
        const cs = getComputedStyle(el);
        if (
          cs.display !== 'none' &&
          cs.visibility !== 'hidden' &&
          parseFloat(cs.opacity) > 0
        ) {
          found.push({
            sel,
            tag: el.tagName,
            id: el.id || '(no id)',
            cls: typeof el.className === 'string' ? el.className : el.className.baseVal,
            opacity: cs.opacity,
            anim: cs.animationName,
          });
        }
      }
    }
    return found;
  }, HIDE_AT_REST);

  if (visible.length === 0) {
    log(`[${stateName}] REST-state PASS — все pulse/glow скрыты`);
  } else {
    log(
      `[${stateName}] REST-state FAIL — видимы ${visible.length}: ${JSON.stringify(visible)}`,
      true,
    );
  }
}

async function fullScreen(name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
}

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// State 0: empty
console.log('\n=== State 0: Empty page ===');
await fullScreen('state-0-empty');
await assertRestState('state-0-empty');
walkthrough.push('Шаг 0: чистый экран, никаких индикаторов drop-zone.');

// State 1: spring
console.log('\n=== State 1: Spring attached ===');
const hasApi = await page.evaluate(() => typeof window.springExperiment?.attachSpringById === 'function');
if (!hasApi) {
  log('window.springExperiment.attachSpringById не найден — fallback API недоступен', true);
}
await page.evaluate(() => window.springExperiment.attachSpringById('spring-k50'));
await page.waitForTimeout(500);
await fullScreen('state-1-spring');
await assertRestState('state-1-spring');
walkthrough.push('Шаг 1: пружина подвешена. drop-zone-bottom hidden.');

// State 2: rod + 3 discs (legacy = chain mode)
console.log('\n=== State 2: Rod + 3 discs (chain) ===');
for (const id of ['rod', 'disc-50', 'disc-20', 'disc-10']) {
  await page.evaluate((eq) => window.springExperiment.attachWeightById(eq), id);
  await page.waitForTimeout(300);
}
await fullScreen('state-2-chain');
await assertRestState('state-2-chain');

// DOM-check
const dom2 = await page.evaluate(() => {
  const wrappers = document.querySelectorAll('.hung-stack .attached-eq');
  return { chainCount: wrappers.length };
});
console.log('chain count:', dom2.chainCount);
if (dom2.chainCount !== 5) log(`chain count mismatch: ${dom2.chainCount} != 5 (spring+rod+3 discs)`, true);

walkthrough.push(
  'Шаг 2: на пружине штанга и 3 диска в цепочке (chain mode). Стопка ' +
    'плотная (после Iter 1 fix). Никаких подсветок в idle.',
);

// State 3: reset
console.log('\n=== State 3: After reset ===');
await page.evaluate(() => window.springExperiment.reset());
await page.waitForTimeout(500);
await fullScreen('state-3-after-reset');
await assertRestState('state-3-after-reset');
walkthrough.push('Шаг 3: всё сброшено, drop-zones опять hidden.');

await browser.close();

console.log('\n═══════════════════════════════════════════════');
console.log('Mental walkthrough (как ученик увидит):');
console.log('═══════════════════════════════════════════════');
walkthrough.forEach((w, i) => console.log(`  ${i}. ${w}`));
console.log('');

if (violations.length === 0) {
  console.log('✅ SELF-CHECK PASS — 0 нарушений legacy.');
} else {
  console.log(`❌ SELF-CHECK FAIL — ${violations.length} нарушени(е/й):`);
  violations.forEach((v) => console.log(`  - ${v}`));
  process.exit(1);
}

const htmlReport = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Self-check legacy</title>
<style>
  body { background: #0d121e; color: #e8eef9; font-family: system-ui; padding: 24px; }
  .state { margin-bottom: 32px; border: 1px solid #333; padding: 16px; border-radius: 8px; }
  .state h2 { margin: 0 0 8px; color: #14b8a6; }
  img { max-width: 100%; border: 1px solid #444; border-radius: 6px; }
  .walk { background: rgba(255, 190, 11, 0.08); padding: 12px; border-radius: 6px; }
  .ok { color: #14b8a6; } .err { color: #ef4444; }
</style></head><body>
<h1>Self-check legacy 2-1-spring (${URL})</h1>
<p class="${violations.length === 0 ? 'ok' : 'err'}">
  ${violations.length === 0 ? '✅ ALL PASS' : `❌ ${violations.length} violations`}
</p>
${['state-0-empty', 'state-1-spring', 'state-2-chain', 'state-3-after-reset']
  .map(
    (n, i) =>
      `<div class="state"><h2>${n}</h2>${walkthrough[i] ? `<p class="walk">${walkthrough[i]}</p>` : ''}<img src="${n}.png"></div>`,
  )
  .join('')}
</body></html>`;
writeFileSync(`${OUT}/report.html`, htmlReport);
console.log(`\n📄 HTML отчёт: file:///${process.cwd().replace(/\\/g, '/')}/${OUT}/report.html`);
