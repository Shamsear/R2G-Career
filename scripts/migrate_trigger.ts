import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('--- Updating resolve_knockout_placeholders trigger in Postgres ---');

  await pool.query(`
    CREATE OR REPLACE FUNCTION resolve_knockout_placeholders()
    RETURNS TRIGGER AS $$
    DECLARE
      next_pairing RECORD;
      loser_id INTEGER;
    BEGIN
      IF NEW.winner_id IS NOT NULL AND (OLD.winner_id IS NULL OR OLD.winner_id != NEW.winner_id) THEN
        -- Calculate loser_id
        IF NEW.winner_id = NEW.team1_id THEN
          loser_id := NEW.team2_id;
        ELSIF NEW.winner_id = NEW.team2_id THEN
          loser_id := NEW.team1_id;
        ELSE
          loser_id := NULL;
        END IF;

        FOR next_pairing IN 
          SELECT id, team1_id, team2_id, team1_placeholder, team2_placeholder, source_pairing_1_id, source_pairing_2_id
          FROM knockout_pairings
          WHERE source_pairing_1_id = NEW.id OR source_pairing_2_id = NEW.id
        LOOP
          -- Update team1 if this pairing is source 1
          IF next_pairing.source_pairing_1_id = NEW.id THEN
            IF next_pairing.team1_placeholder ILIKE 'Loser of%' THEN
              IF loser_id IS NOT NULL THEN
                UPDATE knockout_pairings 
                SET team1_id = loser_id,
                    team1_placeholder = NULL,
                    updated_at = NOW()
                WHERE id = next_pairing.id;
              END IF;
            ELSE
              UPDATE knockout_pairings 
              SET team1_id = NEW.winner_id,
                  team1_placeholder = NULL,
                  updated_at = NOW()
                WHERE id = next_pairing.id;
            END IF;
          END IF;
          
          -- Update team2 if this pairing is source 2
          IF next_pairing.source_pairing_2_id = NEW.id THEN
            IF next_pairing.team2_placeholder ILIKE 'Loser of%' THEN
              IF loser_id IS NOT NULL THEN
                UPDATE knockout_pairings 
                SET team2_id = loser_id,
                    team2_placeholder = NULL,
                    updated_at = NOW()
                WHERE id = next_pairing.id;
              END IF;
            ELSE
              UPDATE knockout_pairings 
              SET team2_id = NEW.winner_id,
                  team2_placeholder = NULL,
                  updated_at = NOW()
              WHERE id = next_pairing.id;
            END IF;
          END IF;
        END LOOP;
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  console.log('Successfully updated resolve_knockout_placeholders trigger!');
  await pool.end();
}

migrate().catch(console.error);
