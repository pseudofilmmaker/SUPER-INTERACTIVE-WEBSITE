const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

  await page.evaluate(() => {
    const v16 = document.getElementById('videos-bg-video-16');
    const layer = document.getElementById('videos-bg-video-layer');
    const footerEl = document.getElementById('videos-footer-text');
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
    ['site-header','dot-nav','progress-bar','global-scroll-cue','ignite-gate',
     'intro-pin-text','cube-stage','fixed-bg-video','photos-bg-video-layer',
     'videos-connected-text','videos-catchfire-text','videos-junehong-text',
     'photos-title-overlay','videos-title-overlay','photos-panel-nav','videos-panel-nav',
     'scroll-feather'].forEach(id=>{
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    document.getElementById('scroll-container').style.display = 'none';
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/tmp/footer_check2.png' });
  await browser.close();
})();
