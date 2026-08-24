const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  let cur = 0;
  const shots = [3500, 3550, 3580, 3610, 3630];
  for (const target of shots) {
    while (cur < target) {
      cur = Math.min(cur + 20, target);
      await page.evaluate((yy) => window.scrollTo(0, yy), cur);
      await page.waitForTimeout(15);
    }
    await page.waitForTimeout(350);
    const info = await page.evaluate(() => {
      const el = document.getElementById('client-wall');
      const cs = el ? getComputedStyle(el) : null;
      return { opacity: cs?cs.opacity:null };
    });
    console.log(target, JSON.stringify(info));
    await page.screenshot({ path: `/tmp/frames/partial_${target}.png` });
  }
  await browser.close();
})();
