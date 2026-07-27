const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const https = require('https');
const { exec } = require('child_process');
require('dotenv').config({ path: '.env.local' });

puppeteer.use(StealthPlugin());

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL || "postgresql://postgres.fxedksenksggdacsjqxq:Dlse0e3fXqM7q7TB@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

const LEGEND_IMAGE_DIR = path.join(__dirname, '../public/assets/images/legends');

if (!fs.existsSync(LEGEND_IMAGE_DIR)) {
  fs.mkdirSync(LEGEND_IMAGE_DIR, { recursive: true });
}

function sanitizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function copyToClipboard(text) {
  const cleanText = text.replace(/[\r\n]/g, '').trim();
  exec(`echo ${cleanText} | clip`, (err) => {
    if (!err) {
      console.log(`  -> Copied "${cleanText}" to clipboard!`);
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

function downloadImageDirect(url, destPath) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
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
        downloadImageDirect(redirectUrl, destPath).then(resolve);
      } else {
        resolve(false);
      }
    }).on('error', () => resolve(false));
  });
}

async function navigateAndType(page, playerName) {
  const cleanName = playerName.replace(/^[A-Z]\.\s+/, '').replace(/^G\.\s+/, '').replace(/^M\.\s+/, '').trim();
  const targetUrl = `https://www.efootballdb.com/players?search=${encodeURIComponent(cleanName)}`;
  console.log(`  -> Navigating browser to eFootball DB search: ${targetUrl}`);
  
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log(`  -> Page load note: ${e.message}`);
  }
}

function checkImageExists(player) {
  const slug = sanitizeName(player.name);
  const playerFolder = path.join(LEGEND_IMAGE_DIR, slug);

  // Check 1: If folder exists and contains non-empty image files
  if (fs.existsSync(playerFolder)) {
    const files = fs.readdirSync(playerFolder).filter(f => f.endsWith('.webp') || f.endsWith('.png') || f.endsWith('.jpg'));
    for (const f of files) {
      const filePath = path.join(playerFolder, f);
      if (fs.statSync(filePath).size > 100) {
        return true;
      }
    }
  }

  // Check 2: If DB image_path is already set to a valid local file
  if (player.image_path && player.image_path.startsWith('/assets/images/legends/')) {
    const fullDbPath = path.join(__dirname, '../public', player.image_path);
    if (fs.existsSync(fullDbPath) && fs.statSync(fullDbPath).size > 100) {
      return true;
    }
  }

  return false;
}

async function scrapeLegendPlayers() {
  console.log("Fetching Legend players from database...");
  const { rows: allPlayers } = await pool.query("SELECT id, name, position, card_type, image_path FROM players WHERE card_type = 'Legend' ORDER BY id ASC");
  
  // Filter out players who ALREADY have downloaded images
  const playersToProcess = allPlayers.filter(player => !checkImageExists(player));
  
  console.log(`\n==================================================`);
  console.log(`TOTAL LEGEND PLAYERS IN DB : ${allPlayers.length}`);
  console.log(`ALREADY HAS LOCAL IMAGES   : ${allPlayers.length - playersToProcess.length}`);
  console.log(`MISSING IMAGES TO PROCESS  : ${playersToProcess.length}`);
  console.log(`==================================================\n`);

  if (playersToProcess.length === 0) {
    console.log("✓ All Legend players already have downloaded image cutouts! Exiting.");
    process.exit(0);
  }

  console.log("Launching browser in interactive mode (headless: false)...");
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

  for (let i = 0; i < playersToProcess.length; i++) {
    const player = playersToProcess[i];
    const slug = sanitizeName(player.name);
    const playerFolder = path.join(LEGEND_IMAGE_DIR, slug);

    if (!fs.existsSync(playerFolder)) {
      fs.mkdirSync(playerFolder, { recursive: true });
    }

    console.log(`\n==================================================`);
    console.log(`[Missing ${i+1}/${playersToProcess.length}] ID: ${player.id}`);
    console.log(`CURRENT LEGEND: ${player.name} (${player.position})`);
    console.log(`==================================================`);
    
    copyToClipboard(player.name);
    await navigateAndType(page, player.name);

    let satisfied = false;
    while (!satisfied) {
      console.log(`\nActions:`);
      console.log(`  [Enter] : Scrape and save player face image on current page`);
      console.log(`  s       : Skip to next player`);
      console.log(`  e       : Reload eFootball DB search page`);
      console.log(`  f       : Open Futwiz search page`);
      console.log(`  b       : Open eFootballHub search page`);

      const response = await askQuestion('\nChoice: ');
      const action = response.trim().toLowerCase();

      if (action === 's') {
        console.log(`Skipped: ${player.name}`);
        break;
      }

      if (action === 'e') {
        await navigateAndType(page, player.name);
        continue;
      }

      if (action === 'f') {
        const cleanName = player.name.replace(/^[A-Z]\.\s+/, '').trim();
        await page.goto(`https://www.futwiz.com/en/fc25/players?search=${encodeURIComponent(cleanName)}`);
        continue;
      }

      if (action === 'b') {
        const cleanName = player.name.replace(/^[A-Z]\.\s+/, '').trim();
        await page.goto(`https://efhub.com/efootball23/player2?name=${encodeURIComponent(cleanName)}`);
        continue;
      }

      // Perform scrape on current open page
      const currentUrl = page.url();
      console.log(`  -> Current open page: ${currentUrl}`);

      const imageData = await page.evaluate(() => {
        // Target eFootball DB player face cutout
        const efFace = document.querySelector('.player-face img, img[alt*="player face"], img[alt*="Gaúcho"], img[src*="/assets/2022/players/"], img[src*="assets.efootballdb.com"]');
        if (efFace && efFace.src) {
          return { src: efFace.src, source: 'efootballdb' };
        }

        // Try Futwiz face
        const futwizFace = document.querySelector('img[alt*="Face"], img[src*="/faces/"]');
        if (futwizFace && futwizFace.src) {
          return { src: futwizFace.src, source: 'futwiz' };
        }

        // Try EFHub face
        const efhubFace = document.querySelector('img[src*="/images/players/"]');
        if (efhubFace && efhubFace.src) {
          return { src: efhubFace.src, source: 'efhub' };
        }

        // Fallback: any image in player face container
        const anyImg = document.querySelector('.player-face img, .card-image img, .player-card img');
        if (anyImg && anyImg.src) {
          return { src: anyImg.src, source: 'generic' };
        }

        return null;
      });

      let downloadUrl = imageData ? imageData.src : null;

      // Extract eFootball 14-digit player ID
      const urlIdMatch = currentUrl.match(/profile\?id=(\d+)/);
      if (urlIdMatch) {
        downloadUrl = `https://assets.efootballdb.com/2022/players/${urlIdMatch[1]}_l.webp`;
      } else if (downloadUrl && (downloadUrl.includes('efootballdb.com') || downloadUrl.includes('/assets/2022/players/'))) {
        const fileMatch = downloadUrl.match(/(\d{10,16})/);
        if (fileMatch) {
          downloadUrl = `https://assets.efootballdb.com/2022/players/${fileMatch[1]}_l.webp`;
        }
      }

      if (!downloadUrl) {
        console.log(`  -> ⚠️ ERROR: Could not locate player image or ID on this page.`);
        console.log(`  -> Please click into the player's card/profile page first.`);
        continue;
      }

      console.log(`  -> Direct Asset CDN URL: ${downloadUrl}`);

      const ext = downloadUrl.includes('.webp') ? 'webp' : 'png';
      const fileCount = fs.readdirSync(playerFolder).length + 1;
      const fileName = `card_${fileCount}.${ext}`;
      const destPath = path.join(playerFolder, fileName);
      const relPath = `/assets/images/legends/${slug}/${fileName}`;

      console.log(`  -> Downloading image directly...`);
      const success = await downloadImageDirect(downloadUrl, destPath);

      if (success && fs.existsSync(destPath) && fs.statSync(destPath).size > 100) {
        // Update database
        await pool.query("UPDATE players SET image_path = $1 WHERE id = $2", [relPath, player.id]);

        console.log(`  -> ✓ SAVED: ${destPath} (${fs.statSync(destPath).size} bytes)`);
        console.log(`  -> ✓ DATABASE UPDATED for ${player.name} -> ${relPath}`);
        satisfied = true;
      } else {
        console.log(`  -> ⚠️ Could not download image from ${downloadUrl}. Retrying...`);
      }
    }
  }

  console.log("\n==================================================");
  console.log("Interactive legend scraping complete!");
  console.log("==================================================");
  await browser.close();
  pool.end();
  process.exit(0);
}

scrapeLegendPlayers().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
