const https = require('https');
const fs = require('fs');

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      resolve(res.statusCode === 200 && res.headers['content-type']?.includes('image'));
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

function getSofifaUrl(id, yearVersion) {
  const padded = String(id).padStart(6, '0');
  const p1 = padded.substring(0, 3);
  const p2 = padded.substring(3, 6);
  return `https://cdn.sofifa.net/players/${p1}/${p2}/${yearVersion}_240.png`;
}

async function findPngForLegend(legend) {
  // If we have an EA ID (e.g. 190043), test years 25 down to 18
  const versions = ['25', '24', '23', '22', '21', '20', '19', '18'];
  if (legend.ea_id) {
    for (const v of versions) {
      const url = getSofifaUrl(legend.ea_id, v);
      const exists = await checkUrl(url);
      if (exists) return url;
    }
  }
  return null;
}

async function testAllLegends() {
  const legends = JSON.parse(fs.readFileSync('scratch/legends_list.json', 'utf8'));
  console.log(`Loaded ${legends.length} legend players from legends_list.json.`);

  // Test searching Sofifa name search API for missing IDs
  // e.g. https://sofifa.com/players?keyword=PELE
}

testAllLegends();
