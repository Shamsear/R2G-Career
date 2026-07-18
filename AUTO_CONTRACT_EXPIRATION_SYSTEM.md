# Auto Contract Expiration System

## Overview
The system automatically releases players whose contracts have expired when a new season is created. No cron jobs or background tasks are required - the expiration logic runs during season creation.

## How It Works

### 1. Season Creation Triggers Auto-Release
When an admin creates a new season (e.g., Season 10.0 or Season 10.5), the system automatically:
- Identifies all active contracts from the previous season
- Compares each contract's `expire_season` with the new season number
- Releases contracts where `expire_season <= new_season_number`
- Marks those contracts as `inactive` in the database
- Makes those players available as free agents

### 2. Season Types
The system recognizes two types of seasons:

#### **Season Start** (e.g., 10.0, 11.0, 12.0)
- `is_mid_season = false`
- Releases contracts expiring at or before the season start (e.g., ≤ 10.0)
- Example: Contract expiring at "SEASON 10" or "9.5" will be released

#### **Mid-Season** (e.g., 10.5, 11.5, 12.5)
- `is_mid_season = true`
- Releases contracts expiring at or before mid-season (e.g., ≤ 10.5)
- Example: Contract expiring at "SEASON 10.5" or "10" will be released

### 3. Contract Carryover Logic
After auto-releasing expired contracts:
- Only **active, non-expired** contracts are carried over to the new season
- Query checks: `expire_season > new_season_number`
- Expired contracts are left behind (not copied to new season)

## Database Schema

### Seasons Table
```sql
seasons (
  id SERIAL PRIMARY KEY,
  season_number NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  is_mid_season BOOLEAN DEFAULT FALSE,  -- NEW FIELD
  has_rws BOOLEAN DEFAULT FALSE,
  rws_year INTEGER,
  start_bonus_rc INTEGER,
  start_bonus_rt INTEGER,
  start_bonus_voucher INTEGER,
  finale_bonus_rc INTEGER,
  finale_bonus_rt INTEGER,
  finale_bonus_voucher INTEGER
)
```

### Player Contracts Table
```sql
player_contracts (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  season_id INTEGER REFERENCES seasons(id),
  current_club_id INTEGER REFERENCES clubs(id),
  signed_value INTEGER,
  salary NUMERIC,
  start_season VARCHAR,      -- e.g., "7.5", "SEASON 8"
  expire_season VARCHAR,     -- e.g., "10.5", "SEASON 11"
  status VARCHAR             -- 'active' or 'inactive'
)
```

## Example Scenarios

### Scenario 1: Creating Season 10.0 (Season Start)
**Before:**
- Player A: Contract expires "SEASON 10" → Status: Active
- Player B: Contract expires "SEASON 9.5" → Status: Active
- Player C: Contract expires "SEASON 11" → Status: Active

**After Season 10.0 Creation:**
- Player A: Released (expire ≤ 10.0) → Status: Inactive → FREE AGENT ✅
- Player B: Released (expire ≤ 10.0) → Status: Inactive → FREE AGENT ✅
- Player C: Carried over → Status: Active → Still with club ✅

### Scenario 2: Creating Season 10.5 (Mid-Season)
**Before:**
- Player D: Contract expires "SEASON 10.5" → Status: Active
- Player E: Contract expires "SEASON 10" → Status: Active
- Player F: Contract expires "SEASON 11" → Status: Active

**After Season 10.5 Creation:**
- Player D: Released (expire ≤ 10.5) → Status: Inactive → FREE AGENT ✅
- Player E: Released (expire ≤ 10.5) → Status: Inactive → FREE AGENT ✅
- Player F: Carried over → Status: Active → Still with club ✅

## Transaction Logging
Each auto-released player generates a transaction log entry:
```typescript
{
  manager_id: club_id,
  season_id: old_season_id,
  currency_type: 'coin',
  amount: 0,
  transaction_type: 'contract_expiry',
  description: 'Auto-released [Player Name] - Contract expired at Season [X]'
}
```

## Admin Feedback
When creating a season, admins receive feedback:
```
✅ Created Season 10.0 successfully! | 🔓 Auto-released 12 expired contracts
```

The response includes:
```typescript
{
  success: true,
  season: { id, season_number, is_active, is_mid_season, ... },
  autoRelease: {
    count: 12,
    players: [
      { playerId, playerName, clubName, expireSeason },
      ...
    ]
  }
}
```

## Implementation Files

### Backend
- **`utils/solo/serverActions.ts`**
  - `createSoloSeason()`: Main function with auto-release logic
  - Auto-release happens at step 2.5 (after fetching old season, before creating new one)

### Database Migration
- **`migrations/add_is_mid_season_to_seasons.sql`**
  - Adds `is_mid_season` column to seasons table
  - Updates existing seasons based on their season_number

### Frontend
- **`app/(solo)/solo-tour/admin/seasons/page.tsx`**
  - Displays auto-release summary in success toast

## Key Benefits

✅ **No Cron Jobs Required** - Runs during season creation
✅ **Automatic & Transparent** - No manual intervention needed
✅ **Handles Both Season Start & Mid-Season** - Flexible timing
✅ **Transaction Logging** - Full audit trail of releases
✅ **Immediate Effect** - Players become free agents instantly
✅ **Admin Visibility** - Clear feedback on what was released

## Testing the System

### Test Case 1: Season Start Release
1. Create contracts expiring at "SEASON 10"
2. Create new season 10.0
3. Verify those contracts are marked inactive
4. Verify players appear in free agents list

### Test Case 2: Mid-Season Release
1. Create contracts expiring at "SEASON 10.5"
2. Create new season 10.5
3. Verify those contracts are marked inactive
4. Verify players appear in free agents list

### Test Case 3: No Expired Contracts
1. All contracts expire after season 11
2. Create new season 10.5
3. Verify no contracts are released
4. Verify all contracts are carried over

## Future Enhancements

- Add detailed release report page showing all released players
- Email notifications to managers when their players are released
- Option to manually trigger release preview before season creation
- Bulk contract extension feature before season transition
