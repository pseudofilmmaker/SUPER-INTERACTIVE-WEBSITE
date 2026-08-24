const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 600 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const info = await page.evaluate(() => {
    const s3 = document.querySelector('#section-3');
    const s3top = window.scrollY + s3.getBoundingClientRect().top;
    const pin = ScrollTrigger.getById('work-reel-pin');
    // find the panelActiveTrigger for section-3 : trigger top center start
    const triggers = ScrollTrigger.getAll().filter(t => t.trigger === s3);
    return {
      s3top,
      pinStart: pin ? pin.start : null,
      pinEnd: pin ? pin.end : null,
      innerHeight: window.innerHeight,
      section3TriggerStart: triggers.map(t => ({start: t.start, end: t.end, vars: t.vars.start})),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
