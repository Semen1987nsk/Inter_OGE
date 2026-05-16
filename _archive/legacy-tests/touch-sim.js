const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2] || 'http://localhost:8000/experiments/kit2/experiment-1-spring.html';
  console.log('Running touch simulation for', url);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 900, height: 1200 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  });

  const page = await context.newPage();

  page.on('console', msg => {
    console.log('PAGE LOG>', msg.text());
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // wait for a draggable weight item
    await page.waitForSelector('.weight-item', { timeout: 8000 });

    const box = await page.$eval('.weight-item', el => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    });

    console.log('Found weight-item at', box);

    const startX = box.left + box.width / 2;
    const startY = box.top + box.height / 2;
    const targetX = startX + 0; // we'll drag downwards
    const targetY = startY + 300;

    console.log('Simulating touch drag from', startX, startY, 'to', targetX, targetY);

    // move to start, then touch down, move, and release
    await page.mouse.move(startX, startY);
    await page.mouse.down();

    const steps = 15;
    for (let i = 1; i <= steps; i++) {
      const x = startX + (targetX - startX) * (i / steps);
      const y = startY + (targetY - startY) * (i / steps);
      await page.mouse.move(x, y);
      await page.waitForTimeout(60);
    }

    await page.mouse.up();

    console.log('Drag simulated, waiting for logs...');
    await page.waitForTimeout(2000);

    // capture wasDropped flag from the element
    const wasDropped = await page.$eval('.weight-item', el => el.dataset.wasDropped || el.getAttribute('data-was-dropped'));
    console.log('weight-item dataset.wasDropped =', wasDropped);

  } catch (err) {
    console.error('ERROR:', err.message);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }

})();
