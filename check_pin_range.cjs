const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const st = ScrollTrigger.getById('work-reel-pin');
    return {
      start: st ? st.start : null,
      end: st ? st.end : null,
      bodyH: document.body.scrollHeight,
      docH: document.documentElement.scrollHeight,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
