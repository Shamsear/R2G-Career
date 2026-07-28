/**
 * Knockout Tournament API Routes
 * 
 * Endpoints:
 * GET    /api/solo/tournaments/[tournamentId]/knockout - Get all knockout rounds
 * POST   /api/solo/tournaments/[tournamentId]/knockout - Create knockout round
 * DELETE /api/solo/tournaments/[tournamentId]/knockout - Delete all knockout rounds
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchKnockoutRounds,
  createKnockoutRoundV2,
  deleteAllKnockoutRoundsV2,
  fetchEligibleKnockoutTeams
} from '@/utils/solo/serverActions';

/**
 * GET - Fetch all knockout rounds and pairings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const tournamentIdNum = parseInt(tournamentId);

    if (isNaN(tournamentIdNum)) {
      return NextResponse.json(
        { error: 'Invalid tournament ID' },
        { status: 400 }
      );
    }

    // Check if requesting eligible teams
    const { searchParams } = new URL(request.url);
    const getTeams = searchParams.get('eligible_teams');

    if (getTeams === 'true') {
      const teams = await fetchEligibleKnockoutTeams(tournamentIdNum);
      return NextResponse.json({ teams });
    }

    // Fetch knockout rounds
    const rounds = await fetchKnockoutRounds(tournamentIdNum);

    return NextResponse.json({
      success: true,
      rounds: rounds || []
    });
  } catch (error: any) {
    console.error('GET /api/solo/tournaments/[id]/knockout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch knockout rounds' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new knockout round
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const tournamentIdNum = parseInt(tournamentId);

    if (isNaN(tournamentIdNum)) {
      return NextResponse.json(
        { error: 'Invalid tournament ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    const { roundName, legs, mode } = body;

    if (!roundName || !legs || !mode) {
      return NextResponse.json(
        { error: 'Missing required fields: roundName, legs, mode' },
        { status: 400 }
      );
    }

    // Validate round name
    const validRounds = ['ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL'];
    if (!validRounds.includes(roundName)) {
      return NextResponse.json(
        { error: `Invalid round name. Must be one of: ${validRounds.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate mode
    if (!['AUTO', 'MANUAL'].includes(mode)) {
      return NextResponse.json(
        { error: 'Mode must be either AUTO or MANUAL' },
        { status: 400 }
      );
    }

    // Validate legs
    if (![1, 2].includes(legs)) {
      return NextResponse.json(
        { error: 'Legs must be 1 or 2' },
        { status: 400 }
      );
    }

    // Create knockout round
    const result = await createKnockoutRoundV2({
      tournamentId: tournamentIdNum,
      roundName: roundName as any,
      legs,
      mode: mode as 'AUTO' | 'MANUAL',
      pairingMethod: body.pairingMethod || 'AUTO_SEED',
      teams: body.teams || [],
      customPairings: body.customPairings || [],
      createFullBracket: body.createFullBracket || false
    });

    return NextResponse.json({
      success: true,
      message: 'Knockout round created successfully',
      ...result
    });
  } catch (error: any) {
    console.error('POST /api/solo/tournaments/[id]/knockout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create knockout round' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete all knockout rounds
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const tournamentIdNum = parseInt(tournamentId);

    if (isNaN(tournamentIdNum)) {
      return NextResponse.json(
        { error: 'Invalid tournament ID' },
        { status: 400 }
      );
    }

    const result = await deleteAllKnockoutRoundsV2(tournamentIdNum);

    return NextResponse.json({
      success: true,
      message: 'All knockout rounds deleted successfully',
      ...result
    });
  } catch (error: any) {
    console.error('DELETE /api/solo/tournaments/[id]/knockout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete knockout rounds' },
      { status: 500 }
    );
  }
}
