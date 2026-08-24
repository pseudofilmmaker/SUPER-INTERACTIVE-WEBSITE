const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const s5Top = 8880;
  const offsets = [-200, -100, -50, -20, 0, 20, 50, 100, 200, 400, 600];
  for (const off of offsets) {
    const y = s5Top + off;
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `/tmp/frames/seam_${off}.png` });
  }
  await browser.close();
})();
