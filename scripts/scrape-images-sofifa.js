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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://sofifa.com/'
      }
    });
    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(dest);
      response.data.pipe(writer);
      writer.on('finish', true);
      writer.on('error', reject);
    });
  } catch (err) {
    console.error(`  -> Failed to download ${url}: ${err.message}`);
    return false;
  }
}

function sanitizeName(name) {
    return name.replace(/[/\\?%*:|"<>]/g, '-').trim();
}

const unmatchedPlayers = [];

async function scrapePlayers() {
  console.log("Fetching non-legend players from DB...");
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

  console.log(`Found ${players.length} missing players to process.`);
  if (players.length === 0) {
    console.log("No missing players to scrape. Exiting.");
    process.exit(0);
  }

  console.log("Launching Puppeteer browser...");
  const browser = await puppeteer.launch({
    headless: false,
    args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled'
    ],
    ignoreDefaultArgs: ['--enable-automation'],
    defaultViewport: null
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Anti-detection hook
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  console.log("Loading sofifa main page to verify Cloudflare...");
  try {
    await page.goto('https://sofifa.com/', { waitUntil: 'networkidle2', timeout: 60000 });
    console.log("Waiting 5 seconds for security clear...");
    await new Promise(r => setTimeout(r, 5000));
  } catch (e) {
    console.log("Initial load warning:", e.message);
  }

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const safePlayerName = sanitizeName(player.name);
    console.log(`\n[${i+1}/${players.length}] Searching: ${player.name} (${player.position})`);

    const searchUrl = `https://sofifa.com/players?keyword=${encodeURIComponent(player.name)}`;
    console.log(`  -> Navigating: ${searchUrl}`);

    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      // Check for Cloudflare block page
      let checkCount = 0;
      while (checkCount < 10) {
        const title = await page.title();
        if (title.includes('Just a moment') || title.includes('Checking your browser')) {
          console.log("  -> ⚠️ Cloudflare challenge detected! Please solve it in the browser window...");
          await new Promise(r => setTimeout(r, 4000));
          checkCount++;
        } else {
          break;
        }
      }

      await new Promise(r => setTimeout(r, 2000)); // Wait for render

      const imageUrl = await page.evaluate(() => {
        // Look inside the main table for avatar images
        const avatarImg = document.querySelector('td.ta img.player-avatar, td img.avatar, table img.avatar, table.table-hover tbody img');
        if (avatarImg && avatarImg.src && avatarImg.src.includes('cdn.sofifa.net/players/')) {
          return avatarImg.src;
        }
        return null;
      });

      if (imageUrl) {
        console.log(`  -> ✓ Found player image: ${imageUrl}`);
        
        // Upgrade image to higher 240px resolution if possible
        let targetUrl = imageUrl;
        if (imageUrl.includes('_120.png')) {
          targetUrl = imageUrl.replace('_120.png', '_240.png');
        } else if (imageUrl.includes('_60.png')) {
          targetUrl = imageUrl.replace('_60.png', '_240.png');
        }

        const playerFolder = path.join(IMAGE_DIR, safePlayerName);
        if (!fs.existsSync(playerFolder)) {
          fs.mkdirSync(playerFolder, { recursive: true });
        }

        const finalDest = path.join(playerFolder, 'card_1.png');
        console.log(`  -> Downloading: ${targetUrl}`);
        
        let success = await downloadImage(targetUrl, finalDest);
        if (!success && targetUrl !== imageUrl) {
          console.log("  -> Fallback to original avatar...");
          await downloadImage(imageUrl, finalDest);
        }
        console.log(`  -> Saved to player folder: ${safePlayerName}`);
      } else {
        console.log(`  -> ⚠️ Player not found on Sofifa.`);
        unmatchedPlayers.push({ id: player.id, name: player.name, position: player.position });
      }

    } catch (err) {
      console.error(`  -> ❌ Error processing ${player.name}:`, err.message);
    }

    // Delay between players
    await new Promise(r => setTimeout(r, 4000));
  }

  if (unmatchedPlayers.length > 0) {
      fs.writeFileSync(path.join(__dirname, 'unmatched-players-sofifa.json'), JSON.stringify(unmatchedPlayers, null, 2));
      console.log(`Saved ${unmatchedPlayers.length} unmatched players to scripts/unmatched-players-sofifa.json`);
  }

  console.log("\nFinished Sofifa image scraping!");
  await browser.close();
  pool.end();
  process.exit(0);
}

scrapePlayers();
