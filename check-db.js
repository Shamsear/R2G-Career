const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const columns = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'fixtures'
  `);
  console.log('Columns in fixtures:');
  columns.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
  
  process.exit(0);
}
run().catch(console.error);
