const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres.fxedksenksggdacsjqxq:Dlse0e3fXqM7q7TB@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

async function inspectPlayers() {
  try {
    // Distinct card_type in players
    const { rows: cardTypes } = await pool.query(`
      SELECT card_type, COUNT(*) FROM players GROUP BY card_type ORDER BY COUNT(*) DESC
    `);
    console.log("Card types in players table:", cardTypes);

    // Get all players with card_type containing 'icon', 'hero', 'legend', or non-standard
    const { rows: legends } = await pool.query(`
      SELECT id, name, position, card_type, base_value, image_path FROM players
      WHERE LOWER(card_type) LIKE '%icon%' 
         OR LOWER(card_type) LIKE '%hero%' 
         OR LOWER(card_type) LIKE '%legend%'
         OR LOWER(card_type) LIKE '%prime%'
         OR LOWER(name) LIKE '%icon%'
         OR LOWER(name) LIKE '%legend%'
      ORDER BY name ASC
    `);

    console.log(`\nFound ${legends.length} legend/icon/hero players:`);
    console.log(JSON.stringify(legends.slice(0, 50), null, 2));

    // Also check if there are other players in players table that might be legends
    const { rows: allPlayers } = await pool.query(`
      SELECT id, name, position, card_type, image_path FROM players ORDER BY id ASC
    `);
    console.log(`\nTotal players in DB: ${allPlayers.length}`);

  } catch (err) {
    console.error("Error inspecting players:", err);
  } finally {
    await pool.end();
  }
}

inspectPlayers();
