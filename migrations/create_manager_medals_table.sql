-- Migration to create manager_medals table for tracking medals and levels
CREATE TABLE IF NOT EXISTS manager_medals (
    id SERIAL PRIMARY KEY,
    manager_id INTEGER NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
    medal_key VARCHAR(100) NOT NULL,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(manager_id, medal_key)
);
