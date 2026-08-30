const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const info0 = await page.evaluate(() => {
    const host = document.getElementById('awards-crawl');
    const inner = host ? host.querySelector('.awards-crawl-inner') : null;
    return {
      scrollHeight: document.documentElement.scrollHeight,
      hostRect: host ? host.getBoundingClientRect() : null,
      hostOffsetTop: host ? host.getBoundingClientRect().top + window.scrollY : null,
    };
  });
  console.log('AT TOP:', JSON.stringify(info0, null, 2));

  for (const y of [16800, 17300, 17800, 18300, 19000]) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => {
      const host = document.getElementById('awards-crawl');
      const inner = host ? host.querySelector('.awards-crawl-inner') : null;
      const cs = inner ? getComputedStyle(inner) : null;
      return {
        scrollY: window.scrollY,
        hostRect: host ? host.getBoundingClientRect() : null,
        innerRect: inner ? inner.getBoundingClientRect() : null,
        opacity: cs ? cs.opacity : null,
        transform: cs ? cs.transform : null,
      };
    });
    console.log('y=' + y, JSON.stringify(info));
  }

  await browser.close();
})();
