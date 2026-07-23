import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const tables = ['player_contracts', 'player_awards', 'manager_seasons'];
    for (const table of tables) {
      console.log(`\n--- Schema for ${table} ---`);
      const { rows } = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      rows.forEach(r => {
        console.log(`${r.column_name}: ${r.data_type}`);
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
