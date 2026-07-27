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

async function testEfootballdbSearchApi() {
  console.log("Testing search endpoints on efootballdb.com...\n");

  const endpoints = [
    "https://api.efootballdb.com/api/players?search=Ronaldinho",
    "https://api.efootballdb.com/api/players?name=Ronaldinho",
    "https://api.efootballdb.com/api/players?q=Ronaldinho",
    "https://www.efootballdb.com/api/search?q=Ronaldinho",
    "https://www.efootballdb.com/api/players?search=Ronaldinho"
  ];

  for (const ep of endpoints) {
    const data = await fetchJson(ep);
    console.log(`Endpoint: ${ep}`);
    if (data && typeof data === 'object') {
      console.log(" -> Result type:", Array.isArray(data) ? `Array(${data.length})` : Object.keys(data));
      if (Array.isArray(data) && data.length > 0) {
        console.log(" -> Top item:", data[0]);
      } else if (data.data && Array.isArray(data.data)) {
        console.log(` -> data.data count: ${data.data.length}`);
        if (data.data.length > 0) {
          console.log(" -> Top item in data.data:", data.data[0]);
        }
      }
    } else {
      console.log(" -> Non-object response");
    }
    console.log("-----------------------------------------------");
  }
}

testEfootballdbSearchApi();
