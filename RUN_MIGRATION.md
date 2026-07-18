# How to Run the Database Migration

## Step 1: Backup Your Database
Before running any migration, **always backup your database first**:

```sql
-- Create a backup (run in your database console)
pg_dump your_database_name > backup_before_migration_$(date +%Y%m%d).sql
```

## Step 2: Run the Migration

### Option A: Using psql (Command Line)
```bash
psql -U your_username -d your_database_name -f migrations/add_is_mid_season_to_seasons.sql
```

### Option B: Using Database GUI (pgAdmin, DBeaver, etc.)
1. Open your database management tool
2. Connect to your database
3. Open the SQL query editor
4. Copy and paste the contents of `migrations/add_is_mid_season_to_seasons.sql`
5. Execute the query

### Option C: Using Supabase Dashboard
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Create a new query
4. Paste the migration SQL
5. Click "Run"

## Step 3: Verify the Migration

Run this query to verify the column was added:

```sql
-- Check if is_mid_season column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'seasons' 
  AND column_name = 'is_mid_season';
```

Expected result:
```
 column_name   | data_type | column_default 
---------------+-----------+----------------
 is_mid_season | boolean   | false
```

## Step 4: Check Existing Data

Verify that existing seasons were updated correctly:

```sql
-- View all seasons with their is_mid_season flag
SELECT 
  id, 
  season_number, 
  is_active, 
  is_mid_season,
  CASE 
    WHEN season_number::numeric % 1 != 0 THEN 'Mid-Season' 
    ELSE 'Season Start' 
  END as season_type
FROM seasons
ORDER BY season_number DESC;
```

Expected output example:
```
 id | season_number | is_active | is_mid_season | season_type  
----+---------------+-----------+---------------+--------------
  8 |          9.5  |   true    |     true      | Mid-Season
  7 |          9    |   false   |     false     | Season Start
  6 |          8.5  |   false   |     true      | Mid-Season
  5 |          8    |   false   |     false     | Season Start
```

## Step 5: Test the Auto-Release System

After migration, test the system:

### Test 1: Create contracts with expiration
```sql
-- Insert test contracts
INSERT INTO player_contracts (player_id, season_id, current_club_id, signed_value, salary, start_season, expire_season, status)
VALUES 
  (1, 8, 1, 50, 2.5, '8', '10', 'active'),    -- Expires at Season 10
  (2, 8, 1, 60, 3.0, '8', '10.5', 'active'),  -- Expires at Season 10.5
  (3, 8, 1, 70, 3.5, '8', '11', 'active');    -- Expires at Season 11
```

### Test 2: Create Season 10.0 (should release contracts expiring at ≤ 10.0)
```
Go to Admin > Seasons
Create Season: 10.0
Expected: "✅ Created Season 10 | 🔓 Auto-released 1 expired contracts"
```

### Test 3: Verify player 1 is now a free agent
```sql
-- Check if player 1's contract is inactive
SELECT * FROM player_contracts 
WHERE player_id = 1 AND status = 'inactive';

-- Verify player 1 appears in free agents
SELECT * FROM players p
WHERE p.id = 1
  AND p.id NOT IN (
    SELECT player_id FROM player_contracts 
    WHERE LOWER(status) = 'active' AND season_id = (SELECT id FROM seasons WHERE is_active = true)
  );
```

## Rollback Instructions (If Needed)

If something goes wrong, you can rollback:

```sql
-- Remove the column
ALTER TABLE seasons DROP COLUMN IF EXISTS is_mid_season;

-- Restore from backup
psql -U your_username -d your_database_name < backup_before_migration_YYYYMMDD.sql
```

## Common Issues

### Issue 1: Column Already Exists
```
ERROR: column "is_mid_season" of relation "seasons" already exists
```
**Solution:** The migration is already applied. Skip to verification step.

### Issue 2: Permission Denied
```
ERROR: permission denied for table seasons
```
**Solution:** Ensure you're connected as a user with ALTER TABLE privileges.

### Issue 3: Table Not Found
```
ERROR: relation "seasons" does not exist
```
**Solution:** Verify you're connected to the correct database and the table exists.

## Post-Migration Checklist

- [ ] Migration script executed successfully
- [ ] `is_mid_season` column exists in seasons table
- [ ] Existing seasons have correct `is_mid_season` values
- [ ] Test season creation works
- [ ] Test contracts auto-release on season creation
- [ ] Verify free agents list updates correctly
- [ ] Check transaction logs for "contract_expiry" entries

## Support

If you encounter issues:
1. Check the error message carefully
2. Verify database connection
3. Ensure proper permissions
4. Review the backup before any destructive operations
