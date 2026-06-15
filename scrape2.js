import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/data')) {
      try {
        const json = await response.json();
        fs.writeFileSync('C:\\DB\\src\\db.json', JSON.stringify(json, null, 2));
        console.log('Saved db.json');
      } catch (e) {
        console.log('Error parsing JSON:', e);
      }
    }
  });

  await page.goto('https://cetms.vercel.app/?view=section&id=ce6541', { waitUntil: 'networkidle0' });
  await browser.close();
})();
