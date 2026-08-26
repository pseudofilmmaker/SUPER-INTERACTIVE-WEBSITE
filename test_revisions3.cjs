const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const st = window.ScrollTrigger.getById('videos-bg-video');
    const v12 = document.getElementById('videos-bg-video-12');

    function scrollTo(p) {
      st.scroll(st.start + p * (st.end - st.start));
      ScrollTrigger.update();
    }
    function getY() {
      const t = getComputedStyle(v12).transform;
      const m = t.match(/matrix\(([^)]+)\)/);
      if (!m) return 0;
      const parts = m[1].split(',').map(Number);
      return parts[5]; // ty
    }

    // Forward through rise window while still idle (before GATE_PROGRESS)
    scrollTo(0.60);
    const y1 = getY();
    scrollTo(0.615);
    const y2 = getY();
    scrollTo(0.622);
    const y3 = getY();
    // Now scroll BACK UP (still idle, hasn't crossed GATE_PROGRESS yet)
    scrollTo(0.615);
    const y4 = getY();
    scrollTo(0.60);
    const y5 = getY();
    scrollTo(0.58);
    const y6 = getY();
    const v12op_at_58 = getComputedStyle(v12).opacity;

    return { y1, y2, y3, y4, y5, y6, v12op_at_58, reversible: y4 === y2 && y5 === y1 };
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
