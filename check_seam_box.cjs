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

  for (const offset of [-300, -200, -100]) {
    await page.evaluate((y) => window.scrollTo(0, y), s5TopAbs + offset);
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => {
      function rectInfo(sel) {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height),
          position: cs.position, opacity: cs.opacity, zIndex: cs.zIndex,
        };
      }
      return {
        scrollY: window.scrollY,
        section5: rectInfo('#section-5'),
        titleBgMedia: rectInfo('#section-5 .title-bg-media'),
        titleOverlay: rectInfo('#section-5 .title-overlay'),
        videosLayer: rectInfo('#videos-bg-video-layer'),
        videosScrim: rectInfo('.videos-bg-video-scrim'),
        section4: rectInfo('#section-4'),
      };
    });
    console.log('offset', offset, JSON.stringify(info, null, 1));
  }
  await browser.close();
})();
