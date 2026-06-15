import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Go to the target page
  console.log('Navigating to page...');
  await page.goto('https://cetms.vercel.app/?view=section&id=ce6641', { waitUntil: 'networkidle0' });

  // Extract all text content to see what we can get
  const textContent = await page.evaluate(() => {
    return document.body.innerText;
  });
  
  // Try to find __NEXT_DATA__ or script tags with JSON
  const scripts = await page.evaluate(() => {
    return Array.from(document.scripts).map(s => s.innerText).filter(t => t.includes('{') || t.includes('['));
  });

  fs.writeFileSync('scraped_text.txt', textContent);
  fs.writeFileSync('scraped_scripts.txt', scripts.join('\n\n---\n\n'));
  
  console.log('Saved scraped data to scraped_text.txt and scraped_scripts.txt');
  await browser.close();
})();
