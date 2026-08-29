import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const chapters = ['works', 'edu', 'awards', 'career'];
const info = await page.evaluate((chapters) => {
  return chapters.map(ch => {
    const st = ScrollTrigger.getAll().find(s => s.vars.id === `section-ch-${ch}-hero-pin`);
    const detail = document.getElementById(`section-ch-${ch}-detail`);
    const detailRect = detail.getBoundingClientRect();
    return {
      ch,
      pinStart: st.start,
      pinEnd: st.end,
      detailTop: Math.round(detailRect.top + window.scrollY),
    };
  });
}, chapters);

const vh = 900;
for (const c of info) {
  const D = c.pinEnd - c.pinStart;
  const spacerHeight = c.detailTop - c.pinStart;
  const peekPx = spacerHeight - vh;
  const peekP = peekPx / D;
  console.log(`${c.ch}: D=${D} spacerHeight=${spacerHeight} peekPx=${peekPx} peekP=${peekP.toFixed(3)}`);
}
await browser.close();
