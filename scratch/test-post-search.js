const https = require('https');

function postJson(url, body) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(body);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Accept': 'application/json, text/plain, */*'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); } catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', () => resolve({ status: 500 }));
    req.write(postData);
    req.end();
  });
}

async function testPostSearch() {
  console.log("Testing POST search endpoints...\n");

  const bodies = [
    { search: "Ronaldinho" },
    { name: "Ronaldinho" },
    { q: "Ronaldinho" },
    { keyword: "Ronaldinho" }
  ];

  const endpoints = [
    "https://api.efootballdb.com/api/players",
    "https://api.efootballdb.com/api/search",
    "https://api.efootballdb.com/api/player-search"
  ];

  for (const ep of endpoints) {
    for (const b of bodies) {
      const res = await postJson(ep, b);
      console.log(`POST ${ep} with ${JSON.stringify(b)} -> Status: ${res.status}`);
      if (res.data && typeof res.data === 'object' && res.data.data) {
        console.log(` -> Result count: ${Array.isArray(res.data.data) ? res.data.data.length : 'not array'}`);
        if (Array.isArray(res.data.data) && res.data.data.length > 0) {
          console.log(" -> Match 1:", JSON.stringify(res.data.data[0]).substring(0, 300));
        }
      }
    }
  }
}

testPostSearch();
