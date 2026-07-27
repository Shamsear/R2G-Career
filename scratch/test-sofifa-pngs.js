const https = require('https');

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      resolve({ url, status: res.statusCode, contentType: res.headers['content-type'], size: res.headers['content-length'] });
    });
    req.on('error', (e) => resolve({ url, status: 500, error: e.message }));
    req.end();
  });
}

// Sofifa formats player ID by padding to 6 digits and splitting 3/3
// e.g. ID 250 -> 000250 -> 000/250
function getSofifaUrl(id) {
  const padded = String(id).padStart(6, '0');
  const p1 = padded.substring(0, 3);
  const p2 = padded.substring(3, 6);
  return `https://cdn.sofifa.net/players/${p1}/${p2}/25_240.png`;
}

async function testSofifaUrls() {
  const legends = [
    { name: "Pele", id: 190043 },
    { name: "Maradona", id: 190042 },
    { name: "Cruyff", id: 190044 },
    { name: "Ronaldinho", id: 28130 },
    { name: "Beckham", id: 250 },
    { name: "Kaka", id: 138449 },
    { name: "Maldini", id: 1109 },
    { name: "Buffon", id: 1179 },
    { name: "Zidane", id: 1397 },
    { name: "Henry", id: 1625 }
  ];

  console.log("Testing Sofifa PNG URLs:\n");
  for (const l of legends) {
    const url = getSofifaUrl(l.id);
    const res = await checkUrl(url);
    console.log(`${l.name} (${l.id}) -> ${res.status} | ${res.contentType} | ${url}`);
  }
}

testSofifaUrls();
