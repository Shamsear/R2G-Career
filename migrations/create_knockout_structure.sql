-- Create knockout rounds and pairings tables for comprehensive knockout tournament management

-- Knockout Rounds Table
CREATE TABLE IF NOT EXISTS knockout_rounds (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  round_name TEXT NOT NULL,  -- ROUND_OF_32, ROUND_OF_16, QUARTER_FINAL, SEMI_FINAL, THIRD_PLACE, FINAL
  round_order INT NOT NULL,  -- 0, 1, 2, 3, 4, 5
  legs INT NOT NULL DEFAULT 1,  -- 1 or 2
  status TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING, IN_PROGRESS, COMPLETED
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tournament_id, round_name),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- Knockout Pairings Table
CREATE TABLE IF NOT EXISTS knockout_pairings (
  id TEXT PRIMARY KEY,
  knockout_round_id TEXT NOT NULL,
  pairing_number INT NOT NULL,  -- 1, 2, 3, 4... (match number within round)
  team1_id TEXT,
  team2_id TEXT,
  team1_placeholder TEXT,  -- "Group A #1", "League #3", "Winner of QF1", etc.
  team2_placeholder TEXT,
  winner_id TEXT,
  leg1_match_id TEXT,  -- Reference to fixtures table
  leg2_match_id TEXT,  -- Reference to fixtures table (if two-legged)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (knockout_round_id) REFERENCES knockout_rounds(id) ON DELETE CASCADE
);

-- Add knockout configuration to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS knockout_config JSONB DEFAULT NULL;

-- Add tournament_type enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' 
    AND column_name = 'tournament_format'
  ) THEN
    ALTER TABLE tournaments 
    ADD COLUMN tournament_format TEXT DEFAULT 'LEAGUE';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE knockout_rounds IS 'Stores knockout round definitions for tournaments';
COMMENT ON TABLE knockout_pairings IS 'Stores team pairings/matchups for each knockout round';
COMMENT ON COLUMN knockout_rounds.round_name IS 'Name of the knockout round (ROUND_OF_32, ROUND_OF_16, QUARTER_FINAL, SEMI_FINAL, THIRD_PLACE, FINAL)';
COMMENT ON COLUMN knockout_rounds.round_order IS 'Order of rounds: 0=R32, 1=R16, 2=QF, 3=SF, 4=3rd Place, 5=Final';
COMMENT ON COLUMN knockout_rounds.legs IS 'Number of legs: 1 for single leg, 2 for home-and-away';
COMMENT ON COLUMN knockout_pairings.team1_placeholder IS 'Placeholder text for auto-qualification (e.g., "Group A #1", "Winner of QF1")';
COMMENT ON COLUMN knockout_pairings.team2_placeholder IS 'Placeholder text for auto-qualification (e.g., "Group B #2", "Winner of QF2")';
COMMENT ON COLUMN knockout_pairings.winner_id IS 'ID of team that won this pairing (populated when matches complete)';
COMMENT ON COLUMN tournaments.knockout_config IS 'JSON config: {defaultLegs: 2, qualifyingTeams: 4, qualifyingRound: "SEMI_FINAL"}';
COMMENT ON COLUMN tournaments.tournament_format IS 'Tournament format: LEAGUE, KNOCKOUT_ONLY, GROUP_KNOCKOUT, LEAGUE_PLAYOFF, CUSTOM_KNOCKOUT';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_knockout_rounds_tournament ON knockout_rounds(tournament_id);
CREATE INDEX IF NOT EXISTS idx_knockout_rounds_status ON knockout_rounds(status);
CREATE INDEX IF NOT EXISTS idx_knockout_pairings_round ON knockout_pairings(knockout_round_id);
CREATE INDEX IF NOT EXISTS idx_knockout_pairings_teams ON knockout_pairings(team1_id, team2_id);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_knockout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS knockout_rounds_updated_at ON knockout_rounds;
CREATE TRIGGER knockout_rounds_updated_at
  BEFORE UPDATE ON knockout_rounds
  FOR EACH ROW
  EXECUTE FUNCTION update_knockout_updated_at();

DROP TRIGGER IF EXISTS knockout_pairings_updated_at ON knockout_pairings;
CREATE TRIGGER knockout_pairings_updated_at
  BEFORE UPDATE ON knockout_pairings
  FOR EACH ROW
  EXECUTE FUNCTION update_knockout_updated_at();
