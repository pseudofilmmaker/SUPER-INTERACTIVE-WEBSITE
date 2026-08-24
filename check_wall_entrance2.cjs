const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const start = 2560, end = 3920;
  const progresses = [0.68, 0.72, 0.76, 0.80, 0.85, 0.90, 0.95, 1.0];
  for (const p of progresses) {
    const y = start + p * (end - start);
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `/tmp/frames/wall_rise_${p.toFixed(2)}.png` });
  }
  await browser.close();
})();
