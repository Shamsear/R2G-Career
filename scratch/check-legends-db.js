const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres.fxedksenksggdacsjqxq:Dlse0e3fXqM7q7TB@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

async function inspectLegendPlayers() {
  try {
    const { rows: tables } = await pool.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    `);
    console.log("Tables in DB:", tables.map(t => t.table_name));

    // Check if there are players or legends tables
    const playerTables = tables.map(t => t.table_name).filter(t => t.includes('player') || t.includes('legend') || t.includes('icon'));
    console.log("Player/Legend related tables:", playerTables);

    for (const t of playerTables) {
      try {
        const { rows } = await pool.query(`SELECT COUNT(*) FROM ${t}`);
        console.log(`Table ${t} count:`, rows[0].count);
      } catch (e) {
        console.error(`Error checking ${t}:`, e.message);
      }
    }

  } catch (err) {
    console.error("Error inspecting legends:", err);
  } finally {
    await pool.end();
  }
}

inspectLegendPlayers();
