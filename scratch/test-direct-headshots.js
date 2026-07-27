const https = require('https');

function checkHead(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      resolve({ status: res.statusCode, type: res.headers['content-type'], length: res.headers['content-length'] });
    });
    req.on('error', () => resolve({ status: 500 }));
    req.end();
  });
}

async function testHeadshots() {
  // EA FC 24 & 25 official player headshots URLs:
  // https://cdn.sofifa.net/players/... (works when constructed directly!)
  // Test direct Sofifa CDN links for famous legend IDs
  const testItems = [
    { name: "MARADONA", url: "https://cdn.sofifa.net/players/190/042/25_240.png" },
    { name: "RONALDINHO", url: "https://cdn.sofifa.net/players/028/130/25_240.png" },
    { name: "BECKHAM", url: "https://cdn.sofifa.net/players/000/250/25_240.png" },
    { name: "KAKA", url: "https://cdn.sofifa.net/players/138/449/25_240.png" },
    { name: "BUFFON", url: "https://cdn.sofifa.net/players/001/179/25_240.png" },
    { name: "ZIDANE", url: "https://cdn.sofifa.net/players/001/397/25_240.png" },
    { name: "HENRY", url: "https://cdn.sofifa.net/players/001/625/25_240.png" }
  ];

  console.log("Testing Direct Sofifa Transparent PNG Headshots:\n");
  for (const item of testItems) {
    const res = await checkHead(item.url);
    console.log(`${item.name} -> Status ${res.status} | Content-Type: ${res.type} | Size: ${res.length} bytes`);
  }
}

testHeadshots();
