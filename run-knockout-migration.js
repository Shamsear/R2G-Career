require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  console.log('🚀 Starting Knockout System Migration...\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'update_knockout_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Migration file loaded');
    console.log('📊 Connecting to database...\n');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📋 Changes applied:');
    console.log('   ✓ Added knockout_config column to tournaments');
    console.log('   ✓ Updated knockout_rounds table structure');
    console.log('   ✓ Updated knockout_pairings table structure');
    console.log('   ✓ Created performance indexes');
    console.log('   ✓ Created helper functions');
    console.log('   ✓ Created bracket visualization view');
    console.log('   ✓ Created auto-resolution triggers');
    console.log('   ✓ Created aggregate score tracking\n');
    
    // Verify the changes
    console.log('🔍 Verifying migration...');
    
    const verifyQueries = [
      { 
        query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'knockout_config'",
        name: 'knockout_config column'
      },
      {
        query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'knockout_rounds' AND column_name = 'creation_mode'",
        name: 'creation_mode column'
      },
      {
        query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'knockout_pairings' AND column_name = 'pairing_order'",
        name: 'pairing_order column'
      },
      {
        query: "SELECT COUNT(*) as count FROM pg_proc WHERE proname = 'resolve_knockout_placeholders'",
        name: 'resolve_knockout_placeholders function'
      },
      {
        query: "SELECT COUNT(*) as count FROM pg_views WHERE viewname = 'v_knockout_bracket'",
        name: 'v_knockout_bracket view'
      }
    ];
    
    for (const check of verifyQueries) {
      const result = await pool.query(check.query);
      const exists = result.rows.length > 0 && (result.rows[0].column_name || result.rows[0].count > 0);
      console.log(`   ${exists ? '✓' : '✗'} ${check.name}`);
    }
    
    console.log('\n✨ Knockout system database migration complete!');
    console.log('📝 Next steps:');
    console.log('   1. Implement server actions for knockout management');
    console.log('   2. Create API routes');
    console.log('   3. Build UI components');
    console.log('   4. Test with sample tournaments\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
