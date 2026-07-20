const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres.fxedksenksggdacsjqxq:Dlse0e3fXqM7q7TB@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

async function checkAndSetup() {
  try {
    const { rows } = await pool.query(`
      SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%album%'
    `);
    console.log("Existing album tables:", rows);

    // Ensure special_tour_album table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS special_tour_album (
        id SERIAL PRIMARY KEY,
        tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        tag VARCHAR(100),
        image_url TEXT NOT NULL,
        date_str VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("special_tour_album table verified/created successfully!");

  } catch (err) {
    console.error("Error setting up special_tour_album table:", err);
  } finally {
    await pool.end();
  }
}

checkAndSetup();
