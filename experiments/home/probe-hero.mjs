// Smoke: убедиться что hero-spec показывает computed «N комплектов / M опытов» из KITS.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('probe-hero-out', { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();

page.on('pageerror', (e) => console.log('PAGEERR:', e.message));

await page.goto('http://localhost:5181/', { waitUntil: 'networkidle', timeout: 10000 });
await page.waitForTimeout(800);

const spec = await page.evaluate(() => ({
  kits: document.querySelector('[data-spec="kits-count"]')?.textContent?.trim() ?? null,
  exp: document.querySelector('[data-spec="experiments-count"]')?.textContent?.trim() ?? null,
  allLines: [...document.querySelectorAll('.hero-spec-line')].map(el => el.textContent?.trim()),
}));

console.log('Hero spec values:');
console.log(JSON.stringify(spec, null, 2));

await page.screenshot({ path: 'probe-hero-out/hero.png', fullPage: false, clip: { x: 0, y: 0, width: 1600, height: 600 } });

await browser.close();

// Validate
const errors = [];
if (!spec.kits?.includes('7')) errors.push(`kits-count = "${spec.kits}", ожидали "7 комплектов"`);
if (!spec.exp?.match(/\d+\s*\/\s*\d+\s*опытов|\d+\s*опытов/)) errors.push(`experiments-count = "${spec.exp}"`);

if (errors.length === 0) {
  console.log('\n✅ Hero computed values OK');
} else {
  console.log('\n❌ Hero validation failed:');
  errors.forEach(e => console.log('  - ' + e));
  process.exit(1);
}
