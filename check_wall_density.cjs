const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  const bodyH = await page.evaluate(() => document.body.scrollHeight);
  for (const frac of [0.15, 0.20, 0.30]) {
    await page.evaluate((y) => window.scrollTo(0, y), bodyH * frac);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `/tmp/frames/wall_density_${frac}.png` });
  }
  await browser.close();
})();
