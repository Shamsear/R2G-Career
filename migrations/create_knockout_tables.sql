-- ============================================
-- KNOCKOUT TOURNAMENT SYSTEM - DATABASE SCHEMA
-- ============================================
-- This migration creates the complete knockout tournament system
-- supporting auto and manual modes with placeholders

-- ============================================
-- 1. KNOCKOUT_ROUNDS TABLE
-- ============================================
-- Stores individual knockout round information
CREATE TABLE IF NOT EXISTS knockout_rounds (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_name TEXT NOT NULL CHECK (round_name IN (
    'ROUND_OF_32', 
    'ROUND_OF_16', 
    'QUARTER_FINAL', 
    'SEMI_FINAL', 
    'THIRD_PLACE', 
    'FINAL'
  )),
  round_order INTEGER NOT NULL CHECK (round_order >= 0 AND round_order <= 5),
  legs INTEGER NOT NULL DEFAULT 2 CHECK (legs IN (1, 2)),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tournament_id, round_name)
);

-- Round order mapping:
-- 0: ROUND_OF_32 (16 pairings)
-- 1: ROUND_OF_16 (8 pairings)
-- 2: QUARTER_FINAL (4 pairings)
-- 3: SEMI_FINAL (2 pairings)
-- 4: THIRD_PLACE (1 pairing)
-- 5: FINAL (1 pairing)

CREATE INDEX IF NOT EXISTS idx_knockout_rounds_tournament ON knockout_rounds(tournament_id);
CREATE INDEX IF NOT EXISTS idx_knockout_rounds_order ON knockout_rounds(tournament_id, round_order);

COMMENT ON TABLE knockout_rounds IS 'Stores knockout tournament rounds';
COMMENT ON COLUMN knockout_rounds.round_name IS 'Name of the round (QUARTER_FINAL, SEMI_FINAL, etc.)';
COMMENT ON COLUMN knockout_rounds.round_order IS 'Sequential order of rounds (0=R32, 1=R16, 2=QF, 3=SF, 4=3rd, 5=Final)';
COMMENT ON COLUMN knockout_rounds.legs IS 'Number of legs in this round (1=single leg, 2=two legs)';
COMMENT ON COLUMN knockout_rounds.status IS 'Current status of the round';

-- ============================================
-- 2. KNOCKOUT_PAIRINGS TABLE
-- ============================================
-- Stores team matchups for each round with placeholder support
CREATE TABLE IF NOT EXISTS knockout_pairings (
  id SERIAL PRIMARY KEY,
  knockout_round_id INTEGER NOT NULL REFERENCES knockout_rounds(id) ON DELETE CASCADE,
  pairing_order INTEGER NOT NULL,
  team1_id INTEGER,
  team2_id INTEGER,
  team1_placeholder TEXT,
  team2_placeholder TEXT,
  winner_id INTEGER,
  leg1_match_id INTEGER,
  leg2_match_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT team_or_placeholder_1 CHECK (
    (team1_id IS NOT NULL) OR (team1_placeholder IS NOT NULL)
  ),
  CONSTRAINT team_or_placeholder_2 CHECK (
    (team2_id IS NOT NULL) OR (team2_placeholder IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_knockout_pairings_round ON knockout_pairings(knockout_round_id);
CREATE INDEX IF NOT EXISTS idx_knockout_pairings_teams ON knockout_pairings(team1_id, team2_id);
CREATE INDEX IF NOT EXISTS idx_knockout_pairings_winner ON knockout_pairings(winner_id);
CREATE INDEX IF NOT EXISTS idx_knockout_pairings_order ON knockout_pairings(knockout_round_id, pairing_order);

COMMENT ON TABLE knockout_pairings IS 'Stores individual team matchups within knockout rounds';
COMMENT ON COLUMN knockout_pairings.pairing_order IS 'Order of pairing within the round (1, 2, 3, ...)';
COMMENT ON COLUMN knockout_pairings.team1_id IS 'Actual team 1 ID (null if using placeholder)';
COMMENT ON COLUMN knockout_pairings.team2_id IS 'Actual team 2 ID (null if using placeholder)';
COMMENT ON COLUMN knockout_pairings.team1_placeholder IS 'Placeholder text like "Group A #1" or "Winner of QF #1"';
COMMENT ON COLUMN knockout_pairings.team2_placeholder IS 'Placeholder text like "Group B #2" or "Winner of QF #2"';
COMMENT ON COLUMN knockout_pairings.winner_id IS 'ID of winning team after matches complete';
COMMENT ON COLUMN knockout_pairings.leg1_match_id IS 'Link to first leg match (or only match if single leg)';
COMMENT ON COLUMN knockout_pairings.leg2_match_id IS 'Link to second leg match (null if single leg)';

-- ============================================
-- 3. ADD KNOCKOUT CONFIG TO TOURNAMENTS TABLE
-- ============================================
-- Add tournament-level knockout configuration
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS knockout_config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN tournaments.knockout_config IS 'Knockout configuration: {"defaultLegs": 2, "qualifyingTeams": 4, "qualifyingRound": "SEMI_FINAL"}';

-- Update existing group stage fields to align with knockout system
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS group_qualifiers INTEGER;

ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS knockout_legs INTEGER DEFAULT 2 CHECK (knockout_legs IN (1, 2));

COMMENT ON COLUMN tournaments.group_qualifiers IS 'Number of teams qualifying from each group to knockout stage';
COMMENT ON COLUMN tournaments.knockout_legs IS 'Default number of legs for knockout rounds (1 or 2)';

-- ============================================
-- 4. UPDATE EXISTING KNOCKOUT FIELDS
-- ============================================
-- Ensure existing knockout fields have proper defaults
UPDATE tournaments 
SET knockout_config = '{}'::jsonb 
WHERE knockout_config IS NULL;

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to get teams count for a round
CREATE OR REPLACE FUNCTION get_round_teams_count(round_name TEXT) 
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

-- Function to get pairings count for a round
CREATE OR REPLACE FUNCTION get_round_pairings_count(round_name TEXT) 
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE round_name
    WHEN 'ROUND_OF_32' THEN 16
    WHEN 'ROUND_OF_16' THEN 8
    WHEN 'QUARTER_FINAL' THEN 4
    WHEN 'SEMI_FINAL' THEN 2
    WHEN 'THIRD_PLACE' THEN 1
    WHEN 'FINAL' THEN 1
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get next round name
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

-- Function to update knockout round status based on matches
CREATE OR REPLACE FUNCTION update_knockout_round_status()
RETURNS TRIGGER AS $$
DECLARE
  round_rec RECORD;
  total_pairings INTEGER;
  completed_pairings INTEGER;
BEGIN
  -- Get the knockout round for this pairing
  SELECT kr.* INTO round_rec
  FROM knockout_rounds kr
  WHERE kr.id = NEW.knockout_round_id;
  
  IF round_rec IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Count total and completed pairings
  SELECT COUNT(*) INTO total_pairings
  FROM knockout_pairings
  WHERE knockout_round_id = round_rec.id;
  
  SELECT COUNT(*) INTO completed_pairings
  FROM knockout_pairings
  WHERE knockout_round_id = round_rec.id
    AND winner_id IS NOT NULL;
  
  -- Update round status
  IF completed_pairings = 0 THEN
    UPDATE knockout_rounds SET status = 'PENDING' WHERE id = round_rec.id;
  ELSIF completed_pairings < total_pairings THEN
    UPDATE knockout_rounds SET status = 'IN_PROGRESS' WHERE id = round_rec.id;
  ELSE
    UPDATE knockout_rounds SET status = 'COMPLETED' WHERE id = round_rec.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update round status when pairings change
DROP TRIGGER IF EXISTS trg_update_knockout_status ON knockout_pairings;
CREATE TRIGGER trg_update_knockout_status
AFTER INSERT OR UPDATE OF winner_id ON knockout_pairings
FOR EACH ROW
EXECUTE FUNCTION update_knockout_round_status();

-- ============================================
-- 6. UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_knockout_rounds_updated_at ON knockout_rounds;
CREATE TRIGGER trg_knockout_rounds_updated_at
BEFORE UPDATE ON knockout_rounds
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_knockout_pairings_updated_at ON knockout_pairings;
CREATE TRIGGER trg_knockout_pairings_updated_at
BEFORE UPDATE ON knockout_pairings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
