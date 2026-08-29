import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const info = await page.evaluate(() => {
  const el = document.getElementById('section-ch-works-hero');
  const rect = el.getBoundingClientRect();
  return { top: Math.round(rect.top + window.scrollY) };
});
console.log('works-hero top:', info.top);
await browser.close();
