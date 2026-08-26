const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const st = window.ScrollTrigger.getById('videos-bg-video');
    if (!st) return { error: 'no ScrollTrigger found' };

    const v11 = document.getElementById('videos-bg-video-11');
    const v12 = document.getElementById('videos-bg-video-12');
    const gateEl = document.getElementById('ignite-gate');
    const connectedEl = document.getElementById('videos-connected-text');
    const words = Array.from(connectedEl.querySelectorAll('.vc-word'));

    function sampleAt(p) {
      st.scroll(st.start + p * (st.end - st.start));
      ScrollTrigger.update();
      const v12t = getComputedStyle(v12).transform;
      return {
        p,
        v11_opacity: getComputedStyle(v11).opacity,
        v12_opacity: getComputedStyle(v12).opacity,
        v12_transform: v12t,
        gate_opacity: getComputedStyle(gateEl).opacity,
        gate_armed: gateEl.classList.contains('is-armed'),
      };
    }

    // Sample the rise window before GATE_PROGRESS (0.626308)
    const samples = [0.58, 0.60, 0.61, 0.615, 0.62, 0.623, 0.6263].map(sampleAt);

    // Check text no longer has period
    const pText = connectedEl.querySelector('p').textContent;

    return { samples, pText, wordCount: words.length };
  });

  console.log(JSON.stringify(result, null, 2));

  await browser.close();
})();
