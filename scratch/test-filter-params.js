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

async function testFilterParams() {
  const params = [
    "filter[name]=Ronaldinho",
    "filter[all]=Ronaldinho",
    "query=Ronaldinho",
    "keyword=Ronaldinho",
    "player_name=Ronaldinho",
    "name_like=Ronaldinho",
    "search_text=Ronaldinho",
    "s=Ronaldinho"
  ];

  for (const p of params) {
    const url = `https://api.efootballdb.com/api/players?${p}`;
    const res = await fetchJson(url);
    if (res && res.data) {
      console.log(`Param: ${p} -> count: ${res.data.length}`);
      if (res.data.length > 0) {
        console.log(" -> Match 1:", res.data[0]);
      }
    }
  }
}

testFilterParams();
