import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  // Go to local app
  }
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Click 'ห้องเรียน' (Room)
  const buttons = await page.$$('button');
  for (let btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text === 'ห้องเรียน') {
      await btn.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1000));
  
  await page.screenshot({ path: 'local_overview.png' });
  console.log('Screenshot saved to local_overview.png');
  
  await browser.close();
})();
