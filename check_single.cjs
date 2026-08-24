const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.evaluate((yy) => window.scrollTo(0, yy), 3920);
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => {
    const el = document.getElementById('client-wall');
    const cs = el ? getComputedStyle(el) : null;
    const st = ScrollTrigger.getById('work-reel-pin');
    return { opacity: cs?cs.opacity:null, transform: cs?cs.transform:null, pinProgress: st?st.progress:null, pinIsActive: st?st.isActive:null, scrollY: window.scrollY };
  });
  console.log(JSON.stringify(info));
  await browser.close();
})();
