// Check whether hidden SVGs inside lab-composite-weight shadow root are
// actually hidden (display:none) or still rendering (the prior bug).
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('CONSOLE-ERR:', msg.text());
});

await page.goto('http://localhost:5176/?screen=spring-stiffness', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

await page.evaluate(() => window.springExperiment.attachSpringById('spring-k10'));
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

const check = await page.evaluate(() => {
  const composite = document.querySelector('.hung-stack lab-composite-weight[kind="composite"]');
  if (!composite) return { err: 'no composite' };
  const sr = composite.shadowRoot;
  const rodSvg = sr.querySelector('svg.rod');
  const discSvg = sr.querySelector('svg.disc');
  const compSvg = sr.querySelector('svg.composite');
  return {
    rod: {
      hidden: rodSvg.hasAttribute('hidden'),
      display: getComputedStyle(rodSvg).display,
      bbox: rodSvg.getBoundingClientRect(),
    },
    disc: {
      hidden: discSvg.hasAttribute('hidden'),
      display: getComputedStyle(discSvg).display,
      bbox: discSvg.getBoundingClientRect(),
    },
    composite: {
      hidden: compSvg.hasAttribute('hidden'),
      display: getComputedStyle(compSvg).display,
      bbox: compSvg.getBoundingClientRect(),
    },
  };
});

console.log('SVG visibility check:');
console.log(JSON.stringify(check, null, 2));

await browser.close();
