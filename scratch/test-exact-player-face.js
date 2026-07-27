const https = require('https');

function checkHead(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      resolve({ url, status: res.statusCode, type: res.headers['content-type'], length: res.headers['content-length'] });
    });
    req.on('error', () => resolve({ url, status: 500 }));
    req.end();
  });
}

async function testExactPlayerFace() {
  const url = "https://api.efootballdb.com/assets/2022/players/1/17592186179024.png.webp";
  console.log(`Checking ${url}...`);
  const res = await checkHead(url);
  console.log("Result:", res);
}

testExactPlayerFace();
