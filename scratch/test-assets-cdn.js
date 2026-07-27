const https = require('https');

function checkHead(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      resolve({ url, status: res.statusCode, type: res.headers['content-type'], length: res.headers['content-length'] });
    });
    req.on('error', () => resolve({ url, status: 500 }));
    req.end();
  });
}

async function testAssetsCdn() {
  const id = "17592186179024";
  const urls = [
    `https://assets.efootballdb.com/2022/players/${id}_l.webp`,
    `https://assets.efootballdb.com/2022/players/${id}_m.webp`,
    `https://assets.efootballdb.com/2022/players/${id}.webp`,
    `https://assets.efootballdb.com/2022/cards/${id}_l.webp`,
    `https://assets.efootballdb.com/2022/cards/${id}.webp`
  ];

  console.log("Testing assets.efootballdb.com direct URLs:\n");
  for (const u of urls) {
    const res = await checkHead(u);
    console.log(`URL: ${u}\n -> Status: ${res.status} | Type: ${res.type} | Size: ${res.length} bytes\n`);
  }
}

testAssetsCdn();
