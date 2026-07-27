# Tournament Detail Page - Knockout Tab Integration Patch

This document shows the exact code changes needed to add the Knockout tab to the tournament detail page.

## File: `app/(solo)/solo-tour/admin/tournaments/[id]/page.tsx`

### Change 1: Add Import for KnockoutManager

Add this import at the top of the file with other component imports:

```typescript
import KnockoutManager from "@/components/tournament/KnockoutManager";
```

### Change 2: Update imports from serverActions

Update the existing import statement to include `fetchKnockoutRounds`:

```typescript
import {
  fetchTournamentById,
  fetchFinancialRules,
  fetchFixtures,
  fetchRegisteredClubs,
  createFixture,
  updateFixture,
  deleteFixture,
  fetchTournamentTypes,
  updateTournamentDetails,
  fetchTournamentClubs,
  addClubToTournament,
  addMultipleClubsToTournament,
  removeClubFromTournament,
  assignClubToGroup,
  autoAssignGroups,
  clearAllGroups,
  autoGenerateFixtures,
  fetchTournamentStandings,
  recalculateTournamentStandings,
  fetchKnockoutRounds  // ADD THIS LINE
} from "@/utils/solo/serverActions";
```

### Change 3: Add State Variable

Add this line with the other useState declarations (around line 45):

```typescript
const [knockoutRounds, setKnockoutRounds] = useState<any[]>([]);
```

### Change 4: Update loadData Function

Find the `loadData` function and modify it. Look for this line:

```typescript
const [tourney, rules, matches, clubsData, types, tourneyClubs, standingsData] = await Promise.all([
```

Change it to:

```typescript
const [tourney, rules, matches, clubsData, types, tourneyClubs, standingsData, knockoutData] = await Promise.all([
```

Then add `fetchKnockoutRounds` to the Promise.all array:

```typescript
fetchTournamentStandings(tournamentId).catch(e => { console.error(e); return []; }),
fetchKnockoutRounds(tournamentId).catch(e => { console.error(e); return []; })  // ADD THIS LINE
```

And add this line after setting all the other state:

```typescript
setStandings(standingsData || []);
setKnockoutRounds(knockoutData || []);  // ADD THIS LINE
```

### Change 5: Add Knockout Tab Button

Find where the tab navigation buttons are rendered. This is typically in the JSX return section where you see buttons like "Overview", "Fixtures", "Standings", etc.

Add this button among the other tab buttons:

```typescript
{/* Knockout Tab - Only show if tournament has knockout stage */}
{(tournament?.format_type?.includes('Knockout') || 
  tournament?.has_knockout_stage || 
  tournament?.is_pure_knockout) && (
  <button
    onClick={() => setActiveTab('knockout')}
    className={`portal-btn ${activeTab === 'knockout' ? 'btn-primary' : 'btn-secondary'}`}
    style={{ 
      margin: '0 4px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px'
    }}
    disabled={isPending}
  >
    <i className="fa-solid fa-trophy"></i>
    <span>Knockout</span>
  </button>
)}
```

### Change 6: Add Knockout Tab Content

Find where the tab content is rendered (where you see things like `{activeTab === 'overview' && (...)}`).

Add this section among the other tab content sections:

```typescript
{/* Knockout Tab Content */}
{activeTab === 'knockout' && (
  <div className="admin-card" style={{ 
    padding: '24px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    marginTop: '16px'
  }}>
    <KnockoutManager
      tournamentId={tournamentId}
      tournament={tournament}
      onSuccess={loadData}
    />
  </div>
)}
```

## Complete Code Snippets

### Typical Tab Button Section Pattern

If your tab buttons look like this:

```typescript
<div className="tab-buttons">
  <button onClick={() => setActiveTab('overview')}>Overview</button>
  <button onClick={() => setActiveTab('fixtures')}>Fixtures</button>
  <button onClick={() => setActiveTab('standings')}>Standings</button>
  <button onClick={() => setActiveTab('stats')}>Stats</button>
</div>
```

Add the knockout button:

```typescript
<div className="tab-buttons">
  <button onClick={() => setActiveTab('overview')}>Overview</button>
  <button onClick={() => setActiveTab('fixtures')}>Fixtures</button>
  <button onClick={() => setActiveTab('standings')}>Standings</button>
  <button onClick={() => setActiveTab('stats')}>Stats</button>
  
  {/* ADD THIS SECTION */}
  {(tournament?.format_type?.includes('Knockout') || 
    tournament?.has_knockout_stage) && (
    <button onClick={() => setActiveTab('knockout')}>
      <i className="fa-solid fa-trophy"></i> Knockout
    </button>
  )}
</div>
```

### Typical Tab Content Section Pattern

If your tab content looks like this:

```typescript
{activeTab === 'overview' && <OverviewContent />}
{activeTab === 'fixtures' && <FixturesContent />}
{activeTab === 'standings' && <StandingsContent />}
{activeTab === 'stats' && <StatsContent />}
```

Add the knockout content:

```typescript
{activeTab === 'overview' && <OverviewContent />}
{activeTab === 'fixtures' && <FixturesContent />}
{activeTab === 'standings' && <StandingsContent />}
{activeTab === 'stats' && <StatsContent />}

{/* ADD THIS SECTION */}
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

## Alternative: If Using a Tab Configuration Array

If your page uses a tab configuration array pattern like:

```typescript
const tabs = [
  { id: 'overview', label: 'Overview', icon: 'fa-info-circle' },
  { id: 'fixtures', label: 'Fixtures', icon: 'fa-calendar' },
  // ... more tabs
];
```

Add the knockout tab conditionally:

```typescript
const tabs = [
  { id: 'overview', label: 'Overview', icon: 'fa-info-circle' },
  { id: 'fixtures', label: 'Fixtures', icon: 'fa-calendar' },
  { id: 'standings', label: 'Standings', icon: 'fa-table' },
  { id: 'stats', label: 'Stats', icon: 'fa-chart-bar' },
  // Add knockout tab conditionally
  ...(tournament?.format_type?.includes('Knockout') || tournament?.has_knockout_stage 
    ? [{ id: 'knockout', label: 'Knockout', icon: 'fa-trophy' }] 
    : [])
];
```

And in your render function:

```typescript
{tabs.map(tab => (
  <button
    key={tab.id}
    onClick={() => setActiveTab(tab.id)}
    className={activeTab === tab.id ? 'active' : ''}
  >
    <i className={`fa-solid ${tab.icon}`}></i>
    {tab.label}
  </button>
))}

{/* Content rendering */}
{activeTab === 'knockout' && (
  <KnockoutManager
    tournamentId={tournamentId}
    tournament={tournament}
    onSuccess={loadData}
  />
)}
```

## Verification Steps

After making these changes:

1. **Check Imports**: No import errors should appear
2. **Check State**: `knockoutRounds` state variable exists
3. **Check Data Loading**: `fetchKnockoutRounds` is called in loadData
4. **Check Tab Button**: Knockout tab button appears for tournaments with knockout stage
5. **Check Tab Content**: Clicking knockout tab shows the KnockoutManager component
6. **Test Functionality**: Create a test knockout round

## Testing

To test the integration:

1. Navigate to a tournament with `format_type` containing "Knockout"
2. You should see the "Knockout" tab button
3. Click the tab - the KnockoutManager component should load
4. Try creating a knockout round in auto mode
5. Verify the round appears in the list
6. Test the reset bracket button

## Styling Tips

If the knockout tab content doesn't match your existing styling, you can adjust the wrapper div:

```typescript
{activeTab === 'knockout' && (
  <div 
    className="admin-card"  // or your existing card class
    style={{ 
      padding: '24px',
      background: 'var(--card-background)',  // use your CSS variables
      borderRadius: '12px',
      marginTop: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}
  >
    <KnockoutManager
      tournamentId={tournamentId}
      tournament={tournament}
      onSuccess={loadData}
    />
  </div>
)}
```

## Common Issues

### Issue: "fetchKnockoutRounds is not a function"
**Solution**: Make sure you've added the server actions to `utils/solo/serverActions.ts`

### Issue: Tab button doesn't appear
**Solution**: Check that `tournament.format_type` includes "Knockout" or `has_knockout_stage` is true

### Issue: Component renders but shows error
**Solution**: Check browser console for specific error. Ensure the migration has been run.

### Issue: Styling looks off
**Solution**: Adjust the wrapper div styles to match your existing admin cards

## Success Criteria

✅ Import KnockoutManager component without errors  
✅ fetchKnockoutRounds imported from serverActions  
✅ knockoutRounds state variable added  
✅ Knockout data loaded in loadData function  
✅ Knockout tab button appears conditionally  
✅ Knockout tab content renders KnockoutManager  
✅ Can create knockout rounds  
✅ Can view existing rounds  
✅ Can reset bracket  

Once all these are working, your integration is complete! 🎉
