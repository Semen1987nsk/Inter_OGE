// REAL drag through mouse events — repro user's exact flow.
// Counts visible disc-shaped elements in the canvas after dropping 3 discs.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('probe-out', { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

page.on('pageerror', (e) => console.log('PAGEERR:', e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('CONSOLE-ERR:', msg.text());
});

await page.goto('http://localhost:5176/?screen=spring-stiffness', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Attach spring + composite (no discs yet)
await page.evaluate(() => window.springExperiment.attachSpringById('spring-k50'));
await page.waitForTimeout(400);
await page.evaluate(() => window.springExperiment.attachWeightById('composite-load'));
await page.waitForTimeout(400);

// Now drag each disc by REAL mouse from tray to composite
async function dragDisc(mass) {
  const discRect = await page.evaluate((m) => {
    const tray = document.querySelector('lab-composite-tray');
    const disc = tray.querySelector(`lab-composite-weight[kind="disc"][mass="${m}"]`);
    if (!disc) return null;
    const r = disc.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, mass);

  const compRect = await page.evaluate(() => {
    const c = document.querySelector('.hung-stack lab-composite-weight[kind="composite"]');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });

  if (!discRect || !compRect) {
    console.log(`drag ${mass}: no rects`);
    return;
  }

  await page.mouse.move(discRect.x, discRect.y);
  await page.mouse.down();
  // Smooth movement in steps
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    const x = discRect.x + (compRect.x - discRect.x) * (i / steps);
    const y = discRect.y + (compRect.y - discRect.y) * (i / steps);
    await page.mouse.move(x, y);
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  await page.waitForTimeout(400);
}

for (const m of [10, 20, 50]) {
  await dragDisc(m);
}

// Count discs in canvas (NOT in tray)
const counts = await page.evaluate(() => {
  // 1) DOM-counter: lab-composite-weight[kind="disc"] WITHOUT being inside tray-slot
  const allDiscs = document.querySelectorAll('lab-composite-weight[kind="disc"]');
  const overlayDiscs = [...allDiscs].filter((d) => !d.closest('.ct-disc-slot'));
  // 2) composite's rendered SVG discs (inside shadow root)
  const composite = document.querySelector('.hung-stack lab-composite-weight[kind="composite"]');
  const compositeRenderedDiscs = composite
    ? composite.shadowRoot.querySelectorAll('g.disc-stacked').length
    : 0;
  // 3) tray slot states
  const slots = [...document.querySelectorAll('.ct-disc-slot')].map((s) => ({
    mass: s.dataset.discMass,
    state: s.dataset.state,
    hasDiscChild: !!s.querySelector('lab-composite-weight[kind="disc"]'),
  }));
  return {
    totalDiscElements: allDiscs.length,
    overlayDiscElements: overlayDiscs.length,
    compositeRenderedDiscs,
    slots,
  };
});

console.log('Disc counts after real mouse drag:');
console.log(JSON.stringify(counts, null, 2));

// Visual zoom proof
const bb = await page.evaluate(() => {
  const c = document.querySelector('.hung-stack lab-composite-weight[kind="composite"]');
  if (!c) return null;
  const r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});

if (bb) {
  const pad = 30;
  await page.screenshot({
    path: 'probe-out/real-drag-result.png',
    clip: {
      x: Math.max(0, bb.x - pad),
      y: Math.max(0, bb.y - pad),
      width: bb.w + pad * 2,
      height: bb.h + pad * 2,
    },
  });
  console.log('\nzoom saved: probe-out/real-drag-result.png');
}

// Also full screenshot to compare with user's screenshot
await page.screenshot({ path: 'probe-out/real-drag-full.png', fullPage: false });

await browser.close();

console.log('\n=== ASSERT ===');
if (counts.overlayDiscElements === 0) {
  console.log('✅ PASS — нет «зависших» дисков в overlay');
} else {
  console.log(`❌ FAIL — ${counts.overlayDiscElements} disc-элементов осталось в overlay`);
}
if (counts.compositeRenderedDiscs === 3) {
  console.log('✅ PASS — composite рисует ровно 3 диска');
} else {
  console.log(`❌ FAIL — composite рисует ${counts.compositeRenderedDiscs} дисков`);
}
