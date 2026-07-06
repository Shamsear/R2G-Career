import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function inspect() {
  try {
    console.log("Querying tournament_types table...");
    const { rows: types } = await pool.query(`
      SELECT * FROM tournament_types
    `);
    console.log("All tournament types:", types);
  } catch (e) {
    console.error("Inspection error:", e);
  } finally {
    await pool.end();
  }
}

inspect();
