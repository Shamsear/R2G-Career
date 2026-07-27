import { NextRequest, NextResponse } from 'next/server';
import { getTournamentDb } from '@/lib/neon/tournament-config';

/**
 * PATCH /api/solo/tournaments/[tournamentId]/knockout/pairings/[pairingId]
 * Update a specific pairing (edit teams, set winner)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string; pairingId: string }> }
) {
  try {
    const { pairingId } = await params;
    const body = await request.json();
    const { team1Id, team2Id, winnerId } = body;

    const sql = getTournamentDb();

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (team1Id !== undefined) {
      updates.push(`team1_id = $${paramIndex}`);
      values.push(team1Id || null);
      paramIndex++;
      // Clear placeholder when setting actual team
      updates.push(`team1_placeholder = NULL`);
    }

    if (team2Id !== undefined) {
      updates.push(`team2_id = $${paramIndex}`);
      values.push(team2Id || null);
      paramIndex++;
      // Clear placeholder when setting actual team
      updates.push(`team2_placeholder = NULL`);
    }

    if (winnerId !== undefined) {
      updates.push(`winner_id = $${paramIndex}`);
      values.push(winnerId || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Add pairingId as the last parameter
    values.push(pairingId);

    const updateQuery = `
      UPDATE knockout_pairings 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await sql.unsafe(updateQuery, values);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Pairing not found' }, { status: 404 });
    }

    // If winner was set, check if we need to update next round pairings
    if (winnerId !== undefined && winnerId !== null) {
      await resolveNextRoundPairings(sql, pairingId, winnerId);
    }

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error('Error updating pairing:', error);
    return NextResponse.json(
      { error: 'Failed to update pairing', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/solo/tournaments/[tournamentId]/knockout/pairings/[pairingId]
 * Delete a specific pairing
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string; pairingId: string }> }
) {
  try {
    const { pairingId } = await params;
    const sql = getTournamentDb();

    await sql`
      DELETE FROM knockout_pairings WHERE id = ${pairingId}
    `;

    return NextResponse.json({ message: 'Pairing deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting pairing:', error);
    return NextResponse.json(
      { error: 'Failed to delete pairing', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Resolve placeholders in next round when a pairing winner is determined
 */
async function resolveNextRoundPairings(sql: any, completedPairingId: string, winnerId: string) {
  try {
    // Get the current pairing details
    const [currentPairing] = await sql`
      SELECT kp.*, kr.round_name, kr.round_order, kr.tournament_id
      FROM knockout_pairings kp
      JOIN knockout_rounds kr ON kr.id = kp.knockout_round_id
      WHERE kp.id = ${completedPairingId}
    `;

    if (!currentPairing) return;

    const { round_name, round_order, pairing_order, tournament_id } = currentPairing;

    // Find next round
    const nextRound = await sql`
      SELECT * FROM knockout_rounds
      WHERE tournament_id = ${tournament_id}
        AND round_order > ${round_order}
      ORDER BY round_order ASC
      LIMIT 1
    `;

    if (nextRound.length === 0) return; // No next round (this was the final)

    const nextRoundId = nextRound[0].id;

    // Update placeholders in next round that reference this match
    const placeholderText = `Winner of ${round_name} #${pairing_order}`;

    // Update team1 placeholders
    await sql`
      UPDATE knockout_pairings
      SET team1_id = ${winnerId}, team1_placeholder = NULL, updated_at = NOW()
      WHERE knockout_round_id = ${nextRoundId}
        AND team1_placeholder = ${placeholderText}
    `;

    // Update team2 placeholders
    await sql`
      UPDATE knockout_pairings
      SET team2_id = ${winnerId}, team2_placeholder = NULL, updated_at = NOW()
      WHERE knockout_round_id = ${nextRoundId}
        AND team2_placeholder = ${placeholderText}
    `;
  } catch (error) {
    console.error('Error resolving next round pairings:', error);
    // Don't throw - this is a background operation
  }
}
