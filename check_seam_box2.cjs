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

  for (const offset of [-300, -200, -100, -50]) {
    await page.evaluate((y) => {
      window.scrollTo(0, y);
    }, s5TopAbs + offset);
    await page.waitForTimeout(200);
    await page.evaluate(() => { if (window.ScrollTrigger) window.ScrollTrigger.update(); });
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => {
      function rectInfo(sel) {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height),
          opacity: cs.opacity, inlineOpacity: el.style.opacity,
        };
      }
      const v9 = document.getElementById('videos-bg-video-9');
      return {
        scrollY: window.scrollY,
        titleOverlay: rectInfo('#section-5 .title-overlay'),
        videosLayer: rectInfo('#videos-bg-video-layer'),
        v9: rectInfo('#videos-bg-video-9'),
        v9currentTime: v9 ? v9.currentTime : null,
        photosLayer: rectInfo('#photos-bg-video-layer'),
        st_videosbg: window.ScrollTrigger ? (() => { const t = window.ScrollTrigger.getById('videos-bg-video'); return t ? { progress: t.progress, isActive: t.isActive, start: t.start, end: t.end } : null; })() : null,
        st_handoff: window.ScrollTrigger ? (() => { const t = window.ScrollTrigger.getById('photos-videos-layer-handoff'); return t ? { progress: t.progress, start: t.start } : null; })() : null,
      };
    });
    console.log('offset', offset, JSON.stringify(info, null, 1));
  }
  await browser.close();
})();
