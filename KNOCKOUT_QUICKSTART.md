# Knockout Tournament Quick Start

## What's Been Created

A complete knockout tournament management system with:

✅ **Database Schema**
- `knockout_rounds` - Stores round definitions (QF, SF, Final, etc.)
- `knockout_pairings` - Stores team matchups with placeholder support
- Automatic timestamp triggers and indexes

✅ **Backend Services**
- `KnockoutService` - Core knockout logic
- Auto-qualification with intelligent placeholders
- Manual team selection with flexible pairing
- Full bracket generation

✅ **API Endpoints**
- `POST /api/tournaments/[id]/knockout` - Create knockout rounds
- `GET /api/tournaments/[id]/knockout` - Get bracket data
- `PATCH /api/tournaments/[id]/knockout/pairings/[pairingId]` - Update pairings
- `DELETE /api/tournaments/[id]/knockout` - Reset bracket

✅ **Features**
- Auto vs Manual qualification modes
- Multiple tournament formats (GROUP_KNOCKOUT, LEAGUE_PLAYOFF, etc.)
- Placeholder auto-resolution
- Full bracket generation
- 1-leg or 2-leg configuration per round

---

## Installation (5 minutes)

### Step 1: Run Database Migration

```bash
node run-knockout-structure-migration.js
```

This creates all necessary tables and columns.

### Step 2: Verify Installation

```sql
-- Check tables exist
SELECT * FROM knockout_rounds LIMIT 1;
SELECT * FROM knockout_pairings LIMIT 1;

-- Check tournament columns added
SELECT knockout_config, tournament_format FROM tournaments LIMIT 1;
```

---

## Usage Examples

### Example 1: Auto-Qualification (Recommended)

**Perfect for**: World Cup style, Champions League, tournaments with group stages

```typescript
// Create knockout rounds with automatic placeholder generation
const response = await fetch(`/api/tournaments/${tournamentId}/knockout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roundName: 'QUARTER_FINAL',
    legs: 2,
    mode: 'AUTO',
    createFullBracket: true  // Also creates SF and Final
  })
});

const { round } = await response.json();
console.log(round.pairings);
// [
//   { team1Placeholder: "Group A #1", team2Placeholder: "Group B #2" },
//   { team1Placeholder: "Group C #1", team2Placeholder: "Group D #2" },
//   ...
// ]
```

**Result**: System creates QF, SF, and Final with intelligent placeholders that auto-resolve when matches complete.

---

### Example 2: Manual Selection

**Perfect for**: FA Cup, custom draws, invitational tournaments

```typescript
// Get qualified teams first
const teams = await getQualifiedTeams(tournamentId);

// Create knockout round with manual team selection
const response = await fetch(`/api/tournaments/${tournamentId}/knockout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roundName: 'SEMI_FINAL',
    legs: 1,
    mode: 'MANUAL',
    teams: [
      { id: 'team1', name: 'Manchester United', seed: 1 },
      { id: 'team2', name: 'Liverpool', seed: 2 },
      { id: 'team3', name: 'Chelsea', seed: 3 },
      { id: 'team4', name: 'Arsenal', seed: 4 }
    ],
    pairingMethod: 'AUTO_SEED',  // 1v4, 2v3
    createFullBracket: true
  })
});
```

**Result**: Creates bracket with actual teams, standard seeding (1v4, 2v3).

---

### Example 3: Get Bracket Data

```typescript
// Fetch all knockout rounds
const response = await fetch(`/api/tournaments/${tournamentId}/knockout`);
const { rounds } = await response.json();

// Display bracket
rounds.forEach(round => {
  console.log(`\n${round.roundName} - ${round.legs} leg(s)`);
  round.pairings.forEach(pairing => {
    const team1 = pairing.team1Id || pairing.team1Placeholder;
    const team2 = pairing.team2Id || pairing.team2Placeholder;
    console.log(`  Match ${pairing.pairingNumber}: ${team1} vs ${team2}`);
  });
});
```

---

## Tournament Format Setup

Before creating knockout rounds, set the tournament format:

```sql
-- World Cup Style (Groups + Knockout)
UPDATE tournaments 
SET 
  tournament_format = 'GROUP_KNOCKOUT',
  has_knockout_stage = true,
  num_groups = 4,
  qualified_per_group = 2
WHERE id = 'your_tournament_id';

-- NBA Playoff Style (League + Playoff)
UPDATE tournaments 
SET 
  tournament_format = 'LEAGUE_PLAYOFF',
  has_knockout_stage = true,
  knockout_config = '{"defaultLegs": 2}'::jsonb
WHERE id = 'your_tournament_id';

-- Pure Knockout (FA Cup Style)
UPDATE tournaments 
SET 
  tournament_format = 'KNOCKOUT_ONLY',
  is_pure_knockout = true
WHERE id = 'your_tournament_id';
```

---

## Common Operations

### Reset Bracket (Start Over)

```typescript
await fetch(`/api/tournaments/${tournamentId}/knockout`, {
  method: 'DELETE'
});
```

### Update a Pairing Manually

```typescript
await fetch(`/api/tournaments/${tournamentId}/knockout/pairings/${pairingId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    team1Id: 'new_team_id_1',
    team2Id: 'new_team_id_2'
  })
});
```

### Check Bracket Status

```typescript
const response = await fetch(`/api/tournaments/${tournamentId}/knockout`);
const { rounds } = await response.json();

rounds.forEach(round => {
  const resolved = round.pairings.filter(p => p.team1Id && p.team2Id).length;
  const total = round.pairings.length;
  console.log(`${round.roundName}: ${resolved}/${total} pairings resolved`);
});
```

---

## Pairing Methods

### AUTO_SEED (Default)
Standard tournament seeding: 1v8, 2v7, 3v6, 4v5

```typescript
pairingMethod: 'AUTO_SEED'
```

### CONSECUTIVE
Sequential pairing: 1v2, 3v4, 5v6, 7v8

```typescript
pairingMethod: 'CONSECUTIVE'
```

### CUSTOM
Define each matchup individually

```typescript
pairingMethod: 'CUSTOM',
customPairings: [
  { team1Id: 'team_a', team2Id: 'team_c' },
  { team1Id: 'team_b', team2Id: 'team_d' }
]
```

---

## Round Names

| Round Name | Team Count | Description |
|------------|-----------|-------------|
| `ROUND_OF_32` | 32 | Round of 32 |
| `ROUND_OF_16` | 16 | Round of 16 |
| `QUARTER_FINAL` | 8 | Quarter Finals |
| `SEMI_FINAL` | 4 | Semi Finals |
| `THIRD_PLACE` | 2 | Third Place Playoff |
| `FINAL` | 2 | Final |

---

## Auto-Resolution

Placeholders automatically resolve when:

1. **Group stage completes** → Group positions finalize
2. **League stage completes** → League standings finalize  
3. **Knockout match completes** → Winner progresses

### Example Placeholders

```
Group-based:
- "Group A #1", "Group B #2", "Group C Winner"

League-based:
- "League #1", "League #4", "League #8"

Winner-based:
- "Winner of QF1", "Winner of SF2"

Loser-based:
- "Loser of SF1" (for third-place playoff)
```

---

## Full Bracket Generation

When `createFullBracket: true`:

1. Creates specified starting round
2. Auto-generates all subsequent rounds
3. Links rounds with winner placeholders
4. Finals are always 1 leg (regardless of config)

**Example**: Creating QF with full bracket:
```
Quarter Finals → Semi Finals → Final
```

All rounds use same leg config except Final (always 1 leg).

---

## Frontend Integration

### Basic Bracket Display

```tsx
function Bracket({ tournamentId }) {
  const [rounds, setRounds] = useState([]);

  useEffect(() => {
    fetch(`/api/tournaments/${tournamentId}/knockout`)
      .then(res => res.json())
      .then(data => setRounds(data.rounds));
  }, [tournamentId]);

  return (
    <div className="bracket">
      {rounds.map(round => (
        <div key={round.id} className="round">
          <h3>{round.roundName}</h3>
          {round.pairings.map(p => (
            <Matchup key={p.id} pairing={p} />
          ))}
        </div>
      ))}
    </div>
  );
}
```

---

## Testing Your Implementation

### 1. Create Auto-Qualification Bracket

```bash
curl -X POST http://localhost:3000/api/tournaments/TOUR123/knockout \
  -H "Content-Type: application/json" \
  -d '{
    "roundName": "QUARTER_FINAL",
    "legs": 2,
    "mode": "AUTO",
    "createFullBracket": true
  }'
```

### 2. Verify Creation

```bash
curl http://localhost:3000/api/tournaments/TOUR123/knockout
```

### 3. Update a Pairing

```bash
curl -X PATCH http://localhost:3000/api/tournaments/TOUR123/knockout/pairings/kp_abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "team1Id": "team_xyz",
    "team2Id": "team_abc"
  }'
```

### 4. Reset Bracket

```bash
curl -X DELETE http://localhost:3000/api/tournaments/TOUR123/knockout
```

---

## Troubleshooting

### Issue: "Knockout round already exists"
**Fix**: Delete existing round first or use different round name

### Issue: "Manual mode requires exactly X teams"
**Fix**: Count your teams array - must match round requirements

### Issue: Placeholders not resolving
**Fix**: Check `tournament_format` is set correctly in tournaments table

### Issue: Database connection error
**Fix**: Verify `NEON_DB_URL` or `DATABASE_URL` in `.env.local`

---

## Next Steps

1. ✅ Run migration: `node run-knockout-structure-migration.js`
2. ✅ Set tournament format in your tournaments table
3. ✅ Test bracket creation with sample tournament
4. ✅ Build bracket visualization UI
5. ✅ Integrate with match scheduling
6. ✅ Add winner resolution after matches complete

---

## Complete Example Flow

```typescript
// 1. Setup tournament
await sql`
  UPDATE tournaments 
  SET 
    tournament_format = 'GROUP_KNOCKOUT',
    has_knockout_stage = true,
    num_groups = 4,
    qualified_per_group = 2
  WHERE id = ${tournamentId}
`;

// 2. Create knockout rounds (after group stage)
const createResponse = await fetch(`/api/tournaments/${tournamentId}/knockout`, {
  method: 'POST',
  body: JSON.stringify({
    roundName: 'QUARTER_FINAL',
    legs: 2,
    mode: 'AUTO',
    createFullBracket: true
  })
});

// 3. Placeholders auto-resolve as matches complete
// System automatically populates team IDs when group stage finishes

// 4. View bracket
const viewResponse = await fetch(`/api/tournaments/${tournamentId}/knockout`);
const { rounds } = await viewResponse.json();

// 5. Display to users
rounds.forEach(round => {
  console.log(`${round.roundName}: ${round.pairings.length} matches`);
});
```

---

## Support Files

- **Full Guide**: `KNOCKOUT_IMPLEMENTATION_GUIDE.md`
- **Database Schema**: `migrations/create_knockout_structure.sql`
- **Type Definitions**: `lib/knockout/types.ts`
- **Service Layer**: `lib/knockout/knockout-service.ts`
- **API Routes**: `app/api/tournaments/[id]/knockout/route.ts`

---

**You're all set!** Start by running the migration, then test with a sample tournament. The system handles all the complexity of placeholder management and bracket generation automatically.
