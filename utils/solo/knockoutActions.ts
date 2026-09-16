/**
 * Enhanced Knockout Tournament Server Actions
 * 
 * These functions integrate with the knockout helper utilities to provide
 * comprehensive knockout tournament management with auto/manual modes,
 * full bracket generation, and placeholder resolution.
 */

import { Pool } from 'pg';
import {
  generateAutoQualificationPairings,
  createManualKnockoutPairings,
  validateTeamSelection,
  calculateBracketStructure,
  generateChainedPlaceholders,
  getNextRoundName,
  roundExists,
  getTournamentConfig,
  RoundName,
  ROUND_NAMES
} from './knockoutHelpers';

// Assuming pool is exported from serverActions.ts
// You'll need to import or pass it as needed

/**
 * Enhanced Create Knockout Round with full auto/manual support
 */
export async function createKnockoutRoundEnhanced(
  pool: Pool,
  data: {
    tournamentId: number;
    roundName: RoundName;
    legs: number;
    mode: 'AUTO' | 'MANUAL';
    pairingMethod?: 'AUTO_SEED' | 'CONSECUTIVE' | 'CUSTOM';
    pairingStrategy?: string;
    teams?: number[];
    customPairings?: Array<{ team1Id: number; team2Id: number }>;
    createFullBracket?: boolean;
  }
) {
  const {
    tournamentId,
    roundName,
    legs,
    mode,
    pairingMethod = 'AUTO_SEED',
    pairingStrategy = 'CROSS_GROUP',
    teams = [],
    customPairings = [],
    createFullBracket = false
  } = data;

  try {
    // Validate inputs
    if (!ROUND_NAMES[roundName]) {
      throw new Error(`Invalid round name: ${roundName}`);
    }

    // Check if round already exists
    if (await roundExists(pool, tournamentId, roundName)) {
      throw new Error(`Round ${roundName} already exists for this tournament`);
    }

    const roundInfo = ROUND_NAMES[roundName];
    const requiredTeams = roundInfo.teams;

    // Get tournament configuration
    const tournamentConfig = await getTournamentConfig(pool, tournamentId);

    // Create the knockout round
    const { rows: [newRound] } = await pool.query(
      `INSERT INTO knockout_rounds (
        tournament_id, round_name, round_order, legs, status,
        creation_mode, pairing_method, is_full_bracket
      ) VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7)
      RETURNING *`,
      [
        tournamentId,
        roundName,
        roundInfo.order,
        legs,
        mode,
        pairingMethod,
        createFullBracket
      ]
    );

    let createdPairings: any[] = [];

    if (mode === 'AUTO') {
      // AUTO MODE: Generate placeholders
      const autoPairings = await generateAutoQualificationPairings(
        pool,
        tournamentId,
        roundName,
        requiredTeams,
        pairingStrategy
      );

      // Insert pairings with placeholders
      for (let i = 0; i < autoPairings.length; i++) {
        const { team1Placeholder, team2Placeholder } = autoPairings[i];
        
        const { rows: [pairing] } = await pool.query(
          `INSERT INTO knockout_pairings (
            knockout_round_id, pairing_order,
            team1_placeholder, team2_placeholder
          ) VALUES ($1, $2, $3, $4)
          RETURNING *`,
          [newRound.id, i + 1, team1Placeholder, team2Placeholder]
        );

        createdPairings.push(pairing);
      }
    } else {
      // MANUAL MODE: Use selected teams
      
      // Validate team selection
      const validation = await validateTeamSelection(
        pool,
        tournamentId,
        teams,
        roundName
      );

      if (!validation.valid) {
        // Rollback: delete the round
        await pool.query('DELETE FROM knockout_rounds WHERE id = $1', [newRound.id]);
        throw new Error(validation.error);
      }

      // Create pairings from teams
      const manualPairings = createManualKnockoutPairings(
        teams,
        pairingMethod,
        customPairings
      );

      // Insert pairings
      for (let i = 0; i < manualPairings.length; i++) {
        const { team1_id, team2_id } = manualPairings[i];
        
        const { rows: [pairing] } = await pool.query(
          `INSERT INTO knockout_pairings (
            knockout_round_id, pairing_order,
            team1_id, team2_id
          ) VALUES ($1, $2, $3, $4)
          RETURNING *`,
          [newRound.id, i + 1, team1_id, team2_id]
        );

        // Create fixture matches if both teams are set (manual mode)
        if (team1_id && team2_id) {
          // Create leg 1
          const { rows: [leg1Match] } = await pool.query(
            `INSERT INTO fixtures (
              tournament_id, home_club_id, away_club_id, round_number, match_status
            ) VALUES ($1, $2, $3, $4, 'scheduled')
            RETURNING id`,
            [tournamentId, team1_id, team2_id, 100 + roundInfo.order]
          );

          await pool.query(
            `UPDATE knockout_pairings SET leg1_match_id = $1 WHERE id = $2`,
            [leg1Match.id, pairing.id]
          );

          // Create leg 2 for two-leg ties
          if (legs === 2) {
            const { rows: [leg2Match] } = await pool.query(
              `INSERT INTO fixtures (
                tournament_id, home_club_id, away_club_id, round_number, match_status
              ) VALUES ($1, $2, $3, $4, 'scheduled')
              RETURNING id`,
              [tournamentId, team2_id, team1_id, 100 + roundInfo.order] // Reversed for leg 2
            );

            await pool.query(
              `UPDATE knockout_pairings SET leg2_match_id = $1 WHERE id = $2`,
              [leg2Match.id, pairing.id]
            );
          }
        }

        createdPairings.push(pairing);
      }
    }

    // Create full bracket if requested
    if (createFullBracket) {
      await generateFullBracketRounds(
        pool,
        tournamentId,
        roundName,
        legs,
        mode,
        createdPairings
      );
    }

    return {
      success: true,
      round: newRound,
      pairings: createdPairings
    };
  } catch (error: any) {
    console.error('Error creating knockout round:', error);
    throw new Error(`Failed to create knockout round: ${error.message}`);
  }
}

/**
 * Generate full bracket structure from starting round
 */
async function generateFullBracketRounds(
  pool: Pool,
  tournamentId: number,
  startingRound: RoundName,
  legs: number,
  mode: 'AUTO' | 'MANUAL',
  previousRoundPairings: any[]
) {
  const bracketStructure = calculateBracketStructure(startingRound, ROUND_NAMES[startingRound].teams);
  
  // Skip the first round (already created)
  const remainingRounds = bracketStructure.rounds.slice(1);

  let currentRoundPairings = previousRoundPairings;
  let currentRoundName = startingRound;

  for (const roundInfo of remainingRounds) {
    const { roundName: nextRoundName, roundOrder, numPairings } = roundInfo;

    // Create the next round
    const { rows: [nextRound] } = await pool.query(
      `INSERT INTO knockout_rounds (
        tournament_id, round_name, round_order, legs, status,
        creation_mode, pairing_method, is_full_bracket
      ) VALUES ($1, $2, $3, $4, 'PENDING', $5, 'AUTO_SEED', true)
      RETURNING *`,
      [tournamentId, nextRoundName, roundOrder, legs, mode]
    );

    // Generate chained placeholders
    const chainedPairings = generateChainedPlaceholders(
      currentRoundPairings,
      currentRoundName as RoundName
    );

    // Insert pairings with source references
    const newPairings: any[] = [];
    for (let i = 0; i < chainedPairings.length; i++) {
      const {
        team1Placeholder,
        team2Placeholder,
        source_pairing_1_id,
        source_pairing_2_id
      } = chainedPairings[i];

      const { rows: [pairing] } = await pool.query(
        `INSERT INTO knockout_pairings (
          knockout_round_id, pairing_order,
          team1_placeholder, team2_placeholder,
          source_pairing_1_id, source_pairing_2_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          nextRound.id,
          i + 1,
          team1Placeholder,
          team2Placeholder,
          source_pairing_1_id,
          source_pairing_2_id
        ]
      );

      newPairings.push(pairing);
    }

    // Update for next iteration
    currentRoundPairings = newPairings;
    currentRoundName = nextRoundName as RoundName;
  }
}

/**
 * Update knockout pairing teams
 */
export async function updateKnockoutPairingEnhanced(
  pool: Pool,
  pairingId: string,
  data: {
    team1Id?: number | null;
    team2Id?: number | null;
    winnerId?: number | null;
  }
) {
  const { team1Id, team2Id, winnerId } = data;

  try {
    const updates: string[] = [];
    const values: any[] = [pairingId];
    let paramIndex = 2;

    if (team1Id !== undefined) {
      updates.push(`team1_id = $${paramIndex}, team1_placeholder = NULL`);
      values.push(team1Id);
      paramIndex++;
    }

    if (team2Id !== undefined) {
      updates.push(`team2_id = $${paramIndex}, team2_placeholder = NULL`);
      values.push(team2Id);
      paramIndex++;
    }

    if (winnerId !== undefined) {
      updates.push(`winner_id = $${paramIndex}`);
      values.push(winnerId);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = NOW()`);

    const query = `
      UPDATE knockout_pairings
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const { rows: [updated] } = await pool.query(query, values);

    if (!updated) {
      throw new Error('Pairing not found');
    }

    return { success: true, pairing: updated };
  } catch (error: any) {
    console.error('Error updating knockout pairing:', error);
    throw new Error(`Failed to update pairing: ${error.message}`);
  }
}

/**
 * Delete all knockout rounds and pairings for a tournament
 */
export async function deleteAllKnockoutRoundsEnhanced(
  pool: Pool,
  tournamentId: number
) {
  try {
    // Delete all pairings first (cascade should handle this, but being explicit)
    await pool.query(
      `DELETE FROM knockout_pairings
       WHERE knockout_round_id IN (
         SELECT id FROM knockout_rounds WHERE tournament_id = $1
       )`,
      [tournamentId]
    );

    // Delete all rounds
    const { rowCount } = await pool.query(
      `DELETE FROM knockout_rounds WHERE tournament_id = $1`,
      [tournamentId]
    );

    return {
      success: true,
      deletedRounds: rowCount || 0
    };
  } catch (error: any) {
    console.error('Error deleting knockout rounds:', error);
    throw new Error(`Failed to delete knockout rounds: ${error.message}`);
  }
}

/**
 * Manually resolve all placeholders for a tournament
 */
export async function resolveAllPlaceholders(
  pool: Pool,
  tournamentId: number
) {
  try {
    console.log('🔍 [RESOLVE] Starting placeholder resolution for tournament:', tournamentId);
    
    // Import the resolve function
    const { resolveQualificationPlaceholder } = await import('./knockoutHelpers');

    // Get all pairings with placeholders
    const { rows: pairings } = await pool.query(
      `SELECT kp.id, kp.knockout_round_id, kp.team1_placeholder, kp.team2_placeholder,
              kp.team1_id, kp.team2_id,
              kr.legs, kr.round_name, kr.round_order, t.name as tournament_name, t.season_id
       FROM knockout_pairings kp
       JOIN knockout_rounds kr ON kr.id = kp.knockout_round_id
       JOIN tournaments t ON kr.tournament_id = t.id
       WHERE kr.tournament_id = $1
         AND (kp.team1_placeholder IS NOT NULL OR kp.team2_placeholder IS NOT NULL OR (kp.team1_id IS NOT NULL AND kp.team2_id IS NOT NULL AND kp.leg1_match_id IS NULL))
       ORDER BY kr.round_order ASC, kp.pairing_order ASC`,
      [tournamentId]
    );

    console.log('🔍 [RESOLVE] Found pairings with placeholders:', pairings.length);
    console.log('🔍 [RESOLVE] Pairings:', JSON.stringify(pairings, null, 2));

    let resolvedCount = 0;

    for (const pairing of pairings) {
      console.log('🔍 [RESOLVE] Processing pairing:', pairing.id, pairing.round_name);
      
      let team1Id = pairing.team1_id || null;
      let team2Id = pairing.team2_id || null;

      if (pairing.team1_placeholder) {
        console.log('🔍 [RESOLVE] Resolving team1 placeholder:', pairing.team1_placeholder);
        const resolved = await resolveQualificationPlaceholder(
          pool,
          pairing.team1_placeholder,
          tournamentId
        );
        if (resolved !== null) {
          team1Id = resolved;
        }
        console.log('🔍 [RESOLVE] Team1 resolved to:', team1Id);
      }

      if (pairing.team2_placeholder) {
        console.log('🔍 [RESOLVE] Resolving team2 placeholder:', pairing.team2_placeholder);
        const resolved = await resolveQualificationPlaceholder(
          pool,
          pairing.team2_placeholder,
          tournamentId
        );
        if (resolved !== null) {
          team2Id = resolved;
        }
        console.log('🔍 [RESOLVE] Team2 resolved to:', team2Id);
      }

      // Update if we found teams
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (team1Id !== null && (pairing.team1_id === null || pairing.team1_placeholder !== null)) {
        updates.push(`team1_id = $${paramIndex}, team1_placeholder = NULL`);
        values.push(team1Id);
        paramIndex++;
        resolvedCount++;
      }

      if (team2Id !== null && (pairing.team2_id === null || pairing.team2_placeholder !== null)) {
        updates.push(`team2_id = $${paramIndex}, team2_placeholder = NULL`);
        values.push(team2Id);
        paramIndex++;
        resolvedCount++;
      }

      if (updates.length > 0) {
        console.log('🔍 [RESOLVE] Updating pairing with resolved teams');
        values.push(pairing.id);
        await pool.query(
          `UPDATE knockout_pairings
           SET ${updates.join(', ')}, updated_at = NOW()
           WHERE id = $${paramIndex}`,
          values
        );
      }

      // Create fixture matches if both teams are resolved and fixtures don't exist yet
      if (team1Id && team2Id) {
        console.log('🔍 [RESOLVE] Both teams resolved, checking for existing fixtures');
        
        // Check if fixtures already exist
        const { rows: existingFixtures } = await pool.query(
          `SELECT leg1_match_id, leg2_match_id FROM knockout_pairings WHERE id = $1`,
          [pairing.id]
        );

        const existing = existingFixtures[0];
        const legs = pairing.legs || 1;
        const groupName = pairing.round_name.endsWith('_A') ? 'A' : pairing.round_name.endsWith('_B') ? 'B' : null;

        // Create leg 1 if it doesn't exist
        if (!existing.leg1_match_id) {
          console.log('🔍 [RESOLVE] Creating leg 1 fixture');
          const { rows: [leg1Match] } = await pool.query(
            `INSERT INTO fixtures (
              tournament_id, season_id, home_club_id, away_club_id, round_number, match_status, group_name
            ) VALUES ($1, $2, $3, $4, $5, 'scheduled', $6)
            RETURNING id`,
            [tournamentId, pairing.season_id || null, team1Id, team2Id, 100 + pairing.round_order, groupName]
          );
          console.log('🔍 [RESOLVE] Created leg 1 fixture:', leg1Match.id);

          await pool.query(
            `UPDATE knockout_pairings SET leg1_match_id = $1 WHERE id = $2`,
            [leg1Match.id, pairing.id]
          );
          console.log('🔍 [RESOLVE] Linked leg 1 fixture to pairing');
        }

        // Create leg 2 if it's a two-leg tie and doesn't exist
        if (legs === 2 && !existing.leg2_match_id) {
          console.log('🔍 [RESOLVE] Creating leg 2 fixture');
          const { rows: [leg2Match] } = await pool.query(
            `INSERT INTO fixtures (
              tournament_id, season_id, home_club_id, away_club_id, round_number, match_status, group_name
            ) VALUES ($1, $2, $3, $4, $5, 'scheduled', $6)
            RETURNING id`,
            [tournamentId, pairing.season_id || null, team2Id, team1Id, 100 + pairing.round_order, groupName]
          );
          console.log('🔍 [RESOLVE] Created leg 2 fixture:', leg2Match.id);

          await pool.query(
            `UPDATE knockout_pairings SET leg2_match_id = $1 WHERE id = $2`,
            [leg2Match.id, pairing.id]
          );
          console.log('🔍 [RESOLVE] Linked leg 2 fixture to pairing');
        }
      }
    }

    console.log('🔍 [RESOLVE] Resolution complete. Resolved count:', resolvedCount);

    return {
      success: true,
      resolvedCount
    };
  } catch (error: any) {
    console.error('❌ [RESOLVE] Error resolving placeholders:', error);
    throw new Error(`Failed to resolve placeholders: ${error.message}`);
  }
}

/**
 * Get eligible teams for manual selection
 */
export async function getEligibleTeamsForKnockout(
  pool: Pool,
  tournamentId: number
) {
  try {
    const { rows: teams } = await pool.query(
      `SELECT 
        ts.club_id as id,
        m.name as manager_name,
        m.r2g_id,
        c.name as club_name,
        c.logo_path,
        tt.custom_team_name,
        tt.use_existing_club,
        tt.custom_logo_path,
        ts.points,
        ts.goal_difference,
        ts.group_name,
        ROW_NUMBER() OVER (
          PARTITION BY ts.group_name 
          ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC
        ) as group_position,
        ROW_NUMBER() OVER (
          ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC
        ) as overall_position
      FROM tournament_standings ts
      JOIN managers m ON m.id = ts.club_id
      LEFT JOIN clubs c ON c.id = m.id
      JOIN tournaments t ON t.id = ts.tournament_id
      LEFT JOIN tournament_teams tt ON tt.tournament_name = t.name AND tt.club_id = ts.club_id
      WHERE ts.tournament_id = $1
      ORDER BY overall_position`,
      [tournamentId]
    );

    return teams.map(team => ({
      id: team.id,
      name: team.use_existing_club === false && team.custom_team_name
        ? team.custom_team_name
        : team.club_name || team.manager_name,
      logo: team.use_existing_club === false && team.custom_logo_path
        ? team.custom_logo_path
        : team.logo_path,
      manager: team.manager_name,
      r2gId: team.r2g_id,
      points: team.points,
      goalDifference: team.goal_difference,
      groupName: team.group_name,
      groupPosition: team.group_position,
      overallPosition: team.overall_position
    }));
  } catch (error: any) {
    console.error('Error fetching eligible teams:', error);
    throw new Error(`Failed to fetch eligible teams: ${error.message}`);
  }
}

/**
 * Create Playoff Tournament (Single-Path or Dual-Path)
 */
export async function createPlayoffTournamentAction(
  pool: Pool,
  data: {
    tournamentId: number;
    playoffType: 'single' | 'dual';
    legs?: number;
  }
) {
  const { tournamentId, playoffType, legs = 1 } = data;
  try {
    await pool.query('BEGIN');

    // Get tournament and season info
    const { rows: tourneys } = await pool.query('SELECT * FROM tournaments WHERE id = $1', [tournamentId]);
    if (tourneys.length === 0) throw new Error('Tournament not found');
    const tournament = tourneys[0];

    // Clear any existing knockout rounds for this tournament
    await pool.query('DELETE FROM knockout_pairings WHERE knockout_round_id IN (SELECT id FROM knockout_rounds WHERE tournament_id = $1)', [tournamentId]);
    await pool.query('DELETE FROM knockout_rounds WHERE tournament_id = $1', [tournamentId]);
    await pool.query('DELETE FROM fixtures WHERE tournament_id = $1 AND round_number >= 100', [tournamentId]);

    // Fetch top standings
    const { rows: standings } = await pool.query(`
      SELECT ts.club_id, ts.group_name, ts.points, ts.goal_difference, ts.goals_scored,
             ROW_NUMBER() OVER (PARTITION BY ts.group_name ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_scored DESC) as group_pos,
             ROW_NUMBER() OVER (ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_scored DESC) as overall_pos
      FROM tournament_standings ts
      WHERE ts.tournament_id = $1
    `, [tournamentId]);

    if (playoffType === 'single') {
      // Top 4 overall
      const top4 = standings.filter((s: any) => s.overall_pos <= 4).sort((a: any, b: any) => a.overall_pos - b.overall_pos);
      const team1Id = top4[0]?.club_id || null;
      const team2Id = top4[1]?.club_id || null;
      const team3Id = top4[2]?.club_id || null;
      const team4Id = top4[3]?.club_id || null;

      // 1. Playoff 1 (Round 110)
      const { rows: [p1Round] } = await pool.query(`
        INSERT INTO knockout_rounds (tournament_id, round_name, round_order, legs, status, creation_mode, pairing_method, is_full_bracket)
        VALUES ($1, 'PLAYOFF_1', 10, $2, 'PENDING', 'AUTO', 'AUTO_SEED', true) RETURNING *
      `, [tournamentId, legs]);

      const { rows: [p1Pairing] } = await pool.query(`
        INSERT INTO knockout_pairings (knockout_round_id, pairing_order, team1_id, team2_id, team1_placeholder, team2_placeholder)
        VALUES ($1, 1, $2, $3, 'League #1', 'League #2') RETURNING *
      `, [p1Round.id, team1Id, team2Id]);

      // 2. Eliminator (Round 111)
      const { rows: [elimRound] } = await pool.query(`
        INSERT INTO knockout_rounds (tournament_id, round_name, round_order, legs, status, creation_mode, pairing_method, is_full_bracket)
        VALUES ($1, 'ELIMINATOR', 11, $2, 'PENDING', 'AUTO', 'AUTO_SEED', true) RETURNING *
      `, [tournamentId, legs]);

      const { rows: [elimPairing] } = await pool.query(`
        INSERT INTO knockout_pairings (knockout_round_id, pairing_order, team1_id, team2_id, team1_placeholder, team2_placeholder)
        VALUES ($1, 1, $2, $3, 'League #3', 'League #4') RETURNING *
      `, [elimRound.id, team3Id, team4Id]);

      // 3. Playoff 2 (Round 112)
      const { rows: [p2Round] } = await pool.query(`
        INSERT INTO knockout_rounds (tournament_id, round_name, round_order, legs, status, creation_mode, pairing_method, is_full_bracket)
        VALUES ($1, 'PLAYOFF_2', 12, $2, 'PENDING', 'AUTO', 'AUTO_SEED', true) RETURNING *
      `, [tournamentId, legs]);

      const { rows: [p2Pairing] } = await pool.query(`
        INSERT INTO knockout_pairings (knockout_round_id, pairing_order, team1_placeholder, team2_placeholder, source_pairing_1_id, source_pairing_2_id)
        VALUES ($1, 1, 'Loser of PLAYOFF_1 #1', 'Winner of ELIMINATOR #1', $2, $3) RETURNING *
      `, [p2Round.id, p1Pairing.id, elimPairing.id]);

      // 4. Grand Final (Round 113)
      const { rows: [finalRound] } = await pool.query(`
        INSERT INTO knockout_rounds (tournament_id, round_name, round_order, legs, status, creation_mode, pairing_method, is_full_bracket)
        VALUES ($1, 'GRAND_FINAL', 13, 1, 'PENDING', 'AUTO', 'AUTO_SEED', true) RETURNING *
      `, [tournamentId]);

      const { rows: [finalPairing] } = await pool.query(`
        INSERT INTO knockout_pairings (knockout_round_id, pairing_order, team1_placeholder, team2_placeholder, source_pairing_1_id, source_pairing_2_id)
        VALUES ($1, 1, 'Winner of PLAYOFF_1 #1', 'Winner of PLAYOFF_2 #1', $2, $3) RETURNING *
      `, [finalRound.id, p1Pairing.id, p2Pairing.id]);

      // Create fixtures for P1 and Eliminator
      if (team1Id && team2Id) {
        const { rows: [f1] } = await pool.query(`
          INSERT INTO fixtures (tournament_id, season_id, home_club_id, away_club_id, round_number, match_status, group_name)
          VALUES ($1, $2, $3, $4, 110, 'scheduled', NULL) RETURNING id
        `, [tournamentId, tournament.season_id, team1Id, team2Id]);
        await pool.query('UPDATE knockout_pairings SET leg1_match_id = $1 WHERE id = $2', [f1.id, p1Pairing.id]);
        if (legs === 2) {
          const { rows: [f1_2] } = await pool.query(`
            INSERT INTO fixtures (tournament_id, season_id, home_club_id, away_club_id, round_number, match_status, group_name)
            VALUES ($1, $2, $3, $4, 110, 'scheduled', NULL) RETURNING id
          `, [tournamentId, tournament.season_id, team2Id, team1Id]);
          await pool.query('UPDATE knockout_pairings SET leg2_match_id = $1 WHERE id = $2', [f1_2.id, p1Pairing.id]);
        }
      }

      if (team3Id && team4Id) {
        const { rows: [f2] } = await pool.query(`
          INSERT INTO fixtures (tournament_id, season_id, home_club_id, away_club_id, round_number, match_status, group_name)
          VALUES ($1, $2, $3, $4, 111, 'scheduled', NULL) RETURNING id
        `, [tournamentId, tournament.season_id, team3Id, team4Id]);
        await pool.query('UPDATE knockout_pairings SET leg1_match_id = $1 WHERE id = $2', [f2.id, elimPairing.id]);
        if (legs === 2) {
          const { rows: [f2_2] } = await pool.query(`
            INSERT INTO fixtures (tournament_id, season_id, home_club_id, away_club_id, round_number, match_status, group_name)
            VALUES ($1, $2, $3, $4, 111, 'scheduled', NULL) RETURNING id
          `, [tournamentId, tournament.season_id, team4Id, team3Id]);
          await pool.query('UPDATE knockout_pairings SET leg2_match_id = $1 WHERE id = $2', [f2_2.id, elimPairing.id]);
        }
      }

    } else {
      // DUAL PATH (Group A and Group B)
      const grpA = standings.filter((s: any) => s.group_name === 'A' && s.group_pos <= 4).sort((a: any, b: any) => a.group_pos - b.group_pos);
      const grpB = standings.filter((s: any) => s.group_name === 'B' && s.group_pos <= 4).sort((a: any, b: any) => a.group_pos - b.group_pos);

      // --- PATH A ---
      const a1 = grpA[0]?.club_id || null;
      const a2 = grpA[1]?.club_id || null;
      const a3 = grpA[2]?.club_id || null;
      const a4 = grpA[3]?.club_id || null;

      // Round 110: Playoff 1 (A)
      const { rows: [p1RoundA] } = await pool.query(`
        INSERT INTO knockout_rounds (tournament_id, round_name, round_order, legs, status, creation_mode, pairing_method, is_full_bracket)
        VALUES ($1, 'PLAYOFF_1_A', 10, $2, 'PENDING', 'AUTO', 'AUTO_SEED', true) RETURNING *
      `, [tournamentId, legs]);
      const { rows: [p1PairingA] } = await pool.query(`
        INSERT INTO knockout_pairings (knockout_round_id, pairing_order, team1_id, team2_id, team1_placeholder, team2_placeholder)
        VALUES ($1, 1, $2, $3, 'Group A #1', 'Group A #2') RETURNING *
      `, [p1RoundA.id, a1, a2]);

      // Round 111: Eliminator (A)
      const { rows: [elimRoundA] } = await pool.query(`
        INSERT INTO knockout_rounds (tournament_id, round_name, round_order, legs, status, creation_mode, pairing_method, is_full_bracket)
        VALUES ($1, 'ELIMINATOR_A', 11, $2, 'PENDING', 'AUTO', 'AUTO_SEED', true) RETURNING *
      `, [tournamentId, legs]);
      const { rows: [elimPairingA] } = await pool.query(`
        INSERT INTO knockout_pairings (knockout_round_id, pairing_order, team1_id, team2_id, team1_placeholder, team2_placeholder)
        VALUES ($1, 1, $2, $3, 'Group A #3', 'Group A #4') RETURNING *
      `, [elimRoundA.id, a3, a4]);

      // Round 112: Playoff 2 (A)
      const { rows: [p2RoundA] } = await pool.query(`
        INSERT INTO knockout_rounds (tournament_id, round_name, round_order, legs, status, creation_mode, pairing_method, is_full_bracket)
        VALUES ($1, 'PLAYOFF_2_A', 12, $2, 'PENDING', 'AUTO', 'AUTO_SEED', true) RETURNING *
      `, [tournamentId, legs]);
      const { rows: [p2PairingA] } = await pool.query(`
        INSERT INTO knockout_pairings (knockout_round_id, pairing_order, team1_placeholder, team2_placeholder, source_pairing_1_id, source_pairing_2_id)
        VALUES ($1, 1, 'Loser of PLAYOFF_1_A #1', 'Winner of ELIMINATOR_A #1', $2, $3) RETURNING *
      `, [p2RoundA.id, p1PairingA.id, elimPairingA.id]);

      // Round 113: Final A
      const { rows: [finalRoundA] } = await pool.query(`
        INSERT INTO knockout_rounds (tournament_id, round_name, round_order, legs, status, creation_mode, pairing_method, is_full_bracket)
        VALUES ($1, 'FINAL_A', 13, 1, 'PENDING', 'AUTO', 'AUTO_SEED', true) RETURNING *
      `, [tournamentId]);
      const { rows: [finalPairingA] } = await pool.query(`
        INSERT INTO knockout_pairings (knockout_round_id, pairing_order, team1_placeholder, team2_placeholder, source_pairing_1_id, source_pairing_2_id)
        VALUES ($1, 1, 'Winner of PLAYOFF_1_A #1', 'Winner of PLAYOFF_2_A #1', $2, $3) RETURNING *
      `, [finalRoundA.id, p1PairingA.id, p2PairingA.id]);

      // --- PATH B ---
      const b1 = grpB[0]?.club_id || null;
      const b2 = grpB[1]?.club_id || null;
      const b3 = grpB[2]?.club_id || null;
      const b4 = grpB[3]?.club_id || null;

      // Round 110: Playoff 1 (B)
      const { rows: [p1RoundB] } = await pool.query(`
        INSERT INTO knockout_rounds (tournament_id, round_name, round_order, legs, status, creation_mode, pairing_method, is_full_bracket)
        VALUES ($1, 'PLAYOFF_1_B', 10, $2, 'PENDING', 'AUTO', 'AUTO_SEED', true) RETURNING *
      `, [tournamentId, legs]);
      const { rows: [p1PairingB] } = await pool.query(`
        INSERT INTO knockout_pairings (knockout_round_id, pairing_order, team1_id, team2_id, team1_placeholder, team2_placeholder)
        VALUES ($1, 1, $2, $3, 'Group B #1', 'Group B #2') RETURNING *
      `, [p1RoundB.id, b1, b2]);

      // Round 111: Eliminator (B)
      const { rows: [elimRoundB] } = await pool.query(`
        INSERT INTO knockout_rounds (tournament_id, round_name, round_order, legs, status, creation_mode, pairing_method, is_full_bracket)
        VALUES ($1, 'ELIMINATOR_B', 11, $2, 'PENDING', 'AUTO', 'AUTO_SEED', true) RETURNING *
      `, [tournamentId, legs]);
      const { rows: [elimPairingB] } = await pool.query(`
        INSERT INTO knockout_pairings (knockout_round_id, pairing_order, team1_id, team2_id, team1_placeholder, team2_placeholder)
        VALUES ($1, 1, $2, $3, 'Group B #3', 'Group B #4') RETURNING *
      `, [elimRoundB.id, b3, b4]);

      // Round 112: Playoff 2 (B)
      const { rows: [p2RoundB] } = await pool.query(`
        INSERT INTO knockout_rounds (tournament_id, round_name, round_order, legs, status, creation_mode, pairing_method, is_full_bracket)
        VALUES ($1, 'PLAYOFF_2_B', 12, $2, 'PENDING', 'AUTO', 'AUTO_SEED', true) RETURNING *
      `, [tournamentId, legs]);
      const { rows: [p2PairingB] } = await pool.query(`
        INSERT INTO knockout_pairings (knockout_round_id, pairing_order, team1_placeholder, team2_placeholder, source_pairing_1_id, source_pairing_2_id)
        VALUES ($1, 1, 'Loser of PLAYOFF_1_B #1', 'Winner of ELIMINATOR_B #1', $2, $3) RETURNING *
      `, [p2RoundB.id, p1PairingB.id, elimPairingB.id]);

      // Round 113: Final B
      const { rows: [finalRoundB] } = await pool.query(`
        INSERT INTO knockout_rounds (tournament_id, round_name, round_order, legs, status, creation_mode, pairing_method, is_full_bracket)
        VALUES ($1, 'FINAL_B', 13, 1, 'PENDING', 'AUTO', 'AUTO_SEED', true) RETURNING *
      `, [tournamentId]);
      const { rows: [finalPairingB] } = await pool.query(`
        INSERT INTO knockout_pairings (knockout_round_id, pairing_order, team1_placeholder, team2_placeholder, source_pairing_1_id, source_pairing_2_id)
        VALUES ($1, 1, 'Winner of PLAYOFF_1_B #1', 'Winner of PLAYOFF_2_B #1', $2, $3) RETURNING *
      `, [finalRoundB.id, p1PairingB.id, p2PairingB.id]);

      // Create Group A Matches
      if (a1 && a2) {
        const { rows: [fA1] } = await pool.query(`
          INSERT INTO fixtures (tournament_id, season_id, home_club_id, away_club_id, round_number, match_status, group_name)
          VALUES ($1, $2, $3, $4, 110, 'scheduled', 'A') RETURNING id
        `, [tournamentId, tournament.season_id, a1, a2]);
        await pool.query('UPDATE knockout_pairings SET leg1_match_id = $1 WHERE id = $2', [fA1.id, p1PairingA.id]);
        if (legs === 2) {
          const { rows: [fA1_2] } = await pool.query(`
            INSERT INTO fixtures (tournament_id, season_id, home_club_id, away_club_id, round_number, match_status, group_name)
            VALUES ($1, $2, $3, $4, 110, 'scheduled', 'A') RETURNING id
          `, [tournamentId, tournament.season_id, a2, a1]);
          await pool.query('UPDATE knockout_pairings SET leg2_match_id = $1 WHERE id = $2', [fA1_2.id, p1PairingA.id]);
        }
      }
      if (a3 && a4) {
        const { rows: [fA2] } = await pool.query(`
          INSERT INTO fixtures (tournament_id, season_id, home_club_id, away_club_id, round_number, match_status, group_name)
          VALUES ($1, $2, $3, $4, 111, 'scheduled', 'A') RETURNING id
        `, [tournamentId, tournament.season_id, a3, a4]);
        await pool.query('UPDATE knockout_pairings SET leg1_match_id = $1 WHERE id = $2', [fA2.id, elimPairingA.id]);
        if (legs === 2) {
          const { rows: [fA2_2] } = await pool.query(`
            INSERT INTO fixtures (tournament_id, season_id, home_club_id, away_club_id, round_number, match_status, group_name)
            VALUES ($1, $2, $3, $4, 111, 'scheduled', 'A') RETURNING id
          `, [tournamentId, tournament.season_id, a4, a3]);
          await pool.query('UPDATE knockout_pairings SET leg2_match_id = $1 WHERE id = $2', [fA2_2.id, elimPairingA.id]);
        }
      }

      // Create Group B Matches
      if (b1 && b2) {
        const { rows: [fB1] } = await pool.query(`
          INSERT INTO fixtures (tournament_id, season_id, home_club_id, away_club_id, round_number, match_status, group_name)
          VALUES ($1, $2, $3, $4, 110, 'scheduled', 'B') RETURNING id
        `, [tournamentId, tournament.season_id, b1, b2]);
        await pool.query('UPDATE knockout_pairings SET leg1_match_id = $1 WHERE id = $2', [fB1.id, p1PairingB.id]);
        if (legs === 2) {
          const { rows: [fB1_2] } = await pool.query(`
            INSERT INTO fixtures (tournament_id, season_id, home_club_id, away_club_id, round_number, match_status, group_name)
            VALUES ($1, $2, $3, $4, 110, 'scheduled', 'B') RETURNING id
          `, [tournamentId, tournament.season_id, b2, b1]);
          await pool.query('UPDATE knockout_pairings SET leg2_match_id = $1 WHERE id = $2', [fB1_2.id, p1PairingB.id]);
        }
      }
      if (b3 && b4) {
        const { rows: [fB2] } = await pool.query(`
          INSERT INTO fixtures (tournament_id, season_id, home_club_id, away_club_id, round_number, match_status, group_name)
          VALUES ($1, $2, $3, $4, 111, 'scheduled', 'B') RETURNING id
        `, [tournamentId, tournament.season_id, b3, b4]);
        await pool.query('UPDATE knockout_pairings SET leg1_match_id = $1 WHERE id = $2', [fB2.id, elimPairingB.id]);
        if (legs === 2) {
          const { rows: [fB2_2] } = await pool.query(`
            INSERT INTO fixtures (tournament_id, season_id, home_club_id, away_club_id, round_number, match_status, group_name)
            VALUES ($1, $2, $3, $4, 111, 'scheduled', 'B') RETURNING id
          `, [tournamentId, tournament.season_id, b4, b3]);
          await pool.query('UPDATE knockout_pairings SET leg2_match_id = $1 WHERE id = $2', [fB2_2.id, elimPairingB.id]);
        }
      }
    }

    await pool.query('COMMIT');
    return { success: true };
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error('Error creating playoff tournament:', error);
    throw error;
  }
}
