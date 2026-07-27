/**
 * Knockout Tournament Service
 * Complete knockout bracket management with auto-qualification and manual selection
 */

import { nanoid } from 'nanoid';
import {
  KnockoutRound,
  KnockoutPairing,
  CreateKnockoutRoundInput,
  RoundName,
  ROUND_ORDER,
  ROUND_TEAM_COUNTS,
  getNextRound,
  TournamentFormat,
  KnockoutRoundWithPairings
} from './types';
import { generateAutoPlaceholders, generateWinnerPlaceholders } from './auto-pairing';

export class KnockoutService {
  constructor(private sql: any) {}

  /**
   * Create a knockout round with pairings
   */
  async createKnockoutRound(input: CreateKnockoutRoundInput): Promise<KnockoutRoundWithPairings> {
    const { tournamentId, roundName, legs, mode, teams, pairingMethod, customPairings, createFullBracket } = input;

    // Validate round doesn't already exist
    const existing = await this.getRound(tournamentId, roundName);
    if (existing) {
      throw new Error(`Knockout round ${roundName} already exists for this tournament`);
    }

    // Get tournament info
    const tournament = await this.getTournamentInfo(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Determine team count for this round
    const teamCount = ROUND_TEAM_COUNTS[roundName];
    const numPairings = teamCount / 2;

    // Create the knockout round
    const roundId = `kr_${nanoid(12)}`;
    const roundOrder = ROUND_ORDER[roundName];

    await this.sql`
      INSERT INTO knockout_rounds (
        id, tournament_id, round_name, round_order, legs, status, created_at, updated_at
      ) VALUES (
        ${roundId}, ${tournamentId}, ${roundName}, ${roundOrder}, ${legs}, 'PENDING', NOW(), NOW()
      )
    `;

    const round: KnockoutRound = {
      id: roundId,
      tournamentId,
      roundName,
      roundOrder,
      legs,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create pairings based on mode
    let pairings: KnockoutPairing[] = [];

    if (mode === 'AUTO') {
      // Auto-qualification mode with placeholders
      pairings = await this.createAutoPlaceholderPairings(roundId, roundName, numPairings, tournament);
    } else {
      // Manual selection mode
      if (!teams || teams.length !== teamCount) {
        throw new Error(`Manual mode requires exactly ${teamCount} teams for ${roundName}`);
      }
      pairings = await this.createManualPairings(roundId, teams, pairingMethod || 'AUTO_SEED', customPairings);
    }

    // If createFullBracket is enabled, generate all subsequent rounds
    if (createFullBracket) {
      await this.createSubsequentRounds(tournamentId, roundName, legs);
    }

    return {
      ...round,
      pairings,
      _count: { pairings: pairings.length }
    };
  }

  /**
   * Create auto-qualification placeholder pairings
   */
  private async createAutoPlaceholderPairings(
    roundId: string,
    roundName: RoundName,
    numPairings: number,
    tournament: any
  ): Promise<KnockoutPairing[]> {
    const pairings: KnockoutPairing[] = [];

    // Generate placeholders based on tournament format
    const placeholderPairs = generateAutoPlaceholders(
      {
        format: tournament.tournament_format || 'KNOCKOUT_ONLY',
        numGroups: tournament.num_groups,
        groupQualifiers: tournament.qualified_per_group,
        playoffFormat: tournament.playoff_format
      },
      roundName,
      numPairings * 2
    );

    // If no format-specific placeholders, use winner-based placeholders
    const finalPairs = placeholderPairs.length > 0 
      ? placeholderPairs 
      : generateWinnerPlaceholders(roundName, numPairings);

    for (let i = 0; i < finalPairs.length && i < numPairings; i++) {
      const pairingId = `kp_${nanoid(12)}`;
      const pair = finalPairs[i];

      await this.sql`
        INSERT INTO knockout_pairings (
          id, knockout_round_id, pairing_number,
          team1_id, team2_id,
          team1_placeholder, team2_placeholder,
          winner_id, leg1_match_id, leg2_match_id,
          created_at, updated_at
        ) VALUES (
          ${pairingId}, ${roundId}, ${i + 1},
          NULL, NULL,
          ${pair.team1Placeholder}, ${pair.team2Placeholder},
          NULL, NULL, NULL,
          NOW(), NOW()
        )
      `;

      pairings.push({
        id: pairingId,
        knockoutRoundId: roundId,
        pairingNumber: i + 1,
        team1Placeholder: pair.team1Placeholder,
        team2Placeholder: pair.team2Placeholder,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return pairings;
  }

  /**
   * Create manual team selection pairings
   */
  private async createManualPairings(
    roundId: string,
    teams: Array<{ id: string; name: string; seed?: number }>,
    pairingMethod: string,
    customPairings?: Array<{ team1Id: string; team2Id: string }>
  ): Promise<KnockoutPairing[]> {
    const pairings: KnockoutPairing[] = [];
    let pairs: Array<{ team1: any; team2: any }> = [];

    if (pairingMethod === 'CUSTOM' && customPairings) {
      // Use custom pairings
      pairs = customPairings.map(cp => {
        const team1 = teams.find(t => t.id === cp.team1Id);
        const team2 = teams.find(t => t.id === cp.team2Id);
        return { team1, team2 };
      });
    } else if (pairingMethod === 'AUTO_SEED') {
      // 1 vs Last, 2 vs Second-last seeding
      const sorted = [...teams].sort((a, b) => (a.seed || 0) - (b.seed || 0));
      const numPairs = teams.length / 2;
      for (let i = 0; i < numPairs; i++) {
        pairs.push({
          team1: sorted[i],
          team2: sorted[teams.length - 1 - i]
        });
      }
    } else {
      // CONSECUTIVE: 1 vs 2, 3 vs 4, 5 vs 6
      for (let i = 0; i < teams.length; i += 2) {
        pairs.push({
          team1: teams[i],
          team2: teams[i + 1]
        });
      }
    }

    // Create pairing records
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      if (!pair.team1 || !pair.team2) continue;

      const pairingId = `kp_${nanoid(12)}`;

      await this.sql`
        INSERT INTO knockout_pairings (
          id, knockout_round_id, pairing_number,
          team1_id, team2_id,
          team1_placeholder, team2_placeholder,
          winner_id, leg1_match_id, leg2_match_id,
          created_at, updated_at
        ) VALUES (
          ${pairingId}, ${roundId}, ${i + 1},
          ${pair.team1.id}, ${pair.team2.id},
          NULL, NULL,
          NULL, NULL, NULL,
          NOW(), NOW()
        )
      `;

      pairings.push({
        id: pairingId,
        knockoutRoundId: roundId,
        pairingNumber: i + 1,
        team1Id: pair.team1.id,
        team2Id: pair.team2.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return pairings;
  }

  /**
   * Create all subsequent rounds for full bracket generation
   */
  private async createSubsequentRounds(
    tournamentId: string,
    startingRound: RoundName,
    legs: number
  ): Promise<void> {
    let currentRound: RoundName | null = startingRound;

    while (currentRound) {
      const nextRound = getNextRound(currentRound);
      if (!nextRound) break;

      // Check if next round already exists
      const existing = await this.getRound(tournamentId, nextRound);
      if (existing) break;

      // Create next round with winner-based placeholders
      const teamCount = ROUND_TEAM_COUNTS[nextRound];
      const numPairings = teamCount / 2;
      const roundId = `kr_${nanoid(12)}`;
      const roundOrder = ROUND_ORDER[nextRound];

      // Finals are always single leg
      const finalLegs = nextRound === 'FINAL' ? 1 : legs;

      await this.sql`
        INSERT INTO knockout_rounds (
          id, tournament_id, round_name, round_order, legs, status, created_at, updated_at
        ) VALUES (
          ${roundId}, ${tournamentId}, ${nextRound}, ${roundOrder}, ${finalLegs}, 'PENDING', NOW(), NOW()
        )
      `;

      // Create winner-based placeholders
      const placeholderPairs = generateWinnerPlaceholders(currentRound, numPairings);

      for (let i = 0; i < placeholderPairs.length; i++) {
        const pairingId = `kp_${nanoid(12)}`;
        const pair = placeholderPairs[i];

        await this.sql`
          INSERT INTO knockout_pairings (
            id, knockout_round_id, pairing_number,
            team1_id, team2_id,
            team1_placeholder, team2_placeholder,
            winner_id, leg1_match_id, leg2_match_id,
            created_at, updated_at
          ) VALUES (
            ${pairingId}, ${roundId}, ${i + 1},
            NULL, NULL,
            ${pair.team1Placeholder}, ${pair.team2Placeholder},
            NULL, NULL, NULL,
            NOW(), NOW()
          )
        `;
      }

      currentRound = nextRound;
    }
  }

  /**
   * Get all knockout rounds for a tournament
   */
  async getKnockoutRounds(tournamentId: string): Promise<KnockoutRoundWithPairings[]> {
    const rounds = await this.sql<KnockoutRound[]>`
      SELECT * FROM knockout_rounds
      WHERE tournament_id = ${tournamentId}
      ORDER BY round_order ASC
    `;

    const roundsWithPairings: KnockoutRoundWithPairings[] = [];

    for (const round of rounds) {
      const pairings = await this.sql<KnockoutPairing[]>`
        SELECT * FROM knockout_pairings
        WHERE knockout_round_id = ${round.id}
        ORDER BY pairing_number ASC
      `;

      roundsWithPairings.push({
        ...round,
        pairings,
        _count: { pairings: pairings.length }
      });
    }

    return roundsWithPairings;
  }

  /**
   * Get a specific knockout round
   */
  async getRound(tournamentId: string, roundName: RoundName): Promise<KnockoutRoundWithPairings | null> {
    const rounds = await this.sql<KnockoutRound[]>`
      SELECT * FROM knockout_rounds
      WHERE tournament_id = ${tournamentId}
        AND round_name = ${roundName}
      LIMIT 1
    `;

    if (rounds.length === 0) return null;

    const round = rounds[0];
    const pairings = await this.sql<KnockoutPairing[]>`
      SELECT * FROM knockout_pairings
      WHERE knockout_round_id = ${round.id}
      ORDER BY pairing_number ASC
    `;

    return {
      ...round,
      pairings,
      _count: { pairings: pairings.length }
    };
  }

  /**
   * Update pairing teams (manual override)
   */
  async updatePairing(
    pairingId: string,
    team1Id?: string,
    team2Id?: string
  ): Promise<void> {
    await this.sql`
      UPDATE knockout_pairings
      SET 
        team1_id = ${team1Id || null},
        team2_id = ${team2Id || null},
        updated_at = NOW()
      WHERE id = ${pairingId}
    `;
  }

  /**
   * Delete all knockout rounds for a tournament (reset bracket)
   */
  async deleteAllRounds(tournamentId: string): Promise<void> {
    // Delete pairings first (cascade should handle this, but being explicit)
    await this.sql`
      DELETE FROM knockout_pairings
      WHERE knockout_round_id IN (
        SELECT id FROM knockout_rounds WHERE tournament_id = ${tournamentId}
      )
    `;

    // Delete rounds
    await this.sql`
      DELETE FROM knockout_rounds
      WHERE tournament_id = ${tournamentId}
    `;

    // Delete associated fixtures
    await this.sql`
      DELETE FROM fixtures
      WHERE tournament_id = ${tournamentId}
        AND knockout_round IS NOT NULL
    `;
  }

  /**
   * Get tournament info
   */
  private async getTournamentInfo(tournamentId: string): Promise<any> {
    const result = await this.sql`
      SELECT 
        id, tournament_name, season_id, tournament_format,
        has_group_stage, has_knockout_stage,
        num_groups, qualified_per_group,
        playoff_format, knockout_config
      FROM tournaments
      WHERE id = ${tournamentId}
      LIMIT 1
    `;

    return result[0] || null;
  }

  /**
   * Resolve placeholder to actual team
   * Called when group/league stage completes or when a knockout match finishes
   */
  async resolvePlaceholder(
    tournamentId: string,
    placeholder: string,
    teamId: string
  ): Promise<void> {
    // Update all pairings with this placeholder
    await this.sql`
      UPDATE knockout_pairings kp
      SET 
        team1_id = CASE 
          WHEN kp.team1_placeholder = ${placeholder} THEN ${teamId}
          ELSE kp.team1_id
        END,
        team2_id = CASE 
          WHEN kp.team2_placeholder = ${placeholder} THEN ${teamId}
          ELSE kp.team2_id
        END,
        updated_at = NOW()
      WHERE kp.knockout_round_id IN (
        SELECT id FROM knockout_rounds WHERE tournament_id = ${tournamentId}
      )
      AND (kp.team1_placeholder = ${placeholder} OR kp.team2_placeholder = ${placeholder})
    `;
  }

  /**
   * Mark pairing winner and auto-resolve dependent pairings
   */
  async setWinner(pairingId: string, winnerId: string): Promise<void> {
    // Get the pairing
    const pairings = await this.sql`
      SELECT * FROM knockout_pairings WHERE id = ${pairingId}
    `;

    if (pairings.length === 0) {
      throw new Error('Pairing not found');
    }

    const pairing = pairings[0];

    // Update winner
    await this.sql`
      UPDATE knockout_pairings
      SET winner_id = ${winnerId}, updated_at = NOW()
      WHERE id = ${pairingId}
    `;

    // Get round info
    const rounds = await this.sql`
      SELECT * FROM knockout_rounds WHERE id = ${pairing.knockout_round_id}
    `;

    if (rounds.length === 0) return;

    const round = rounds[0];
    const roundAbbrev = this.getRoundAbbreviation(round.round_name);
    const matchNumber = pairing.pairing_number;

    // Resolve placeholder in next rounds
    const placeholder = `Winner of ${roundAbbrev}${matchNumber}`;
    await this.resolvePlaceholder(round.tournament_id, placeholder, winnerId);
  }

  private getRoundAbbreviation(roundName: string): string {
    const abbrevs: Record<string, string> = {
      'ROUND_OF_32': 'R32-',
      'ROUND_OF_16': 'R16-',
      'QUARTER_FINAL': 'QF',
      'SEMI_FINAL': 'SF',
      'THIRD_PLACE': 'TPP',
      'FINAL': 'F'
    };
    return abbrevs[roundName] || 'M';
  }
}
