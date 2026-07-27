const https = require('https');

function checkHead(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      resolve({ status: res.statusCode, type: res.headers['content-type'], length: res.headers['content-length'] });
    });
    req.on('error', () => resolve({ status: 500 }));
    req.end();
  });
}

function fetchHtml(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function testEfootballRenders() {
  console.log("Testing eFootball / PESMaster Legend player render URLs...\n");

  // PESMaster eFootball player search or image CDN test
  const testUrls = [
    { name: "PESMaster Ronaldinho Render", url: "https://www.pesmaster.com/images/efootball2024/players/render/35.png" },
    { name: "eFootball Hub Render Test", url: "https://efootballhub.net/images/players/35.png" },
    { name: "PESMaster eFootball 2025 Player Card", url: "https://www.pesmaster.com/images/efootball2025/players/render/105.png" }
  ];

  for (const t of testUrls) {
    const res = await checkHead(t.url);
    console.log(`${t.name} -> Status: ${res.status} | Type: ${res.type} | Size: ${res.length}`);
  }

  // Let's also fetch search results on PESMaster for 'Ronaldinho' or 'Del Piero'
  console.log("\nSearching PESMaster for 'Ronaldinho'...");
  const pesHtml = await fetchHtml("https://www.pesmaster.com/efootball-2024/search/?q=ronaldinho");
  const imgMatches = pesHtml.match(/src="([^"]+\.png)"/g);
  console.log("PESMaster image matches:", imgMatches ? imgMatches.slice(0, 10) : []);
}

testEfootballRenders();
