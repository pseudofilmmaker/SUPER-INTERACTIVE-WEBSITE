const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  const bodyH = await page.evaluate(() => document.body.scrollHeight);
  for (const frac of [0.26, 0.28, 0.32, 0.35]) {
    await page.evaluate((y) => window.scrollTo(0, y), bodyH * frac);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `/tmp/frames/wall_trans_${frac}.png` });
  }
  await browser.close();
})();
