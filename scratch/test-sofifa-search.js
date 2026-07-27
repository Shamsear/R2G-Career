const https = require('https');

function fetchHtml(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

function extractPlayerInfo(html) {
  // Sofifa player rows contain img src like https://cdn.sofifa.net/players/190/043/24_120.png or 25_120.png
  const matches = [...html.matchAll(/cdn\.sofifa\.net\/players\/(\d+)\/(\d+)\/(\d+)_120\.png/g)];
  return matches.map(m => {
    const p1 = m[1];
    const p2 = m[2];
    const fullId = parseInt(p1 + p2, 10);
    return { fullId, p1, p2, version: m[3] };
  });
}

async function testSofifaSearch() {
  const names = ["PELE", "DIEGO MARADONA", "PAOLO MALDINI", "CARLES PUYOL", "ZLATAN IBRAHIMOVIC", "FRANCO BARESI"];
  
  for (const name of names) {
    const url = `https://sofifa.com/players?keyword=${encodeURIComponent(name)}`;
    console.log(`Searching Sofifa for ${name}...`);
    const html = await fetchHtml(url);
    const results = extractPlayerInfo(html);
    console.log(`Results for ${name}:`, results.slice(0, 3));
  }
}

testSofifaSearch();
