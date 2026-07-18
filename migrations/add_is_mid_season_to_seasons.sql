-- Migration: Add is_mid_season flag to seasons table
-- Purpose: Track whether a season is a mid-season point (e.g., 10.5) or season start (e.g., 10.0)
-- Date: 2026-07-18

-- Add is_mid_season column to seasons table
ALTER TABLE seasons 
ADD COLUMN IF NOT EXISTS is_mid_season BOOLEAN DEFAULT FALSE;

-- Update existing seasons based on their season_number
-- If season_number has a decimal (e.g., 9.5), it's a mid-season
UPDATE seasons 
SET is_mid_season = (season_number::numeric % 1 != 0);

-- Add comment for documentation
COMMENT ON COLUMN seasons.is_mid_season IS 'Indicates if this is a mid-season point (e.g., 10.5) vs season start (e.g., 10.0). Used for automatic contract expiration logic.';
