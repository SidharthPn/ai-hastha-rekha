const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/kili.html');
  
  // Click Seek Guidance
  await page.waitForSelector('#btn-begin', { visible: true });
  await page.click('#btn-begin');
  
  // Wait for the next screen
  await page.waitForSelector('#btn-open-cage', { visible: true });
  
  // Click Open Cage
  await page.click('#btn-open-cage');
  
  // Wait 3 seconds for parrot to appear
  await new Promise(r => setTimeout(r, 3000));
  
  await page.screenshot({ path: 'frontend/assets/images/puppeteer_kili_josyam.png' });
  
  await browser.close();
})();
