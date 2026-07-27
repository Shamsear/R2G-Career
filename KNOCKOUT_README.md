# ⚽ Knockout Tournament System

A complete, production-ready knockout tournament management system with automatic qualification, manual selection, and intelligent bracket generation.

## 🎯 Features

- ✅ **Auto-Qualification Mode** - Intelligent placeholders that auto-resolve
- ✅ **Manual Selection Mode** - Full control over team selection and pairing
- ✅ **Multiple Tournament Formats** - World Cup, NBA Playoffs, FA Cup, and more
- ✅ **Full Bracket Generation** - Create entire bracket structure at once
- ✅ **Flexible Configuration** - 1-leg or 2-leg per round
- ✅ **Smart Pairing** - Auto-seed, consecutive, or custom matchups
- ✅ **Automatic Resolution** - Teams populate as stages complete
- ✅ **Type-Safe** - Complete TypeScript implementation
- ✅ **RESTful API** - Clean API endpoints for all operations

## 📁 Project Structure

```
├── migrations/
│   └── create_knockout_structure.sql        # Database schema
├── lib/knockout/
│   ├── types.ts                              # Type definitions
│   ├── auto-pairing.ts                       # Placeholder generation
│   ├── knockout-service.ts                   # Core service
│   └── index.ts                              # Exports
├── app/api/tournaments/[id]/knockout/
│   ├── route.ts                              # Main CRUD endpoints
│   └── pairings/[pairingId]/route.ts        # Pairing updates
├── run-knockout-structure-migration.js       # Migration runner
├── KNOCKOUT_QUICKSTART.md                    # Quick start guide
├── KNOCKOUT_IMPLEMENTATION_GUIDE.md          # Full documentation
└── KNOCKOUT_SUMMARY.md                       # Implementation summary
```

## 🚀 Quick Start

### 1. Install

```bash
# Run database migration
node run-knockout-structure-migration.js
```

### 2. Configure Tournament

```sql
UPDATE tournaments 
SET 
  tournament_format = 'GROUP_KNOCKOUT',
  has_knockout_stage = true,
  num_groups = 4,
  qualified_per_group = 2
WHERE id = 'your_tournament_id';
```

### 3. Create Knockout Rounds

```typescript
// Auto-qualification mode
const response = await fetch('/api/tournaments/TOUR123/knockout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roundName: 'QUARTER_FINAL',
    legs: 2,
    mode: 'AUTO',
    createFullBracket: true
  })
});
```

### 4. View Bracket

```typescript
const response = await fetch('/api/tournaments/TOUR123/knockout');
const { rounds } = await response.json();
```

## 📖 Documentation

| Document | Description |
|----------|-------------|
| **[Quick Start Guide](KNOCKOUT_QUICKSTART.md)** | Get up and running in 5 minutes |
| **[Implementation Guide](KNOCKOUT_IMPLEMENTATION_GUIDE.md)** | Complete API reference and examples |
| **[Summary](KNOCKOUT_SUMMARY.md)** | Implementation overview and features |

## 🎮 Tournament Formats

### GROUP_KNOCKOUT (World Cup Style)
Group stage → Knockout rounds with auto-qualification

```typescript
tournament_format = 'GROUP_KNOCKOUT'
num_groups = 4
qualified_per_group = 2
```

### LEAGUE_PLAYOFF (NBA Style)
League stage → Playoff rounds with top teams

```typescript
tournament_format = 'LEAGUE_PLAYOFF'
playoff_format = 'TOP_4_SEMI'
```

### KNOCKOUT_ONLY (FA Cup Style)
Pure elimination bracket from start to finish

```typescript
tournament_format = 'KNOCKOUT_ONLY'
is_pure_knockout = true
```

### CUSTOM_KNOCKOUT
Custom entry points and configurations

```typescript
tournament_format = 'CUSTOM_KNOCKOUT'
knockout_config = { qualifyingTeams: 4, qualifyingRound: 'SEMI_FINAL' }
```

## 🔧 API Endpoints

### Create Knockout Round
```http
POST /api/tournaments/[id]/knockout
Content-Type: application/json

{
  "roundName": "QUARTER_FINAL",
  "legs": 2,
  "mode": "AUTO",
  "createFullBracket": true
}
```

### Get All Rounds
```http
GET /api/tournaments/[id]/knockout
```

### Update Pairing
```http
PATCH /api/tournaments/[id]/knockout/pairings/[pairingId]
Content-Type: application/json

{
  "team1Id": "team_abc",
  "team2Id": "team_xyz"
}
```

### Reset Bracket
```http
DELETE /api/tournaments/[id]/knockout
```

## 🎯 Common Use Cases

### World Cup Bracket

```typescript
// After group stage completes
POST /api/tournaments/TOUR123/knockout
{
  "roundName": "ROUND_OF_16",
  "legs": 1,
  "mode": "AUTO",
  "createFullBracket": true
}

// Placeholders: "Group A #1 vs Group B #2", etc.
// Auto-resolves when group stage finishes
```

### Champions League Knockout

```typescript
// After group stage
POST /api/tournaments/TOUR123/knockout
{
  "roundName": "ROUND_OF_16",
  "legs": 2,
  "mode": "AUTO",
  "createFullBracket": true
}

// Two-legged ties through to semi-finals
// Single-leg final
```

### FA Cup Draw

```typescript
// Manual draw with 16 teams
POST /api/tournaments/TOUR123/knockout
{
  "roundName": "ROUND_OF_16",
  "legs": 1,
  "mode": "MANUAL",
  "teams": [...16 teams...],
  "pairingMethod": "AUTO_SEED"
}
```

## 📊 Database Schema

### knockout_rounds
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| tournament_id | TEXT | Foreign key to tournaments |
| round_name | TEXT | ROUND_OF_16, QUARTER_FINAL, etc. |
| round_order | INT | Order of rounds (0-5) |
| legs | INT | 1 or 2 |
| status | TEXT | PENDING, IN_PROGRESS, COMPLETED |

### knockout_pairings
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| knockout_round_id | TEXT | Foreign key to knockout_rounds |
| pairing_number | INT | Match number within round |
| team1_id | TEXT | Actual team ID (nullable) |
| team2_id | TEXT | Actual team ID (nullable) |
| team1_placeholder | TEXT | Placeholder text (nullable) |
| team2_placeholder | TEXT | Placeholder text (nullable) |
| winner_id | TEXT | Winner team ID (nullable) |
| leg1_match_id | TEXT | Link to fixtures table |
| leg2_match_id | TEXT | Link to fixtures table |

## 🔍 Examples

### Auto-Qualification with Placeholders

```typescript
// Create knockout rounds
const response = await fetch('/api/tournaments/TOUR123/knockout', {
  method: 'POST',
  body: JSON.stringify({
    roundName: 'QUARTER_FINAL',
    legs: 2,
    mode: 'AUTO',
    createFullBracket: true
  })
});

// Result: Pairings with placeholders
{
  pairings: [
    { team1Placeholder: "Group A #1", team2Placeholder: "Group B #2" },
    { team1Placeholder: "Group C #1", team2Placeholder: "Group D #2" },
    { team1Placeholder: "Group B #1", team2Placeholder: "Group A #2" },
    { team1Placeholder: "Group D #1", team2Placeholder: "Group C #2" }
  ]
}

// When group stage completes:
// → Placeholders auto-resolve to actual team IDs
// → "Group A #1" becomes "team_abc123"
```

### Manual Selection with Seeding

```typescript
const teams = [
  { id: 't1', name: 'Bayern Munich', seed: 1 },
  { id: 't2', name: 'Real Madrid', seed: 2 },
  { id: 't3', name: 'Barcelona', seed: 3 },
  { id: 't4', name: 'Liverpool', seed: 4 },
  { id: 't5', name: 'PSG', seed: 5 },
  { id: 't6', name: 'Man City', seed: 6 },
  { id: 't7', name: 'Juventus', seed: 7 },
  { id: 't8', name: 'Chelsea', seed: 8 }
];

const response = await fetch('/api/tournaments/TOUR123/knockout', {
  method: 'POST',
  body: JSON.stringify({
    roundName: 'QUARTER_FINAL',
    legs: 2,
    mode: 'MANUAL',
    teams,
    pairingMethod: 'AUTO_SEED'  // 1v8, 2v7, 3v6, 4v5
  })
});

// Result: Pairings with actual teams
{
  pairings: [
    { team1Id: 't1', team2Id: 't8' },  // Bayern vs Chelsea
    { team1Id: 't2', team2Id: 't7' },  // Real vs Juventus
    { team1Id: 't3', team2Id: 't6' },  // Barca vs Man City
    { team1Id: 't4', team2Id: 't5' }   // Liverpool vs PSG
  ]
}
```

## 🎨 Frontend Integration

### React Example

```tsx
import { useState, useEffect } from 'react';

function KnockoutBracket({ tournamentId }) {
  const [rounds, setRounds] = useState([]);

  useEffect(() => {
    fetch(`/api/tournaments/${tournamentId}/knockout`)
      .then(res => res.json())
      .then(data => setRounds(data.rounds || []));
  }, [tournamentId]);

  return (
    <div className="bracket">
      {rounds.map(round => (
        <div key={round.id} className="round">
          <h2>{round.roundName}</h2>
          {round.pairings.map(pairing => (
            <div key={pairing.id} className="matchup">
              <div className="team">
                {pairing.team1Id ? (
                  <TeamName id={pairing.team1Id} />
                ) : (
                  <span className="placeholder">
                    {pairing.team1Placeholder}
                  </span>
                )}
              </div>
              <span className="vs">vs</span>
              <div className="team">
                {pairing.team2Id ? (
                  <TeamName id={pairing.team2Id} />
                ) : (
                  <span className="placeholder">
                    {pairing.team2Placeholder}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

## 🧪 Testing

### Test Auto-Qualification

```bash
# Create bracket
curl -X POST http://localhost:3000/api/tournaments/TOUR123/knockout \
  -H "Content-Type: application/json" \
  -d '{"roundName":"QUARTER_FINAL","legs":2,"mode":"AUTO","createFullBracket":true}'

# Verify creation
curl http://localhost:3000/api/tournaments/TOUR123/knockout
```

### Test Manual Selection

```bash
curl -X POST http://localhost:3000/api/tournaments/TOUR123/knockout \
  -H "Content-Type: application/json" \
  -d '{
    "roundName":"SEMI_FINAL",
    "legs":1,
    "mode":"MANUAL",
    "teams":[
      {"id":"t1","name":"Team A","seed":1},
      {"id":"t2","name":"Team B","seed":2},
      {"id":"t3","name":"Team C","seed":3},
      {"id":"t4","name":"Team D","seed":4}
    ],
    "pairingMethod":"AUTO_SEED"
  }'
```

## 🛠️ Troubleshooting

### "Knockout round already exists"
Delete existing round first or use different round name

### "Manual mode requires exactly X teams"
Verify your teams array count matches the round requirements

### Placeholders not resolving
Check `tournament_format` is set correctly in tournaments table

### Migration fails
Ensure database connection is configured in `.env.local`

## 📝 License

[Your License Here]

## 🤝 Contributing

[Your Contributing Guidelines]

## 📞 Support

For questions or issues:
- Check documentation files
- Review inline code comments
- Open an issue

---

**Built with ❤️ for tournament management**
