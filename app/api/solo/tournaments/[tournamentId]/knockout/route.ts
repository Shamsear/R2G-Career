import { NextRequest, NextResponse } from 'next/server';
import { getTournamentDb } from '@/lib/neon/tournament-config';

/**
 * GET /api/solo/tournaments/[tournamentId]/knockout
 * Fetch all knockout rounds and pairings for a tournament
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const sql = getTournamentDb();

    // Fetch all knockout rounds with their pairings
    const rounds = await sql`
      SELECT 
        kr.*,
        json_agg(
          json_build_object(
            'id', kp.id,
            'pairingOrder', kp.pairing_order,
            'team1Id', kp.team1_id,
            'team2Id', kp.team2_id,
            'team1Placeholder', kp.team1_placeholder,
            'team2Placeholder', kp.team2_placeholder,
            'winnerId', kp.winner_id,
            'leg1MatchId', kp.leg1_match_id,
            'leg2MatchId', kp.leg2_match_id,
            'team1', t1.row_to_json,
            'team2', t2.row_to_json
          ) ORDER BY kp.pairing_order
        ) as pairings
      FROM knockout_rounds kr
      LEFT JOIN knockout_pairings kp ON kp.knockout_round_id = kr.id
      LEFT JOIN LATERAL (
        SELECT json_build_object(
          'id', tc.club_id,
          'name', COALESCE(tc.custom_name, c.name),
          'logo', COALESCE(tc.custom_logo, c.logo_path),
          'manager', m.name
        ) as row_to_json
        FROM tournament_clubs tc
        LEFT JOIN clubs c ON c.id = tc.club_id
        LEFT JOIN managers m ON m.club_id = c.id
        WHERE tc.club_id = kp.team1_id AND tc.tournament_id = kr.tournament_id
      ) t1 ON true
      LEFT JOIN LATERAL (
        SELECT json_build_object(
          'id', tc.club_id,
          'name', COALESCE(tc.custom_name, c.name),
          'logo', COALESCE(tc.custom_logo, c.logo_path),
          'manager', m.name
        ) as row_to_json
        FROM tournament_clubs tc
        LEFT JOIN clubs c ON c.id = tc.club_id
        LEFT JOIN managers m ON m.club_id = c.id
        WHERE tc.club_id = kp.team2_id AND tc.tournament_id = kr.tournament_id
      ) t2 ON true
      WHERE kr.tournament_id = ${tournamentId}
      GROUP BY kr.id
      ORDER BY kr.round_order
    `;

    return NextResponse.json(rounds);
  } catch (error: any) {
    console.error('Error fetching knockout rounds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knockout rounds', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/solo/tournaments/[tournamentId]/knockout
 * Create knockout round(s) with pairings
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const body = await request.json();
    const {
      roundName,
      legs = 2,
      teams = [],
      autoPair = false,
      customPairings = [],
      createFullBracket = false,
      mode = 'manual' // 'manual' or 'auto'
    } = body;

    const sql = getTournamentDb();

    // Validate round name
    const validRounds = ['ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL'];
    if (!validRounds.includes(roundName)) {
      return NextResponse.json(
        { error: `Invalid round name. Must be one of: ${validRounds.join(', ')}` },
        { status: 400 }
      );
    }

    // Get round order and required team count
    const roundOrder = {
      'ROUND_OF_32': 0,
      'ROUND_OF_16': 1,
      'QUARTER_FINAL': 2,
      'SEMI_FINAL': 3,
      'THIRD_PLACE': 4,
      'FINAL': 5
    }[roundName];

    const requiredTeams = {
      'ROUND_OF_32': 32,
      'ROUND_OF_16': 16,
      'QUARTER_FINAL': 8,
      'SEMI_FINAL': 4,
      'THIRD_PLACE': 2,
      'FINAL': 2
    }[roundName];

    // Fetch tournament details
    const tournament = await sql`
      SELECT * FROM tournaments WHERE id = ${tournamentId}
    `;

    if (!tournament || tournament.length === 0) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const tournamentData = tournament[0];

    // Check if round already exists
    const existing = await sql`
      SELECT id FROM knockout_rounds 
      WHERE tournament_id = ${tournamentId} AND round_name = ${roundName}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'This knockout round already exists' },
        { status: 400 }
      );
    }

    // Create the round
    const [newRound] = await sql`
      INSERT INTO knockout_rounds (tournament_id, round_name, round_order, legs, status)
      VALUES (${tournamentId}, ${roundName}, ${roundOrder}, ${legs}, 'PENDING')
      RETURNING *
    `;

    // Generate pairings based on mode
    let pairings = [];

    if (mode === 'auto') {
      // Auto mode: Create placeholders based on tournament type
      pairings = await generateAutoPlaceholders(sql, tournamentData, roundName, requiredTeams);
    } else {
      // Manual mode: Validate team count
      if (teams.length !== requiredTeams) {
        // Clean up the round we just created
        await sql`DELETE FROM knockout_rounds WHERE id = ${newRound.id}`;
        return NextResponse.json(
          { error: `This round requires exactly ${requiredTeams} teams, but ${teams.length} were provided` },
          { status: 400 }
        );
      }

      // Generate pairings from teams
      if (customPairings.length > 0) {
        pairings = customPairings;
      } else if (autoPair) {
        // Auto-seed pairing: 1 vs last, 2 vs second-last
        for (let i = 0; i < teams.length / 2; i++) {
          pairings.push({
            team1Id: teams[i],
            team2Id: teams[teams.length - 1 - i]
          });
        }
      } else {
        // Consecutive pairing: 1v2, 3v4, 5v6
        for (let i = 0; i < teams.length; i += 2) {
          pairings.push({
            team1Id: teams[i],
            team2Id: teams[i + 1]
          });
        }
      }
    }

    // Insert pairings
    for (let i = 0; i < pairings.length; i++) {
      const pairing = pairings[i];
      await sql`
        INSERT INTO knockout_pairings (
          knockout_round_id,
          pairing_order,
          team1_id,
          team2_id,
          team1_placeholder,
          team2_placeholder
        ) VALUES (
          ${newRound.id},
          ${i + 1},
          ${pairing.team1Id || null},
          ${pairing.team2Id || null},
          ${pairing.team1Placeholder || null},
          ${pairing.team2Placeholder || null}
        )
      `;
    }

    // Create full bracket if requested
    if (createFullBracket) {
      await createSubsequentRounds(sql, tournamentId, roundName, roundOrder, legs);
    }

    // Fetch the complete round with pairings
    const result = await sql`
      SELECT 
        kr.*,
        json_agg(
          json_build_object(
            'id', kp.id,
            'pairingOrder', kp.pairing_order,
            'team1Id', kp.team1_id,
            'team2Id', kp.team2_id,
            'team1Placeholder', kp.team1_placeholder,
            'team2Placeholder', kp.team2_placeholder
          ) ORDER BY kp.pairing_order
        ) as pairings
      FROM knockout_rounds kr
      LEFT JOIN knockout_pairings kp ON kp.knockout_round_id = kr.id
      WHERE kr.id = ${newRound.id}
      GROUP BY kr.id
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating knockout round:', error);
    return NextResponse.json(
      { error: 'Failed to create knockout round', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/solo/tournaments/[tournamentId]/knockout
 * Delete all knockout rounds for a tournament (reset bracket)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const sql = getTournamentDb();

    // Delete all knockout rounds (pairings will cascade)
    await sql`
      DELETE FROM knockout_rounds WHERE tournament_id = ${tournamentId}
    `;

    return NextResponse.json({ message: 'All knockout rounds deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting knockout rounds:', error);
    return NextResponse.json(
      { error: 'Failed to delete knockout rounds', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate auto-qualification placeholders based on tournament type
 */
async function generateAutoPlaceholders(sql: any, tournament: any, roundName: string, requiredTeams: number) {
  const pairings = [];
  const formatType = tournament.format_type;
  const numGroups = tournament.num_groups;
  const qualifiedPerGroup = tournament.qualified_per_group || tournament.group_qualifiers;

  if (formatType === 'Group Stage' && numGroups && qualifiedPerGroup) {
    // GROUP_KNOCKOUT logic
    const totalQualifiers = numGroups * qualifiedPerGroup;
    
    if (roundName === 'QUARTER_FINAL' && requiredTeams === 8) {
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
    } else if (roundName === 'SEMI_FINAL' && requiredTeams === 4) {
      if (numGroups === 2 && qualifiedPerGroup === 2) {
        pairings.push(
          { team1Placeholder: 'Group A #1', team2Placeholder: 'Group B #2' },
          { team1Placeholder: 'Group B #1', team2Placeholder: 'Group A #2' }
        );
      } else if (numGroups === 4 && qualifiedPerGroup === 1) {
        pairings.push(
          { team1Placeholder: 'Group A Winner', team2Placeholder: 'Group B Winner' },
          { team1Placeholder: 'Group C Winner', team2Placeholder: 'Group D Winner' }
        );
      }
    } else if (roundName === 'FINAL' && requiredTeams === 2) {
      pairings.push(
        { team1Placeholder: 'Group A Winner', team2Placeholder: 'Group B Winner' }
      );
    }
  } else if (formatType === 'League' || formatType === 'League Format') {
    // LEAGUE_PLAYOFF logic
    if (roundName === 'SEMI_FINAL' && requiredTeams === 4) {
      pairings.push(
        { team1Placeholder: 'League #1', team2Placeholder: 'League #4' },
        { team1Placeholder: 'League #2', team2Placeholder: 'League #3' }
      );
    } else if (roundName === 'FINAL' && requiredTeams === 2) {
      pairings.push(
        { team1Placeholder: 'League #1', team2Placeholder: 'League #2' }
      );
    }
  }

  // Fallback: Generic seed-based placeholders
  if (pairings.length === 0) {
    for (let i = 1; i <= requiredTeams / 2; i++) {
      pairings.push({
        team1Placeholder: `Seed #${i}`,
        team2Placeholder: `Seed #${requiredTeams + 1 - i}`
      });
    }
  }

  return pairings;
}

/**
 * Create subsequent rounds for full bracket generation
 */
async function createSubsequentRounds(sql: any, tournamentId: string, startRoundName: string, startOrder: number, legs: number) {
  const roundSequence = [
    { name: 'ROUND_OF_32', order: 0, teams: 32 },
    { name: 'ROUND_OF_16', order: 1, teams: 16 },
    { name: 'QUARTER_FINAL', order: 2, teams: 8 },
    { name: 'SEMI_FINAL', order: 3, teams: 4 },
    { name: 'FINAL', order: 5, teams: 2 }
  ];

  // Find rounds after the starting round
  const subsequentRounds = roundSequence.filter(r => r.order > startOrder);

  for (const roundDef of subsequentRounds) {
    // Create the round
    const [newRound] = await sql`
      INSERT INTO knockout_rounds (tournament_id, round_name, round_order, legs, status)
      VALUES (${tournamentId}, ${roundDef.name}, ${roundDef.order}, ${legs}, 'PENDING')
      RETURNING *
    `;

    // Create placeholder pairings referencing previous round winners
    const pairingCount = roundDef.teams / 2;
    const prevRoundOrder = roundDef.order - 1;

    // Find the previous round name
    const prevRound = roundSequence.find(r => r.order === prevRoundOrder);
    if (!prevRound) continue;

    for (let i = 0; i < pairingCount; i++) {
      await sql`
        INSERT INTO knockout_pairings (
          knockout_round_id,
          pairing_order,
          team1_placeholder,
          team2_placeholder
        ) VALUES (
          ${newRound.id},
          ${i + 1},
          ${`Winner of ${prevRound.name} #${i * 2 + 1}`},
          ${`Winner of ${prevRound.name} #${i * 2 + 2}`}
        )
      `;
    }
  }
}
