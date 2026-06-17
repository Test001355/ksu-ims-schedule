import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 2000));
  
  // Click on 'ข้อมูลหลัก' tab
  const tabs = await page.$$('button');
  for (let tab of tabs) {
    const text = await page.evaluate(el => el.textContent, tab);
    if (text && text.includes('ข้อมูลหลัก')) {
      await tab.click();
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Click on 'รายวิชา' tab inside Masters
  const masterTabs = await page.$$('button');
  for (let tab of masterTabs) {
    const text = await page.evaluate(el => el.textContent, tab);
    if (text && text.trim() === 'รายวิชา') {
      await tab.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1000));
  
  const content = await page.content();
  fs.writeFileSync('page.html', content);
  
  const rows = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    if (tables.length === 0) return 'No tables';
    // Assume the last table is the courses table
    const table = tables[tables.length - 1];
    return table.querySelectorAll('tbody tr').length;
  });
  
  console.log('Table rows in tbody:', rows);
  
  await browser.close();
})();
