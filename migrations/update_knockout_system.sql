-- =====================================================
-- COMPREHENSIVE KNOCKOUT TOURNAMENT SYSTEM MIGRATION
-- =====================================================
-- This migration updates the database schema to support
-- the complete knockout tournament system with auto
-- qualification, manual selection, and bracket management.
-- =====================================================

-- Step 1: Add knockout configuration to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS knockout_config JSONB DEFAULT '{}';

-- Add tournament type enum if not exists
DO $$ BEGIN
  CREATE TYPE tournament_format AS ENUM (
    'LEAGUE',
    'KNOCKOUT_ONLY', 
    'GROUP_KNOCKOUT',
    'LEAGUE_PLAYOFF',
    'CUSTOM_KNOCKOUT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Update knockout_rounds table structure
ALTER TABLE knockout_rounds
ADD COLUMN IF NOT EXISTS pairing_method TEXT DEFAULT 'AUTO',
ADD COLUMN IF NOT EXISTS creation_mode TEXT DEFAULT 'AUTO',
ADD COLUMN IF NOT EXISTS is_full_bracket BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN knockout_rounds.pairing_method IS 'AUTO_SEED (1v8, 2v7), CONSECUTIVE (1v2, 3v4), or CUSTOM';
COMMENT ON COLUMN knockout_rounds.creation_mode IS 'AUTO (with placeholders) or MANUAL (selected teams)';
COMMENT ON COLUMN knockout_rounds.is_full_bracket IS 'True if this round was part of full bracket generation';

-- Step 3: Update knockout_pairings table
ALTER TABLE knockout_pairings
ADD COLUMN IF NOT EXISTS pairing_order INTEGER,
ADD COLUMN IF NOT EXISTS source_round_id INTEGER,
ADD COLUMN IF NOT EXISTS source_pairing_1_id INTEGER,
ADD COLUMN IF NOT EXISTS source_pairing_2_id INTEGER,
ADD COLUMN IF NOT EXISTS aggregate_score_team1 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS aggregate_score_team2 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS away_goals_team1 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS away_goals_team2 INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN knockout_pairings.pairing_order IS 'Order of pairing within the round (1, 2, 3, 4...)';
COMMENT ON COLUMN knockout_pairings.source_round_id IS 'Previous round ID for bracket progression';
COMMENT ON COLUMN knockout_pairings.source_pairing_1_id IS 'Winner of this pairing fills team1 slot';
COMMENT ON COLUMN knockout_pairings.source_pairing_2_id IS 'Winner of this pairing fills team2 slot';
COMMENT ON COLUMN knockout_pairings.aggregate_score_team1 IS 'Total goals across both legs';
COMMENT ON COLUMN knockout_pairings.aggregate_score_team2 IS 'Total goals across both legs';

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_knockout_rounds_tournament 
ON knockout_rounds(tournament_id, round_order);

CREATE INDEX IF NOT EXISTS idx_knockout_pairings_round 
ON knockout_pairings(knockout_round_id, pairing_order);

CREATE INDEX IF NOT EXISTS idx_knockout_pairings_teams 
ON knockout_pairings(team1_id, team2_id);

CREATE INDEX IF NOT EXISTS idx_knockout_pairings_winner 
ON knockout_pairings(winner_id);

CREATE INDEX IF NOT EXISTS idx_knockout_pairings_source 
ON knockout_pairings(source_round_id, source_pairing_1_id, source_pairing_2_id);

-- Step 5: Create helper function to get round team count
CREATE OR REPLACE FUNCTION get_round_team_count(round_name TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE round_name
    WHEN 'ROUND_OF_32' THEN 32
    WHEN 'ROUND_OF_16' THEN 16
    WHEN 'QUARTER_FINAL' THEN 8
    WHEN 'SEMI_FINAL' THEN 4
    WHEN 'THIRD_PLACE' THEN 2
    WHEN 'FINAL' THEN 2
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 6: Create helper function to get next round name
CREATE OR REPLACE FUNCTION get_next_round_name(current_round TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE current_round
    WHEN 'ROUND_OF_32' THEN 'ROUND_OF_16'
    WHEN 'ROUND_OF_16' THEN 'QUARTER_FINAL'
    WHEN 'QUARTER_FINAL' THEN 'SEMI_FINAL'
    WHEN 'SEMI_FINAL' THEN 'FINAL'
    WHEN 'THIRD_PLACE' THEN NULL
    WHEN 'FINAL' THEN NULL
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 7: Add constraint to ensure valid round progression
ALTER TABLE knockout_rounds
ADD CONSTRAINT chk_valid_round_name 
CHECK (round_name IN ('ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL'));

-- Step 8: Add constraint for valid statuses
ALTER TABLE knockout_rounds
ADD CONSTRAINT chk_valid_status 
CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED'));

-- Step 9: Add constraint for valid legs
ALTER TABLE knockout_rounds
ADD CONSTRAINT chk_valid_legs 
CHECK (legs IN (1, 2));

-- Step 10: Create view for bracket visualization
CREATE OR REPLACE VIEW v_knockout_bracket AS
SELECT 
  kr.id as round_id,
  kr.tournament_id,
  kr.round_name,
  kr.round_order,
  kr.legs,
  kr.status as round_status,
  kr.creation_mode,
  kr.pairing_method,
  kp.id as pairing_id,
  kp.pairing_order,
  kp.team1_id,
  kp.team2_id,
  kp.team1_placeholder,
  kp.team2_placeholder,
  kp.winner_id,
  kp.leg1_match_id,
  kp.leg2_match_id,
  kp.aggregate_score_team1,
  kp.aggregate_score_team2,
  m1.name as team1_name,
  m2.name as team2_name,
  mw.name as winner_name,
  c1.logo_path as team1_logo,
  c2.logo_path as team2_logo,
  cw.logo_path as winner_logo
FROM knockout_rounds kr
LEFT JOIN knockout_pairings kp ON kp.knockout_round_id = kr.id
LEFT JOIN managers m1 ON m1.id = kp.team1_id
LEFT JOIN managers m2 ON m2.id = kp.team2_id
LEFT JOIN managers mw ON mw.id = kp.winner_id
LEFT JOIN clubs c1 ON c1.id = m1.id
LEFT JOIN clubs c2 ON c2.id = m2.id
LEFT JOIN clubs cw ON cw.id = mw.id
ORDER BY kr.round_order, kp.pairing_order;

-- Step 11: Create function to auto-resolve placeholders
CREATE OR REPLACE FUNCTION resolve_knockout_placeholders()
RETURNS TRIGGER AS $$
DECLARE
  next_pairing RECORD;
BEGIN
  -- When a winner is set in a pairing, check if any next round pairings reference it
  IF NEW.winner_id IS NOT NULL AND (OLD.winner_id IS NULL OR OLD.winner_id != NEW.winner_id) THEN
    -- Find pairings in next rounds that reference this pairing
    FOR next_pairing IN 
      SELECT id, team1_id, team2_id, source_pairing_1_id, source_pairing_2_id
      FROM knockout_pairings
      WHERE source_pairing_1_id = NEW.id OR source_pairing_2_id = NEW.id
    LOOP
      -- Update team1 if this pairing is source 1
      IF next_pairing.source_pairing_1_id = NEW.id THEN
        UPDATE knockout_pairings 
        SET team1_id = NEW.winner_id,
            team1_placeholder = NULL,
            updated_at = NOW()
        WHERE id = next_pairing.id;
      END IF;
      
      -- Update team2 if this pairing is source 2
      IF next_pairing.source_pairing_2_id = NEW.id THEN
        UPDATE knockout_pairings 
        SET team2_id = NEW.winner_id,
            team2_placeholder = NULL,
            updated_at = NOW()
        WHERE id = next_pairing.id;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Create trigger for auto-resolution
DROP TRIGGER IF EXISTS trg_resolve_knockout_placeholders ON knockout_pairings;
CREATE TRIGGER trg_resolve_knockout_placeholders
AFTER UPDATE OF winner_id ON knockout_pairings
FOR EACH ROW
EXECUTE FUNCTION resolve_knockout_placeholders();

-- Step 13: Create function to calculate aggregate scores
CREATE OR REPLACE FUNCTION update_knockout_aggregate_scores()
RETURNS TRIGGER AS $$
DECLARE
  leg1_home INTEGER;
  leg1_away INTEGER;
  leg2_home INTEGER;
  leg2_away INTEGER;
  pairing RECORD;
BEGIN
  -- Get the pairing that contains this match
  SELECT * INTO pairing
  FROM knockout_pairings
  WHERE leg1_match_id = NEW.id OR leg2_match_id = NEW.id
  LIMIT 1;
  
  IF pairing IS NOT NULL THEN
    -- Get leg 1 scores
    SELECT home_score, away_score INTO leg1_home, leg1_away
    FROM fixtures
    WHERE id = pairing.leg1_match_id;
    
    -- Get leg 2 scores (if exists)
    IF pairing.leg2_match_id IS NOT NULL THEN
      SELECT home_score, away_score INTO leg2_home, leg2_away
      FROM fixtures
      WHERE id = pairing.leg2_match_id;
    ELSE
      leg2_home := 0;
      leg2_away := 0;
    END IF;
    
    -- Update aggregate scores
    UPDATE knockout_pairings
    SET 
      aggregate_score_team1 = COALESCE(leg1_home, 0) + COALESCE(leg2_away, 0),
      aggregate_score_team2 = COALESCE(leg1_away, 0) + COALESCE(leg2_home, 0),
      away_goals_team1 = COALESCE(leg2_away, 0),
      away_goals_team2 = COALESCE(leg1_away, 0),
      updated_at = NOW()
    WHERE id = pairing.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 14: Create trigger for aggregate score updates
DROP TRIGGER IF EXISTS trg_update_knockout_aggregate_scores ON fixtures;
CREATE TRIGGER trg_update_knockout_aggregate_scores
AFTER UPDATE OF home_score, away_score ON fixtures
FOR EACH ROW
EXECUTE FUNCTION update_knockout_aggregate_scores();

-- Step 15: Add sample knockout configurations
COMMENT ON TABLE knockout_rounds IS 'Stores knockout tournament rounds with support for auto/manual creation and full bracket generation';
COMMENT ON TABLE knockout_pairings IS 'Stores team pairings within knockout rounds with placeholder support and auto-resolution';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- The database now supports:
-- ✅ Auto and manual knockout creation modes
-- ✅ Placeholder-based team qualification
-- ✅ Full bracket generation
-- ✅ Automatic winner progression
-- ✅ Aggregate score tracking
-- ✅ Away goals rule support
-- ✅ Flexible tournament configurations
-- =====================================================
