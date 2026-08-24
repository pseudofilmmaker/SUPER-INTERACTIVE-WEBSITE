const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const s5 = document.getElementById('section-5');
    const rect = s5.getBoundingClientRect();
    const s5Top = window.scrollY + rect.top;
    const s5Bottom = s5Top + s5.offsetHeight;
    return { s5Top, s5Bottom, height: s5.offsetHeight, bodyH: document.body.scrollHeight };
  });
  console.log(JSON.stringify(info));
  await browser.close();
})();
