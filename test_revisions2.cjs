const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const st = window.ScrollTrigger.getById('videos-bg-video');
    const v11 = document.getElementById('videos-bg-video-11');
    const v12 = document.getElementById('videos-bg-video-12');
    const gateEl = document.getElementById('ignite-gate');

    function scrollTo(p) {
      st.scroll(st.start + p * (st.end - st.start));
      ScrollTrigger.update();
    }

    // Scroll forward through rise, past gate arm point
    scrollTo(0.60);
    scrollTo(0.615);
    scrollTo(0.6265); // should trigger armGate
    const afterArm = {
      gate_armed: gateEl.classList.contains('is-armed'),
      gate_opacity: getComputedStyle(gateEl).opacity,
      v12_transform: getComputedStyle(v12).transform,
    };

    // Now scroll BACK UP above GATE_PROGRESS - margin, should reset to idle
    scrollTo(0.60);
    const afterBack = {
      gate_armed: gateEl.classList.contains('is-armed'),
      gate_opacity: getComputedStyle(gateEl).opacity,
      v12_transform: getComputedStyle(v12).transform,
      v12_opacity: getComputedStyle(v12).opacity,
    };

    // scroll back down again to re-trigger rise + arm
    scrollTo(0.615);
    const reRise = {
      v12_transform: getComputedStyle(v12).transform,
      v12_opacity: getComputedStyle(v12).opacity,
    };
    scrollTo(0.6265);
    const reArm = {
      gate_armed: gateEl.classList.contains('is-armed'),
    };

    return { afterArm, afterBack, reRise, reArm };
  });

  console.log(JSON.stringify(result, null, 2));

  await browser.close();
})();
