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
        'Referer': 'https://www.fut.gg/',
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
  
  // Anti-webdriver hook
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });

  const basePageUrl = 'https://www.fut.gg/players/?page=1&rarity_id=%5B1%2C0%5D';

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const safePlayerName = sanitizeName(player.name);
    console.log(`\n[${i+1}/${players.length}] Scraping: ${player.name} (${player.position})`);

    try {
      console.log(`  -> Navigating base listing: ${basePageUrl}`);
      await page.goto(basePageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise(r => setTimeout(r, 3000));

      // Wait for search input
      const searchInputSelector = 'input[type="search"], input[type="text"], input[placeholder*="Search"]';
      await page.waitForSelector(searchInputSelector, { timeout: 15000 });
      
      // Type in the search input
      console.log(`  -> Typing search query for: ${player.name}`);
      // Click, clear, and type
      await page.click(searchInputSelector);
      // Select all text to clear it
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      
      await page.type(searchInputSelector, player.name, { delay: 100 });
      await page.keyboard.press('Enter');
      console.log(`  -> Search query submitted, waiting for results...`);
      await new Promise(r => setTimeout(r, 4000)); // Wait for AJAX/redirect results

      // Wait and locate result links matching player profiles
      const playerProfileUrl = await page.evaluate((playerName) => {
        const links = Array.from(document.querySelectorAll('a'));
        const nameParts = playerName.toLowerCase().split(/\s+/).map(p => p.replace(/[^a-z0-9]/g, '')).filter(p => p.length > 2);
        
        // Find anchor elements pointing to a specific player profile page matching id prefix, e.g. /players/12345-name/
        const playerLink = links.find(a => {
          if (!a.href || !/\/players\/\d+-/.test(a.href)) return false;
          const hrefLower = a.href.toLowerCase();
          return nameParts.some(part => hrefLower.includes(part));
        });
        return playerLink ? playerLink.href : null;
      }, player.name);

      if (!playerProfileUrl) {
        console.log(`  -> ⚠️ No profile found matching: ${player.name}`);
        unmatchedPlayers.push({ id: player.id, name: player.name, position: player.position });
        continue;
      }

      console.log(`  -> Found profile URL: ${playerProfileUrl}`);
      await page.goto(playerProfileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await new Promise(r => setTimeout(r, 3500)); // Wait for player page elements

      // Extract the high resolution card image url
      const cardImageUrl = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        // Match fut.gg card images
        const cardImg = imgs.find(img => img.src && (img.src.includes('/cards/') || img.src.includes('/media/cards/') || img.className.includes('card')));
        if (cardImg) return cardImg.src;

        const fallbackImg = imgs.find(img => img.src && img.src.includes('cdn.fut.gg/media/'));
        return fallbackImg ? fallbackImg.src : null;
      });

      if (cardImageUrl) {
        const playerFolder = path.join(IMAGE_DIR, safePlayerName);
        if (!fs.existsSync(playerFolder)) {
          fs.mkdirSync(playerFolder, { recursive: true });
        }
        
        const finalDest = path.join(playerFolder, 'card_1.png');
        console.log(`  -> Downloading image: ${cardImageUrl}`);
        await downloadImage(cardImageUrl, finalDest);
        console.log(`  -> ✓ Saved to: ${safePlayerName}/card_1.png`);
      } else {
        console.log(`  -> ⚠️ Could not find player card image on profile page.`);
        unmatchedPlayers.push({ id: player.id, name: player.name, position: player.position });
      }

    } catch (err) {
      console.error(`  -> ❌ Error processing ${player.name}:`, err.message);
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  if (unmatchedPlayers.length > 0) {
      fs.writeFileSync(path.join(__dirname, 'unmatched-players-futgg.json'), JSON.stringify(unmatchedPlayers, null, 2));
      console.log(`Saved ${unmatchedPlayers.length} unmatched players to scripts/unmatched-players-futgg.json`);
  }

  console.log("\nFinished fut.gg image scraping!");
  await browser.close();
  pool.end();
  process.exit(0);
}

scrapePlayers();
