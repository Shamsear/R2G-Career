require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    console.log('🧪 Testing Master of Prediction queries...');

    // 1. Check season 1
    const { rows: seasonRows } = await pool.query('SELECT * FROM prediction_seasons WHERE season_number = 1');
    console.log('✅ Season 1:', seasonRows[0]?.name);

    // 2. Check days count
    const { rows: dayRows } = await pool.query('SELECT COUNT(*) as count FROM prediction_days WHERE season_id = $1', [seasonRows[0]?.id]);
    console.log(`✅ Total Days for Season 1: ${dayRows[0]?.count}`);

    // 3. Check sample managers
    const { rows: managers } = await pool.query('SELECT id, name, r2g_id FROM managers LIMIT 5');
    console.log(`✅ Fetched ${managers.length} sample managers for scoring:`, managers.map(m => `${m.name} (${m.r2g_id || m.id})`).join(', '));

    console.log('✨ All initial checks passed!');
    await pool.end();
  } catch (err) {
    console.error('❌ Test failed:', err);
    await pool.end();
    process.exit(1);
  }
}

test();
