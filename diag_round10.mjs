import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// Find works-hero pin section top + its scroll distance (from ScrollTrigger)
const info = await page.evaluate(() => {
  const el = document.getElementById('section-ch-works-hero');
  const rect = el.getBoundingClientRect();
  const top = Math.round(rect.top + window.scrollY);
  // chapter pin distance = viewport height * 1.8 (per code)
  const pinDistance = Math.round(window.innerHeight * 1.8);
  return { top, pinDistance, vh: window.innerHeight };
});
console.log('works-hero top:', info.top, 'pinDistance:', info.pinDistance, 'vh:', info.vh);

const pinStart = info.top;
const pinEnd = info.top + info.pinDistance;

// progress values to sample: p=0 (pin start), 0.3 (title), 0.56 (title out end), 0.60 (teaser entry), 0.70 (teaser hold),
// 0.80 (teaser out start), 0.86 (teaser out end), 0.90 (run end), 0.95 (near pin release), 1.0 (pin release), 1.05 (past release, resting content)
const progressPoints = [0, 0.1, 0.3, 0.56, 0.60, 0.70, 0.80, 0.86, 0.90, 0.95, 1.0, 1.05];

for (const p of progressPoints) {
  const scrollY = Math.round(pinStart + p * info.pinDistance);
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await page.waitForTimeout(600); // let scrub:0.5 settle

  const state = await page.evaluate(() => {
    const viewport = document.getElementById('ch-works-teaser-viewport');
    const text = document.getElementById('ch-works-teaser-text');
    const title = document.getElementById('ch-works-title-text');
    const detailWrap = document.querySelector('#section-ch-works-hero')?.nextElementSibling
      || document.querySelector('.chapter-detail-wrap');
    const vOpacity = viewport ? getComputedStyle(viewport).opacity : null;
    const vTransform = text ? getComputedStyle(text).transform : null;
    const tOpacity = title ? getComputedStyle(title).opacity : null;
    return { vOpacity, vTransform, tOpacity };
  });
  console.log(`p=${p.toFixed(2)} scrollY=${scrollY} | title.opacity=${state.tOpacity} teaser.opacity=${state.vOpacity} teaser.transform=${state.vTransform}`);

  const shot = `/home/user/webapp/shot_p${String(p).replace('.', '_')}.png`;
  await page.screenshot({ path: shot });
}

await browser.close();
console.log('done');
