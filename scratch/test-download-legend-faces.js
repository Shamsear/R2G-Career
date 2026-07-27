const https = require('https');
const fs = require('fs');

function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
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
        downloadFile(redirectUrl, destPath).then(resolve);
      } else {
        resolve(false);
      }
    }).on('error', () => resolve(false));
  });
}

async function testDownloadLegendFaces() {
  const testItems = [
    { name: "Ronaldinho", id: "17592186179024" },
    { name: "Del Piero", id: "105854569331106" },
    { name: "Costacurta", id: "106787651045215" },
    { name: "Beckham", id: "106787651045391" },
    { name: "Cannavaro", id: "105854569387197" },
    { name: "Cruyff", id: "105854569391823" }
  ];

  console.log("Downloading transparent eFootball DB face images...\n");

  for (const item of testItems) {
    const dir = `public/assets/images/legends/${item.name.toLowerCase().replace(/ /g, '_')}`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const cdnUrl = `https://assets.efootballdb.com/2022/players/${item.id}_l.webp`;
    const destFile = `${dir}/${item.id}.webp`;

    const success = await downloadFile(cdnUrl, destFile);
    console.log(`Downloaded ${item.name} (${item.id}) -> ${destFile} : ${success ? "SUCCESS" : "FAILED"}`);
  }
}

testDownloadLegendFaces();
