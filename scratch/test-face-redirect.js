const https = require('https');

function followRedirect(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve({ original: url, redirect: res.headers.location, status: res.statusCode });
      } else {
        resolve({ original: url, status: res.statusCode, contentType: res.headers['content-type'], length: res.headers['content-length'] });
      }
    }).on('error', (e) => resolve({ original: url, status: 500, error: e.message }));
  });
}

async function testRedirect() {
  const res = await followRedirect("https://api.efootballdb.com/assets/2022/players/1/17592186179024.png.webp");
  console.log("Redirect result:", res);

  if (res.redirect) {
    const res2 = await followRedirect(res.redirect);
    console.log("Second redirect result:", res2);
  }
}

testRedirect();
