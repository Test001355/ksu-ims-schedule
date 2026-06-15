import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });
  
  await page.goto('http://localhost:5173/masters', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  
  await page.screenshot({ path: 'local_masters.png', fullPage: true });
  await browser.close();
})();
