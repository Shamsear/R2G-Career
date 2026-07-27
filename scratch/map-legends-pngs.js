const https = require('https');
const fs = require('fs');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function checkHead(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      resolve(res.statusCode === 200 && res.headers['content-type']?.includes('image'));
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

function getSofifaUrl(id) {
  const padded = String(id).padStart(6, '0');
  const p1 = padded.substring(0, 3);
  const p2 = padded.substring(3, 6);
  return `https://cdn.sofifa.net/players/${p1}/${p2}/25_240.png`;
}

async function mapLegendsToPngs() {
  const legends = JSON.parse(fs.readFileSync('scratch/legends_list.json', 'utf8'));
  console.log(`Loaded ${legends.length} legends.`);

  // Test building a comprehensive dictionary of Legend IDs
  // We can fetch EA FC Icon/Hero dataset or search public FIFA datasets
}

mapLegendsToPngs();
