const https = require('https');

function checkImageHead(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      resolve({ url, status: res.statusCode, contentType: res.headers['content-type'], size: res.headers['content-length'] });
    });
    req.on('error', () => resolve({ url, status: 500 }));
    req.end();
  });
}

async function testSampleLegendCutouts() {
  // EA Sports IDs for famous legends (Pele: 190043, Maradona: 190042, Zidane: 1397, Cruyff: 190044, Ronaldinho: 28130, Beckham: 250, Kaká: 138449, Maldini: 1109, Buffon: 1179)
  const testLegendIds = [
    { name: "PELE", id: 190043 },
    { name: "DIEGO MARADONA", id: 190042 },
    { name: "JOHAN CRUYFF", id: 190044 },
    { name: "RONALDINHO GAUCHO", id: 28130 },
    { name: "DAVID BECKHAM", id: 250 },
    { name: "KAKA", id: 138449 },
    { name: "PAOLO MALDINI", id: 1109 },
    { name: "GIANLUIGI BUFFON", id: 1179 },
    { name: "ZINEDINE ZIDANE", id: 1397 },
    { name: "THIERRY HENRY", id: 1625 }
  ];

  console.log("Testing EA Sports FC Transparent PNG Cutouts:\n");

  for (const legend of testLegendIds) {
    const eaCdnUrl = `https://eafc24.content.easports.com/fifa/fltPlayerImages/2024/pub/player/p${legend.id}.png`;
    const res = await checkImageHead(eaCdnUrl);
    console.log(`${legend.name} (ID: ${legend.id}) -> Status: ${res.status}, Type: ${res.contentType}`);
  }
}

testSampleLegendCutouts();
