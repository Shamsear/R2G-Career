const https = require('https');

function checkHead(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      resolve({ url, status: res.statusCode, type: res.headers['content-type'], length: res.headers['content-length'] });
    });
    req.on('error', () => resolve({ url, status: 500 }));
    req.end();
  });
}

async function verifyComparisonSources() {
  console.log("Verifying sample player (Ronaldinho / Beckham) across sources:\n");

  const sources = [
    { source: "1. EA FC / FIFA Standard Passport Headshot", url: "https://cdn.sofifa.net/players/028/130/25_240.png" },
    { source: "2. eFootball / PES Full Dynamic Legend Card", url: "https://efimg.com/efootballhub22/images/player_cards/89138556678367_l.png" },
    { source: "3. EA FC 24 / 25 Full Icon Card Render", url: "https://cdn.futwiz.com/assets/img/fc24/faces/28130.png" },
    { source: "4. EA FC Full Body Action Cutout", url: "https://fifa-render.fut.gg/24/players/28130.png" }
  ];

  for (const s of sources) {
    const res = await checkHead(s.url);
    console.log(`${s.source}\n -> Status: ${res.status} | Type: ${res.type} | Size: ${res.length} bytes\n`);
  }
}

verifyComparisonSources();
