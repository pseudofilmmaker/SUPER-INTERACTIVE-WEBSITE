const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.evaluate(() => window.scrollTo(0, 17300));
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/r21_awards_hold3.png' });

  const info = await page.evaluate(() => {
    const list = document.querySelector('.awards-list');
    const items = Array.from(document.querySelectorAll('.awards-item')).map(el => el.getBoundingClientRect());
    return {
      listRect: list ? list.getBoundingClientRect() : null,
      itemRects: items,
      listHTML_len: list ? list.innerHTML.length : 0,
    };
  });
  console.log(JSON.stringify(info, null, 2));

  await browser.close();
})();
