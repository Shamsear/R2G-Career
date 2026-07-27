const https = require('https');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    }).on('error', () => resolve(null));
  });
}

function checkHead(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      resolve({ url, status: res.statusCode, type: res.headers['content-type'], length: res.headers['content-length'] });
    });
    req.on('error', () => resolve({ url, status: 500 }));
    req.end();
  });
}

async function testApiEfootballdb() {
  console.log("Testing api.efootballdb.com endpoints for ID 17592186179024...\n");

  const testApiUrls = [
    "https://api.efootballdb.com/api/player/17592186179024",
    "https://api.efootballdb.com/api/players/17592186179024",
    "https://api.efootballdb.com/player/17592186179024",
    "https://api.efootballdb.com/players/17592186179024",
    "https://api.efootballdb.com/api/v1/players/17592186179024"
  ];

  for (const u of testApiUrls) {
    const res = await fetchJson(u);
    console.log(`API URL: ${u} -> Type: ${typeof res} | Snippet: ${JSON.stringify(res).substring(0, 200)}`);
  }

  console.log("\nTesting asset image URLs for ID 17592186179024...\n");
  const testAssets = [
    "https://api.efootballdb.com/assets/2022/players/17592186179024_.png.webp",
    "https://api.efootballdb.com/assets/2022/players/17592186179024.png.webp",
    "https://api.efootballdb.com/assets/2022/players/17592186179024.png",
    "https://api.efootballdb.com/assets/2022/cards/17592186179024.png.webp",
    "https://api.efootballdb.com/assets/2022/cards/17592186179024.png"
  ];

  for (const a of testAssets) {
    const res = await checkHead(a);
    console.log(`Asset: ${a} -> Status: ${res.status} | Type: ${res.type} | Size: ${res.length}`);
  }
}

testApiEfootballdb();
