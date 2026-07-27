const fs = require('fs');
const path = require('path');
const ImageKit = require('imagekit');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const isForce = process.argv.includes('--force');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || 'public_QpvUc6JUwUyndDfGjuUt2ADRsYM=',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || 'private_nEZtFOz/nPnStlvmm5Dr//WSUY0=',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/6dbhhctcf'
});

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL || "postgresql://postgres.fxedksenksggdacsjqxq:Dlse0e3fXqM7q7TB@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

const LEGEND_DIR = path.join(__dirname, '../public/assets/images/legends');

async function deleteOldImageKitFile(fileName) {
  try {
    const list = await new Promise((resolve) => {
      imagekit.listFiles({ path: '/legends', searchQuery: `name = "${fileName}"` }, (err, res) => {
        resolve(res || []);
      });
    });

    for (const item of list) {
      if (item.name === fileName && item.fileId) {
        await new Promise((resolve) => {
          imagekit.deleteFile(item.fileId, (err, res) => {
            console.log(`  -> [Force] Deleted old ImageKit file: ${fileName} (fileId: ${item.fileId})`);
            resolve(res);
          });
        });
      }
    }
  } catch (e) {
    // Ignore deletion errors
  }
}

async function uploadLegendImages() {
  if (!fs.existsSync(LEGEND_DIR)) {
    console.error(`Directory not found: ${LEGEND_DIR}`);
    return;
  }

  const allEntries = fs.readdirSync(LEGEND_DIR);
  const imageFiles = allEntries.filter(file => {
    const full = path.join(LEGEND_DIR, file);
    return fs.statSync(full).isFile() && (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.webp'));
  });

  console.log(`Found ${imageFiles.length} ID-organized legend images locally. (Mode: ${isForce ? 'FORCE DELETE & OVERWRITE' : 'STRICT SKIP EXISTING'})`);
  
  // Fetch existing players from PostgreSQL DB to check current image_path
  const { rows: dbPlayers } = await pool.query("SELECT id, image_path FROM players WHERE card_type = 'Legend'");
  const dbImageMap = {};
  for (const p of dbPlayers) {
    dbImageMap[p.id] = p.image_path;
  }

  const existingFiles = new Set();

  if (!isForce) {
    console.log(`Fetching list of existing files from ImageKit folder '/legends'...`);
    let skip = 0;
    const limit = 1000;

    while (true) {
      try {
        const list = await new Promise((resolve, reject) => {
          imagekit.listFiles({
            path: '/legends',
            limit: limit,
            skip: skip
          }, function(error, result) {
            if (error) reject(error);
            else resolve(result);
          });
        });

        if (!list || list.length === 0) break;
        for (const item of list) {
          existingFiles.add(item.name);
        }
        if (list.length < limit) break;
        skip += limit;
      } catch (err) {
        console.warn("⚠️ Could not retrieve file list from ImageKit:", err.message);
        break;
      }
    }
  }

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (let i = 0; i < imageFiles.length; i++) {
    const fileName = imageFiles[i];
    const playerId = path.parse(fileName).name; // e.g. "5" from "5.webp"
    const filePath = path.join(LEGEND_DIR, fileName);

    const ikUrl = `${imagekit.options.urlEndpoint.replace(/\/$/, '')}/legends/${fileName}`;

    // STRICT SKIP CHECK when NOT in force mode
    if (!isForce) {
      const dbUrl = dbImageMap[parseInt(playerId)];
      const isDbAlreadyIk = dbUrl && dbUrl.startsWith('https://ik.imagekit.io/');
      
      if (existingFiles.has(fileName) || isDbAlreadyIk) {
        console.log(`[${i + 1}/${imageFiles.length}] ⏭️ Skipping ${fileName} (already exists on ImageKit/DB)`);
        
        // Ensure DB is pointing to ImageKit URL if not already
        if (/^\d+$/.test(playerId) && !isDbAlreadyIk) {
          await pool.query("UPDATE players SET image_path = $1 WHERE id = $2", [ikUrl, parseInt(playerId)]);
        }
        skippedCount++;
        continue;
      }
    }

    // ONLY delete old files if --force is explicitly passed
    if (isForce) {
      await deleteOldImageKitFile(fileName);
    }

    const fileData = fs.readFileSync(filePath);
    console.log(`[${i + 1}/${imageFiles.length}] ⬆️ Uploading ${fileName} to ImageKit...`);

    try {
      const result = await new Promise((resolve, reject) => {
        imagekit.upload({
          file: fileData,
          fileName: fileName,
          folder: '/legends',
          useUniqueFileName: false,
          overwriteFile: isForce
        }, function(error, res) {
          if (error) reject(error);
          else resolve(res);
        });
      });

      successCount++;
      console.log(`  -> Successfully uploaded: ${result.url}`);

      // Update DB with ImageKit URL
      if (/^\d+$/.test(playerId)) {
        await pool.query("UPDATE players SET image_path = $1 WHERE id = $2", [result.url, parseInt(playerId)]);
        console.log(`  -> Updated DB player ${playerId} -> ${result.url}`);
      }

    } catch (error) {
      console.error(`  -> Failed to upload ${fileName}:`, error.message);
      failCount++;
    }
  }

  console.log(`\n=======================================================`);
  console.log(`IMAGEKIT LEGEND UPLOAD SUMMARY`);
  console.log(`Total local images : ${imageFiles.length}`);
  console.log(`Skipped (existing) : ${skippedCount}`);
  console.log(`Uploaded           : ${successCount}`);
  console.log(`Failed             : ${failCount}`);
  console.log(`=======================================================\n`);

  await pool.end();
}

uploadLegendImages().catch(console.error);
