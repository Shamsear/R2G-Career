# Knockout Tournament System - Implementation Plan

## Overview
This document tracks the implementation of the comprehensive knockout tournament system as specified in the requirements.

---

## Phase 1: Database Schema ✅ (READY TO RUN)
**Status**: Migration created, awaiting execution

**Files Created**:
- `migrations/update_knockout_system.sql` - Complete schema migration
- `run-knockout-migration.js` - Migration runner script

**Changes Include**:
- ✅ knockout_config column in tournaments table
- ✅ Enhanced knockout_rounds table (pairing_method, creation_mode, is_full_bracket)
- ✅ Enhanced knockout_pairings table (pairing_order, source tracking, aggregate scores)
- ✅ Performance indexes
- ✅ Helper functions (get_round_team_count, get_next_round_name)
- ✅ Auto-resolution trigger for placeholder population
- ✅ Aggregate score calculation trigger
- ✅ Bracket visualization view

**Run**: `node run-knockout-migration.js`

---

## Phase 2: Core Server Actions (NEXT)
**Status**: Pending Phase 1 completion

**New Functions to Implement in `utils/solo/serverActions.ts`**:

### 2.1 Auto Qualification Logic
```typescript
- generateAutoQualificationPairings(tournamentId, roundName, numTeams)
  - Analyzes tournament type
  - Creates appropriate placeholders based on groups/league
  - Returns pairing structure with placeholders

- resolveQualificationPlaceholder(placeholder, tournamentId)
  - Parses placeholder text ("Group A #1", "League #3")
  - Queries standings to get actual team
  - Returns team ID or null if not yet determined
```

### 2.2 Manual Selection Logic
```typescript
- createManualKnockoutPairings(teams, pairingMethod)
  - AUTO_SEED: 1v8, 2v7, 3v6, 4v5
  - CONSECUTIVE: 1v2, 3v4, 5v6, 7v8
  - CUSTOM: accepts custom pairing array
  - Returns pairing structure

- validateTeamSelection(tournamentId, teamIds, roundName)
  - Checks team count matches round requirements
  - Verifies teams are in tournament
  - Ensures no duplicate selections
  - Returns validation result
```

### 2.3 Full Bracket Generation
```typescript
- generateFullBracket(startingRound, legs, numTeams, mode)
  - Calculates all subsequent rounds
  - Creates chained placeholder structure
  - Links pairings via source_pairing references
  - Returns array of rounds with pairings

- calculateBracketStructure(numTeams)
  - Determines required rounds
  - Calculates byes if needed
  - Returns round sequence
```

### 2.4 Bracket Management
```typescript
- updateKnockoutPairing(pairingId, team1Id, team2Id)
  - Updates team assignments
  - Validates team eligibility
  - Returns updated pairing

- deleteAllKnockoutRounds(tournamentId)
  - Deletes all rounds and pairings
  - Cascades to related matches
  - Returns confirmation

- resolveAllPlaceholders(tournamentId)
  - Manual trigger for placeholder resolution
  - Checks all pairings
  - Updates with qualified teams
```

### 2.5 Updated Functions
```typescript
- fetchKnockoutRounds(tournamentId) [ENHANCE EXISTING]
  - Add pairing_order, creation_mode, pairing_method
  - Include source pairing references
  - Add aggregate scores

- createKnockoutRound(data) [ENHANCE EXISTING]
  - Add mode parameter (auto/manual)
  - Add pairingMethod parameter
  - Add createFullBracket parameter
  - Implement auto vs manual logic
```

**Estimated Lines**: ~800-1000 lines of code

---

## Phase 3: API Routes (AFTER PHASE 2)
**Status**: Pending

**New API Files to Create**:

### 3.1 Create Knockout Round
```
POST /api/solo/tournaments/[tournamentId]/knockout
Body: { roundName, legs, mode, teams[], pairingMethod, createFullBracket }
```

### 3.2 Get Knockout Rounds
```
GET /api/solo/tournaments/[tournamentId]/knockout
Returns: Full bracket structure with pairings
```

### 3.3 Update Pairing
```
PATCH /api/solo/tournaments/[tournamentId]/knockout/pairings/[pairingId]
Body: { team1Id, team2Id }
```

### 3.4 Delete Knockout Structure
```
DELETE /api/solo/tournaments/[tournamentId]/knockout
```

### 3.5 Resolve Placeholders
```
POST /api/solo/tournaments/[tournamentId]/knockout/resolve
```

**Estimated Lines**: ~400-500 lines

---

## Phase 4: UI Components (AFTER PHASE 3)
**Status**: Pending

### 4.1 Enhanced KnockoutManager Component
**File**: `components/tournament/KnockoutManager.tsx`

**Features to Add**:
- Mode selector (Auto/Manual) ✓ (basic version exists)
- Round type selector with team count validation
- Team selection interface (searchable, multi-select)
- Pairing method selector
- Full bracket toggle
- Preview pairings before creation
- Better styling for dark theme ✓ (in progress)

**Estimated Lines**: ~600-800 lines

### 4.2 BracketVisualization Component
**File**: `components/tournament/BracketVisualization.tsx` (NEW)

**Features**:
- Visual bracket tree display
- Shows all rounds in columns
- Lines connecting pairings
- Team logos and names
- Placeholder text for unresolved teams
- Winner highlighting
- Click to view match details

**Estimated Lines**: ~400-500 lines

### 4.3 PairingEditor Component
**File**: `components/tournament/PairingEditor.tsx` (NEW)

**Features**:
- Modal for editing individual pairings
- Team search and selection
- Swap team positions
- Clear pairing
- Save/Cancel actions

**Estimated Lines**: ~200-300 lines

### 4.4 TeamSelector Component
**File**: `components/tournament/TeamSelector.tsx` (NEW)

**Features**:
- Multi-select interface
- Search/filter teams
- Show team logos and info
- Quick select buttons (Top 4, Top 8, etc.)
- Selected count indicator
- Validation feedback

**Estimated Lines**: ~300-400 lines

---

## Phase 5: Integration & Testing (FINAL)
**Status**: Pending

### 5.1 Tournament Type Integration
- Test GROUP_KNOCKOUT with auto qualification
- Test LEAGUE_PLAYOFF with various formats
- Test KNOCKOUT_ONLY pure bracket
- Test CUSTOM_KNOCKOUT with custom entry points

### 5.2 Match Scheduling Integration
- Link knockout pairings to fixtures
- Create matches when bracket is ready
- Update aggregate scores from match results
- Determine winners automatically

### 5.3 Documentation
- API documentation
- User guide for admins
- Code comments
- Example configurations

---

## Current Status Summary

| Phase | Status | Progress | Blocking Issues |
|-------|--------|----------|-----------------|
| Phase 1: Database | ✅ Ready | 100% | Awaiting execution |
| Phase 2: Server Actions | ⏳ Pending | 0% | Needs Phase 1 |
| Phase 3: API Routes | ⏳ Pending | 0% | Needs Phase 2 |
| Phase 4: UI Components | 🔨 Partial | 20% | Needs Phase 2 & 3, Current UI not displaying |
| Phase 5: Integration | ⏳ Pending | 0% | Needs all above |

---

## Immediate Next Steps

1. **RUN MIGRATION** ← YOU ARE HERE
   ```bash
   node run-knockout-migration.js
   ```

2. **Fix Current UI Display Issue**
   - Debug why KnockoutManager not showing
   - Verify component rendering
   - Check parent container CSS

3. **Implement Phase 2 Core Functions**
   - Start with auto qualification logic
   - Then manual selection
   - Then bracket generation

4. **Create API Routes** (Phase 3)

5. **Enhance UI Components** (Phase 4)

6. **Test Everything** (Phase 5)

---

## Estimated Total Effort

- **Database**: 1 hour (✅ DONE)
- **Server Actions**: 8-10 hours
- **API Routes**: 3-4 hours  
- **UI Components**: 10-12 hours
- **Integration & Testing**: 4-5 hours
- **Documentation**: 2-3 hours

**TOTAL**: ~30-35 hours of development time

---

## Notes

- This is a comprehensive, production-ready implementation
- Each phase builds on the previous
- Code quality and error handling are prioritized
- Following existing project patterns and conventions
- Fully typed with TypeScript
- Includes proper validation and security checks

---

Last Updated: 2025-01-27
