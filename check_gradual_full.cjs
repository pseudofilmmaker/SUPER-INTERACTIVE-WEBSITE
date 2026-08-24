const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const shots = [2560, 2900, 3200, 3450, 3650, 3800, 3920, 4200, 4675, 5036, 5300, 5520];
  let cur = 0;
  for (const target of shots) {
    // gradual step from current position to target in 30px increments
    while (cur < target) {
      cur = Math.min(cur + 30, target);
      await page.evaluate((yy) => window.scrollTo(0, yy), cur);
      await page.waitForTimeout(15);
    }
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => {
      const el = document.getElementById('client-wall');
      const cs = el ? getComputedStyle(el) : null;
      return { opacity: cs?cs.opacity:null };
    });
    console.log(target, JSON.stringify(info));
    await page.screenshot({ path: `/tmp/frames/grad_${target}.png` });
  }
  await browser.close();
})();
