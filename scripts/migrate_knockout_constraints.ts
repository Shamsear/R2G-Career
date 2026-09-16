import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('--- Migrating knockout_rounds table constraints ---');
  
  // Drop old constraints if they exist
  await pool.query(`ALTER TABLE knockout_rounds DROP CONSTRAINT IF EXISTS chk_valid_round_name;`);
  await pool.query(`ALTER TABLE knockout_rounds DROP CONSTRAINT IF EXISTS knockout_rounds_round_name_check;`);
  await pool.query(`ALTER TABLE knockout_rounds DROP CONSTRAINT IF EXISTS knockout_rounds_round_order_check;`);

  // Add updated constraints
  const validRoundNames = [
    'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL',
    'PLAYOFF_1', 'ELIMINATOR', 'PLAYOFF_2', 'GRAND_FINAL',
    'PLAYOFF_1_A', 'ELIMINATOR_A', 'PLAYOFF_2_A', 'FINAL_A',
    'PLAYOFF_1_B', 'ELIMINATOR_B', 'PLAYOFF_2_B', 'FINAL_B'
  ];
  
  const nameList = validRoundNames.map(n => `'${n}'`).join(', ');
  
  await pool.query(`
    ALTER TABLE knockout_rounds 
    ADD CONSTRAINT chk_valid_round_name 
    CHECK (round_name IN (${nameList}));
  `);

  await pool.query(`
    ALTER TABLE knockout_rounds 
    ADD CONSTRAINT knockout_rounds_round_order_check 
    CHECK (round_order >= 0 AND round_order <= 30);
  `);

  console.log('Successfully updated knockout_rounds constraints!');
  await pool.end();
}

migrate().catch(console.error);
