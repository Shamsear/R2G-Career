# Running the Knockout Tournament Migration

This guide shows you how to run the knockout tournament database migration.

## Migration File
`migrations/create_knockout_tables.sql`

## Option 1: Using psql Command Line

If you have direct database access via psql:

```bash
# Connect and run the migration
psql -h your-host -U your-user -d your-database -f migrations/create_knockout_tables.sql

# Or if using environment variable for connection string
psql $SOLO_DATABASE_URL -f migrations/create_knockout_tables.sql
```

## Option 2: Using Database GUI Client

### Using pgAdmin:
1. Open pgAdmin and connect to your database
2. Right-click on your database → Query Tool
3. Open the file `migrations/create_knockout_tables.sql`
4. Click Execute (F5)

### Using DBeaver:
1. Connect to your database
2. Create new SQL script (SQL Editor)
3. Copy contents of `migrations/create_knockout_tables.sql`
4. Paste and Execute (Ctrl+Enter)

### Using TablePlus:
1. Connect to your database
2. Click "SQL" button or press Cmd+T (Mac) / Ctrl+T (Windows)
3. Paste the migration SQL
4. Press Cmd+Enter (Mac) / Ctrl+Enter (Windows)

### Using Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Paste the contents of `migrations/create_knockout_tables.sql`
5. Click "Run"

## Option 3: Using Node.js Script

Create a file `scripts/run-knockout-migration.js`:

```javascript
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.SOLO_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Running knockout tournament migration...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, '..', 'migrations', 'create_knockout_tables.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ Tables created: knockout_rounds, knockout_pairings');
    console.log('✅ Functions created: get_round_teams_count, get_round_pairings_count, get_next_round_name');
    console.log('✅ Triggers created: trg_update_knockout_status');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
```

Then run:
```bash
node scripts/run-knockout-migration.js
```

## Option 4: Using Next.js API Route (Development Only)

⚠️ **WARNING**: Only use this in development! Never expose database migrations via API in production.

Create `app/api/admin/run-migration/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  // Add authentication check here
  const { password } = await request.json();
  
  if (password !== process.env.ADMIN_MIGRATION_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pool = new Pool({
    connectionString: process.env.SOLO_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const sql = fs.readFileSync(
      path.join(process.cwd(), 'migrations', 'create_knockout_tables.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Migration completed successfully' 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}
```

Then call it:
```bash
curl -X POST http://localhost:3000/api/admin/run-migration \
  -H "Content-Type: application/json" \
  -d '{"password":"your-secret-password"}'
```

## Verification

After running the migration, verify it worked:

### Check Tables Exist

```sql
-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('knockout_rounds', 'knockout_pairings');

-- Should return 2 rows
```

### Check Table Structure

```sql
-- Check knockout_rounds columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'knockout_rounds'
ORDER BY ordinal_position;

-- Check knockout_pairings columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'knockout_pairings'
ORDER BY ordinal_position;
```

### Check Functions

```sql
-- Check if helper functions were created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%knockout%' OR routine_name LIKE '%round%';

-- Should show: get_round_teams_count, get_round_pairings_count, etc.
```

### Check Triggers

```sql
-- Check if triggers were created
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%knockout%';

-- Should show: trg_update_knockout_status
```

### Test a Query

```sql
-- Try selecting from the new tables (should return empty results but no error)
SELECT * FROM knockout_rounds;
SELECT * FROM knockout_pairings;

-- Should return 0 rows (no data yet)
```

## Rollback (If Needed)

If you need to undo the migration:

```sql
-- Drop tables (cascades to all related data)
DROP TABLE IF EXISTS knockout_pairings CASCADE;
DROP TABLE IF EXISTS knockout_rounds CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_round_teams_count(TEXT);
DROP FUNCTION IF EXISTS get_round_pairings_count(TEXT);
DROP FUNCTION IF EXISTS get_next_round_name(TEXT);
DROP FUNCTION IF EXISTS update_knockout_round_status();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Remove columns from tournaments table
ALTER TABLE tournaments DROP COLUMN IF EXISTS knockout_config;
ALTER TABLE tournaments DROP COLUMN IF EXISTS group_qualifiers;
ALTER TABLE tournaments DROP COLUMN IF EXISTS knockout_legs;
```

## Troubleshooting

### Error: "relation already exists"

The tables already exist. Either:
- Skip the migration (already done)
- Drop existing tables first and re-run
- Check if the existing structure matches what you need

### Error: "permission denied"

Your database user doesn't have CREATE TABLE permissions. Either:
- Use a superuser account
- Grant necessary permissions:
  ```sql
  GRANT CREATE ON SCHEMA public TO your_user;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
  ```

### Error: "function already exists"

Functions with these names already exist. Either:
- Use `CREATE OR REPLACE FUNCTION` (already in migration)
- Drop existing functions first
- Check if existing functions do what you need

### Error: "column already exists"

The `tournaments` table already has these columns. This is fine! The migration uses `ADD COLUMN IF NOT EXISTS`, so it's safe to run multiple times.

## Next Steps

After successful migration:

1. ✅ Verify all tables and functions created
2. ✅ Test a simple insert (optional):
   ```sql
   -- This will fail if schema is wrong
   INSERT INTO knockout_rounds (tournament_id, round_name, round_order, legs)
   VALUES ('test_tournament', 'QUARTER_FINAL', 2, 2);
   
   -- Clean up test data
   DELETE FROM knockout_rounds WHERE tournament_id = 'test_tournament';
   ```
3. ✅ Proceed to integrate the knockout tab (see `TOURNAMENT_PAGE_KNOCKOUT_PATCH.md`)
4. ✅ Test the full knockout creation flow

## Common Database Connection Strings

### Supabase
```
postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### Neon
```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

### Local PostgreSQL
```
postgresql://localhost:5432/your_database
```

### Heroku
```
postgres://[user]:[password]@[host]:5432/[database]
```

## Need Help?

If you encounter issues:

1. Check your database connection string is correct
2. Verify you have necessary permissions
3. Look at the specific error message
4. Try running each CREATE statement separately to isolate the problem
5. Check existing tables don't conflict: `\dt` in psql

## Success!

If you see no errors and the verification queries return results, your migration is complete! 🎉

You can now proceed with integrating the knockout tab into your tournament page.
