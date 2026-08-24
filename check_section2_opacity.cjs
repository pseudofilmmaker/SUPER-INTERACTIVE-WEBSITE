const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  for (const y of [3920, 4200, 4675, 5036, 5300, 5520, 5755, 6000, 6294, 6320]) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => {
      const el = document.getElementById('client-wall');
      const cs = el ? getComputedStyle(el) : null;
      return { opacity: cs ? cs.opacity : null, transform: cs ? cs.transform : null, display: cs?cs.display:null, visibility: cs?cs.visibility:null };
    });
    console.log(y, JSON.stringify(info));
  }
  await browser.close();
})();
