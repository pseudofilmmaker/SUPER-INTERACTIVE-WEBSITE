const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 600 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const s5TopAbs = await page.evaluate(() => {
    const el = document.querySelector('#section-5');
    const r = el.getBoundingClientRect();
    return window.scrollY + r.top;
  });

  await page.evaluate((y) => window.scrollTo(0, y), s5TopAbs - 100);
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/frames/verify_before.png' });

  // Now disable title-overlay
  await page.evaluate(() => {
    const el = document.querySelector('#section-5 .title-overlay');
    if (el) el.style.display = 'none';
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: '/tmp/frames/verify_after_disabled.png' });

  await browser.close();
})();
