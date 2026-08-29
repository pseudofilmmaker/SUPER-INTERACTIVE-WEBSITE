import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const info = await page.evaluate(() => {
  const st = ScrollTrigger.getAll().find(s => s.vars.id === 'about-hero-pin');
  const profile = document.getElementById('section-about-profile');
  const rect = profile.getBoundingClientRect();
  return {
    pinStart: st.start,
    pinEnd: st.end,
    profileTop: Math.round(rect.top + window.scrollY),
  };
});
const vh = 900;
const D = info.pinEnd - info.pinStart;
const spacerHeight = info.profileTop - info.pinStart;
const peekPx = spacerHeight - vh;
const peekP = peekPx / D;
console.log({ ...info, D, spacerHeight, peekPx, peekP });
await browser.close();
