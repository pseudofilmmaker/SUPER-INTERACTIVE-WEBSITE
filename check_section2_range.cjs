const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const triggers = ScrollTrigger.getAll().map(st => ({
      id: st.vars.id || '(no id)',
      trigger: st.trigger ? (st.trigger.id || st.trigger.className) : null,
      start: st.start,
      end: st.end,
    }));
    return triggers;
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
