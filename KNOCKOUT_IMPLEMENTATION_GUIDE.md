# Knockout Tournament Implementation Guide

## Overview

This implementation provides a complete knockout tournament management system with:
- ✅ Auto-qualification mode with intelligent placeholders
- ✅ Manual team selection mode
- ✅ Multiple tournament formats (KNOCKOUT_ONLY, GROUP_KNOCKOUT, LEAGUE_PLAYOFF, CUSTOM_KNOCKOUT)
- ✅ Full bracket generation
- ✅ Automatic placeholder resolution
- ✅ Visual bracket management

## Installation

### 1. Run Database Migration

```bash
# Run the migration to create knockout tables
psql -d your_database -f migrations/create_knockout_structure.sql
```

This creates:
- `knockout_rounds` table
- `knockout_pairings` table
- Indexes and triggers
- Tournament format columns

### 2. Install Dependencies

The implementation uses `nanoid` for ID generation:

```bash
npm install nanoid
```

## API Endpoints

### Create Knockout Round

**POST** `/api/tournaments/[id]/knockout`

Creates a new knockout round with pairings.

#### Auto-Qualification Mode

```typescript
// Request Body
{
  "roundName": "QUARTER_FINAL",
  "legs": 2,
  "mode": "AUTO",
  "createFullBracket": true
}

// Response
{
  "success": true,
  "message": "Knockout round QUARTER_FINAL created successfully",
  "round": {
    "id": "kr_abc123",
    "tournamentId": "tournament_id",
    "roundName": "QUARTER_FINAL",
    "roundOrder": 2,
    "legs": 2,
    "status": "PENDING",
    "pairings": [
      {
        "id": "kp_xyz789",
        "pairingNumber": 1,
        "team1Placeholder": "Group A #1",
        "team2Placeholder": "Group B #2"
      }
    ]
  }
}
```

#### Manual Selection Mode

```typescript
// Request Body
{
  "roundName": "SEMI_FINAL",
  "legs": 2,
  "mode": "MANUAL",
  "teams": [
    { "id": "team_1", "name": "Team A", "seed": 1 },
    { "id": "team_2", "name": "Team B", "seed": 2 },
    { "id": "team_3", "name": "Team C", "seed": 3 },
    { "id": "team_4", "name": "Team D", "seed": 4 }
  ],
  "pairingMethod": "AUTO_SEED",  // or "CONSECUTIVE" or "CUSTOM"
  "createFullBracket": true
}

// Response
{
  "success": true,
  "round": {
    "pairings": [
      {
        "team1Id": "team_1",
        "team2Id": "team_4",
        "pairingNumber": 1
      },
      {
        "team1Id": "team_2",
        "team2Id": "team_3",
        "pairingNumber": 2
      }
    ]
  }
}
```

#### Custom Pairing Mode

```typescript
// Request Body
{
  "roundName": "SEMI_FINAL",
  "legs": 1,
  "mode": "MANUAL",
  "teams": [
    { "id": "team_1", "name": "Team A" },
    { "id": "team_2", "name": "Team B" },
    { "id": "team_3", "name": "Team C" },
    { "id": "team_4", "name": "Team D" }
  ],
  "pairingMethod": "CUSTOM",
  "customPairings": [
    { "team1Id": "team_1", "team2Id": "team_3" },
    { "team1Id": "team_2", "team2Id": "team_4" }
  ]
}
```

### Get Knockout Rounds

**GET** `/api/tournaments/[id]/knockout`

Returns all knockout rounds with pairings for a tournament.

```typescript
// Response
{
  "success": true,
  "rounds": [
    {
      "id": "kr_abc123",
      "roundName": "QUARTER_FINAL",
      "roundOrder": 2,
      "legs": 2,
      "status": "PENDING",
      "pairings": [...],
      "_count": { "pairings": 4 }
    },
    {
      "id": "kr_def456",
      "roundName": "SEMI_FINAL",
      "roundOrder": 3,
      "legs": 2,
      "status": "PENDING",
      "pairings": [...],
      "_count": { "pairings": 2 }
    }
  ]
}
```

### Update Pairing

**PATCH** `/api/tournaments/[id]/knockout/pairings/[pairingId]`

Manually override teams in a pairing.

```typescript
// Request Body
{
  "team1Id": "team_abc",
  "team2Id": "team_def"
}

// Response
{
  "success": true,
  "message": "Pairing updated successfully"
}
```

### Delete All Rounds (Reset Bracket)

**DELETE** `/api/tournaments/[id]/knockout`

Deletes all knockout rounds, pairings, and associated fixtures.

```typescript
// Response
{
  "success": true,
  "message": "All knockout rounds deleted successfully"
}
```

## Usage Examples

### Example 1: World Cup Style (GROUP_KNOCKOUT)

```typescript
// 1. Set tournament format
const tournament = {
  tournament_format: 'GROUP_KNOCKOUT',
  num_groups: 4,
  qualified_per_group: 2,
  has_knockout_stage: true
};

// 2. Create knockout rounds after group stage
const response = await fetch(`/api/tournaments/${tournamentId}/knockout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roundName: 'QUARTER_FINAL',
    legs: 2,
    mode: 'AUTO',
    createFullBracket: true
  })
});

// Result: Creates QF, SF, and Final with placeholders
// Placeholders: "Group A #1 vs Group B #2", etc.
// As group matches complete, placeholders auto-resolve to actual teams
```

### Example 2: NBA Playoff Style (LEAGUE_PLAYOFF)

```typescript
// 1. Set tournament format
const tournament = {
  tournament_format: 'LEAGUE_PLAYOFF',
  playoff_format: 'TOP_4_SEMI',
  has_knockout_stage: true
};

// 2. Create playoff bracket
const response = await fetch(`/api/tournaments/${tournamentId}/knockout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roundName: 'SEMI_FINAL',
    legs: 2,
    mode: 'AUTO',
    createFullBracket: true
  })
});

// Result: Creates SF and Final with placeholders
// Placeholders: "League #1 vs League #4", "League #2 vs League #3"
```

### Example 3: FA Cup Style (KNOCKOUT_ONLY)

```typescript
// 1. Set tournament format
const tournament = {
  tournament_format: 'KNOCKOUT_ONLY',
  is_pure_knockout: true
};

// 2. Manually select and pair teams
const response = await fetch(`/api/tournaments/${tournamentId}/knockout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roundName: 'ROUND_OF_16',
    legs: 1,
    mode: 'MANUAL',
    teams: [
      { id: 'team1', name: 'Manchester United', seed: 1 },
      { id: 'team2', name: 'Liverpool', seed: 2 },
      // ... 14 more teams
    ],
    pairingMethod: 'AUTO_SEED',
    createFullBracket: true
  })
});
```

### Example 4: Custom Entry Point

```typescript
// 1. Set tournament format
const tournament = {
  tournament_format: 'CUSTOM_KNOCKOUT',
  knockout_config: {
    qualifyingTeams: 4,
    qualifyingRound: 'SEMI_FINAL',
    defaultLegs: 1
  }
};

// 2. Create from semi-finals
const response = await fetch(`/api/tournaments/${tournamentId}/knockout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roundName: 'SEMI_FINAL',
    legs: 1,
    mode: 'MANUAL',
    teams: [
      { id: 't1', name: 'Team A' },
      { id: 't2', name: 'Team B' },
      { id: 't3', name: 'Team C' },
      { id: 't4', name: 'Team D' }
    ],
    pairingMethod: 'AUTO_SEED'
  })
});

// 3. Create final with 2 legs
const finalResponse = await fetch(`/api/tournaments/${tournamentId}/knockout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roundName: 'FINAL',
    legs: 2,
    mode: 'AUTO'  // Will use "Winner of SF1 vs Winner of SF2"
  })
});
```

## Placeholder Auto-Resolution

The system automatically resolves placeholders to actual teams when:

1. **Group Stage Completes**: Group positions are finalized
2. **League Stage Completes**: League standings are finalized
3. **Knockout Match Completes**: Winner progresses to next round

### Resolution Process

```typescript
import { KnockoutService } from '@/lib/knockout';

// When a knockout match completes:
const service = new KnockoutService(sql);

// 1. Set the winner of the pairing
await service.setWinner('kp_pairing123', 'team_winner_id');

// This automatically:
// - Updates the pairing winner_id
// - Finds next round pairings with placeholder "Winner of QF1"
// - Resolves placeholder to actual team ID
```

### Manual Placeholder Resolution

```typescript
// Resolve a specific placeholder
await service.resolvePlaceholder(
  tournamentId,
  'Group A #1',
  'team_abc123'
);
```

## Frontend Integration

### Fetching Bracket Data

```typescript
// Get all knockout rounds
const response = await fetch(`/api/tournaments/${tournamentId}/knockout`);
const { rounds } = await response.json();

// Display bracket
rounds.forEach(round => {
  console.log(`${round.roundName} (${round.status})`);
  round.pairings.forEach(pairing => {
    const team1 = pairing.team1Id || pairing.team1Placeholder;
    const team2 = pairing.team2Id || pairing.team2Placeholder;
    console.log(`  Match ${pairing.pairingNumber}: ${team1} vs ${team2}`);
  });
});
```

### Creating Bracket UI

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
    <div className="knockout-bracket">
      {rounds.map(round => (
        <div key={round.id} className="knockout-round">
          <h3>{round.roundName}</h3>
          {round.pairings.map(pairing => (
            <div key={pairing.id} className="pairing">
              <div className="team">
                {pairing.team1Id ? (
                  <TeamDisplay teamId={pairing.team1Id} />
                ) : (
                  <span className="placeholder">{pairing.team1Placeholder}</span>
                )}
              </div>
              <div className="vs">vs</div>
              <div className="team">
                {pairing.team2Id ? (
                  <TeamDisplay teamId={pairing.team2Id} />
                ) : (
                  <span className="placeholder">{pairing.team2Placeholder}</span>
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

## Tournament Format Configuration

### Setting Tournament Format

```sql
-- Update tournament to use GROUP_KNOCKOUT format
UPDATE tournaments 
SET 
  tournament_format = 'GROUP_KNOCKOUT',
  has_knockout_stage = true,
  num_groups = 4,
  qualified_per_group = 2,
  knockout_config = '{"defaultLegs": 2}'::jsonb
WHERE id = 'tournament_id';
```

### Available Formats

| Format | Description | Use Case |
|--------|-------------|----------|
| `LEAGUE` | Pure league/round-robin | Traditional league |
| `KNOCKOUT_ONLY` | Pure elimination bracket | FA Cup, Copa del Rey |
| `GROUP_KNOCKOUT` | Groups then knockout | World Cup, Champions League |
| `LEAGUE_PLAYOFF` | League then playoffs | NBA, NFL |
| `CUSTOM_KNOCKOUT` | Custom entry points | Special tournaments |

## Advanced Features

### Full Bracket Generation

When `createFullBracket: true`, the system:
1. Creates the specified round
2. Automatically generates all subsequent rounds
3. Links rounds with winner placeholders
4. Applies leg configuration consistently (Finals are always 1 leg)

### Bracket Reset

```typescript
// Delete all knockout data and start over
await fetch(`/api/tournaments/${tournamentId}/knockout`, {
  method: 'DELETE'
});
```

### Manual Pairing Override

```typescript
// Change teams in a pairing
await fetch(`/api/tournaments/${tournamentId}/knockout/pairings/${pairingId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    team1Id: 'new_team_1',
    team2Id: 'new_team_2'
  })
});
```

## Best Practices

1. **Use AUTO mode for standard tournaments**: Let the system handle placeholder generation
2. **Enable createFullBracket**: Generates entire bracket structure upfront
3. **Set tournament_format correctly**: Determines placeholder logic
4. **Complete preceding stages first**: Ensure group/league stages are done before manual selection
5. **Use MANUAL mode for custom draws**: When you need specific matchups
6. **Reset only when necessary**: Bracket reset is destructive

## Troubleshooting

### "Knockout round already exists"
**Solution**: Delete existing round or use a different round name

### "Manual mode requires exactly X teams"
**Solution**: Ensure your teams array has the correct count for the round

### "Tournament not found"
**Solution**: Verify tournament ID is correct

### Placeholders not resolving
**Solution**: Check that tournament_format is set correctly and preceding stage is complete

## Next Steps

1. Run the database migration
2. Update your tournament records with appropriate `tournament_format` values
3. Test with a sample tournament
4. Build the frontend bracket UI
5. Integrate with match scheduling system

## Support

For issues or questions, refer to the complete guide in this repository or check the inline code documentation.
