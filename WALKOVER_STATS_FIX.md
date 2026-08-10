# Walkover Statistics Fix

## Problem
Walkover matches were incorrectly inflating goal statistics even though no actual football was played. The 3-0 scoreline is purely administrative for awarding points.

## Solution Applied
Updated two functions in `utils/solo/serverActions.ts` to exclude walkover goals from statistics:

### 1. `recalculateTournamentStandingsInTransaction()` (Lines ~2666-2700)
**Tournament Standings Table Updates:**

#### ✅ Always Counted:
- `matches_played` - Walkovers count as played matches
- `points` - Winner gets 3 points (from 3-0 result)

#### ❌ Excluded for Walkovers:
- `goals_scored` - NOT counted
- `goals_against` - NOT counted  
- `goal_difference` - NOT affected

### 2. `recalculateManagerSeasonStatsInTransaction()` (Lines ~2736-2780)
**Manager Season Stats Updates:**

#### ✅ Always Counted:
- `matches_played` - Walkovers count as matches
- `wins/draws/losses` - Winner gets W, loser gets L

#### ❌ Excluded for Walkovers:
- `goals_scored` - NOT counted
- `goals_conceded` - NOT counted
- `clean_sheets` - NOT counted

## Technical Implementation
```typescript
const isWalkover = f.match_status === 'wo_home' || f.match_status === 'wo_away';

// Only count goals for actual played matches
if (!isWalkover) {
  statsMap[home].gf += hs;
  statsMap[home].ga += as_;
}

// Always count points/wins regardless of walkover
if (hs > as_) statsMap[home].pts += 3;
```

## Impact
- **Tournament Standings**: Teams still get 3 points for walkover wins, but goal difference won't be artificially inflated
- **Manager Stats**: Win/loss record accurately reflects results, but goal stats only reflect actual gameplay
- **Fair Competition**: Prevents teams from benefiting statistically from opponent absences
- **Tiebreakers**: Goal difference now more accurately reflects actual performance when teams are level on points

## What Still Uses Walkover Scores
- ✅ **Financial Transactions**: Walkover win bonus and fine still apply
- ✅ **Points Calculation**: Winner still gets 3 points for standings
- ✅ **Win/Loss Record**: Still counts toward match record

## Testing Checklist
- [ ] Submit a walkover result (wo_home or wo_away)
- [ ] Verify tournament standings show correct points but 0 goals
- [ ] Verify manager season stats show W/L but no goals
- [ ] Verify financial transactions still apply correctly
- [ ] Verify non-walkover matches still count goals normally
- [ ] Check fixture history page shows walkover status clearly

## Date Applied
2026-08-10
