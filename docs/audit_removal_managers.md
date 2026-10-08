> [!NOTE]
> **Execution Status**: Completed. 
> The 3 managers (`MAJEE`, `SHAMIL FC`, `OP SANJU`) and their associated seasons, wallets, medals, and logs have been completely removed from the database. 
> **Clubs (`AL AHLI`, `BAYER LEVERKUSEN`, `CELTIC`) were preserved and unlinked.**

---

## 1. Target Entity Summary

| # | Manager Name / R2G ID | Manager ID | Club Name | Club ID | Division / Tier |
|---|---|---|---|---|---|
| 1 | **MAJEED** (`MAJEE`) | `1` | **AL AHLI** | `1` | Open / Unassigned |
| 2 | **SHAMIL FC** (`SHAMIL FC`) | `5` | **BAYER LEVERKUSEN** | `5` | Open / Unassigned |
| 3 | **SANJU OP** (`OP SANJU`) | `30` | **CELTIC** | `30` | Open / Unassigned |

---

## 2. Database References & Foreign Key Audit

Across all 45+ tables in the Solo database, exactly **39 related records** exist across **6 tables**:

| Database Table | Column Reference | Total Matching Records | Impact Details |
|---|---|:---:|---|
| `managers` | `id` | **3** | Primary records for IDs `1`, `5`, `30` |
| `clubs` | `id` | **3** | Club records for IDs `1` (Al Ahli), `5` (Bayer Leverkusen), `30` (Celtic) |
| `manager_seasons` | `manager_id` / `club_id` | **7** | Season history (S4, S5, S6, S7) across the 3 managers |
| `manager_wallets` | `manager_id` / `current_club_id` | **6** | Financial ledger wallets (S6, S7) across the 3 managers |
| `manager_medals` | `manager_id` | **19** | 10 medals (Majeed), 9 medals (Shamil FC), 0 (Sanju OP) |
| `medal_audit_logs` | `manager_id` | **4** | Historical audit logs for medal award transactions |
| `fixtures` | `home_club_id` / `away_club_id` | **0** | No active scheduled fixtures |
| `player_contracts` | `club_id` | **0** | No active players contracted to these clubs |
| `tournament_teams` | `manager_id` / `club_id` | **0** | No active tournament registrations |
| `tournament_standings`| `manager_id` / `club_id` | **0** | No active standings |
| `auctions` | `winning_manager_id` | **0** | No auction ownership records |
| **Total Affected Records** | | **39** | |

---

## 3. Manager Breakdown

### 1. MAJEED (`MAJEE` / AL AHLI)
- **Manager ID**: `1` | **Club ID**: `1`
- **Overall Rating**: `12.4`
- **Wallets**: `3,222 RC`, `350 RT` (Season 6 & 7)
- **Season Records**:
  - Season 5: 31 matches (7W - 5D - 19L), 36 GS, 73 GC, 12.4 pts (Rank #26)
  - Season 7: Initialized empty row
- **Medals**: 10 records
- **Medal Logs**: 2 records

### 2. SHAMIL FC (`SHAMIL FC` / BAYER LEVERKUSEN)
- **Manager ID**: `5` | **Club ID**: `5`
- **Overall Rating**: `94.9`
- **Wallets**: `4,690 RC`, `475 RT` (Season 6 & 7)
- **Season Records**:
  - Season 4: 31 matches (7W - 7D - 17L), 47 GS, 64 GC, 20.4 pts (Rank #19)
  - Season 5: 29 matches (9W - 5D - 15L), 31 GS, 46 GC, 28.3 pts (Rank #21)
  - Season 7: Initialized empty row
- **Medals**: 9 records
- **Medal Logs**: 2 records

### 3. SANJU OP (`OP SANJU` / CELTIC)
- **Manager ID**: `30` | **Club ID**: `30`
- **Overall Rating**: `0.0`
- **Wallets**: `0 RC`, `0 RT` (Season 6 & 7)
- **Season Records**:
  - Season 7: Initialized empty row
- **Medals**: 0 records
- **Medal Logs**: 0 records

---

## 4. Deletion Execution Sequence (When Approved)

When you choose to proceed, deletion must follow child-to-parent dependency order in a single atomic SQL transaction:

```sql
BEGIN;

-- 1. Delete Medal Audit Logs
DELETE FROM medal_audit_logs WHERE manager_id IN (1, 5, 30);

-- 2. Delete Manager Medals
DELETE FROM manager_medals WHERE manager_id IN (1, 5, 30);

-- 3. Delete Manager Wallets
DELETE FROM manager_wallets WHERE manager_id IN (1, 5, 30) OR current_club_id IN (1, 5, 30);

-- 4. Delete Manager Seasons
DELETE FROM manager_seasons WHERE manager_id IN (1, 5, 30) OR club_id IN (1, 5, 30);

-- 5. Delete Clubs
DELETE FROM clubs WHERE id IN (1, 5, 30);

-- 6. Delete Managers
DELETE FROM managers WHERE id IN (1, 5, 30);

COMMIT;
```

---

> [!NOTE]
> **Action Paused**: No queries or deletions have been executed. Awaiting your explicit confirmation.
