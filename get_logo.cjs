const https = require('https');
const fs = require('fs');

https.get('https://transfer-credit.vercel.app/login', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    // Find img src that looks like a logo
    const match = data.match(/src="([^"]*logo[^"]*)"/i) || data.match(/src="(\/_next\/image\?url=[^"]+)"/i) || data.match(/src="([^"]+\.png)"/i);
    if (match) {
      let url = match[1];
      if (url.startsWith('/')) {
        url = 'https://transfer-credit.vercel.app' + url;
      }
      // Handle Next.js image URL encoding
      if (url.includes('/_next/image?url=')) {
        const urlParams = new URL(url);
        url = 'https://transfer-credit.vercel.app' + decodeURIComponent(urlParams.searchParams.get('url'));
      }
      console.log('Found logo URL:', url);
      
      // Download the image
      https.get(url, (imgRes) => {
        const file = fs.createWriteStream('public/ksu-logo.png');
        imgRes.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('Downloaded transparent logo!');
        });
      });
    } else {
      console.log('No logo found');
    }
  });
});
