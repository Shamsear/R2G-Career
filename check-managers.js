const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkManagers() {
  const pool = new Pool({
    connectionString: process.env.SOLO_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const columns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'managers'
      ORDER BY ordinal_position
    `);
    
    console.log('Managers table columns:');
    columns.rows.forEach(row => console.log(`  - ${row.column_name} (${row.data_type})`));
    
    const clubs = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'clubs'
      ORDER BY ordinal_position
    `);
    
    console.log('\nClubs table columns:');
    clubs.rows.forEach(row => console.log(`  - ${row.column_name} (${row.data_type})`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkManagers();
