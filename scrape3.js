import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.goto('https://cetms.vercel.app/masters', { waitUntil: 'networkidle0' });
  
  const html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('C:\\DB\\masters.html', html);
  console.log('Saved masters.html');
  
  await browser.close();
})();
