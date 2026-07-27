const https = require('https');

function checkHead(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      resolve({ url, status: res.statusCode, type: res.headers['content-type'], length: res.headers['content-length'] });
    });
    req.on('error', () => resolve({ url, status: 500 }));
    req.end();
  });
}

async function testEfimg() {
  const sampleCard = "https://efimg.com/efootballhub22/images/player_cards/89138556678367_l.png";
  const res = await checkHead(sampleCard);
  console.log("eFootball card render:", res);
}

testEfimg();
