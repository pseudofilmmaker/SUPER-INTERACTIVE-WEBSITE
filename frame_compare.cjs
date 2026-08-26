const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 773 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  const times = [2.8, 3.0, 3.2, 3.4, 3.5, 3.6, 3.8, 4.0];
  for (const t of times) {
    await page.evaluate((tt) => {
      const v16 = document.getElementById('videos-bg-video-16');
      const layer = document.getElementById('videos-bg-video-layer');
      document.querySelectorAll('.videos-bg-video-el').forEach(v => { v.style.opacity = 0; });
      layer.style.opacity = 1;
      v16.style.opacity = 1;
      v16.currentTime = tt;
    }, t);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `/tmp/v16_last/site_t${t}.png` });
  }
  await browser.close();
})();
