import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
});

await page.goto('http://localhost:5178/?screen=archimedes');
await page.waitForFunction(() => typeof window.archimedesExperiment !== 'undefined', { timeout: 10_000 });
await page.evaluate(() => window.archimedesExperiment?.reset());
await page.waitForTimeout(200);

// Стадия 1: только дин-р
await page.evaluate(() => window.archimedesExperiment?.placeDynamometer(1));
await page.waitForTimeout(200);

const stage1 = await page.evaluate(() => {
  const dynoHost = document.querySelector('#ar-dyno-host');
  const dynoEl = dynoHost?.querySelector('lab-dynamometer');
  const cylHost = document.querySelector('#ar-cylinder-host');
  return {
    dynoHostRect: dynoHost?.getBoundingClientRect().toJSON(),
    dynoElRect: dynoEl?.getBoundingClientRect().toJSON(),
    dynoElInlineStyle: dynoEl?.getAttribute('style'),
    dynoHostInlineStyle: dynoHost?.getAttribute('style'),
    dynoHostHidden: dynoHost?.hidden,
    cylHostInlineStyle: cylHost?.getAttribute('style'),
    cylHostHidden: cylHost?.hidden,
    getWeightHookY: dynoEl?.getWeightHookY?.(),
  };
});
console.log('STAGE 1 — only dyno:', JSON.stringify(stage1, null, 2));

// Стадия 2: + цилиндр №3 (P=0.69)
await page.evaluate(() => window.archimedesExperiment?.attachCylinderById(3));
await page.waitForTimeout(2000); // пусть отшумится

const stage2 = await page.evaluate(() => {
  const dynoHost = document.querySelector('#ar-dyno-host');
  const dynoEl = dynoHost?.querySelector('lab-dynamometer');
  const cylHost = document.querySelector('#ar-cylinder-host');
  return {
    dynoElInlineStyle: dynoEl?.getAttribute('style'),
    dynoElRect: dynoEl?.getBoundingClientRect().toJSON(),
    cylHostInlineStyle: cylHost?.getAttribute('style'),
    cylHostRect: cylHost?.getBoundingClientRect().toJSON(),
    cylHostHidden: cylHost?.hidden,
    getWeightHookY: dynoEl?.getWeightHookY?.(),
    forceAttr: dynoEl?.getAttribute('force'),
  };
});
console.log('STAGE 2 — dyno + cyl-3:', JSON.stringify(stage2, null, 2));

// Стадия 3: visual
await page.screenshot({ path: './probe-stage2.png', fullPage: false });
console.log('Screenshot saved ./probe-stage2.png');

await browser.close();
