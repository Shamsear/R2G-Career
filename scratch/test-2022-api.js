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

async function test2022Api() {
  console.log("Testing api.efootballdb.com/api/2022/ endpoints...\n");

  const urls = [
    "https://api.efootballdb.com/api/2022/players/17592186179024",
    "https://api.efootballdb.com/api/2022/players?search=Ronaldinho",
    "https://api.efootballdb.com/api/2022/players?name=Ronaldinho",
    "https://api.efootballdb.com/api/2022/players?q=Ronaldinho",
    "https://api.efootballdb.com/api/2022/players?all=Ronaldinho",
    "https://api.efootballdb.com/api/2022/players"
  ];

  for (const u of urls) {
    const data = await fetchJson(u);
    console.log(`URL: ${u}`);
    if (data && typeof data === 'object') {
      if (Array.isArray(data)) {
        console.log(` -> Array length: ${data.length}`);
        if (data.length > 0) console.log(" -> Item 0:", JSON.stringify(data[0]).substring(0, 300));
      } else if (data.data && Array.isArray(data.data)) {
        console.log(` -> data.data length: ${data.data.length}`);
        if (data.data.length > 0) console.log(" -> Item 0:", JSON.stringify(data.data[0]).substring(0, 300));
      } else {
        console.log(" -> Snippet:", JSON.stringify(data).substring(0, 300));
      }
    } else {
      console.log(" -> Format:", typeof data);
    }
    console.log("-----------------------------------------");
  }
}

test2022Api();
