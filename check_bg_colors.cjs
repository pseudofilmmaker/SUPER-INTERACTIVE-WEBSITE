const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 600 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const s5top = await page.evaluate(() => {
    const el = document.querySelector('#section-5');
    return window.scrollY + el.getBoundingClientRect().top;
  });
  await page.evaluate((y) => window.scrollTo(0, y - 100), s5top);
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    function cs(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, bgImage: s.backgroundImage.slice(0,60), zIndex: s.zIndex, position: s.position };
    }
    return {
      html: cs('html'),
      body: cs('body'),
      scrollContainer: cs('#scroll-container'),
      section4: cs('#section-4'),
      section5: cs('#section-5'),
      videosLayer: cs('#videos-bg-video-layer'),
      photosLayer: cs('#photos-bg-video-layer'),
      bgVar: getComputedStyle(document.documentElement).getPropertyValue('--bg'),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
