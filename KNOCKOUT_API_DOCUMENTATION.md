# Knockout Tournament API Documentation

## Base URL
```
/api/solo/tournaments/[tournamentId]/knockout
```

---

## Endpoints

### 1. Get Knockout Rounds

Fetch all knockout rounds and pairings for a tournament.

**Endpoint:** `GET /api/solo/tournaments/[tournamentId]/knockout`

**Parameters:**
- `tournamentId` (path, required): Tournament ID

**Query Parameters:**
- `eligible_teams=true` (optional): Returns eligible teams instead of rounds

**Response (Rounds):**
```json
{
  "success": true,
  "rounds": [
    {
      "id": "kr_abc123",
      "tournament_id": 11,
      "round_name": "QUARTER_FINAL",
      "round_order": 2,
      "legs": 2,
      "status": "PENDING",
      "creation_mode": "AUTO",
      "pairing_method": "AUTO_SEED",
      "is_full_bracket": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "pairings": [
        {
          "id": "kp_xyz789",
          "knockout_round_id": "kr_abc123",
          "pairing_order": 1,
          "team1_id": null,
          "team2_id": null,
          "team1_placeholder": "Group A #1",
          "team2_placeholder": "Group B #2",
          "winner_id": null,
          "leg1_match_id": null,
          "leg2_match_id": null,
          "source_pairing_1_id": null,
          "source_pairing_2_id": null,
          "team1": null,
          "team2": null
        }
      ]
    }
  ]
}
```

**Response (Eligible Teams):**
```json
{
  "teams": [
    {
      "id": 1,
      "name": "Team Name",
      "logo": "/path/to/logo.png",
      "manager": "Manager Name",
      "r2gId": "R2G-001",
      "points": 18,
      "goalDifference": 10,
      "groupName": "A",
      "groupPosition": 1,
      "overallPosition": 1
    }
  ]
}
```

**Example:**
```javascript
// Get rounds
const response = await fetch('/api/solo/tournaments/11/knockout');
const data = await response.json();

// Get eligible teams
const response = await fetch('/api/solo/tournaments/11/knockout?eligible_teams=true');
const data = await response.json();
```

---

### 2. Create Knockout Round

Create a new knockout round with pairings.

**Endpoint:** `POST /api/solo/tournaments/[tournamentId]/knockout`

**Parameters:**
- `tournamentId` (path, required): Tournament ID

**Request Body:**
```json
{
  "roundName": "QUARTER_FINAL",
  "legs": 2,
  "mode": "AUTO",
  "pairingMethod": "AUTO_SEED",
  "teams": [],
  "customPairings": [],
  "createFullBracket": true
}
```

**Body Fields:**
- `roundName` (required): One of `ROUND_OF_32`, `ROUND_OF_16`, `QUARTER_FINAL`, `SEMI_FINAL`, `THIRD_PLACE`, `FINAL`
- `legs` (required): `1` (single leg) or `2` (two legs)
- `mode` (required): `AUTO` (with placeholders) or `MANUAL` (selected teams)
- `pairingMethod` (optional): `AUTO_SEED` (1v8), `CONSECUTIVE` (1v2), or `CUSTOM`
- `teams` (optional): Array of team IDs for manual mode `[1, 2, 3, 4, 5, 6, 7, 8]`
- `customPairings` (optional): Array of custom pairings `[{team1Id: 1, team2Id: 8}]`
- `createFullBracket` (optional): Boolean, creates all subsequent rounds

**Response:**
```json
{
  "success": true,
  "message": "Knockout round created successfully",
  "round": {
    "id": "kr_abc123",
    "tournament_id": 11,
    "round_name": "QUARTER_FINAL",
    "round_order": 2,
    "legs": 2,
    "status": "PENDING",
    "creation_mode": "AUTO",
    "pairing_method": "AUTO_SEED",
    "is_full_bracket": true
  },
  "pairings": [...]
}
```

**Example - Auto Mode:**
```javascript
const response = await fetch('/api/solo/tournaments/11/knockout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roundName: 'QUARTER_FINAL',
    legs: 2,
    mode: 'AUTO',
    createFullBracket: true
  })
});
const data = await response.json();
```

**Example - Manual Mode:**
```javascript
const response = await fetch('/api/solo/tournaments/11/knockout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roundName: 'SEMI_FINAL',
    legs: 1,
    mode: 'MANUAL',
    pairingMethod: 'AUTO_SEED',
    teams: [1, 2, 3, 4], // Team IDs from standings
    createFullBracket: false
  })
});
const data = await response.json();
```

---

### 3. Update Knockout Pairing

Update team assignments or winner for a specific pairing.

**Endpoint:** `PATCH /api/solo/tournaments/[tournamentId]/knockout/pairings/[pairingId]`

**Parameters:**
- `tournamentId` (path, required): Tournament ID
- `pairingId` (path, required): Pairing ID

**Request Body:**
```json
{
  "team1Id": 5,
  "team2Id": 12,
  "winnerId": 5
}
```

**Body Fields:**
- `team1Id` (optional): Team ID for first slot (null to clear)
- `team2Id` (optional): Team ID for second slot (null to clear)
- `winnerId` (optional): Winning team ID (null to clear)

At least one field must be provided.

**Response:**
```json
{
  "success": true,
  "message": "Pairing updated successfully",
  "pairing": {
    "id": "kp_xyz789",
    "knockout_round_id": "kr_abc123",
    "pairing_order": 1,
    "team1_id": 5,
    "team2_id": 12,
    "team1_placeholder": null,
    "team2_placeholder": null,
    "winner_id": 5
  }
}
```

**Example:**
```javascript
const response = await fetch('/api/solo/tournaments/11/knockout/pairings/kp_xyz789', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    team1Id: 5,
    team2Id: 12
  })
});
const data = await response.json();
```

---

### 4. Resolve Placeholders

Manually trigger placeholder resolution for all pairings in a tournament.

**Endpoint:** `POST /api/solo/tournaments/[tournamentId]/knockout/resolve`

**Parameters:**
- `tournamentId` (path, required): Tournament ID

**Request Body:** None required

**Response:**
```json
{
  "success": true,
  "message": "Resolved 8 placeholder(s)",
  "resolvedCount": 8
}
```

**Example:**
```javascript
const response = await fetch('/api/solo/tournaments/11/knockout/resolve', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
const data = await response.json();
```

**Use Cases:**
- After group stage completes
- To manually populate teams in auto mode
- When standings are finalized

---

### 5. Delete All Knockout Rounds

Delete the entire knockout structure for a tournament.

**Endpoint:** `DELETE /api/solo/tournaments/[tournamentId]/knockout`

**Parameters:**
- `tournamentId` (path, required): Tournament ID

**Response:**
```json
{
  "success": true,
  "message": "All knockout rounds deleted successfully",
  "deletedRounds": 3
}
```

**Example:**
```javascript
const response = await fetch('/api/solo/tournaments/11/knockout', {
  method: 'DELETE'
});
const data = await response.json();
```

**Warning:** This action is irreversible. All rounds, pairings, and associated matches will be deleted.

---

## Error Responses

All endpoints return error responses in this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Status Codes:**
- `400` - Bad Request (invalid input, missing fields)
- `404` - Not Found (tournament or resource doesn't exist)
- `500` - Internal Server Error (database or server issue)

---

## Workflow Examples

### Example 1: World Cup Style (Group + Knockout)

**Step 1: Create group stage and complete matches**
```javascript
// After group stage is complete, create knockout rounds
```

**Step 2: Create Quarter Finals with auto qualification**
```javascript
const response = await fetch('/api/solo/tournaments/11/knockout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roundName: 'QUARTER_FINAL',
    legs: 2,
    mode: 'AUTO',
    createFullBracket: true // Also creates Semi Finals and Final
  })
});
```

**Step 3: System auto-populates teams as they qualify**
```
Placeholders created:
- Group A #1 vs Group B #2
- Group C #1 vs Group D #2
- Group B #1 vs Group A #2
- Group D #1 vs Group C #2
```

**Step 4: Manually resolve if needed**
```javascript
await fetch('/api/solo/tournaments/11/knockout/resolve', {
  method: 'POST'
});
```

---

### Example 2: Pure Knockout (Manual Selection)

**Step 1: Get eligible teams**
```javascript
const response = await fetch('/api/solo/tournaments/11/knockout?eligible_teams=true');
const { teams } = await response.json();
```

**Step 2: Create knockout round with selected teams**
```javascript
const topEightTeams = teams.slice(0, 8).map(t => t.id);

await fetch('/api/solo/tournaments/11/knockout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roundName: 'QUARTER_FINAL',
    legs: 1,
    mode: 'MANUAL',
    pairingMethod: 'AUTO_SEED', // 1v8, 2v7, 3v6, 4v5
    teams: topEightTeams,
    createFullBracket: true
  })
});
```

---

### Example 3: Edit Pairing

**Update teams in a pairing:**
```javascript
await fetch('/api/solo/tournaments/11/knockout/pairings/kp_xyz789', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    team1Id: 5,
    team2Id: 12
  })
});
```

---

### Example 4: Reset Bracket

**Delete all knockout rounds and start over:**
```javascript
await fetch('/api/solo/tournaments/11/knockout', {
  method: 'DELETE'
});
```

---

## Integration with Frontend

### React Component Example

```typescript
import { useState, useEffect } from 'react';

function KnockoutManager({ tournamentId }: { tournamentId: number }) {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRounds();
  }, [tournamentId]);

  async function loadRounds() {
    setLoading(true);
    try {
      const response = await fetch(`/api/solo/tournaments/${tournamentId}/knockout`);
      const data = await response.json();
      setRounds(data.rounds || []);
    } catch (error) {
      console.error('Failed to load rounds:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createRound(roundData: any) {
    try {
      const response = await fetch(`/api/solo/tournaments/${tournamentId}/knockout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roundData)
      });
      
      if (response.ok) {
        await loadRounds();
        alert('Round created successfully!');
      }
    } catch (error) {
      console.error('Failed to create round:', error);
      alert('Failed to create round');
    }
  }

  // ... rest of component
}
```

---

## Security Considerations

1. **Authentication**: Ensure admin authentication middleware is applied
2. **Authorization**: Verify user has permission to modify tournament
3. **Validation**: All inputs are validated on the server
4. **SQL Injection**: Parameterized queries prevent SQL injection
5. **Rate Limiting**: Consider adding rate limits for creation endpoints

---

## Testing

### Test with cURL

**Create Auto Round:**
```bash
curl -X POST http://localhost:3000/api/solo/tournaments/11/knockout \
  -H "Content-Type: application/json" \
  -d '{
    "roundName": "QUARTER_FINAL",
    "legs": 2,
    "mode": "AUTO",
    "createFullBracket": true
  }'
```

**Get Rounds:**
```bash
curl http://localhost:3000/api/solo/tournaments/11/knockout
```

**Update Pairing:**
```bash
curl -X PATCH http://localhost:3000/api/solo/tournaments/11/knockout/pairings/kp_xyz789 \
  -H "Content-Type: application/json" \
  -d '{
    "team1Id": 5,
    "team2Id": 12
  }'
```

---

## Next Steps

✅ API Routes Complete
⏳ Update Frontend Components
⏳ Test End-to-End
⏳ Deploy to Production
