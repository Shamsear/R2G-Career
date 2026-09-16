-- Master of Prediction Database Migration
-- Creates prediction_seasons, prediction_days, and prediction_scores tables

-- 1. Prediction Seasons Table
CREATE TABLE IF NOT EXISTS prediction_seasons (
  id SERIAL PRIMARY KEY,
  season_number INTEGER NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 36,
  total_weeks INTEGER NOT NULL DEFAULT 6,
  days_per_week INTEGER NOT NULL DEFAULT 6,
  status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'upcoming'
  current_day INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Prediction Days Table (36 Days / Rounds per Season)
CREATE TABLE IF NOT EXISTS prediction_days (
  id SERIAL PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES prediction_seasons(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL, -- 1 to 36
  week_number INTEGER NOT NULL, -- 1 to 6
  title VARCHAR(150),
  match_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (season_id, day_number)
);

-- 3. Prediction Scores Table (Member points per day)
CREATE TABLE IF NOT EXISTS prediction_scores (
  id SERIAL PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES prediction_seasons(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL, -- 1 to 36
  week_number INTEGER NOT NULL, -- 1 to 6
  member_id INTEGER NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
  points NUMERIC(6, 2) NOT NULL DEFAULT 0,
  notes VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (season_id, day_number, member_id)
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_prediction_scores_season ON prediction_scores(season_id);
CREATE INDEX IF NOT EXISTS idx_prediction_scores_day ON prediction_scores(season_id, day_number);
CREATE INDEX IF NOT EXISTS idx_prediction_scores_week ON prediction_scores(season_id, week_number);
CREATE INDEX IF NOT EXISTS idx_prediction_scores_member ON prediction_scores(member_id);
CREATE INDEX IF NOT EXISTS idx_prediction_days_season ON prediction_days(season_id, day_number);

-- Seed Season 1 if not exists
INSERT INTO prediction_seasons (season_number, name, total_days, total_weeks, days_per_week, status, current_day, notes)
VALUES (1, 'Master of Prediction - Season 1', 36, 6, 6, 'active', 1, 'Inaugural 36-day prediction tournament across 6 weeks.')
ON CONFLICT (season_number) DO NOTHING;

-- Seed 36 days for Season 1
DO $$
DECLARE
  s_id INTEGER;
  d INTEGER;
  w INTEGER;
BEGIN
  SELECT id INTO s_id FROM prediction_seasons WHERE season_number = 1 LIMIT 1;
  IF s_id IS NOT NULL THEN
    FOR d IN 1..36 LOOP
      w := CEIL(d::NUMERIC / 6);
      INSERT INTO prediction_days (season_id, day_number, week_number, title, is_completed)
      VALUES (s_id, d, w, 'Day ' || d || ' (Week ' || w || ')', FALSE)
      ON CONFLICT (season_id, day_number) DO NOTHING;
    END LOOP;
  END IF;
END $$;
