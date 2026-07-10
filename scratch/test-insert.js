const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const c = new Client({
    connectionString: process.env.SOLO_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  try {
    const res = await c.query(
      'INSERT INTO tournaments (name, format_type, season_id, financial_rule_id, tournament_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      ['Test Tourney', 'League', 6, null, 'solo']
    );
    console.log("Success:", res.rows[0]);
    await c.query('DELETE FROM tournaments WHERE id = $1', [res.rows[0].id]);
    console.log("Cleaned up successfully.");
  } catch (err) {
    console.error("Exact Error:", err);
  } finally {
    await c.end();
  }
}

run();
