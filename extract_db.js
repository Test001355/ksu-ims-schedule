const fs = require('fs');

const data = JSON.parse(fs.readFileSync('vercel_network.json', 'utf8'));
const apiResponse = data.find(d => d.url.includes('/api/data'));

if (apiResponse) {
  const dbData = JSON.parse(apiResponse.data);
  fs.writeFileSync('src/db.json', JSON.stringify(dbData, null, 2));
  console.log('Successfully wrote src/db.json');
} else {
  console.log('Could not find /api/data in vercel_network.json');
}
