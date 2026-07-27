/**
 * Run Knockout Structure Migration
 * Creates knockout_rounds and knockout_pairings tables
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  console.log('🚀 Starting Knockout Structure Migration...\n');

  const databaseUrl = process.env.NEON_DB_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Error: NEON_DB_URL or DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl
  });

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'create_knockout_structure.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded: create_knockout_structure.sql\n');
    console.log('📊 Executing migration SQL...\n');

    // Execute entire migration
    await pool.query(migrationSql);

    console.log('✅ Migration completed successfully!\n');

    // Verify tables created
    console.log('🔍 Verifying tables...\n');

    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('knockout_rounds', 'knockout_pairings')
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 2) {
      console.log('✅ knockout_rounds table created');
      console.log('✅ knockout_pairings table created');
    } else {
      console.log(`⚠️  Warning: Expected 2 tables, found ${tablesResult.rows.length}`);
      if (tablesResult.rows.length > 0) {
        tablesResult.rows.forEach(t => console.log(`   Found: ${t.table_name}`));
      }
    }

    // Check columns
    console.log('\n🔍 Checking tournament table updates...\n');

    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tournaments' 
        AND column_name IN ('knockout_config', 'tournament_format')
    `);

    if (columnsResult.rows.length > 0) {
      columnsResult.rows.forEach(col => {
        console.log(`✅ tournaments.${col.column_name} column added`);
      });
    } else {
      console.log('⚠️  No new columns found in tournaments table');
    }

    console.log('\n🎉 Knockout structure is ready!\n');
    console.log('Next steps:');
    console.log('1. Update tournaments with tournament_format values');
    console.log('2. Test knockout round creation via API');
    console.log('3. Build frontend bracket UI\n');

    await pool.end();
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
