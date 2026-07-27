const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: "postgresql://postgres.fxedksenksggdacsjqxq:Dlse0e3fXqM7q7TB@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

async function updateDbWithEfootballdbImages() {
  try {
    const indexPath = 'public/assets/data/efootballdb_legends_all_results.json';
    if (!fs.existsSync(indexPath)) {
      console.error("Index file does not exist yet.");
      return;
    }

    const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    console.log(`Updating database for ${Object.keys(data).length} legends...`);

    let updatedCount = 0;

    for (const [name, info] of Object.entries(data)) {
      if (info.images && info.images.length > 0) {
        // Pick the top downloaded image variation
        const primaryImage = info.images[0].local_path;
        await pool.query(`UPDATE players SET image_path = $1 WHERE id = $2`, [primaryImage, info.db_id]);
        updatedCount++;
        console.log(`Updated player ${info.db_id} (${name}) -> ${primaryImage}`);
      }
    }

    console.log(`\nSuccessfully updated ${updatedCount} Legend player records in database!`);

  } catch (err) {
    console.error("Error updating DB:", err);
  } finally {
    await pool.end();
  }
}

updateDbWithEfootballdbImages();
