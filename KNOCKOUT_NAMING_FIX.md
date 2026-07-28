# Knockout Tournament Naming Convention Fix ✅

## Summary
Fixed the knockout tournament system to use consistent naming conventions across all tournament types (Solo, RWS, Special), respecting custom team names, manager names, and club names based on tournament type.

## Problem
The knockout system was not consistently applying the naming logic used throughout the rest of the application:
- **Solo tournaments**: Should show club names (or custom names if set)
- **RWS tournaments**: Should show manager names (or custom names if set)
- **Special tournaments**: Should show manager names (or custom names if set)

## Solution

### Backend Changes (`utils/solo/serverActions.ts`)

Updated **4 functions** to include RWS in the naming logic:

#### 1. `fetchTournamentStandings` (Line ~1050)
```typescript
// BEFORE
const isSpecial = r.tournament_type === 'special';
const defaultName = isSpecial ? (r.manager || "Unknown") : (r.club_name || r.manager);
const defaultLogo = isSpecial ? (r.manager_avatar || r.club_logo) : r.club_logo;

// AFTER
const isSpecialOrRws = r.tournament_type === 'special' || r.tournament_type === 'rws';
const defaultName = isSpecialOrRws ? (r.manager || "Unknown") : (r.club_name || r.manager);
const defaultLogo = isSpecialOrRws ? (r.manager_avatar || r.club_logo) : r.club_logo;
```

#### 2. `fetchFixtures` (Line ~842)
```typescript
// BEFORE
const isSpecial = r.tournament_type === 'special';
const homeDefaultName = isSpecial ? (r.home_manager || "Unknown") : (r.home_club_name || r.home_manager);

// AFTER
const isSpecialOrRws = r.tournament_type === 'special' || r.tournament_type === 'rws';
const homeDefaultName = isSpecialOrRws ? (r.home_manager || "Unknown") : (r.home_club_name || r.home_manager);
```

#### 3. `fetchFixtureById` (Line ~907)
```typescript
// BEFORE
const isSpecial = r.tournament_type === 'special';

// AFTER
const isSpecialOrRws = r.tournament_type === 'special' || r.tournament_type === 'rws';
```

#### 4. `fetchKnockoutMatches` (Line ~979)
```typescript
// BEFORE
const isSpecial = r.tournament_type === 'special';

// AFTER
const isSpecialOrRws = r.tournament_type === 'special' || r.tournament_type === 'rws';
```

#### 5. `fetchTournamentClubs` (Line ~3807)
```typescript
// BEFORE
const isSpecial = r.tournament_type === 'special';
use_existing_club: isSpecial ? false : (r.use_existing_club ?? true)

// AFTER
const isSpecialOrRws = r.tournament_type === 'special' || r.tournament_type === 'rws';
use_existing_club: isSpecialOrRws ? false : (r.use_existing_club ?? true)
```

### Frontend Changes (`app/(solo)/solo-tour/admin/tournaments/[id]/page.tsx`)

#### 1. Updated `generateKnockoutPreview` Function (Line ~939)
```typescript
// BEFORE
team1: team1Data ? (tournament?.tournament_type === 'special' ? (team1Data.manager || team1Data.club_name) : team1Data.club_name) : null

// AFTER
team1: team1Data?.club_name || null
```

**Why**: The `club_name` field from `fetchTournamentStandings` already contains the correct name based on tournament type and custom settings.

#### 2. Removed Redundant Logic from Manual Selection Dropdowns
The dropdowns now use `team.club_name` directly, which already contains the correct value.

#### 3. Fixed JSX Syntax Error
Removed orphaned JSX lines that were causing a build error.

## Naming Priority Logic

The backend now applies this priority for ALL tournament types:

1. **Custom Name** (if admin sets `custom_team_name` and `use_existing_club = false`)
2. **Tournament Type Based**:
   - **Solo**: Club name → Manager name (fallback)
   - **RWS**: Manager name → Club name (fallback)
   - **Special**: Manager name → "Unknown" (fallback)

## Data Flow

```
Database (tournament_teams table)
  ↓
  custom_team_name? → Use custom name
  ↓
  tournament_type = 'rws' OR 'special'? → Use manager name
  ↓
  tournament_type = 'solo'? → Use club name
  ↓
Backend (serverActions.ts)
  ↓
  Returns data with correct name in `club_name` field
  ↓
Frontend (page.tsx)
  ↓
  Uses `club_name` directly (no additional logic needed)
  ↓
Display
```

## Testing Checklist

### Solo Tournaments
- [ ] Default: Shows club names
- [ ] Custom: Shows custom team names when set
- [ ] Knockout manual selection shows correct names
- [ ] Knockout preview shows correct names
- [ ] Fixtures tab shows correct names

### RWS Tournaments
- [ ] Default: Shows manager names
- [ ] Custom: Shows custom team names when set (e.g., country names)
- [ ] Knockout manual selection shows manager/custom names
- [ ] Knockout preview shows manager/custom names
- [ ] Fixtures tab shows manager/custom names

### Special Tournaments
- [ ] Default: Shows manager names
- [ ] Custom: Shows custom team names when set
- [ ] Knockout manual selection shows manager/custom names
- [ ] Knockout preview shows manager/custom names
- [ ] Fixtures tab shows manager/custom names

## Files Modified

1. ✅ `utils/solo/serverActions.ts`
   - Updated 5 functions to include RWS in naming logic
   - All fixture/match/standings queries now consistent

2. ✅ `app/(solo)/solo-tour/admin/tournaments/[id]/page.tsx`
   - Simplified `generateKnockoutPreview` to use `club_name` directly
   - Fixed JSX syntax error

## Benefits

1. **Consistency**: All parts of the app now use the same naming logic
2. **Maintainability**: One source of truth (backend) for name resolution
3. **Custom Names**: Properly respected across all tournament types
4. **RWS Support**: Now correctly shows manager names for World Series tournaments
5. **Simplicity**: Frontend doesn't need to know about tournament type logic

## Related Documentation

- `KNOCKOUT_MANUAL_MODE_COMPLETE.md` - Manual team selection feature
- `KNOCKOUT_IMPLEMENTATION_PLAN.md` - Overall knockout system design
- `KNOCKOUT_API_DOCUMENTATION.md` - API endpoints for knockout management

## Notes

- The `club_name` field is a "display name" that contains the correct value regardless of source
- Actual database columns (`managers.name`, `clubs.name`, `tournament_teams.custom_team_name`) remain unchanged
- Logo paths follow the same priority logic (`club_logo` field contains the correct logo URL)
