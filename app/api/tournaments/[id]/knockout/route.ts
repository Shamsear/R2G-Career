import { NextRequest, NextResponse } from 'next/server';
import { getTournamentDb } from '@/lib/neon/tournament-config';
import { KnockoutService } from '@/lib/knockout/knockout-service';
import { CreateKnockoutRoundInput, RoundName } from '@/lib/knockout/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET - Get all knockout rounds for a tournament
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const sql = getTournamentDb();
    const params = await context.params;
    const tournamentId = params.id;

    const service = new KnockoutService(sql);
    const rounds = await service.getKnockoutRounds(tournamentId);

    return NextResponse.json({
      success: true,
      rounds
    });
  } catch (error: any) {
    console.error('Error fetching knockout rounds:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch knockout rounds' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new knockout round
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const sql = getTournamentDb();
    const params = await context.params;
    const tournamentId = params.id;
    const body = await request.json();

    const {
      roundName,
      legs = 2,
      mode = 'AUTO', // 'AUTO' or 'MANUAL'
      teams = [], // For MANUAL mode: [{ id, name, seed }]
      pairingMethod = 'AUTO_SEED', // 'AUTO_SEED', 'CONSECUTIVE', 'CUSTOM'
      customPairings = [], // For CUSTOM: [{ team1Id, team2Id }]
      createFullBracket = false
    } = body;

    // Validation
    if (!roundName) {
      return NextResponse.json(
        { success: false, error: 'roundName is required' },
        { status: 400 }
      );
    }

    const validRounds: RoundName[] = [
      'ROUND_OF_32',
      'ROUND_OF_16',
      'QUARTER_FINAL',
      'SEMI_FINAL',
      'THIRD_PLACE',
      'FINAL'
    ];

    if (!validRounds.includes(roundName)) {
      return NextResponse.json(
        { success: false, error: `Invalid roundName. Must be one of: ${validRounds.join(', ')}` },
        { status: 400 }
      );
    }

    // Create input
    const input: CreateKnockoutRoundInput = {
      tournamentId,
      roundName: roundName as RoundName,
      legs,
      mode,
      teams,
      pairingMethod,
      customPairings,
      createFullBracket
    };

    const service = new KnockoutService(sql);
    const round = await service.createKnockoutRound(input);

    return NextResponse.json({
      success: true,
      message: `Knockout round ${roundName} created successfully`,
      round
    });
  } catch (error: any) {
    console.error('Error creating knockout round:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create knockout round' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete all knockout rounds (reset bracket)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const sql = getTournamentDb();
    const params = await context.params;
    const tournamentId = params.id;

    const service = new KnockoutService(sql);
    await service.deleteAllRounds(tournamentId);

    return NextResponse.json({
      success: true,
      message: 'All knockout rounds deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting knockout rounds:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete knockout rounds' },
      { status: 500 }
    );
  }
}
