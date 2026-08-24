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

  for (const offset of [-300, -200, -100, -50, 0]) {
    await page.evaluate((y) => window.scrollTo(0, y), s5TopAbs + offset);
    await page.waitForTimeout(200);
    await page.evaluate(() => { if (window.ScrollTrigger) window.ScrollTrigger.update(); });
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => {
      const v7 = document.getElementById('photos-bg-video-7');
      const v8 = document.getElementById('photos-bg-video-8');
      const v9 = document.getElementById('videos-bg-video-9');
      return {
        scrollY: window.scrollY,
        v7: v7 ? { opacity: v7.style.opacity, currentTime: v7.currentTime } : null,
        v8: v8 ? { opacity: v8.style.opacity, currentTime: v8.currentTime } : null,
        v9: v9 ? { opacity: v9.style.opacity, currentTime: v9.currentTime } : null,
        photosLayerOpacity: getComputedStyle(document.getElementById('photos-bg-video-layer')).opacity,
        videosLayerOpacity: getComputedStyle(document.getElementById('videos-bg-video-layer')).opacity,
        photosBgVideoTrigger: (() => { const t = window.ScrollTrigger.getById('photos-bg-video'); return t ? {progress: t.progress, start: t.start, end: t.end} : null; })(),
      };
    });
    console.log('offset', offset, JSON.stringify(info));
  }
  await browser.close();
})();
