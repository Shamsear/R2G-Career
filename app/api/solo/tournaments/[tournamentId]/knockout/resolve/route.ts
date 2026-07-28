/**
 * Knockout Placeholder Resolution API Route
 * 
 * Endpoints:
 * POST /api/solo/tournaments/[tournamentId]/knockout/resolve - Manually resolve placeholders
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveKnockoutPlaceholders } from '@/utils/solo/serverActions';

/**
 * POST - Manually resolve all placeholders for a tournament
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

    const result = await resolveKnockoutPlaceholders(tournamentIdNum);

    return NextResponse.json({
      success: true,
      message: `Resolved ${result.resolvedCount} placeholder(s)`,
      ...result
    });
  } catch (error: any) {
    console.error('POST /api/solo/tournaments/[id]/knockout/resolve error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resolve placeholders' },
      { status: 500 }
    );
  }
}
