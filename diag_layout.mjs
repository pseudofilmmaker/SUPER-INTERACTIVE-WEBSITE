import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const info = await page.evaluate(() => {
  const hero = document.getElementById('section-ch-works-hero');
  const detail = document.getElementById('section-ch-works-detail');
  const heroRect = hero.getBoundingClientRect();
  const detailRect = detail.getBoundingClientRect();
  const heroParent = hero.parentElement;
  return {
    heroTop: Math.round(heroRect.top + window.scrollY),
    heroHeight: heroRect.height,
    detailTop: Math.round(detailRect.top + window.scrollY),
    heroParentTag: heroParent.tagName,
    heroParentClass: heroParent.className,
    heroOuterHTML: hero.outerHTML.slice(0, 300),
  };
});
console.log(JSON.stringify(info, null, 2));

// Now check ScrollTrigger pin spacer
const st = await page.evaluate(() => {
  const trig = ScrollTrigger.getAll().find(s => s.vars.id === 'section-ch-works-hero-pin');
  const pinnedEl = trig.pin;
  const spacer = pinnedEl ? pinnedEl.parentNode : null;
  return {
    start: trig.start,
    end: trig.end,
    pinTag: pinnedEl ? pinnedEl.tagName : null,
    pinClass: pinnedEl ? pinnedEl.className : null,
    spacerTag: spacer ? spacer.tagName : null,
    spacerClass: spacer ? spacer.className : null,
    spacerHeight: spacer ? spacer.getBoundingClientRect().height : null,
    spacerStyle: spacer ? spacer.getAttribute('style') : null,
  };
});
console.log(JSON.stringify(st, null, 2));
await browser.close();
