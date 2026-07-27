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

async function inspectSamplePlayer() {
  const data = await fetchJson("https://api.efootballdb.com/api/players?page=1");
  console.log("Meta info:", data.meta);
  console.log("Total players in DB:", data.meta ? data.meta.total : 'unknown');
  if (data.data && data.data.length > 0) {
    console.log("Sample player object:", JSON.stringify(data.data[0], null, 2));
  }
}

inspectSamplePlayer();
