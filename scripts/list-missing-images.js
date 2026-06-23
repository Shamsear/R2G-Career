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
    return name.replace(/[\/\\?%*:|"<>]/g, '-').trim();
}

async function listMissingImages() {
  try {
    const { rows: players } = await pool.query("SELECT id, name, position FROM players WHERE card_type != 'Legend' ORDER BY id ASC");
    
    let missingImages = [];

    for (const player of players) {
      const safePlayerName = sanitizeName(player.name);
      
      const finalPlayerFileId = path.join(IMAGE_DIR, `${player.id}.png`);
      const finalPlayerFileName = path.join(IMAGE_DIR, `${safePlayerName}.png`);
      const playerFolder = path.join(IMAGE_DIR, safePlayerName);
      
      let hasImage = false;
      
      if (fs.existsSync(finalPlayerFileId) || fs.existsSync(finalPlayerFileName)) {
        hasImage = true;
      } else if (fs.existsSync(playerFolder)) {
        const files = fs.readdirSync(playerFolder);
        if (files.length > 0) {
          hasImage = true;
        }
      }
      
      if (!hasImage) {
        missingImages.push({ id: player.id, name: player.name, position: player.position });
      }
    }
    
    console.log(`Total standard players: ${players.length}`);
    console.log(`Players without images: ${missingImages.length}`);
    
    fs.writeFileSync('missing-images.json', JSON.stringify(missingImages, null, 2));
    console.log('Saved missing players to missing-images.json');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

listMissingImages();
