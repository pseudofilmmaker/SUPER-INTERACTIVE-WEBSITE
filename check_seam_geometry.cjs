const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 600 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Get section-5's actual scrollY top first
  const bounds = await page.evaluate(() => {
    function rectInfo(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        top: r.top, bottom: r.bottom, height: r.height,
        position: cs.position, opacity: cs.opacity, zIndex: cs.zIndex,
        background: cs.background.slice(0, 80),
      };
    }
    return {
      scrollY: window.scrollY,
      innerHeight: window.innerHeight,
      s4: rectInfo('#section-4'),
      s5: rectInfo('#section-5'),
      s6: rectInfo('#section-6'),
      titleBgMedia5: rectInfo('#section-5 .title-bg-media'),
      titleOverlay5: rectInfo('#section-5 .title-overlay'),
      videosLayer: rectInfo('#videos-bg-video-layer'),
      photosLayer: rectInfo('#photos-bg-video-layer'),
      fixedBg: rectInfo('#fixed-bg-video'),
      groupTitleOverlay: rectInfo('#videos-title-overlay'),
    };
  });
  console.log('INITIAL (scroll 0):', JSON.stringify(bounds, null, 2));

  // Now scroll to find section-5 top
  const s5TopAbs = await page.evaluate(() => {
    const el = document.querySelector('#section-5');
    const r = el.getBoundingClientRect();
    return window.scrollY + r.top;
  });
  console.log('s5TopAbs:', s5TopAbs);

  // Scroll to a position mid-way through section-5 where seam was seen (offset ~ -100 to -200 relative to top, i.e. before reaching top, meaning section-5 already partly visible)
  for (const offset of [-300, -200, -100, -50, 0, 50, 100, 150, 200]) {
    const scrollTo = s5TopAbs + offset;
    await page.evaluate((y) => window.scrollTo(0, y), scrollTo);
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => {
      function rectInfo(sel) {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), opacity: cs.opacity };
      }
      return {
        scrollY: window.scrollY,
        s4: rectInfo('#section-4'),
        s5: rectInfo('#section-5'),
        s6: rectInfo('#section-6'),
        titleOverlay5: rectInfo('#section-5 .title-overlay'),
        videosLayer: rectInfo('#videos-bg-video-layer'),
        photosLayer: rectInfo('#photos-bg-video-layer'),
      };
    });
    console.log(`\noffset=${offset} scrollY=${info.scrollY}:`, JSON.stringify(info));
    await page.screenshot({ path: `/tmp/frames/geom_${offset}.png` });
  }

  await browser.close();
})();
