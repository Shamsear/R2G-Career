const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
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

function sanitizeName(name) {
    return name.replace(/[/\\?%*:|"<>]/g, '-').trim();
}

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

function copyToClipboard(text) {
  const cleanText = text.replace(/[\r\n]/g, '').trim();
  exec(`echo ${cleanText} | clip`, (err) => {
    if (!err) {
      console.log(`  -> Copied to clipboard!`);
    }
  });
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// Auto-navigate and type in search bar
async function navigateAndType(page, editionCode, playerName) {
  const targetUrl = `https://www.futwiz.com/en/${editionCode}/players`;
  console.log(`  -> Navigating browser to: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  
  const searchInputSelector = '#globalsearch1, input.search-input, input[placeholder*="Search"]';
  await page.waitForSelector(searchInputSelector, { timeout: 15000 });
  await page.click(searchInputSelector);
  
  // Clear input
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  
  const searchName = toTitleCase(playerName);
  console.log(`  -> Auto-typing: "${searchName}"`);
  await page.type(searchInputSelector, searchName, { delay: 50 });
}

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

  console.log("Launching Puppeteer browser in interactive mode...");
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
  });

  console.log("Loading initial page...");
  try {
    await page.goto('https://www.futwiz.com/en/', { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log("Load warning:", e.message);
  }

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const safePlayerName = sanitizeName(player.name);
    
    console.log(`\n==================================================`);
    console.log(`[Player ${i+1}/${players.length}] ID: ${player.id}`);
    console.log(`CURRENT PLAYER: ${player.name} (${player.position})`);
    console.log(`==================================================`);
    
    copyToClipboard(player.name);

    // Initial navigation to FC 25
    try {
      await navigateAndType(page, 'fc25', player.name);
    } catch (err) {
      console.log(`  -> Navigation warning: ${err.message}`);
    }

    let satisfied = false;
    while (!satisfied) {
      console.log(`\nOptions:`);
      console.log(`  [Enter] : Scrape the current open card page`);
      console.log(`  25      : Go to FC 25 players search page`);
      console.log(`  24      : Go to FC 24 players search page`);
      console.log(`  26      : Go to FC 26 players search page`);
      console.log(`  s       : Skip this player`);

      const response = await askQuestion('\nAction: ');
      const cleanResponse = response.trim().toLowerCase();
      
      if (cleanResponse === 's') {
        console.log(`Skipped player: ${player.name}`);
        break;
      }

      if (cleanResponse === '25') {
        try {
          await navigateAndType(page, 'fc25', player.name);
        } catch (err) {
          console.log(`  -> Navigation warning: ${err.message}`);
        }
        continue;
      }

      if (cleanResponse === '24') {
        try {
          await navigateAndType(page, 'fc24', player.name);
        } catch (err) {
          console.log(`  -> Navigation warning: ${err.message}`);
        }
        continue;
      }

      if (cleanResponse === '26') {
        try {
          await navigateAndType(page, 'fc26', player.name);
        } catch (err) {
          console.log(`  -> Navigation warning: ${err.message}`);
        }
        continue;
      }

      // Perform scrape on current page (when they just hit enter)
      const currentUrl = page.url();
      console.log(`  -> Active page URL detected: ${currentUrl}`);

      if (!currentUrl.includes('/player/')) {
        console.log(`  -> ⚠️ ERROR: You are not on a player profile page. Please open a player's card page first.`);
        continue;
      }

      console.log(`  -> Reading card data...`);
      const check = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        const itemMatch = text.match(/this item is (.+?), a /);
        let isStandardType = false;
        let cardMetadata = '';
        
        if (itemMatch) {
          cardMetadata = itemMatch[1];
          const hasCommon = cardMetadata.includes('common');
          const hasRare = cardMetadata.includes('rare');
          const hasGold = cardMetadata.includes('gold');
          const hasSilver = cardMetadata.includes('silver');
          const hasBronze = cardMetadata.includes('bronze');
          
          const isPromo = cardMetadata.includes('totw') || cardMetadata.includes('inform') || 
                          cardMetadata.includes('special') || cardMetadata.includes('potm') || 
                          cardMetadata.includes('hero') || cardMetadata.includes('icon') || 
                          cardMetadata.includes('tots') || cardMetadata.includes('toty') || 
                          cardMetadata.includes('champions');
                          
          isStandardType = ((hasCommon && (hasGold || hasSilver || hasBronze)) || 
                           (hasRare && (hasGold || hasSilver || hasBronze))) && !isPromo;
        }

        const faceImg = document.querySelector('img[alt*="Face"], img[src*="/faces/"]');
        
        return {
          isStandard: isStandardType,
          cardMetadata,
          imgSrc: faceImg ? faceImg.src : null
        };
      });

      if (!check.imgSrc) {
        console.log(`  -> ⚠️ ERROR: Could not find the player's face image on this page.`);
        continue;
      }

      console.log(`  -> Card Type: "${check.cardMetadata || 'Unknown'}" | Standard Verified: ${check.isStandard}`);

      if (!check.isStandard) {
        console.log(`  -> ⚠️ WARNING: This card is flagged as promo or non-standard.`);
        const confirmForce = await askQuestion(`  -> Force download this card anyway? (y/n): `);
        if (confirmForce.trim().toLowerCase() !== 'y') {
          continue;
        }
      }

      const playerFolder = path.join(IMAGE_DIR, safePlayerName);
      if (!fs.existsSync(playerFolder)) {
        fs.mkdirSync(playerFolder, { recursive: true });
      }

      const finalDest = path.join(playerFolder, 'card_1.png');
      console.log(`  -> Downloading image via browser context...`);

      const base64Data = await page.evaluate(async (imgUrl) => {
        const res = await fetch(imgUrl);
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }, check.imgSrc);

      if (base64Data && base64Data.startsWith('data:image/')) {
        const base64Image = base64Data.split(';base64,').pop();
        fs.writeFileSync(finalDest, Buffer.from(base64Image, 'base64'));
        console.log(`  -> ✓ SUCCESS: Saved standard headshot: public/assets/images/players/${safePlayerName}/card_1.png`);
        satisfied = true;
      } else {
        console.log(`  -> ⚠️ ERROR: Failed to download the image.`);
      }
    }
  }

  console.log("\nFinished interactive scraping session!");
  await browser.close();
  pool.end();
  process.exit(0);
}

scrapePlayers().catch(err => {
  console.error(err);
  process.exit(1);
});
