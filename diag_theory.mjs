import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const info = await page.evaluate(() => {
  const detail = document.getElementById('section-ch-works-detail');
  const rect = detail.getBoundingClientRect();
  return { detailTopDoc: Math.round(rect.top + window.scrollY) };
});
const pinStart = 6146, pinDistance = 1620, vh = 900;
const detailTopDoc = info.detailTopDoc;
const spacerHeight = detailTopDoc - pinStart;
const peekBeginsScrollY = detailTopDoc - vh;
const peekBeginsP = (peekBeginsScrollY - pinStart) / pinDistance;
console.log({ detailTopDoc, spacerHeight, peekBeginsScrollY, peekBeginsP });
await browser.close();
