const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 600 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  // find section-3 top too, for photos handoff check
  const tops = await page.evaluate(() => {
    function top(sel) {
      const el = document.querySelector(sel);
      const r = el.getBoundingClientRect();
      return window.scrollY + r.top;
    }
    return { s2: top('#section-2'), s3: top('#section-3'), s4: top('#section-4'), s5: top('#section-5') };
  });
  console.log(JSON.stringify(tops));
  await browser.close();
})();
