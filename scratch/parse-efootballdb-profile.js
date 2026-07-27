const https = require('https');
const fs = require('fs');

function fetchHtml(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function parseProfile() {
  const url = "https://www.efootballdb.com/players/profile?id=17592186179024";
  console.log(`Fetching ${url}...`);
  const html = await fetchHtml(url);
  console.log(`HTML size: ${html.length} bytes.`);

  // Save HTML to scratch for inspection
  fs.writeFileSync('scratch/efootballdb_profile.html', html);

  // Extract all img tags
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  console.log("\nAll images found on profile page:");
  while ((match = imgRegex.exec(html)) !== null) {
    console.log(" ->", match[1]);
  }
}

parseProfile();
