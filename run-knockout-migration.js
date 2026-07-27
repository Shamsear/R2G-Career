const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  console.log('🚀 Starting Knockout Tournament Migration...\n');

  const connectionString = process.env.SOLO_DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ ERROR: SOLO_DATABASE_URL not found in .env.local');
    console.error('Please ensure your .env.local file has SOLO_DATABASE_URL set.');
    process.exit(1);
  }

  console.log('✓ Database connection string found');
  console.log('✓ Connecting to database...\n');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✓ Database connection successful\n');
    
    console.log('📖 Reading migration file...');
    const sqlFilePath = path.join(__dirname, 'migrations', 'create_knockout_tables.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`Migration file not found: ${sqlFilePath}`);
    }
    
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('✓ Migration file loaded\n');
    
    console.log('⚙️  Executing migration...');
    console.log('   - Creating knockout_rounds table...');
    console.log('   - Creating knockout_pairings table...');
    console.log('   - Creating helper functions...');
    console.log('   - Creating triggers...\n');
    
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify tables were created
    console.log('🔍 Verifying migration...');
    
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('knockout_rounds', 'knockout_pairings')
      ORDER BY table_name
    `);
    
    if (tablesCheck.rows.length === 2) {
      console.log('✓ Tables created:');
      tablesCheck.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    } else {
      console.warn('⚠️  Warning: Expected 2 tables but found', tablesCheck.rows.length);
    }
    
    // Check functions
    const functionsCheck = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND (routine_name LIKE '%knockout%' OR routine_name LIKE '%round%')
      ORDER BY routine_name
    `);
    
    console.log(`✓ Functions created: ${functionsCheck.rows.length} functions`);
    functionsCheck.rows.forEach(row => {
      console.log(`  - ${row.routine_name}()`);
    });
    
    // Test a simple query
    const testQuery = await pool.query('SELECT COUNT(*) FROM knockout_rounds');
    console.log(`✓ Test query successful: ${testQuery.rows[0].count} knockout rounds found`);
    
    console.log('\n🎉 SUCCESS! Knockout tournament system is ready to use!\n');
    console.log('📋 Next steps:');
    console.log('   1. Open your browser');
    console.log('   2. Navigate to admin dashboard');
    console.log('   3. Open any tournament with knockout stage');
    console.log('   4. Click the "Knockout" tab');
    console.log('   5. Create your first knockout round!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    
    if (error.detail) {
      console.error('Detail:', error.detail);
    }
    
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    
    console.error('\n💡 Troubleshooting:');
    console.error('   - Check if you have CREATE TABLE permissions');
    console.error('   - Verify SOLO_DATABASE_URL is correct in .env.local');
    console.error('   - Ensure the database is accessible');
    console.error('   - Check if tables already exist (run: SELECT * FROM knockout_rounds;)');
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
