import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
const info = await page.evaluate(() => {
  const st = ScrollTrigger.getById('about-hero-pin');
  return { start: st.start, end: st.end };
});
const { start, end } = info;
const range = end - start;
for (const p of [0.64, 0.65, 0.66, 0.67]) {
  await page.evaluate((y) => { window.scrollTo(0, y); ScrollTrigger.update(); }, start + range * p);
  await page.screenshot({ path: `shot_cf_${p}.png` });
}
await browser.close();
