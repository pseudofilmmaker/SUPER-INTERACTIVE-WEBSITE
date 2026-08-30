const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log('totalHeight', totalHeight);

  async function scanOpacity(selector, label) {
    let last = null;
    let firstFull = null, lastFull = null;
    for (let y = 0; y < totalHeight; y += 150) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(10);
      const op = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return el ? parseFloat(getComputedStyle(el).opacity) : null;
      }, selector);
      if (op === null) continue;
      if (op > 0.99 && firstFull === null) firstFull = y;
      if (op > 0.99) lastFull = y;
      if (last === null || Math.abs(op - last) > 0.1) {
        console.log(label, y, op.toFixed(3));
        last = op;
      }
    }
    console.log(label, 'FULL_OPACITY_RANGE:', firstFull, '->', lastFull, 'span_px=', (lastFull-firstFull));
  }

  await scanOpacity('.awards-crawl-inner', 'AWARDS');
  await scanOpacity('.career-crawl-inner', 'CAREER');

  await browser.close();
})();
