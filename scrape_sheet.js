import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('https://cetms.vercel.app/', { waitUntil: 'networkidle0' });
  
  const tabs = await page.$$('nav a');
  for (let tab of tabs) {
    const text = await page.evaluate(el => el.textContent, tab);
    if (text === 'ใบตารางสอน') {
      await tab.click();
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  const html = await page.evaluate(() => {
    return document.querySelector('main')?.outerHTML || document.body.innerHTML;
  });
  
  fs.writeFileSync('vercel_sheet.txt', html);
  await browser.close();
})();
