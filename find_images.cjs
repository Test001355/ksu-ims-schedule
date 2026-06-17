const https = require('https');

https.get('https://transfer-credit.vercel.app/login', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    let match;
    while ((match = imgRegex.exec(data)) !== null) {
      console.log('Found image src:', match[1]);
    }
  });
});
