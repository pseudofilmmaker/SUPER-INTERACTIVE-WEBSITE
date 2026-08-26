const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

  // Bypass scroll/gate entirely -- directly force the final scene + footer visible via DOM
  await page.evaluate(() => {
    const v16 = document.getElementById('videos-bg-video-16');
    const layer = document.getElementById('videos-bg-video-layer');
    const footerEl = document.getElementById('videos-footer-text');
    // hide all other video layers, show only v16 at its true last frame
    document.querySelectorAll('.videos-bg-video-el').forEach(v => { v.style.opacity = 0; });
    layer.style.opacity = 1;
    v16.style.opacity = 1;
    v16.currentTime = 5.9;
    footerEl.style.opacity = 1;
    document.querySelectorAll('.vf-line').forEach(l => {
      l.style.opacity = 1;
      l.style.filter = 'none';
      l.style.transform = 'none';
    });
    // hide header/dot-nav/progress-bar/scroll-cue for a clean check
    ['site-header','dot-nav','progress-bar','global-scroll-cue','ignite-gate'].forEach(id=>{
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/tmp/footer_check.png' });
  await browser.close();
})();
