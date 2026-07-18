# Auto Contract Expiration - Visual Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN CREATES NEW SEASON                  │
│                   (e.g., Season 10.0 or 10.5)                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 1: Check Season Exists                     │
│   ❌ If exists → Throw error                                 │
│   ✅ If new → Continue                                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│          STEP 2: Fetch Old Active Season                     │
│   • Get season_id                                            │
│   • Get season_number                                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│       ⭐ STEP 2.5: AUTO-RELEASE EXPIRED CONTRACTS ⭐         │
│                                                              │
│  1. Query all active contracts from old season               │
│     WHERE expire_season <= new_season_number                 │
│                                                              │
│  2. For each expired contract:                               │
│     • Mark status = 'inactive'                               │
│     • Log transaction: "contract_expiry"                     │
│     • Add to releasedPlayers array                           │
│                                                              │
│  3. Count released contracts                                 │
│                                                              │
│  Result: Players become FREE AGENTS 🎉                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         STEP 3: Deactivate Old Season                        │
│   • UPDATE seasons SET is_active = FALSE                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         STEP 4: Create New Season                            │
│   • INSERT new season record                                 │
│   • Set is_mid_season flag (true if .5, false if .0)        │
│   • Create RWS tournament if enabled                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         STEP 5: Carry Over Data (if enabled)                 │
│   • Copy manager wallets                                     │
│   • Initialize manager seasons                               │
│   • Copy ONLY non-expired contracts                          │
│     WHERE expire_season > new_season_number                  │
│   • Carry over divisions & standings                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 6: Commit & Return Result                  │
│   {                                                          │
│     success: true,                                           │
│     season: {...},                                           │
│     autoRelease: {                                           │
│       count: 12,                                             │
│       players: [...]                                         │
│     }                                                        │
│   }                                                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           ADMIN SEES SUCCESS MESSAGE                         │
│  "✅ Created Season 10 | 🔓 Auto-released 12 contracts"      │
└─────────────────────────────────────────────────────────────┘
```

## Contract Status Flow

```
BEFORE SEASON CREATION:
┌──────────────────────────────────────────────────────────┐
│  Player A: Contract expires "SEASON 10" → Status: Active │
│  Player B: Contract expires "SEASON 9.5" → Status: Active│
│  Player C: Contract expires "SEASON 11" → Status: Active │
└──────────────────────────────────────────────────────────┘
                           │
                           │ Admin creates Season 10.0
                           ▼
┌──────────────────────────────────────────────────────────┐
│               AUTO-RELEASE LOGIC RUNS                     │
│                                                           │
│  IF expire_season <= 10.0:                                │
│    • Player A (expires 10): RELEASED ✅                   │
│    • Player B (expires 9.5): RELEASED ✅                  │
│    • Player C (expires 11): KEPT ❌                       │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
AFTER SEASON 10.0 CREATED:
┌──────────────────────────────────────────────────────────┐
│  Player A: Status: Inactive → FREE AGENT 🎯               │
│  Player B: Status: Inactive → FREE AGENT 🎯               │
│  Player C: Status: Active → Still with club ✅            │
└──────────────────────────────────────────────────────────┘
```

## Season Type Detection

```
┌─────────────────────────────────────────────────────┐
│           INPUT: Season Number                      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  seasonNumber % 1    │
        └──────┬───────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
    == 0          != 0
        │             │
        ▼             ▼
┌──────────┐   ┌─────────────┐
│ Season   │   │ Mid-Season  │
│  Start   │   │             │
│ (10.0)   │   │  (10.5)     │
│          │   │             │
│ is_mid   │   │ is_mid      │
│ = false  │   │ = true      │
└──────────┘   └─────────────┘
```

## Database State Changes

```
OLD SEASON (Season 9):
┌───────────────────────────────────────────────────────┐
│ player_contracts (season_id = 9)                      │
├───────┬─────────┬────────────┬───────────┬──────────┤
│ id    │ player  │ club_id    │ expire    │ status   │
├───────┼─────────┼────────────┼───────────┼──────────┤
│ 101   │ John    │ 5          │ 10        │ active   │
│ 102   │ Mike    │ 5          │ 10.5      │ active   │
│ 103   │ Sarah   │ 7          │ 11        │ active   │
└───────┴─────────┴────────────┴───────────┴──────────┘
                   │
                   │ CREATE SEASON 10.0
                   ▼
┌───────────────────────────────────────────────────────┐
│ AUTO-RELEASE: Mark expired as inactive                │
├───────┬─────────┬────────────┬───────────┬──────────┤
│ id    │ player  │ club_id    │ expire    │ status   │
├───────┼─────────┼────────────┼───────────┼──────────┤
│ 101   │ John    │ 5          │ 10        │ inactive │ ← Changed
│ 102   │ Mike    │ 5          │ 10.5      │ active   │
│ 103   │ Sarah   │ 7          │ 11        │ active   │
└───────┴─────────┴────────────┴───────────┴──────────┘
                   │
                   ▼
NEW SEASON (Season 10):
┌───────────────────────────────────────────────────────┐
│ player_contracts (season_id = 10)                     │
├───────┬─────────┬────────────┬───────────┬──────────┤
│ id    │ player  │ club_id    │ expire    │ status   │
├───────┼─────────┼────────────┼───────────┼──────────┤
│ 201   │ Mike    │ 5          │ 10.5      │ active   │ ← Copied
│ 202   │ Sarah   │ 7          │ 11        │ active   │ ← Copied
└───────┴─────────┴────────────┴───────────┴──────────┘
        ↑
        │ John NOT copied (contract expired)
        │ John is now a FREE AGENT
```

## Free Agent Detection Query

```
┌─────────────────────────────────────────────────┐
│         fetchFreeAgents() Logic                 │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
        SELECT * FROM players
        WHERE id NOT IN (
          SELECT player_id 
          FROM player_contracts 
          WHERE status = 'active' 
            AND season_id = current_season
        )
                   │
                   ▼
        ┌──────────────────────┐
        │  RESULTS:            │
        │  - John (released)   │
        │  - Other free agents │
        └──────────────────────┘
```

## Transaction Logging Flow

```
For each released player:
┌─────────────────────────────────────────────────────┐
│ INSERT INTO wallet_transactions                     │
│ {                                                   │
│   manager_id: club_id,                              │
│   season_id: old_season_id,                         │
│   currency_type: 'coin',                            │
│   amount: 0,                                        │
│   transaction_type: 'contract_expiry',              │
│   description: 'Auto-released [Player] - ...'      │
│ }                                                   │
└─────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│         AUDIT TRAIL CREATED                         │
│  Admins can view in Financial Ops > Transactions    │
└─────────────────────────────────────────────────────┘
```

## Error Handling

```
┌─────────────────────────────────────────┐
│  Try Block: All operations              │
└──────────────┬──────────────────────────┘
               │
               ▼
    ┌──────────────────┐
    │  Error occurs?   │
    └────┬────────┬────┘
         │        │
        NO       YES
         │        │
         ▼        ▼
    ┌─────┐  ┌────────────┐
    │COMMIT│  │  ROLLBACK  │
    │      │  │            │
    │✅ All│  │❌ Undo all │
    │changes│  │  changes   │
    │saved │  │            │
    └─────┘  └────────────┘
```

## Admin UI Flow

```
┌─────────────────────────────────────────────────────┐
│        Admin Panel: Seasons Management              │
│                                                     │
│  ┌────────────────────────────────────────────┐    │
│  │ Create New Season                          │    │
│  │                                            │    │
│  │ Season Number: [10.5      ]                │    │
│  │ ☑ Make Active                              │    │
│  │ ☑ Carry Over                               │    │
│  │                                            │    │
│  │ [Create Season]                            │    │
│  └────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────┘
                       │ Click
                       ▼
┌─────────────────────────────────────────────────────┐
│        Backend: createSoloSeason()                   │
│  • Auto-release expired contracts                    │
│  • Create new season                                 │
│  • Carry over non-expired contracts                  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│        Success Toast Message                         │
│  ┌─────────────────────────────────────────────┐    │
│  │ ✅ Created Season 10.5 successfully!        │    │
│  │ 🔓 Auto-released 12 expired contracts       │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

## Comparison: Manual vs Auto Release

```
BEFORE (Manual):                    AFTER (Auto):
┌─────────────────────┐            ┌─────────────────────┐
│ 1. Create Season    │            │ 1. Create Season    │
│ 2. Go to Auction    │            │    ↓                │
│ 3. Preview Expired  │            │ ✅ Done!            │
│ 4. Click Release    │            │                     │
│ 5. Confirm Release  │            │ System handles      │
│ 6. Wait for process │            │ everything          │
│ 7. ✅ Done          │            │ automatically       │
└─────────────────────┘            └─────────────────────┘
  5-7 steps, manual                  1 step, automatic
  Risk of forgetting                 No risk, always runs
```

---

## Legend

- ✅ Success / Included
- ❌ Error / Excluded
- 🎯 Target / Result
- 🔓 Released
- ⭐ Key Feature
- ▼ Flow Direction
