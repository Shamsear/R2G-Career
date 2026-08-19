/**
 * Knockout Tournament Helper Functions
 * 
 * This module contains all the business logic for knockout tournament management:
 * - Auto qualification with placeholder generation
 * - Manual team selection and pairing
 * - Full bracket generation
 * - Placeholder resolution
 * - Bracket validation and utilities
 */

import { Pool } from 'pg';

// Types
export interface KnockoutRound {
  id: string;
  tournament_id: number;
  round_name: string;
  round_order: number;
  legs: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  creation_mode: 'AUTO' | 'MANUAL';
  pairing_method: 'AUTO_SEED' | 'CONSECUTIVE' | 'CUSTOM';
  is_full_bracket: boolean;
  pairings?: KnockoutPairing[];
}

export interface KnockoutPairing {
  id: string;
  knockout_round_id: string;
  pairing_order: number;
  team1_id?: number;
  team2_id?: number;
  team1_placeholder?: string;
  team2_placeholder?: string;
  winner_id?: number;
  leg1_match_id?: number;
  leg2_match_id?: number;
  source_pairing_1_id?: string;
  source_pairing_2_id?: string;
}

export interface BracketStructure {
  rounds: Array<{
    roundName: string;
    roundOrder: number;
    numPairings: number;
  }>;
}

// Constants
export const ROUND_NAMES = {
  ROUND_OF_32: { order: 0, teams: 32, pairings: 16 },
  ROUND_OF_16: { order: 1, teams: 16, pairings: 8 },
  QUARTER_FINAL: { order: 2, teams: 8, pairings: 4 },
  SEMI_FINAL: { order: 3, teams: 4, pairings: 2 },
  THIRD_PLACE: { order: 4, teams: 2, pairings: 1 },
  FINAL: { order: 5, teams: 2, pairings: 1 }
} as const;

export type RoundName = keyof typeof ROUND_NAMES;

// ============================================================================
// AUTO QUALIFICATION LOGIC
// ============================================================================

/**
 * Generate auto-qualification pairings based on tournament type
 */
export async function generateAutoQualificationPairings(
  pool: Pool,
  tournamentId: number,
  roundName: RoundName,
  numTeams: number,
  pairingStrategy?: string
): Promise<Array<{ team1Placeholder: string; team2Placeholder: string }>> {
  // Get tournament details
  const { rows: [tournament] } = await pool.query(
    `SELECT format_type, tournament_type, num_groups, qualified_per_group, knockout_config
     FROM tournaments WHERE id = $1`,
    [tournamentId]
  );

  if (!tournament) {
    throw new Error('Tournament not found');
  }

  const formatType = tournament.format_type;
  const numGroups = tournament.num_groups;
  const qualifiedPerGroup = tournament.qualified_per_group || 2;

  // Determine pairing logic based on tournament type
  if (formatType?.includes('Group')) {
    return generateGroupKnockoutPairings(numTeams, numGroups, qualifiedPerGroup, pairingStrategy || 'CROSS_GROUP');
  } else if (formatType?.includes('League')) {
    return generateLeaguePlayoffPairings(numTeams);
  } else {
    // Pure knockout or fallback
    return generateSeedBasedPairings(numTeams);
  }
}

/**
 * Generate pairings for GROUP + KNOCKOUT tournaments
 */
function generateGroupKnockoutPairings(
  numTeams: number,
  numGroups: number,
  qualifiedPerGroup: number,
  pairingStrategy: string = 'CROSS_GROUP'
): Array<{ team1Placeholder: string; team2Placeholder: string }> {
  const pairings: Array<{ team1Placeholder: string; team2Placeholder: string }> = [];
  const groupNames = 'ABCDEFGH'.split('').slice(0, numGroups);

  if (pairingStrategy === 'RANKED_OVERALL') {
    // Rank all teams by overall position (Seed #1 vs Seed #8, etc.)
    return generateSeedBasedPairings(numTeams);
  }

  if (pairingStrategy === 'CONSECUTIVE_GROUPS') {
    // Consecutive groups: A1 vs B1, C1 vs D1, etc.
    const numPairings = numTeams / 2;
    for (let i = 0; i < numPairings; i++) {
      const group1Idx = i * 2;
      const group2Idx = i * 2 + 1;
      if (group1Idx < numGroups && group2Idx < numGroups) {
        pairings.push({
          team1Placeholder: `Group ${groupNames[group1Idx]} #1`,
          team2Placeholder: `Group ${groupNames[group2Idx]} #1`
        });
      }
    }
    return pairings;
  }

  // Default: CROSS_GROUP strategy (A1 vs B2, B1 vs A2)
  if (numTeams === 8) {
    // Quarter Finals
    if (numGroups === 4 && qualifiedPerGroup === 2) {
      // 4 groups, 2 qualifiers each
      pairings.push(
        { team1Placeholder: 'Group A #1', team2Placeholder: 'Group B #2' },
        { team1Placeholder: 'Group C #1', team2Placeholder: 'Group D #2' },
        { team1Placeholder: 'Group B #1', team2Placeholder: 'Group A #2' },
        { team1Placeholder: 'Group D #1', team2Placeholder: 'Group C #2' }
      );
    } else if (numGroups === 2 && qualifiedPerGroup === 4) {
      // 2 groups, 4 qualifiers each
      pairings.push(
        { team1Placeholder: 'Group A #1', team2Placeholder: 'Group B #4' },
        { team1Placeholder: 'Group A #2', team2Placeholder: 'Group B #3' },
        { team1Placeholder: 'Group B #2', team2Placeholder: 'Group A #3' },
        { team1Placeholder: 'Group B #1', team2Placeholder: 'Group A #4' }
      );
    }
  } else if (numTeams === 4) {
    // Semi Finals
    if (numGroups === 2 && qualifiedPerGroup === 2) {
      pairings.push(
        { team1Placeholder: 'Group A #1', team2Placeholder: 'Group B #2' },
        { team1Placeholder: 'Group B #1', team2Placeholder: 'Group A #2' }
      );
    } else if (numGroups === 4 && qualifiedPerGroup === 1) {
      pairings.push(
        { team1Placeholder: 'Group A #1', team2Placeholder: 'Group B #1' },
        { team1Placeholder: 'Group C #1', team2Placeholder: 'Group D #1' }
      );
    }
  } else if (numTeams === 2) {
    // Final
    pairings.push(
      { team1Placeholder: 'Group A #1', team2Placeholder: 'Group B #1' }
    );
  }

  // If no specific logic matched, fall back to seed-based
  if (pairings.length === 0) {
    return generateSeedBasedPairings(numTeams);
  }

  return pairings;
}

/**
 * Generate pairings for LEAGUE + PLAYOFF tournaments
 */
function generateLeaguePlayoffPairings(
  numTeams: number
): Array<{ team1Placeholder: string; team2Placeholder: string }> {
  const pairings: Array<{ team1Placeholder: string; team2Placeholder: string }> = [];

  if (numTeams === 8) {
    // Quarter Finals - 1v8, 2v7, 3v6, 4v5
    for (let i = 1; i <= 4; i++) {
      pairings.push({
        team1Placeholder: `League #${i}`,
        team2Placeholder: `League #${9 - i}`
      });
    }
  } else if (numTeams === 4) {
    // Semi Finals - 1v4, 2v3
    pairings.push(
      { team1Placeholder: 'League #1', team2Placeholder: 'League #4' },
      { team1Placeholder: 'League #2', team2Placeholder: 'League #3' }
    );
  } else if (numTeams === 2) {
    // Final - 1v2
    pairings.push(
      { team1Placeholder: 'League #1', team2Placeholder: 'League #2' }
    );
  }

  return pairings;
}

/**
 * Generate seed-based pairings (1v8, 2v7, 3v6, 4v5, etc.)
 */
function generateSeedBasedPairings(
  numTeams: number
): Array<{ team1Placeholder: string; team2Placeholder: string }> {
  const pairings: Array<{ team1Placeholder: string; team2Placeholder: string }> = [];
  const numPairings = numTeams / 2;

  for (let i = 1; i <= numPairings; i++) {
    pairings.push({
      team1Placeholder: `Seed #${i}`,
      team2Placeholder: `Seed #${numTeams - i + 1}`
    });
  }

  return pairings;
}

/**
 * Resolve a qualification placeholder to actual team ID
 */
export async function resolveQualificationPlaceholder(
  pool: Pool,
  placeholder: string,
  tournamentId: number
): Promise<number | null> {
  // Parse placeholder format: "Group A #1", "League #3", "Seed #2", "Winner of SEMI_FINAL #1"
  const groupMatch = placeholder.match(/Group ([A-H]) #(\d+)/);
  const leagueMatch = placeholder.match(/League #(\d+)/);
  const seedMatch = placeholder.match(/Seed #(\d+)/);
  const winnerMatch = placeholder.match(/Winner of (\w+) #(\d+)/) || placeholder.match(/Winner of (\w+) Match #(\d+)/);

  try {
    if (groupMatch) {
      const [, groupName, position] = groupMatch;
      const { rows } = await pool.query(
        `SELECT club_id FROM tournament_standings
         WHERE tournament_id = $1 AND group_name = $2
         ORDER BY points DESC, goal_difference DESC
         LIMIT 1 OFFSET $3`,
        [tournamentId, groupName, parseInt(position) - 1]
      );
      return rows[0]?.club_id || null;
    } else if (leagueMatch) {
      const [, position] = leagueMatch;
      const { rows } = await pool.query(
        `SELECT club_id FROM tournament_standings
         WHERE tournament_id = $1
         ORDER BY points DESC, goal_difference DESC
         LIMIT 1 OFFSET $2`,
        [tournamentId, parseInt(position) - 1]
      );
      return rows[0]?.club_id || null;
    } else if (seedMatch) {
      const [, position] = seedMatch;
      const { rows } = await pool.query(
        `SELECT club_id FROM tournament_standings
         WHERE tournament_id = $1
         ORDER BY points DESC, goal_difference DESC
         LIMIT 1 OFFSET $2`,
        [tournamentId, parseInt(position) - 1]
      );
      return rows[0]?.club_id || null;
    } else if (winnerMatch) {
      const [, roundName, pairingOrder] = winnerMatch;
      // Find the round ID for this tournament and roundName
      const { rows: roundRows } = await pool.query(
        `SELECT id FROM knockout_rounds WHERE tournament_id = $1 AND round_name = $2`,
        [tournamentId, roundName]
      );
      if (roundRows.length > 0) {
        // Find the winner_id of the pairing in that round with this pairing_order
        const { rows: pairingRows } = await pool.query(
          `SELECT winner_id FROM knockout_pairings 
           WHERE knockout_round_id = $1 AND pairing_order = $2`,
          [roundRows[0].id, parseInt(pairingOrder)]
        );
        return pairingRows[0]?.winner_id || null;
      }
    }
  } catch (error) {
    console.error('Error resolving placeholder:', placeholder, error);
  }

  return null;
}

// ============================================================================
// MANUAL SELECTION LOGIC
// ============================================================================

/**
 * Create manual knockout pairings with specified pairing method
 */
export function createManualKnockoutPairings(
  teamIds: number[],
  pairingMethod: 'AUTO_SEED' | 'CONSECUTIVE' | 'CUSTOM',
  customPairings?: Array<{ team1Id: number; team2Id: number }>
): Array<{ team1_id: number; team2_id: number }> {
  const pairings: Array<{ team1_id: number; team2_id: number }> = [];

  if (pairingMethod === 'CUSTOM' && customPairings) {
    return customPairings.map(p => ({ team1_id: p.team1Id, team2_id: p.team2Id }));
  }

  if (pairingMethod === 'AUTO_SEED') {
    // 1v8, 2v7, 3v6, 4v5, etc.
    const numPairings = teamIds.length / 2;
    for (let i = 0; i < numPairings; i++) {
      pairings.push({
        team1_id: teamIds[i],
        team2_id: teamIds[teamIds.length - 1 - i]
      });
    }
  } else if (pairingMethod === 'CONSECUTIVE') {
    // 1v2, 3v4, 5v6, 7v8
    for (let i = 0; i < teamIds.length; i += 2) {
      if (i + 1 < teamIds.length) {
        pairings.push({
          team1_id: teamIds[i],
          team2_id: teamIds[i + 1]
        });
      }
    }
  }

  return pairings;
}

/**
 * Validate team selection for knockout round
 */
export async function validateTeamSelection(
  pool: Pool,
  tournamentId: number,
  teamIds: number[],
  roundName: RoundName
): Promise<{ valid: boolean; error?: string }> {
  const requiredTeams = ROUND_NAMES[roundName].teams;

  // Check team count
  if (teamIds.length !== requiredTeams) {
    return {
      valid: false,
      error: `Round ${roundName} requires exactly ${requiredTeams} teams, but ${teamIds.length} were selected`
    };
  }

  // Check for duplicates
  const uniqueTeams = new Set(teamIds);
  if (uniqueTeams.size !== teamIds.length) {
    return {
      valid: false,
      error: 'Duplicate teams detected in selection'
    };
  }

  // Verify all teams are in tournament
  const { rows } = await pool.query(
    `SELECT COUNT(*) as count
     FROM tournament_standings
     WHERE tournament_id = $1 AND club_id = ANY($2::int[])`,
    [tournamentId, teamIds]
  );

  if (parseInt(rows[0].count) !== teamIds.length) {
    return {
      valid: false,
      error: 'One or more selected teams are not participating in this tournament'
    };
  }

  return { valid: true };
}

// ============================================================================
// FULL BRACKET GENERATION
// ============================================================================

/**
 * Calculate bracket structure starting from a given round
 */
export function calculateBracketStructure(
  startingRound: RoundName,
  numTeams: number
): BracketStructure {
  const rounds: Array<{ roundName: string; roundOrder: number; numPairings: number }> = [];
  const roundEntries = Object.entries(ROUND_NAMES);
  const startIndex = roundEntries.findIndex(([name]) => name === startingRound);

  if (startIndex === -1) {
    throw new Error(`Invalid starting round: ${startingRound}`);
  }

  // Add starting round
  const [startName, startInfo] = roundEntries[startIndex];
  rounds.push({
    roundName: startName,
    roundOrder: startInfo.order,
    numPairings: startInfo.pairings
  });

  // Add subsequent rounds until Final
  for (let i = startIndex + 1; i < roundEntries.length; i++) {
    const [roundName, roundInfo] = roundEntries[i];
    
    // Skip THIRD_PLACE in normal progression
    if (roundName === 'THIRD_PLACE') continue;
    
    rounds.push({
      roundName,
      roundOrder: roundInfo.order,
      numPairings: roundInfo.pairings
    });

    // Stop at Final
    if (roundName === 'FINAL') break;
  }

  return { rounds };
}

/**
 * Generate chained placeholders for subsequent rounds
 */
export function generateChainedPlaceholders(
  previousRoundPairings: KnockoutPairing[],
  previousRoundName: RoundName
): Array<{ 
  team1Placeholder: string; 
  team2Placeholder: string;
  source_pairing_1_id: string;
  source_pairing_2_id: string;
}> {
  const pairings: Array<{ 
    team1Placeholder: string; 
    team2Placeholder: string;
    source_pairing_1_id: string;
    source_pairing_2_id: string;
  }> = [];

  // Pair consecutive winners: Winner of Match 1 vs Winner of Match 2, etc.
  for (let i = 0; i < previousRoundPairings.length; i += 2) {
    if (i + 1 < previousRoundPairings.length) {
      const pairing1 = previousRoundPairings[i];
      const pairing2 = previousRoundPairings[i + 1];

      pairings.push({
        team1Placeholder: `Winner of ${previousRoundName} Match #${pairing1.pairing_order}`,
        team2Placeholder: `Winner of ${previousRoundName} Match #${pairing2.pairing_order}`,
        source_pairing_1_id: pairing1.id,
        source_pairing_2_id: pairing2.id
      });
    }
  }

  return pairings;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get next round name in sequence
 */
export function getNextRoundName(currentRound: RoundName): RoundName | null {
  const mapping: Record<RoundName, RoundName | null> = {
    ROUND_OF_32: 'ROUND_OF_16',
    ROUND_OF_16: 'QUARTER_FINAL',
    QUARTER_FINAL: 'SEMI_FINAL',
    SEMI_FINAL: 'FINAL',
    THIRD_PLACE: null,
    FINAL: null
  };

  return mapping[currentRound];
}

/**
 * Check if round already exists
 */
export async function roundExists(
  pool: Pool,
  tournamentId: number,
  roundName: RoundName
): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT COUNT(*) as count FROM knockout_rounds
     WHERE tournament_id = $1 AND round_name = $2`,
    [tournamentId, roundName]
  );

  return parseInt(rows[0].count) > 0;
}

/**
 * Get tournament type and configuration
 */
export async function getTournamentConfig(
  pool: Pool,
  tournamentId: number
): Promise<{
  formatType: string;
  tournamentType: string;
  numGroups?: number;
  qualifiedPerGroup?: number;
  knockoutConfig?: any;
}> {
  const { rows: [tournament] } = await pool.query(
    `SELECT format_type, tournament_type, num_groups, qualified_per_group, knockout_config
     FROM tournaments WHERE id = $1`,
    [tournamentId]
  );

  if (!tournament) {
    throw new Error('Tournament not found');
  }

  return {
    formatType: tournament.format_type,
    tournamentType: tournament.tournament_type,
    numGroups: tournament.num_groups,
    qualifiedPerGroup: tournament.qualified_per_group,
    knockoutConfig: tournament.knockout_config
  };
}
