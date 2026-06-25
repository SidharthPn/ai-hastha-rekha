const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/test_parrot.html');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'frontend/assets/images/puppeteer_test_parrot.png' });
  await browser.close();
})();
