const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 600 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const s5BottomAbs = await page.evaluate(() => {
    const el = document.querySelector('#section-5');
    const r = el.getBoundingClientRect();
    return window.scrollY + r.bottom;
  });

  for (const offset of [-200, -100, -50, 0, 50, 100]) {
    await page.evaluate((y) => window.scrollTo(0, y), s5BottomAbs + offset);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `/tmp/frames/geombot_${offset}.png` });
  }
  await browser.close();
})();
