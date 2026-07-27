const https = require('https');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', () => resolve(null));
  });
}

function checkHead(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      resolve({ status: res.statusCode, location: res.headers.location, type: res.headers['content-type'] });
    });
    req.on('error', () => resolve({ status: 500 }));
    req.end();
  });
}

async function debugSearchItem() {
  const searchUrl = "https://api.efootballdb.com/api/2022/players?search=Ronaldinho";
  console.log("Searching Ronaldinho...");
  const res = await fetchJson(searchUrl);
  if (res && res.data) {
    console.log("Sample items found:", res.data.length);
    for (let i = 0; i < Math.min(5, res.data.length); i++) {
      const item = res.data[i];
      console.log(`Item ${i}:`, { pes_id: item.pes_id, base_pes_id: item.base_pes_id, name: item.english_name || item.player_name });
      const cdnUrl = `https://assets.efootballdb.com/2022/players/${item.pes_id}_l.webp`;
      const head = await checkHead(cdnUrl);
      console.log(` -> CDN URL ${cdnUrl} status: ${head.status}`);
    }
  }
}

debugSearchItem();
