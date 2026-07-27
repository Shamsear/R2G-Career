const https = require('https');

function fetchUrl(url) {
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

async function inspectEfhubHome() {
  const html = await fetchUrl("https://efhub.com");
  console.log("efhub home length:", html.length);

  // Match all image URLs
  const imgMatches = [...html.matchAll(/(https:\/\/[^"'\s]+\.(png|webp|jpg|jpeg))/gi)];
  console.log("Found image links on efhub:", imgMatches.slice(0, 15).map(m => m[1]));
}

inspectEfhubHome();
