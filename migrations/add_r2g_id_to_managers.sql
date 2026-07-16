-- Migration to add r2g_id column to managers table on Solo side
ALTER TABLE managers ADD COLUMN r2g_id VARCHAR(50);

-- Backfill existing managers using their integer ID (e.g. 1 -> SSPSM0001)
UPDATE managers SET r2g_id = 'SSPSM' || LPAD(id::text, 4, '0');

-- Set it to NOT NULL and UNIQUE now that it's backfilled
ALTER TABLE managers ALTER COLUMN r2g_id SET NOT NULL;
ALTER TABLE managers ADD CONSTRAINT unique_r2g_id UNIQUE (r2g_id);

-- Create trigger function to auto-generate r2g_id for newly inserted managers
CREATE OR REPLACE FUNCTION generate_manager_r2g_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.r2g_id IS NULL THEN
    NEW.r2g_id := 'SSPSM' || LPAD(NEW.id::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind the trigger BEFORE INSERT
DROP TRIGGER IF EXISTS trigger_generate_manager_r2g_id ON managers;
CREATE TRIGGER trigger_generate_manager_r2g_id
BEFORE INSERT ON managers
FOR EACH ROW
EXECUTE FUNCTION generate_manager_r2g_id();
