const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL || 'postgres://localhost/r2g',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const { rows } = await pool.query('SELECT name FROM clubs');
  console.log(rows.map(r => r.name));
  process.exit(0);
}

main().catch(console.error);
