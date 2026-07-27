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

async function testBasePesId() {
  console.log("Testing base_pes_id queries for Ronaldinho (134608)...\n");

  const queryUrls = [
    "https://api.efootballdb.com/api/2022/players?base_pes_id=134608",
    "https://api.efootballdb.com/api/2022/players?filter[base_pes_id]=134608",
    "https://api.efootballdb.com/api/2022/players?search=Ronaldinho",
    "https://api.efootballdb.com/api/2022/players?all=Ronaldinho",
    "https://api.efootballdb.com/api/2022/players/134608"
  ];

  for (const u of queryUrls) {
    const data = await fetchJson(u);
    console.log(`URL: ${u}`);
    if (data && typeof data === 'object') {
      if (Array.isArray(data.data)) {
        console.log(` -> Found ${data.data.length} variations/results!`);
        data.data.slice(0, 5).forEach((p, idx) => {
          console.log(`    Result ${idx + 1}: pes_id: ${p.pes_id} | base_pes_id: ${p.base_pes_id} | card_type: ${p.card_type}`);
        });
      } else if (data.data) {
        console.log(" -> Single player object:", data.data.pes_id, data.data.base_pes_id);
      }
    }
    console.log("---------------------------------------");
  }
}

testBasePesId();
