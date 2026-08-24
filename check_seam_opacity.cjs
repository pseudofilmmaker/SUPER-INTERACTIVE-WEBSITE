const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const s5Top = 8880;
  for (const off of [-100, -50, -20, 0]) {
    await page.evaluate((yy) => window.scrollTo(0, yy), s5Top + off);
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => {
      function op(id) { const el = document.getElementById(id); return el ? getComputedStyle(el).opacity : 'N/A'; }
      return {
        fixedBgVideo: op('fixed-bg-video'),
        photosBgVideoLayer: op('photos-bg-video-layer'),
        videosBgVideoLayer: op('videos-bg-video-layer'),
      };
    });
    console.log(off, JSON.stringify(info));
  }
  await browser.close();
})();
