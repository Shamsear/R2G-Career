const fs = require('fs');
const path = require('path');
const https = require('https');

const baseUrl = 'https://fifaprizee.com';

const files = [
  '/assets/cards/download_24/backgrounds_23_B_RIVALS_LIVE_BLUE_STATIC.png',
  '/assets/cards/conv_anim_24/playercardui_rivals24_B_RIVALS_LIVE_BLUE_LOOP.png',
  '/assets/cards/download_24/backgrounds_23_B_RIVALS_LIVE_RED_STATIC.png',
  '/assets/cards/conv_anim_24/playercardui_rivals24_B_RIVALS_LIVE_RED_LOOP.png',
  '/assets/imgassets/background_blank.png',
  '/assets/cards/conv_anim_24/playercardui_rivals24_B_RIVALS_ICON_LOOP.png',
  '/assets/cards/download_24/backgrounds_23_B_BASE_PRIMEICON_STATIC.png',
  '/assets/cards/conv_anim_24/playercardui_primeicon_B_BASE_PRIMEICON_LOOP.png'
];

const publicDir = path.join(__dirname, 'public');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else {
        file.close();
        fs.unlink(dest, () => {}); // Delete the file async. (But we don't check the result)
        resolve(`Failed to download ${url}: ${response.statusCode}`);
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      resolve(`Error downloading ${url}: ${err.message}`);
    });
  });
}

async function main() {
  for (const file of files) {
    const url = baseUrl + file;
    const dest = path.join(publicDir, file);
    console.log(`Downloading ${url} to ${dest}...`);
    const result = await download(url, dest);
    if (result) {
      console.log(result);
    } else {
      console.log(`Successfully downloaded ${file}`);
    }
  }
}

main();
