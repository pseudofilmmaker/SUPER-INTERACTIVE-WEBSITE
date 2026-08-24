const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  // section-2 range 3920-5520. Sample several points across the full scrub, including near-seam points.
  const ys = [3920, 4120, 4320, 4520, 4720, 4920, 5120, 5320];
  let cur = 0;
  for (const target of ys) {
    while (cur < target) { cur = Math.min(cur+30, target); await page.evaluate(y=>window.scrollTo(0,y), cur); await page.waitForTimeout(10); }
    await page.waitForTimeout(300);
    await page.screenshot({ path: `/tmp/frames/marquee_${target}.png` });
  }
  await browser.close();
})();
