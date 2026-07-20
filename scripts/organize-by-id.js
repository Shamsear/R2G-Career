const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const IMAGE_DIR = path.join(__dirname, '../public/assets/images/players');

function sanitizeName(name) {
  return name.replace(/[/\\?%*:|"<>]/g, '-').trim();
}

async function reorganize() {
  try {
    console.log("Fetching players from DB to get ID mappings...");
    const { rows: players } = await pool.query("SELECT id, name FROM players");

    let movedCount = 0;

    for (const player of players) {
      const safePlayerName = sanitizeName(player.name);
      const playerFolder = path.join(IMAGE_DIR, safePlayerName);
      const destinationFile = path.join(IMAGE_DIR, `${player.id}.png`);

      // If the destination [id].png already exists, skip
      if (fs.existsSync(destinationFile)) {
        continue;
      }

      // If the player name folder exists, look for downloaded card variants
      if (fs.existsSync(playerFolder)) {
        const files = fs.readdirSync(playerFolder).sort(); // Sort so card_1.png comes first
        const imageFile = files.find(f => f.startsWith('card_') && (f.endsWith('.png') || f.endsWith('.jpg')));

        if (imageFile) {
          const sourcePath = path.join(playerFolder, imageFile);
          
          // Copy card_1.png (or first found variant) to [id].png
          fs.copyFileSync(sourcePath, destinationFile);
          console.log(`Copied ${safePlayerName}/${imageFile} -> ${player.id}.png`);
          movedCount++;
        }
      }
    }

    console.log(`Reorganization complete! Moved/Renamed ${movedCount} files to their ID-based filenames.`);

  } catch (err) {
    console.error("Error organizing images:", err);
  } finally {
    await pool.end();
  }
}

reorganize();
