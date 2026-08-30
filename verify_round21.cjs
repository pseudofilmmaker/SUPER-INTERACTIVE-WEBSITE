const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // 1. Confirm no border-bottom on filmography-item / awards-item / career-item
  const borders = await page.evaluate(() => {
    const fi = document.querySelector('.filmography-item');
    const ai = document.querySelector('.awards-item');
    const ci = document.querySelector('.career-item');
    return {
      filmography: fi ? getComputedStyle(fi).borderBottomStyle : null,
      awards: ai ? getComputedStyle(ai).borderBottomStyle : null,
      career: ci ? getComputedStyle(ci).borderBottomStyle : null,
    };
  });
  console.log('BORDERS:', JSON.stringify(borders));

  await browser.close();
})();
