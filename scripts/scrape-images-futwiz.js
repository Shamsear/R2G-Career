const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
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

// Remove accents/diacritics from names
function stripAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const unmatchedPlayers = [];

async function scrapePlayers() {
  console.log("Fetching non-legend players from DB...");
  const { rows: allPlayers } = await pool.query("SELECT id, name, position FROM players WHERE card_type != 'Legend' ORDER BY id ASC");
    
  const players = allPlayers.filter(player => {
    const safePlayerName = sanitizeName(player.name);
    if (safePlayerName === 'HWANG HEE-CHAN') return true; // Force re-process Hwang Hee-Chan
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
  });

  console.log("Loading futwiz main page...");
  try {
    await page.goto('https://www.futwiz.com/en/', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 4000));
  } catch (e) {
    console.log("Initial load warning:", e.message);
  }

  const editions = [
    { label: 'FC 26', url: 'https://www.futwiz.com/en/fc26/players' },
    { label: 'FC 25', url: 'https://www.futwiz.com/en/fc25/players' },
    { label: 'FC 24', url: 'https://www.futwiz.com/en/fc24/players' }
  ];

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const safePlayerName = sanitizeName(player.name);
    
    // Normalize and create alternative search query phrases
    const cleanFullName = stripAccents(toTitleCase(player.name));
    const nameParts = cleanFullName.split(/\s+/).filter(w => w.length > 0);
    
    const searchAttempts = [cleanFullName];
    if (nameParts.length > 1) {
      searchAttempts.push(nameParts[nameParts.length - 1]); // Last name
      searchAttempts.push(nameParts[0]); // First name
    }

    console.log(`\n[${i+1}/${players.length}] Searching: ${player.name} (${player.position})`);
    console.log(`  -> Search attempts queue: ${JSON.stringify(searchAttempts)}`);

    let foundStandardCard = false;

    for (const edition of editions) {
      console.log(`  -> Loading listing page (${edition.label}): ${edition.url}`);
      try {
        await page.goto(edition.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      } catch (err) {
        console.log(`  -> Page load warning: ${err.message}`);
        continue;
      }
      
      const searchInputSelector = '#globalsearch1, input.search-input, input[placeholder*="Search"]';
      try {
        await page.waitForSelector(searchInputSelector, { timeout: 15000 });
      } catch (err) {
        console.log(`  -> Input selector not found on page. Skipping edition.`);
        continue;
      }

      for (const query of searchAttempts) {
        try {
          console.log(`     -> Trying query: "${query}"`);
          await page.click(searchInputSelector);
          
          // Clear input
          await page.keyboard.down('Control');
          await page.keyboard.press('A');
          await page.keyboard.up('Control');
          await page.keyboard.press('Backspace');
          
          await page.type(searchInputSelector, query, { delay: 100 });
          
          console.log(`     -> Waiting 10 seconds for dropdown suggestions...`);
          await new Promise(r => setTimeout(r, 10000));

          // Get suggestion links from the autocomplete dropdown matching ANY of the player name keywords
          const profileUrls = await page.evaluate((playerName) => {
            const elements = Array.from(document.querySelectorAll('a[href*="/player/"], div.globalsearch-result-row, [data-url*="/player/"]'));
            // Split original DB player name into normalized keywords
            const nameKeywords = playerName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, '')).filter(w => w.length > 2);
            
            const matched = elements.filter(el => {
              const urlVal = el.getAttribute('href') || el.getAttribute('data-url');
              if (!urlVal) return false;
              
              const textLower = el.textContent.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
              const urlLower = urlVal.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
              return nameKeywords.some(keyword => textLower.includes(keyword) || urlLower.includes(keyword));
            });

            return Array.from(new Set(matched.map(el => {
              const urlVal = el.getAttribute('href') || el.getAttribute('data-url');
              return new URL(urlVal, window.location.href).href;
            })));
          }, player.name);

          if (profileUrls.length > 0) {
            console.log(`     -> Found ${profileUrls.length} potential profiles. Checking cards...`);
            
            for (const url of profileUrls) {
              console.log(`        -> Checking card type: ${url}`);
              await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
              await new Promise(r => setTimeout(r, 2500));

              const check = await page.evaluate(() => {
                const text = document.body.innerText.toLowerCase();
                const itemMatch = text.match(/this item is (.+?), a /);
                let isStandardType = false;
                
                if (itemMatch) {
                  const cardMetadata = itemMatch[1];
                  
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
                  
                  console.log(`Card Description metadata: "${cardMetadata}" | isStandard: ${isStandardType}`);
                }

                const faceImg = document.querySelector('img[alt*="Face"], img[src*="/faces/"]');
                
                return {
                  isStandard: isStandardType,
                  imgSrc: faceImg ? faceImg.src : null
                };
              });

              if (check.isStandard && check.imgSrc) {
                console.log(`        -> ✓ Standard card verified. Image: ${check.imgSrc}`);
                
                // Important: folder name stays original safePlayerName
                const playerFolder = path.join(IMAGE_DIR, safePlayerName);
                if (!fs.existsSync(playerFolder)) {
                  fs.mkdirSync(playerFolder, { recursive: true });
                }

                const finalDest = path.join(playerFolder, 'card_1.png');
                console.log(`        -> Downloading image...`);

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
                  console.log(`        -> ✓ Saved: ${safePlayerName}`);
                  foundStandardCard = true;
                  break; // Exit profile links loop
                }
              } else {
                console.log(`        -> X Non-standard card or no image.`);
              }
            }
          }

          if (foundStandardCard) {
            break; // Exit searchAttempts loop
          }
        } catch (err) {
          console.log(`     -> Warning on query "${query}": ${err.message}`);
        }
      }

      if (foundStandardCard) {
        break; // Exit editions loop
      }
    }

    if (!foundStandardCard) {
      console.log(`  -> ⚠️ No standard card found for ${player.name} across any edition.`);
      unmatchedPlayers.push({ id: player.id, name: player.name, position: player.position });
    }

    // Delay between players
    await new Promise(r => setTimeout(r, 4000));
  }

  if (unmatchedPlayers.length > 0) {
      fs.writeFileSync(path.join(__dirname, 'unmatched-players-futwiz.json'), JSON.stringify(unmatchedPlayers, null, 2));
      console.log(`Saved ${unmatchedPlayers.length} unmatched players to scripts/unmatched-players-futwiz.json`);
  }

  console.log("\nFinished Futwiz image scraping!");
  await browser.close();
  pool.end();
  process.exit(0);
}

scrapePlayers();
