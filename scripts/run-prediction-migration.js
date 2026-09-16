require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const connectionString = process.env.SOLO_DATABASE_URL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.error('❌ Database connection string not found in .env.local');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('🔄 Applying Master of Prediction database migration...');
    const sqlPath = path.join(__dirname, '..', 'migrations', 'create_prediction_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);

    console.log('✅ Master of Prediction tables created & Season 1 seeded successfully!');

    // Check rows
    const { rows: seasons } = await pool.query('SELECT * FROM prediction_seasons ORDER BY season_number ASC');
    console.log(`📋 Found ${seasons.length} prediction seasons:`);
    seasons.forEach(s => console.log(`   - Season ${s.season_number}: "${s.name}" (Status: ${s.status}, Days: ${s.total_days}, Weeks: ${s.total_weeks})`));

    const { rows: days } = await pool.query('SELECT COUNT(*) as count FROM prediction_days WHERE season_id = $1', [seasons[0]?.id]);
    console.log(`   - Seeded ${days[0]?.count} days for Season 1.`);

    await pool.end();
  } catch (err) {
    console.error('❌ Migration error:', err);
    await pool.end();
    process.exit(1);
  }
}

run();
