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

async function inspectEfhubApi() {
  const data = await fetchJson("https://efhub.com/api/search?q=ronaldinho");
  console.log("Keys of data:", typeof data === 'object' ? Object.keys(data) : 'not object');
  console.log("Sample response:", JSON.stringify(data, null, 2).substring(0, 1000));
}

inspectEfhubApi();
