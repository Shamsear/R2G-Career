/**
 * Knockout Pairing API Routes
 * 
 * Endpoints:
 * PATCH /api/solo/tournaments/[tournamentId]/knockout/pairings/[pairingId] - Update pairing
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateKnockoutPairingV2 } from '@/utils/solo/serverActions';

/**
 * PATCH - Update a knockout pairing
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string; pairingId: string }> }
) {
  try {
    const { tournamentId, pairingId } = await params;
    const tournamentIdNum = parseInt(tournamentId);

    if (isNaN(tournamentIdNum)) {
      return NextResponse.json(
        { error: 'Invalid tournament ID' },
        { status: 400 }
      );
    }

    if (!pairingId) {
      return NextResponse.json(
        { error: 'Pairing ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Extract update data
    const { team1Id, team2Id, winnerId } = body;

    // At least one field must be provided
    if (team1Id === undefined && team2Id === undefined && winnerId === undefined) {
      return NextResponse.json(
        { error: 'At least one field (team1Id, team2Id, winnerId) must be provided' },
        { status: 400 }
      );
    }

    // Update the pairing
    const result = await updateKnockoutPairingV2(pairingId, {
      team1Id: team1Id !== undefined ? (team1Id === null ? null : parseInt(team1Id)) : undefined,
      team2Id: team2Id !== undefined ? (team2Id === null ? null : parseInt(team2Id)) : undefined,
      winnerId: winnerId !== undefined ? (winnerId === null ? null : parseInt(winnerId)) : undefined
    });

    return NextResponse.json({
      success: true,
      message: 'Pairing updated successfully',
      ...result
    });
  } catch (error: any) {
    console.error('PATCH /api/solo/tournaments/[id]/knockout/pairings/[pairingId] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update pairing' },
      { status: 500 }
    );
  }
}
