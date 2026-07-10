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
      'UPDATE tournaments SET name = $1, format_type = $2, financial_rule_id = $3, tournament_type = $4 WHERE id = $5 RETURNING *',
      ['SS Super League S9 Test', 'Knockout', null, 'solo', 1]
    );
    console.log("Success update:", res.rows[0]);
    await c.query(
      'UPDATE tournaments SET name = $1, format_type = $2, financial_rule_id = $3, tournament_type = $4 WHERE id = $5',
      ['SS Super League S9', 'Knockout', null, 'solo', 1]
    );
    console.log("Restored successfully.");
  } catch (err) {
    console.error("Exact Error:", err);
  } finally {
    await c.end();
  }
}

run();
