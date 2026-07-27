const https = require('https');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://efootballhub.net/'
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

function checkHead(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      resolve({ status: res.statusCode, type: res.headers['content-type'] });
    });
    req.on('error', () => resolve({ status: 500 }));
    req.end();
  });
}

async function testEfootballHub() {
  console.log("Testing eFootball Hub player endpoints...");
  
  // Search eFootballHub API for Ronaldinho / Cruyff / Pele
  const efootballHubSearch = await fetchJson("https://efootballhub.net/api/search?q=ronaldinho");
  console.log("eFootballHub search results:", typeof efootballHubSearch === 'object' ? JSON.stringify(efootballHubSearch).substring(0, 300) : efootballHubSearch.substring(0, 200));

  // Test eFootball database player render image formats:
  const testImages = [
    "https://efootballhub.net/images/players/full/105.png",
    "https://efootballhub.net/images/players/105.png",
    "https://efootballhub.net/images/cards/105.png",
    "https://www.pesmaster.com/images/efootball-2024/players/full/105.png"
  ];

  for (const img of testImages) {
    const res = await checkHead(img);
    console.log(`URL: ${img} -> Status: ${res.status} | Type: ${res.type}`);
  }
}

testEfootballHub();
