const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const st = window.ScrollTrigger.getById('videos-bg-video');
    const connectedEl = document.getElementById('videos-connected-text');
    const words = Array.from(connectedEl.querySelectorAll('.vc-word'));

    // PHASE_V12_END=0.701046, PHASE_V13_END=0.775785
    const PHASE_V12_END = 0.701046;
    const PHASE_V13_END = 0.775785;
    function pFromLocal13(l) { return PHASE_V12_END + l * (PHASE_V13_END - PHASE_V12_END); }

    function scrollTo(p) {
      st.scroll(st.start + p * (st.end - st.start));
      ScrollTrigger.update();
    }

    function sampleWords(local13) {
      scrollTo(pFromLocal13(local13));
      return words.map(w => parseFloat(getComputedStyle(w).opacity).toFixed(2));
    }

    const s1 = sampleWords(0.0);
    const s2 = sampleWords(0.25);
    const s3 = sampleWords(0.30);
    const s4 = sampleWords(0.35);
    const s5 = sampleWords(0.42);
    const s6 = sampleWords(0.6);
    const s7 = sampleWords(0.85);
    const s8 = sampleWords(0.9);
    const s9 = sampleWords(0.96);
    const s10 = sampleWords(1.0);

    return { s1, s2, s3, s4, s5, s6, s7, s8, s9, s10 };
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
