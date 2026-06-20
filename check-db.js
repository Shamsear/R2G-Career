const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const { rows } = await pool.query('SELECT id, name FROM players LIMIT 10');
  console.log(rows);
  process.exit(0);
}
run();
