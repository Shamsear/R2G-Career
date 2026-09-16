const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('=== RWS ALBUM TABLE SCHEMA & ROWS ===');
    const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'rws_album'");
    console.table(cols.rows);
    const photos = await pool.query('SELECT * FROM rws_album');
    console.table(photos.rows);

    console.log('\n=== ALL TOURNAMENTS WITH TOURNAMENT_TYPE rws ===');
    const rwsTourneys = await pool.query("SELECT * FROM tournaments WHERE tournament_type = 'rws'");
    console.table(rwsTourneys.rows);

    console.log('\n=== SEASONS WITH has_rws = true ===');
    const rwsSeasons = await pool.query("SELECT * FROM seasons WHERE has_rws = true");
    console.table(rwsSeasons.rows);

    console.log('\n=== TOURNAMENT_TEAMS FOR RWS TOURNAMENTS ===');
    const rwsTeams = await pool.query(`
      SELECT tt.*, c.name as club_name, m.name as manager_name, m.r2g_id
      FROM tournament_teams tt
      LEFT JOIN clubs c ON tt.club_id = c.id
      LEFT JOIN managers m ON tt.club_id = m.id
      WHERE tt.tournament_name LIKE '%World Series%' OR tt.tournament_name LIKE '%RWS%' OR tt.tournament_name = 'R2G World Series'
    `);
    console.table(rwsTeams.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
