const fs = require('fs');
const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function findApiInScripts() {
  const html = fs.readFileSync('scratch/efootballdb_profile.html', 'utf8');
  const scripts = [...html.matchAll(/src=["'](\/_next\/static\/chunks\/[^"']+)["']/g)].map(m => "https://www.efootballdb.com" + m[1]);
  console.log(`Found ${scripts.length} Next.js JS chunks.`);

  for (const s of scripts) {
    const code = await fetchUrl(s);
    const apiMatches = [...code.matchAll(/(https:\/\/api\.efootballdb\.com\/[a-zA-Z0-9_\-\/\?\=\&]+)/g)];
    if (apiMatches.length > 0) {
      console.log(`\nScript: ${s}`);
      apiMatches.forEach(m => console.log(" -> API Endpoint:", m[1]));
    }
  }
}

findApiInScripts();
