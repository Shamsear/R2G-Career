const https = require('https');
const fs = require('fs');
const path = require('path');

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

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function getCleanSearchTerm(name) {
  // Strip initials like "A. ", "G. ", "M. ", "J. ", "PARK "
  return name
    .replace(/^[A-Z]\.\s+/, '')
    .replace(/^PARK\s+/, '')
    .replace(/^G\.\s+/, '')
    .replace(/^M\.\s+/, '')
    .trim();
}

async function downloadAllLegendImages() {
  const legends = JSON.parse(fs.readFileSync('scratch/legends_list.json', 'utf8'));
  console.log(`Loaded ${legends.length} Legend players to process from eFootball DB...\n`);

  const baseImageDir = path.join(process.cwd(), 'public', 'assets', 'images', 'legends');
  if (!fs.existsSync(baseImageDir)) {
    fs.mkdirSync(baseImageDir, { recursive: true });
  }

  const allResultsMap = {};
  let totalDownloaded = 0;

  for (let i = 0; i < legends.length; i++) {
    const legend = legends[i];
    const searchTerm = getCleanSearchTerm(legend.name);
    const slug = slugify(legend.name);
    const legendDir = path.join(baseImageDir, slug);

    if (!fs.existsSync(legendDir)) {
      fs.mkdirSync(legendDir, { recursive: true });
    }

    console.log(`[${i + 1}/${legends.length}] Searching eFootball DB for: "${searchTerm}" (${legend.name})...`);

    // Fetch search results from efootballdb API
    const searchUrl = `https://api.efootballdb.com/api/2022/players?search=${encodeURIComponent(searchTerm)}`;
    const searchRes = await fetchJson(searchUrl);

    let variations = [];
    if (searchRes && searchRes.data && Array.isArray(searchRes.data)) {
      variations = searchRes.data;
    }

    // Fallback: If no variation found by search name, try legend.id
    if (variations.length === 0 && legend.id) {
      variations = [{ pes_id: legend.id }];
    }

    console.log(` -> Found ${variations.length} card variations for ${legend.name}.`);

    const playerFiles = [];

    for (const varItem of variations) {
      const pesId = varItem.pes_id;
      if (!pesId) continue;

      const directCdnUrl = `https://assets.efootballdb.com/2022/players/${pesId}_l.webp`;
      const fileName = `${pesId}.webp`;
      const destFile = path.join(legendDir, fileName);

      if (fs.existsSync(destFile) && fs.statSync(destFile).size > 1000) {
        playerFiles.push({ pes_id: pesId, cdn_url: directCdnUrl, local_path: `/assets/images/legends/${slug}/${fileName}` });
        continue;
      }

      const success = await downloadFile(directCdnUrl, destFile);
      if (success) {
        totalDownloaded++;
        playerFiles.push({ pes_id: pesId, cdn_url: directCdnUrl, local_path: `/assets/images/legends/${slug}/${fileName}` });
        console.log(`    Saved variation ${pesId} -> ${fileName}`);
      }
    }

    allResultsMap[legend.name] = {
      db_id: legend.id,
      position: legend.position,
      variations_count: playerFiles.length,
      images: playerFiles
    };

    await new Promise(r => setTimeout(r, 100));
  }

  // Save index json
  const dataDir = path.join(process.cwd(), 'public', 'assets', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const jsonPath = path.join(dataDir, 'efootballdb_legends_all_results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(allResultsMap, null, 2));

  console.log(`\nCOMPLETED! Downloaded ${totalDownloaded} eFootball DB legend player images across all variations.`);
  console.log(`Index saved at: ${jsonPath}`);
}

downloadAllLegendImages();
