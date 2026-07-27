const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkTable() {
  const pool = new Pool({
    connectionString: process.env.SOLO_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'tournaments' AND column_name = 'id'
    `);
    
    console.log('Tournaments table ID column:');
    console.log(result.rows);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTable();
