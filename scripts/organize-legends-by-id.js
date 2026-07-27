const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const isForce = process.argv.includes('--force');

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL || "postgresql://postgres.fxedksenksggdacsjqxq:Dlse0e3fXqM7q7TB@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

const LEGEND_DIR = path.join(__dirname, '../public/assets/images/legends');

function sanitizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

async function organizeLegendsById() {
  try {
    console.log(`Organizing Legend images by DB ID (Mode: ${isForce ? 'FORCE OVERWRITE & DELETE OLD' : 'STRICT SKIP EXISTING'})...`);
    const { rows: legends } = await pool.query("SELECT id, name, position, card_type, image_path FROM players WHERE card_type = 'Legend'");

    console.log(`Processing ${legends.length} Legend players.`);
    let movedCount = 0;
    let skippedCount = 0;

    for (const player of legends) {
      const slug = sanitizeName(player.name);
      const playerFolder = path.join(LEGEND_DIR, slug);

      const destWebp = path.join(LEGEND_DIR, `${player.id}.webp`);
      const destPng = path.join(LEGEND_DIR, `${player.id}.png`);
      const destJpg = path.join(LEGEND_DIR, `${player.id}.jpg`);

      // STRICT SKIP: If not in --force mode and ANY id file already exists, SKIP!
      if (!isForce && (fs.existsSync(destWebp) || fs.existsSync(destPng) || fs.existsSync(destJpg))) {
        skippedCount++;
        continue;
      }

      // If in force mode, delete existing old ID files
      if (isForce) {
        if (fs.existsSync(destWebp)) fs.unlinkSync(destWebp);
        if (fs.existsSync(destPng)) fs.unlinkSync(destPng);
        if (fs.existsSync(destJpg)) fs.unlinkSync(destJpg);
      }

      // Check player folder for card images
      if (fs.existsSync(playerFolder)) {
        const files = fs.readdirSync(playerFolder).filter(f => f.endsWith('.webp') || f.endsWith('.png') || f.endsWith('.jpg'));
        if (files.length > 0) {
          // Sort by modification time to get the newest uploaded image
          files.sort((a, b) => {
            const statA = fs.statSync(path.join(playerFolder, a)).mtimeMs;
            const statB = fs.statSync(path.join(playerFolder, b)).mtimeMs;
            return statB - statA; // Most recent first
          });

          const newestFile = files[0];
          const sourcePath = path.join(playerFolder, newestFile);
          const ext = path.extname(newestFile);
          const destinationPath = path.join(LEGEND_DIR, `${player.id}${ext}`);

          // Delete older card files in player folder ONLY if in force mode
          if (isForce && files.length > 1) {
            for (let k = 1; k < files.length; k++) {
              try {
                fs.unlinkSync(path.join(playerFolder, files[k]));
              } catch (e) {}
            }
          }

          fs.copyFileSync(sourcePath, destinationPath);
          movedCount++;
          console.log(`✓ [${isForce ? 'Force Replaced' : 'Created'}] ${slug}/${newestFile} -> legends/${player.id}${ext}`);

          // Update image_path in database
          const relPath = `/assets/images/legends/${player.id}${ext}`;
          await pool.query("UPDATE players SET image_path = $1 WHERE id = $2", [relPath, player.id]);
        }
      }
    }

    console.log(`\n-------------------------------------------------------`);
    console.log(`ORGANIZE SUMMARY`);
    console.log(`Total players checked : ${legends.length}`);
    console.log(`Already existing      : ${skippedCount} (Skipped)`);
    console.log(`Newly organized       : ${movedCount}`);
    console.log(`-------------------------------------------------------\n`);

  } catch (err) {
    console.error("Error organizing legend images:", err);
  } finally {
    await pool.end();
  }
}

organizeLegendsById();
