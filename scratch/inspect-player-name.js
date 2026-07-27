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

async function inspectPlayerDetails() {
  const url = "https://api.efootballdb.com/api/2022/players/17592186179024";
  console.log(`Fetching player profile from ${url}...`);
  const json = await fetchJson(url);
  console.log("Full player JSON:", JSON.stringify(json, null, 2));
}

inspectPlayerDetails();
