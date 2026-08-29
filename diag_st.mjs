import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const info = await page.evaluate(() => {
  const st = ScrollTrigger.getAll().find(s => s.vars.id === 'section-ch-works-hero-pin');
  if (!st) return { error: 'not found', all: ScrollTrigger.getAll().map(s => s.vars.id) };
  return { start: st.start, end: st.end, progress: st.progress };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
