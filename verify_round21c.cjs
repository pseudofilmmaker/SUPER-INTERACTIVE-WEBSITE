const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.evaluate(() => window.scrollTo(0, 4000));
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/r21_filmography.png' });

  await page.evaluate(() => window.scrollTo(0, 17500));
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/r21_awards_hold.png' });

  await page.evaluate(() => window.scrollTo(0, 20000));
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/r21_career_hold.png' });

  await browser.close();
})();
