const https = require('https');

function followRedirect(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = new URL(redirectUrl, url).href;
        }
        resolve({ original: url, redirect: redirectUrl, status: res.statusCode });
      } else {
        resolve({ original: url, status: res.statusCode, contentType: res.headers['content-type'], length: res.headers['content-length'] });
      }
    }).on('error', () => resolve({ original: url, status: 500 }));
  });
}

async function testRedirects() {
  const urls = [
    "https://efootballhub.net/images/players/full/105.png",
    "https://efootballhub.net/images/players/105.png",
    "https://efootballhub.net/images/cards/105.png",
    "https://efootball.open-db.com/images/players/105.png"
  ];

  for (const u of urls) {
    const res = await followRedirect(u);
    console.log(res);
  }
}

testRedirects();
