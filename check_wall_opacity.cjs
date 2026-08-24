const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const start = 2560, end = 3920;
  const progresses = [0.60,0.65,0.68,0.70,0.72,0.74,0.76,0.78,0.80,0.85,0.90,0.95,1.0];
  for (const p of progresses) {
    const y = start + p * (end - start);
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(600);
    const info = await page.evaluate(() => {
      const el = document.getElementById('client-wall');
      const st = ScrollTrigger.getById('work-reel-pin');
      const cs = el ? getComputedStyle(el) : null;
      return {
        actualProgress: st ? st.progress : null,
        opacity: cs ? cs.opacity : null,
        transform: cs ? cs.transform : null,
      };
    });
    console.log(p, JSON.stringify(info));
  }
  await browser.close();
})();
