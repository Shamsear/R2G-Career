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

async function testLaravelApi() {
  console.log("Testing api.efootballdb.com/api/players query parameters...\n");

  const queryUrls = [
    "https://api.efootballdb.com/api/players?search=Ronaldinho",
    "https://api.efootballdb.com/api/players?name=Ronaldinho",
    "https://api.efootballdb.com/api/players?q=Ronaldinho",
    "https://api.efootballdb.com/api/players?keyword=Ronaldinho",
    "https://api.efootballdb.com/api/players?page=1",
    "https://api.efootballdb.com/api/players"
  ];

  for (const u of queryUrls) {
    const data = await fetchJson(u);
    console.log(`URL: ${u}`);
    if (data && typeof data === 'object') {
      console.log(" -> Keys:", Object.keys(data));
      if (data.data && Array.isArray(data.data)) {
        console.log(` -> Found ${data.data.length} players!`);
        console.log(" -> Sample player:", JSON.stringify(data.data[0]).substring(0, 300));
      } else {
        console.log(" -> Output snippet:", JSON.stringify(data).substring(0, 300));
      }
    } else {
      console.log(" -> Output format:", typeof data);
    }
    console.log("-----------------------------------------");
  }
}

testLaravelApi();
