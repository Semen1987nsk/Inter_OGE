// Диагностика mobile-overflow на 390px (iPhone 13).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('probe-mobile-out', { recursive: true });

const browser = await chromium.launch({ headless: true });

for (const url of [
  { name: 'kit-2', url: 'http://localhost:5176/?screen=spring-stiffness' },
  { name: 'kit-1', url: 'http://localhost:5175/?screen=density-solid' },
]) {
  for (const vp of [{ w: 390, h: 844 }, { w: 768, h: 1024 }, { w: 1280, h: 800 }]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    try {
      await page.goto(url.url, { waitUntil: 'networkidle', timeout: 8000 });
    } catch {
      console.log(`SKIP ${url.name} ${vp.w}px — server not running`);
      await ctx.close();
      continue;
    }
    await page.waitForTimeout(400);

    const info = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      const overflow = body.scrollWidth - body.clientWidth;
      // Найти первый элемент, чей right > viewport
      const offenders = [];
      const vpW = window.innerWidth;
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.right - vpW > 5 && r.width < vpW * 2) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: typeof el.className === 'string' ? el.className.slice(0, 60) : '',
            id: el.id,
            right: Math.round(r.right),
            width: Math.round(r.width),
          });
          if (offenders.length >= 8) break;
        }
      }
      return {
        bodyScrollW: body.scrollWidth,
        htmlScrollW: html.scrollWidth,
        viewportW: vpW,
        overflow,
        offenders,
      };
    });
    console.log(`\n=== ${url.name} @ ${vp.w}×${vp.h} ===`);
    console.log(JSON.stringify(info, null, 2));
    await page.screenshot({
      path: `probe-mobile-out/${url.name}-${vp.w}.png`,
      fullPage: false,
    });
    await ctx.close();
  }
}

await browser.close();
