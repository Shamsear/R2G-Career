const https = require('https');

function fetchHtml(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function inspectHomepage() {
  const html = await fetchHtml("https://www.efootballdb.com");
  console.log("HTML length:", html.length);
  const profileLinks = [...html.matchAll(/\/players\/profile\?id=(\d+)/g)].map(m => m[1]);
  console.log(`Found ${profileLinks.length} profile IDs on homepage!`);
  console.log("Sample profile IDs:", profileLinks.slice(0, 15));
}

inspectHomepage();
