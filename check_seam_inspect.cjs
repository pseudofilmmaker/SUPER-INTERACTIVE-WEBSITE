const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const s5Top = 8880;
  await page.evaluate((yy) => window.scrollTo(0, yy), s5Top - 100);
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    // sample elements at a point above the seam line (y=100) and below (y=300)
    function sample(x, y) {
      const els = document.elementsFromPoint(x, y);
      return els.slice(0, 6).map(el => ({
        tag: el.tagName, id: el.id, cls: el.className,
        opacity: getComputedStyle(el).opacity,
        zIndex: getComputedStyle(el).zIndex,
        position: getComputedStyle(el).position,
      }));
    }
    return { above: sample(640, 100), below: sample(640, 300) };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
