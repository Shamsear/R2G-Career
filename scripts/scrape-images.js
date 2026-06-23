const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

puppeteer.use(StealthPlugin());

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const IMAGE_DIR = path.join(__dirname, '../public/assets/images/players');

if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

async function downloadImage(url, dest) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Referer': 'https://www.futbin.com/',
        'Origin': 'https://www.futbin.com',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(dest);
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (err) {
    console.error(`  -> Failed to download ${url}: ${err.message}`);
  }
}

function sanitizeName(name) {
    return name.replace(/[/\\?%*:|"<>]/g, '-').trim();
}

const MAX_CONCURRENCY = 4; // Number of parallel browser tabs

const unmatchedPlayers = [];

async function scrapePlayers() {
  console.log("Fetching non-legend players from DB...");
  // We explicitly exclude legends from the list as requested
  const { rows: allPlayers } = await pool.query("SELECT id, name, position FROM players WHERE card_type != 'Legend' ORDER BY id ASC");
    
  const players = allPlayers.filter(player => {
    const safePlayerName = sanitizeName(player.name);
    const finalPlayerFileId = path.join(IMAGE_DIR, `${player.id}.png`);
    const finalPlayerFileName = path.join(IMAGE_DIR, `${safePlayerName}.png`);
    if (fs.existsSync(finalPlayerFileId) || fs.existsSync(finalPlayerFileName)) return false;
    const playerFolder = path.join(IMAGE_DIR, safePlayerName);
    if (fs.existsSync(playerFolder) && fs.readdirSync(playerFolder).length > 0) return false;
    return true;
  });

  console.log(`Found ${players.length} missing players to process. Launching workers...`);

  console.log(`Launching Stealth Puppeteer with ${MAX_CONCURRENCY} workers...`);
  const browser = await puppeteer.launch({
    headless: false, 
    args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--window-size=1280,800',
        '--disable-blink-features=AutomationControlled'
    ],
    ignoreDefaultArgs: ['--enable-automation']
  });

  let currentIndex = 0;

  async function worker(workerId) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log(`[Worker ${workerId}] Navigating to futbin.com to clear initial checks...`);
    await page.goto('https://www.futbin.com/', { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 4000));

    while (currentIndex < players.length) {
      const player = players[currentIndex++];
      if (!player) break;

      // Make folder using player name instead of ID
      const safePlayerName = sanitizeName(player.name);
      const playerFolder = path.join(IMAGE_DIR, safePlayerName);
      
      // Check if the old [id].png exists or folder already populated to skip
      const finalPlayerFileId = path.join(IMAGE_DIR, `${player.id}.png`);
      const finalPlayerFileName = path.join(IMAGE_DIR, `${safePlayerName}.png`);
      if (fs.existsSync(finalPlayerFileId) || fs.existsSync(finalPlayerFileName)) {
        console.log(`[Worker ${workerId}] Skipping [${player.id}] ${player.name} - Final image already exists.`);
        continue;
      }
      
      if (!fs.existsSync(playerFolder)) {
        fs.mkdirSync(playerFolder, { recursive: true });
      } else {
          const files = fs.readdirSync(playerFolder);
          if (files.length > 0) {
              console.log(`[Worker ${workerId}] Skipping [${player.id}] ${player.name} - Folder already populated.`);
              continue;
          }
      }

      console.log(`[Worker ${workerId}] Scraping [${player.id}] ${player.name} (Position: ${player.position})...`);
      
      try {
        // Use Futbin's native version filter to automatically exclude promos/legends!
        const searchUrl = `https://www.futbin.com/26/players?search=${encodeURIComponent(player.name)}&version=gold%2Csilver%2Cbronze`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForSelector('a.player-row-playercard, a.table-player-name, td.table-name a, .no-results', { timeout: 15000 }).catch(() => {});
        
        const profileUrls = await page.evaluate((playerPos, playerName) => {
          const rows = document.querySelectorAll('tr');
          const urls = [];
          const seen = new Set();
          
          for (const row of Array.from(rows)) {
             const linkElement = row.querySelector('a.player-row-playercard, a.table-player-name, td.table-name a');
             if (!linkElement || !linkElement.href || !linkElement.href.includes('/player/')) continue;
             
             // 1. Check position (Loose check)
             const posEl = row.querySelector('.table-pos, .table-pos-main');
             const posText = posEl ? posEl.textContent.toUpperCase() : '';
             const targetPos = playerPos ? playerPos.toUpperCase() : '';
             
             if (targetPos && posText) {
                 let normalizedTarget = targetPos;
                 if (targetPos === 'AM') normalizedTarget = 'CAM';
                 
                 if (!posText.includes(normalizedTarget) && !normalizedTarget.includes(posText)) {
                     // We will still keep it, but maybe as a secondary option if needed.
                     // Removing the 'continue' allows players like Pulisic (RW in game, ST in DB) to be found.
                 }
             }
             
             if (!seen.has(linkElement.href)) {
                 urls.push(linkElement.href);
                 seen.add(linkElement.href);
                 if (urls.length >= 3) break; // Limit to 3 variants to save time
             }
          }
          return urls;
        }, player.position, player.name);

        if (!profileUrls || profileUrls.length === 0) {
           console.log(`[Worker ${workerId}]   -> No matching base cards found for ${player.name} with position ${player.position}`);
           unmatchedPlayers.push({ id: player.id, name: player.name, position: player.position });
           // Clean up empty folder
           if (fs.existsSync(playerFolder) && fs.readdirSync(playerFolder).length === 0) {
               fs.rmdirSync(playerFolder);
           }
           continue;
        }

        console.log(`[Worker ${workerId}]   -> Found ${profileUrls.length} profile variants matching criteria. Downloading...`);

        for (let i = 0; i < profileUrls.length; i++) {
          const profileUrl = profileUrls[i];
          await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await new Promise(r => setTimeout(r, 2000));

          const imageUrl = await page.evaluate(() => {
              const pic = document.getElementById('player_pic');
              if (pic && pic.src && !pic.src.includes('blank')) return pic.src;
              
              const cardPic = document.querySelector('.pcdisplay-picture img');
              if (cardPic && cardPic.src && !cardPic.src.includes('blank')) return cardPic.src;

              const imgs = Array.from(document.querySelectorAll('img'));
              const playerImg = imgs.find(img => img.src.includes('/players/') && !img.src.includes('silhouettes'));
              if (playerImg) return playerImg.src;

              return null;
          });

          if (imageUrl) {
              const imgPath = path.join(playerFolder, `card_${i+1}.png`);
              console.log(`[Worker ${workerId}]      -> Found image ${i+1}: ${imageUrl}`);
              await downloadImage(imageUrl, imgPath);
          } else {
              console.log(`[Worker ${workerId}]      -> No face image found on profile variant ${i+1}`);
          }

          await new Promise(r => setTimeout(r, 1500));
        }
        
        console.log(`[Worker ${workerId}]   -> Saved all matching variants to folder /${safePlayerName}/`);

      } catch (error) {
        console.log(`[Worker ${workerId}]   -> Error scraping ${player.name}: ${error.message}`);
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    await page.close();
  }

  const workers = [];
  for (let i = 0; i < MAX_CONCURRENCY; i++) {
    workers.push(worker(i + 1));
  }

  await Promise.all(workers);

  if (unmatchedPlayers.length > 0) {
      fs.writeFileSync(path.join(__dirname, 'unmatched-players.json'), JSON.stringify(unmatchedPlayers, null, 2));
      console.log(`Saved ${unmatchedPlayers.length} unmatched players to scripts/unmatched-players.json`);
  }

  console.log("Finished scraping!");
  await browser.close();
  process.exit(0);
}

scrapePlayers();
