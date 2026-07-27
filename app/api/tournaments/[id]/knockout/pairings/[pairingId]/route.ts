import { NextRequest, NextResponse } from 'next/server';
import { getTournamentDb } from '@/lib/neon/tournament-config';
import { KnockoutService } from '@/lib/knockout/knockout-service';

interface RouteContext {
  params: Promise<{ id: string; pairingId: string }>;
}

/**
 * PATCH - Update a knockout pairing (manual team override)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const sql = getTournamentDb();
    const params = await context.params;
    const { pairingId } = params;
    const body = await request.json();

    const { team1Id, team2Id } = body;

    const service = new KnockoutService(sql);
    await service.updatePairing(pairingId, team1Id, team2Id);

    return NextResponse.json({
      success: true,
      message: 'Pairing updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating pairing:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update pairing' },
      { status: 500 }
    );
  }
}
