const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: "postgresql://postgres.fxedksenksggdacsjqxq:Dlse0e3fXqM7q7TB@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

async function exportLegends() {
  try {
    const { rows: legends } = await pool.query(`
      SELECT id, name, position, base_value, image_path FROM players
      WHERE card_type = 'Legend'
      ORDER BY name ASC
    `);

    console.log(`Exporting ${legends.length} legend players...`);
    fs.writeFileSync('scratch/legends_list.json', JSON.stringify(legends, null, 2));

  } catch (err) {
    console.error("Error exporting legends:", err);
  } finally {
    await pool.end();
  }
}

exportLegends();
