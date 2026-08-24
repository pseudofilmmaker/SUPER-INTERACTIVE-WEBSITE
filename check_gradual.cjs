const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  // gradual scroll in small steps from 0 to 4000
  for (let y = 0; y <= 4000; y += 40) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const el = document.getElementById('client-wall');
    const cs = el ? getComputedStyle(el) : null;
    const st = ScrollTrigger.getById('work-reel-pin');
    return { opacity: cs?cs.opacity:null, transform: cs?cs.transform:null, pinProgress: st?st.progress:null, pinIsActive: st?st.isActive:null, scrollY: window.scrollY };
  });
  console.log('after gradual scroll to 4000:', JSON.stringify(info));
  await page.screenshot({ path: '/tmp/frames/gradual_4000.png' });
  await browser.close();
})();
