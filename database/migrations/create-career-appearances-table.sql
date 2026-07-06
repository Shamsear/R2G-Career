-- Create career_matchday_appearances table to track player appearances per matchday in Career Mode
CREATE TABLE IF NOT EXISTS career_matchday_appearances (
    id SERIAL PRIMARY KEY,
    season_id VARCHAR(255) NOT NULL,
    matchday INTEGER NOT NULL,
    team_id VARCHAR(255) NOT NULL,
    player_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_career_appearance UNIQUE(season_id, matchday, team_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_career_appearances_season ON career_matchday_appearances(season_id);
CREATE INDEX IF NOT EXISTS idx_career_appearances_team ON career_matchday_appearances(team_id);
CREATE INDEX IF NOT EXISTS idx_career_appearances_player ON career_matchday_appearances(player_id);
