const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2] || 'http://localhost:8000/experiments/kit2/experiment-1-spring.html';
  console.log('Running pointer touch simulation for', url);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 900, height: 1200 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
  });

  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG>', msg.text()));

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('.weight-item', { timeout: 10000 });

    // Scroll to the element to make it visible in viewport
    await page.$eval('.weight-item', el => el.scrollIntoView({ block: 'center', inline: 'center' }));

    const box = await page.$eval('.weight-item', el => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    });

    console.log('Found weight-item at', box);

    const startX = box.left + box.width / 2;
    const startY = box.top + box.height / 2;
    const endX = startX;
    const endY = startY + 350;

    // Dispatch pointer events with pointerType='touch'
    await page.evaluate(({sx, sy, ex, ey}) => {
      function dispatchPointer(target, type, x, y) {
        const ev = new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerType: 'touch',
          clientX: x,
          clientY: y,
          pointerId: 1
        });
        target.dispatchEvent(ev);
      }

      const el = document.querySelector('.weight-item');
      const target = el;
      dispatchPointer(target, 'pointerover', sx, sy);
      dispatchPointer(target, 'pointerenter', sx, sy);
      dispatchPointer(target, 'pointerdown', sx, sy);

      const steps = 20;
      for (let i = 1; i <= steps; i++) {
        const x = sx + (ex - sx) * (i/steps);
        const y = sy + (ey - sy) * (i/steps);
        dispatchPointer(document.elementFromPoint(x, y) || target, 'pointermove', x, y);
      }

      dispatchPointer(target, 'pointerup', ex, ey);
    }, { sx: startX, sy: startY, ex: endX, ey: endY });

    console.log('Pointer simulation dispatched. Waiting for logs.');
    await page.waitForTimeout(2000);

    const wasDropped = await page.$eval('.weight-item', el => el.dataset.wasDropped);
    console.log('weight-item dataset.wasDropped =', wasDropped);

  } catch (err) {
    console.error('ERROR:', err.message);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
