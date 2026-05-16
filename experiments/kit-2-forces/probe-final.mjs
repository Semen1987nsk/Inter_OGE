// Финальная проверка Iter 3: крупный zoom композита.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('probe-out', { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 3,
});
const page = await ctx.newPage();

await page.goto('http://localhost:5176/?screen=spring-stiffness', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

await page.evaluate(() => window.springExperiment.attachSpringById('spring-k50'));
await page.waitForTimeout(300);
await page.evaluate(() => window.springExperiment.attachWeightById('composite-load'));
await page.waitForTimeout(300);
for (const m of [10, 20, 50]) {
  await page.evaluate((mass) => {
    const tray = document.querySelector('lab-composite-tray');
    if (tray) tray.addDisc(mass);
  }, m);
  await page.waitForTimeout(200);
}

const bb = await page.evaluate(() => {
  const c = document.querySelector('.hung-stack lab-composite-weight[kind="composite"]');
  if (!c) return null;
  const r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});

if (bb) {
  const pad = 20;
  await page.screenshot({
    path: 'probe-out/final-composite-bigzoom.png',
    clip: {
      x: Math.max(0, bb.x - pad),
      y: Math.max(0, bb.y - pad),
      width: bb.w + pad * 2,
      height: bb.h + pad * 2,
    },
  });
  console.log('saved probe-out/final-composite-bigzoom.png');
}

await browser.close();
