const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const result = await pool.query(`
    SELECT id, season_number 
    FROM seasons 
    ORDER BY season_number DESC
  `);
  console.log('Seasons in database:');
  result.rows.forEach(r => console.log(`  - ID: ${r.id}, Number: ${r.season_number}`));
  
  process.exit(0);
}
run().catch(console.error);
