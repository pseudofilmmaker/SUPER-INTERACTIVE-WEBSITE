const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  const bodyH = await page.evaluate(() => document.body.scrollHeight);
  for (const frac of [0.08, 0.10, 0.12, 0.14, 0.16, 0.18]) {
    await page.evaluate((y) => window.scrollTo(0, y), bodyH * frac);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `/tmp/frames/wall_ent_${frac}.png` });
  }
  await browser.close();
})();
