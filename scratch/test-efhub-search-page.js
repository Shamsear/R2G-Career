const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function testSearchPage() {
  const names = ["ronaldinho", "del piero", "maradona", "cruyff", "pirlo", "beckham", "kaka"];

  for (const name of names) {
    const url = `https://efhub.com/search?q=${encodeURIComponent(name)}`;
    console.log(`Fetching ${url}...`);
    const html = await fetchUrl(url);
    const matches = [...html.matchAll(/efimg\.com\/efootballhub22\/images\/player_cards\/([0-9]+)_l\.png/g)];
    console.log(`Found ${matches.length} eFootball card renders for ${name}:`);
    matches.slice(0, 3).forEach(m => {
      console.log(` -> Card URL: https://efimg.com/efootballhub22/images/player_cards/${m[1]}_l.png`);
    });
  }
}

testSearchPage();
