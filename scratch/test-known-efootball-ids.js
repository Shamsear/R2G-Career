const https = require('https');

function checkHead(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      resolve({ url, status: res.statusCode, size: res.headers['content-length'] });
    });
    req.on('error', () => resolve({ url, status: 500 }));
    req.end();
  });
}

async function testKnownEfootballIds() {
  // Test 14-digit efootball player card IDs
  // Ronaldinho user profile ID: 17592186179024
  const testIds = [
    "17592186179024",
    "105854569331106",
    "106787651045215",
    "106787651045391",
    "105854569387197",
    "105854569391823",
    "106787651035597",
    "106787651039542",
    "106787651090754",
    "106787651045391"
  ];

  console.log("Testing known eFootball card IDs on assets.efootballdb.com:\n");
  for (const id of testIds) {
    const url = `https://assets.efootballdb.com/2022/players/${id}_l.webp`;
    const res = await checkHead(url);
    console.log(`ID ${id} -> Status: ${res.status} | Size: ${res.size} bytes`);
  }
}

testKnownEfootballIds();
