import { chromium } from '@playwright/test';

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
];

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5178/?screen=archimedes');
  await page.waitForFunction(() => typeof window.archimedesExperiment !== 'undefined', { timeout: 10_000 });
  await page.evaluate(() => window.archimedesExperiment?.reset());
  await page.waitForTimeout(150);

  // Полный happy-path с водой
  await page.evaluate(() => {
    const e = window.archimedesExperiment;
    e.placeDynamometer(1);
    e.attachCylinderById(3);
    e.placeBeaker();
    e.pourWater(200);
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.archimedesExperiment?.dipCylinderInWater());
  await page.waitForTimeout(2000);

  const dom = await page.evaluate(() => {
    const cylHost = document.querySelector('#ar-cylinder-host');
    const beakerHost = document.querySelector('#ar-beaker-host');
    const dynoHost = document.querySelector('#ar-dyno-host');
    const beaker = beakerHost?.querySelector('lab-beaker');
    const dynoEl = dynoHost?.querySelector('lab-dynamometer');
    const beakerSvg = beaker?.shadowRoot?.querySelector('svg.frame');
    const waterRect = beaker?.shadowRoot?.querySelector('#bk-water');

    const cyl = cylHost?.getBoundingClientRect();
    const bkr = beakerHost?.getBoundingClientRect();
    const dno = dynoHost?.getBoundingClientRect();
    const dnoEl = dynoEl?.getBoundingClientRect();
    const svgRect = beakerSvg?.getBoundingClientRect();
    const svgScaleY = svgRect ? svgRect.height / 130 : 1;
    const svgYAttr = parseFloat(waterRect?.getAttribute('y') ?? '0');
    const svgHAttr = parseFloat(waterRect?.getAttribute('height') ?? '0');
    const waterTop = svgRect ? svgRect.top + svgYAttr * svgScaleY : 0;
    const waterBottom = svgRect ? svgRect.top + (svgYAttr + svgHAttr) * svgScaleY : 0;

    return {
      cylTop: cyl?.top, cylBot: cyl?.bottom,
      beakerTop: bkr?.top, beakerBot: bkr?.bottom,
      dynoBot: dno?.bottom, dynoElBot: dnoEl?.bottom,
      waterTop, waterBottom,
      cylInlineStyle: cylHost?.getAttribute('style'),
      forceAttr: dynoEl?.getAttribute('force'),
      getWeightHookY: dynoEl?.getWeightHookY?.(),
    };
  });

  const inv1 = dom.cylTop > dom.waterTop + 5;
  const inv2 = dom.cylBot < dom.beakerBot - 8;
  const inv3 = dom.cylBot - dom.waterTop;
  const dynoVsCyl = dom.cylTop - (dom.dynoElBot ?? dom.dynoBot);
  console.log(`\n=== VP ${vp.name} (after dip) ===`);
  console.log(`  cyl_top=${dom.cylTop?.toFixed(1)}  cyl_bot=${dom.cylBot?.toFixed(1)}`);
  console.log(`  beaker_top=${dom.beakerTop?.toFixed(1)}  beaker_bot=${dom.beakerBot?.toFixed(1)}`);
  console.log(`  water_top=${dom.waterTop?.toFixed(1)}  water_bot=${dom.waterBottom?.toFixed(1)}`);
  console.log(`  dyno_el_bot=${dom.dynoElBot?.toFixed(1)}  dyno_host_bot=${dom.dynoBot?.toFixed(1)}`);
  console.log(`  cylInline=${dom.cylInlineStyle}`);
  console.log(`  force=${dom.forceAttr}  hookY=${dom.getWeightHookY}`);
  console.log(`  cyl - dyno_el_bot = ${dynoVsCyl.toFixed(1)} px (gap above cylinder)`);
  console.log(`  inv1 (cyl_top > water_top+5): ${inv1}`);
  console.log(`  inv2 (cyl_bot < beaker_bot-8): ${inv2}`);
  console.log(`  inv3 overlap (cyl_bot - water_top): ${inv3.toFixed(1)} (need >=50)`);

  await page.screenshot({ path: `./probe-${vp.name}.png`, fullPage: false });
  await ctx.close();
}

await browser.close();
