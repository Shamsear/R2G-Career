const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkTables() {
  const pool = new Pool({
    connectionString: process.env.SOLO_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // List all tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Available tables:');
    tables.rows.forEach(row => console.log('  -', row.table_name));
    
    console.log('\n\nChecking for tournament-related tables:');
    const tournamentTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%tournament%'
      ORDER BY table_name
    `);
    
    tournamentTables.rows.forEach(row => console.log('  -', row.table_name));
    
    // Check tournaments table structure
    console.log('\n\nTournaments table columns:');
    const columns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'tournaments'
      ORDER BY ordinal_position
    `);
    
    columns.rows.forEach(row => console.log(`  - ${row.column_name} (${row.data_type})`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
