# Knockout Tournament Integration Guide

## Overview
This guide explains how to integrate the knockout tournament system into the Solo Tour tournament detail page.

## Files Created

### 1. Database Schema
- **File**: `migrations/create_knockout_tables.sql`
- **Purpose**: Creates `knockout_rounds` and `knockout_pairings` tables
- **Run**: Execute this migration on your database

### 2. API Routes
- **File**: `app/api/solo/tournaments/[tournamentId]/knockout/route.ts`
- **Endpoints**:
  - `GET`: Fetch all knockout rounds
  - `POST`: Create new knockout round
  - `DELETE`: Delete all knockout rounds (reset bracket)

- **File**: `app/api/solo/tournaments/[tournamentId]/knockout/pairings/[pairingId]/route.ts`
- **Endpoints**:
  - `PATCH`: Update pairing (edit teams, set winner)
  - `DELETE`: Delete specific pairing

### 3. Server Actions
- **File**: `utils/solo/serverActions.ts` (appended)
- **Functions Added**:
  - `fetchKnockoutRounds(tournamentId)`
  - `createKnockoutRound(data)`
  - `updateKnockoutPairing(data)`
  - `deleteAllKnockoutRounds(tournamentId)`

### 4. UI Component
- **File**: `components/tournament/KnockoutManager.tsx`
- **Purpose**: Complete knockout management interface

## Integration Steps

### Step 1: Run the Migration

```bash
# Connect to your database and run:
psql -d your_database_url -f migrations/create_knockout_tables.sql
```

Or use your preferred database client to execute the SQL file.

### Step 2: Add Knockout Tab to Tournament Detail Page

Open `app/(solo)/solo-tour/admin/tournaments/[id]/page.tsx` and make the following changes:

#### A. Import the KnockoutManager component

At the top of the file, add:

```typescript
import KnockoutManager from "@/components/tournament/KnockoutManager";
import {
  // ... existing imports
  fetchKnockoutRounds  // Add this to the existing imports
} from "@/utils/solo/serverActions";
```

#### B. Add state for knockout rounds

In the component state section (around line 45), add:

```typescript
const [knockoutRounds, setKnockoutRounds] = useState<any[]>([]);
```

#### C. Update loadData function

Find the `loadData` function and add knockout rounds fetch:

```typescript
const loadData = async () => {
  setLoading(true);
  try {
    const [tourney, rules, matches, clubsData, types, tourneyClubs, standingsData, knockoutData] = await Promise.all([
      fetchTournamentById(tournamentId).catch(e => { console.error(e); return null; }),
      fetchFinancialRules().catch(e => { console.error(e); return []; }),
      fetchFixtures(tournamentId).catch(e => { console.error(e); return []; }),
      fetchRegisteredClubs(true).catch(e => { console.error(e); return []; }),
      fetchTournamentTypes().catch(e => { console.error(e); return []; }),
      fetchTournamentClubs(tournamentId).catch(e => { console.error(e); return []; }),
      fetchTournamentStandings(tournamentId).catch(e => { console.error(e); return []; }),
      fetchKnockoutRounds(tournamentId).catch(e => { console.error(e); return []; }) // Add this
    ]);
    
    // ... existing code ...
    setKnockoutRounds(knockoutData || []); // Add this
    
  } catch (e) {
    // ... existing error handling
  }
};
```

#### D. Add Knockout Tab Button

Find where the tab buttons are rendered (search for buttons with `onClick={() => setActiveTab(...)`), and add:

```typescript
{/* Check if tournament has knockout stage */}
{(tournament?.format_type?.includes('Knockout') || 
  tournament?.has_knockout_stage || 
  tournament?.is_pure_knockout) && (
  <button
    onClick={() => setActiveTab('knockout')}
    className={`portal-btn ${activeTab === 'knockout' ? 'btn-primary' : 'btn-secondary'}`}
    style={{ margin: '0 4px' }}
  >
    <i className="fa-solid fa-trophy" style={{ marginRight: '6px' }}></i>
    Knockout
  </button>
)}
```

#### E. Add Knockout Tab Content

Find where tab content is rendered (search for `{activeTab === 'overview'` or similar), and add:

```typescript
{/* Knockout Tab */}
{activeTab === 'knockout' && (
  <div className="admin-card">
    <KnockoutManager
      tournamentId={tournamentId}
      tournament={tournament}
      onSuccess={loadData}
    />
  </div>
)}
```

### Step 3: Update Tournament Format Types

Ensure your tournament format types include knockout options. In the tournament edit form, add these format types if not present:

```typescript
const formatTypes = [
  "League",
  "League Format",
  "Group Stage",
  "Knockout",
  "League + Knockout",
  "Group + Knockout",
  "Group Stage + Knockout"
];
```

## Usage

### Creating a Knockout Round

1. Navigate to a tournament with knockout stage enabled
2. Click the "Knockout" tab
3. Choose creation mode:
   - **Auto Qualification**: System creates placeholders that auto-resolve
   - **Manual Selection**: Manually select teams after group/league completes
4. Select round type (Quarter Finals, Semi Finals, Final, etc.)
5. Choose number of legs (Single or Two)
6. Enable "Create full bracket" to auto-generate all subsequent rounds
7. Click "Create Knockout Round"

### Auto Qualification Placeholder Examples

**For Group Stage + Knockout:**
- `Group A #1` - First place from Group A
- `Group B #2` - Second place from Group B
- `Group A Winner` - Winner of Group A

**For League + Playoff:**
- `League #1` - First place in league
- `League #4` - Fourth place in league

**For subsequent rounds:**
- `Winner of QUARTER_FINAL #1` - Winner of QF match #1
- `Winner of SEMI_FINAL #2` - Winner of SF match #2

### Placeholder Resolution

Placeholders automatically resolve to actual teams when:
1. Group/League stages complete and standings are finalized
2. Knockout matches complete and winners are determined
3. Manual updates are made via the pairing edit interface

## Database Schema Details

### knockout_rounds Table

```sql
- id: Unique round identifier (kr_xxx)
- tournament_id: Reference to tournaments table
- round_name: QUARTER_FINAL, SEMI_FINAL, FINAL, etc.
- round_order: Sequential order (0-5)
- legs: Number of legs (1 or 2)
- status: PENDING, IN_PROGRESS, COMPLETED
```

### knockout_pairings Table

```sql
- id: Unique pairing identifier (kp_xxx)
- knockout_round_id: Reference to knockout_rounds
- pairing_order: Order within round (1, 2, 3...)
- team1_id: Actual team 1 ID (null if placeholder)
- team2_id: Actual team 2 ID (null if placeholder)
- team1_placeholder: Placeholder text like "Group A #1"
- team2_placeholder: Placeholder text like "League #2"
- winner_id: ID of winning team
- leg1_match_id: Link to first leg match
- leg2_match_id: Link to second leg match
```

## API Endpoint Usage

### Create Knockout Round

```typescript
POST /api/solo/tournaments/[tournamentId]/knockout

Body:
{
  "roundName": "QUARTER_FINAL",
  "legs": 2,
  "teams": [],  // Empty for auto mode, team IDs for manual
  "mode": "auto",  // or "manual"
  "createFullBracket": true
}
```

### Get Knockout Rounds

```typescript
GET /api/solo/tournaments/[tournamentId]/knockout

Returns: Array of rounds with populated pairings and team data
```

### Update Pairing

```typescript
PATCH /api/solo/tournaments/[tournamentId]/knockout/pairings/[pairingId]

Body:
{
  "team1Id": "123",  // Optional
  "team2Id": "456",  // Optional
  "winnerId": "123"  // Optional
}
```

### Reset Bracket

```typescript
DELETE /api/solo/tournaments/[tournamentId]/knockout

Deletes all knockout rounds and pairings for the tournament
```

## Features Implemented

✅ Auto and Manual knockout creation modes  
✅ Placeholder-based qualification  
✅ Automatic placeholder resolution  
✅ Full bracket generation  
✅ Single and two-leg match support  
✅ Round status tracking  
✅ Winner progression to next rounds  
✅ Visual bracket display  
✅ Reset bracket functionality  
✅ Integration with existing tournament system  

## Future Enhancements

These features can be added later:

- 🔄 Manual pairing editor (drag-and-drop teams)
- 📊 Visual bracket tree view
- 🎯 Match scheduling from knockout pairings
- 📈 Automatic winner detection from match results
- 🏆 Third place playoff support
- 🔢 Seeding configuration
- 📱 Mobile-optimized bracket view
- 📧 Notifications when placeholders resolve

## Troubleshooting

### Issue: Knockout tab doesn't appear

**Solution**: Check that the tournament has `has_knockout_stage = true` or format_type includes "Knockout"

```sql
UPDATE tournaments 
SET has_knockout_stage = true 
WHERE id = 'your_tournament_id';
```

### Issue: Placeholders not resolving

**Solution**: Ensure group/league standings are calculated and match results are saved properly

### Issue: "Round already exists" error

**Solution**: Use the "Reset Bracket" button to clear existing rounds, or create a different round

### Issue: Cannot create manual round without teams

**Solution**: Complete the group/league stage first, or use auto mode instead

## Testing Checklist

- [ ] Run migration successfully
- [ ] Tournament detail page loads without errors
- [ ] Knockout tab appears for knockout tournaments
- [ ] Can create knockout round in auto mode
- [ ] Can create knockout round in manual mode (after league/group completes)
- [ ] Full bracket generation works
- [ ] Placeholders display correctly
- [ ] Can view existing knockout rounds
- [ ] Can reset bracket
- [ ] Server actions work without errors

## Support

For issues or questions:
1. Check the database migration ran successfully
2. Verify API routes are accessible
3. Check browser console for errors
4. Ensure tournament has knockout stage enabled
5. Review server logs for detailed error messages

## Complete Example

Here's a complete flow for a Group Stage + Knockout tournament:

1. **Create Tournament**
   - Format: "Group Stage + Knockout"
   - 4 Groups, 4 teams per group
   - 2 qualifiers per group

2. **Add Teams & Assign Groups**
   - Add 16 teams total
   - Assign 4 teams to each group (A, B, C, D)

3. **Generate Group Fixtures**
   - Create group stage matches
   - Play all group matches

4. **Create Knockout (Auto Mode)**
   - Go to Knockout tab
   - Select "Auto Qualification"
   - Choose "Quarter Finals" (8 teams)
   - Enable "Create Full Bracket"
   - System creates: QF (4 matches) → SF (2 matches) → Final (1 match)
   - Placeholders auto-populate from group standings

5. **View Bracket**
   - See all rounds with placeholders
   - Top 2 from each group automatically paired
   - Example: "Group A #1 vs Group B #2"

6. **Schedule Knockout Matches**
   - Create fixture records for each pairing
   - Link fixtures to pairings (leg1_match_id, leg2_match_id)

7. **Update Winners**
   - As matches complete, update pairing.winner_id
   - Winners automatically flow to next round

This completes the knockout tournament integration! 🎉
