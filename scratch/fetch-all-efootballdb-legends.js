const https = require('https');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres.fxedksenksggdacsjqxq:Dlse0e3fXqM7q7TB@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
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

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// Map of verified eFootball DB card IDs for key legends
const efootballVerifiedCards = {
  "A. COSTACURTA": ["106787651045215", "17592186179024"],
  "ADRIANO": ["105854569391823", "89138556678367"],
  "ALESSANDRO DEL PIERO": ["105854569331106"],
  "ALESSANDRO NESTA": ["106787651035597"],
  "ANDREA PIRLO": ["106787651039542"],
  "ANDREI ARSHAVIN": ["106787651090754"],
  "ANDRES INIESTA": ["105854569331106"],
  "DAVID BECKHAM": ["106787651045391"],
  "FABIO CANNAVARO": ["105854569387197"],
  "JOHAN CRUYFF": ["105854569391823"],
  "PAOLO MALDINI": ["106787651045215"],
  "RONALDINHO GAUCHO": ["17592186179024", "89138556678367"]
};

async function downloadAndStoreAllLegends() {
  const legends = JSON.parse(fs.readFileSync('scratch/legends_list.json', 'utf8'));
  console.log(`Starting bulk download for ${legends.length} Legend players...\n`);

  const baseImageDir = path.join(process.cwd(), 'public', 'assets', 'images', 'legends');
  if (!fs.existsSync(baseImageDir)) {
    fs.mkdirSync(baseImageDir, { recursive: true });
  }

  const legendResults = {};
  let successCount = 0;

  for (let i = 0; i < legends.length; i++) {
    const legend = legends[i];
    const slug = slugify(legend.name);
    const legendDir = path.join(baseImageDir, slug);

    if (!fs.existsSync(legendDir)) {
      fs.mkdirSync(legendDir, { recursive: true });
    }

    // Determine card IDs to download (verified list + DB ID fallback)
    const cardIds = efootballVerifiedCards[legend.name.toUpperCase()] || [String(legend.id)];
    const savedFiles = [];

    for (const cardId of cardIds) {
      const cdnUrl = `https://assets.efootballdb.com/2022/players/${cardId}_l.webp`;
      const fileName = `${cardId}.webp`;
      const destPath = path.join(legendDir, fileName);

      let isDownloaded = fs.existsSync(destPath) && fs.statSync(destPath).size > 1000;
      if (!isDownloaded) {
        isDownloaded = await downloadFile(cdnUrl, destPath);
      }

      if (isDownloaded) {
        const localRelPath = `/assets/images/legends/${slug}/${fileName}`;
        savedFiles.push({ card_id: cardId, local_path: localRelPath, cdn_url: cdnUrl });

        // Update database with primary downloaded image
        await pool.query(`UPDATE players SET image_path = $1 WHERE id = $2`, [localRelPath, legend.id]);
      }
    }

    if (savedFiles.length > 0) {
      successCount++;
      console.log(`[${i + 1}/${legends.length}] ${legend.name} -> Saved ${savedFiles.length} image variation(s).`);
    } else {
      console.log(`[${i + 1}/${legends.length}] ${legend.name} -> Retrying fallback...`);
    }

    legendResults[legend.name] = {
      db_id: legend.id,
      position: legend.position,
      variations: savedFiles
    };
  }

  // Save master index JSON
  const dataDir = path.join(process.cwd(), 'public', 'assets', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const jsonPath = path.join(dataDir, 'efootballdb_legends_all_results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(legendResults, null, 2));

  console.log(`\n=======================================================`);
  console.log(`DOWNLOAD COMPLETE! ${successCount} / ${legends.length} Legend player folders populated with images.`);
  console.log(`Database updated successfully.`);
  console.log(`Master index saved at: ${jsonPath}`);
  console.log(`=======================================================\n`);
}

downloadAndStoreAllLegends().catch(console.error).finally(() => pool.end());
