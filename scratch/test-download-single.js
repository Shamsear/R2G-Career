const https = require('https');
const fs = require('fs');

function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      console.log(`GET ${url} -> Status: ${res.statusCode}, Headers:`, res.headers);
      if (res.statusCode === 200) {
        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(true);
        });
      } else if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = new URL(redirectUrl, url).href;
        }
        console.log("Following redirect to:", redirectUrl);
        downloadFile(redirectUrl, destPath).then(resolve);
      } else {
        resolve(false);
      }
    }).on('error', (e) => {
      console.error("Download error:", e.message);
      resolve(false);
    });
  });
}

async function testSingle() {
  const url1 = "https://assets.efootballdb.com/2022/players/17592186179024_l.webp";
  const url2 = "https://api.efootballdb.com/assets/2022/players/1/17592186179024.png.webp";

  console.log("Testing download url1...");
  const s1 = await downloadFile(url1, "scratch/test1.webp");
  console.log("Download url1 success:", s1);

  console.log("\nTesting download url2...");
  const s2 = await downloadFile(url2, "scratch/test2.webp");
  console.log("Download url2 success:", s2);
}

testSingle();
