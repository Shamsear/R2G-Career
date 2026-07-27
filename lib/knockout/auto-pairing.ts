/**
 * Auto-Qualification Placeholder Generation
 * Creates intelligent placeholders for knockout pairings based on tournament type
 */

import { RoundName, TournamentFormat } from './types';

interface TournamentInfo {
  format: TournamentFormat;
  numGroups?: number;
  groupQualifiers?: number;
  playoffFormat?: string;
}

interface PlaceholderPair {
  team1Placeholder: string;
  team2Placeholder: string;
}

/**
 * Generate placeholder pairings for auto-qualification mode
 */
export function generateAutoPlaceholders(
  tournament: TournamentInfo,
  roundName: RoundName,
  numTeams: number
): PlaceholderPair[] {
  const format = tournament.format;

  // GROUP_KNOCKOUT pairing logic
  if (format === 'GROUP_KNOCKOUT') {
    return generateGroupKnockoutPlaceholders(roundName, numTeams, tournament);
  }

  // LEAGUE_PLAYOFF pairing logic
  if (format === 'LEAGUE_PLAYOFF') {
    return generateLeaguePlayoffPlaceholders(roundName, numTeams, tournament);
  }

  // KNOCKOUT_ONLY or fallback - use seed-based pairing
  return generateSeedBasedPlaceholders(numTeams);
}

/**
 * GROUP_KNOCKOUT placeholder generation
 */
function generateGroupKnockoutPlaceholders(
  roundName: RoundName,
  numTeams: number,
  tournament: TournamentInfo
): PlaceholderPair[] {
  const numGroups = tournament.numGroups || 4;
  const qualifiers = tournament.groupQualifiers || 2;
  const pairs: PlaceholderPair[] = [];

  // Quarter Finals (8 teams)
  if (roundName === 'QUARTER_FINAL' && numTeams === 8) {
    if (numGroups === 4 && qualifiers === 2) {
      // 4 groups, 2 qualifiers each
      pairs.push({ team1Placeholder: 'Group A #1', team2Placeholder: 'Group B #2' });
      pairs.push({ team1Placeholder: 'Group C #1', team2Placeholder: 'Group D #2' });
      pairs.push({ team1Placeholder: 'Group B #1', team2Placeholder: 'Group A #2' });
      pairs.push({ team1Placeholder: 'Group D #1', team2Placeholder: 'Group C #2' });
    } else if (numGroups === 2 && qualifiers === 4) {
      // 2 groups, 4 qualifiers each
      pairs.push({ team1Placeholder: 'Group A #1', team2Placeholder: 'Group B #4' });
      pairs.push({ team1Placeholder: 'Group A #2', team2Placeholder: 'Group B #3' });
      pairs.push({ team1Placeholder: 'Group B #2', team2Placeholder: 'Group A #3' });
      pairs.push({ team1Placeholder: 'Group B #1', team2Placeholder: 'Group A #4' });
    }
  }

  // Semi Finals (4 teams)
  if (roundName === 'SEMI_FINAL' && numTeams === 4) {
    if (numGroups === 2 && qualifiers === 2) {
      // 2 groups, 2 qualifiers each
      pairs.push({ team1Placeholder: 'Group A #1', team2Placeholder: 'Group B #2' });
      pairs.push({ team1Placeholder: 'Group B #1', team2Placeholder: 'Group A #2' });
    } else if (numGroups === 4 && qualifiers === 1) {
      // 4 groups, 1 winner each
      pairs.push({ team1Placeholder: 'Group A Winner', team2Placeholder: 'Group B Winner' });
      pairs.push({ team1Placeholder: 'Group C Winner', team2Placeholder: 'Group D Winner' });
    } else {
      // Fallback to winner of previous round
      pairs.push({ team1Placeholder: 'Winner of QF1', team2Placeholder: 'Winner of QF2' });
      pairs.push({ team1Placeholder: 'Winner of QF3', team2Placeholder: 'Winner of QF4' });
    }
  }

  // Finals (2 teams)
  if (roundName === 'FINAL' && numTeams === 2) {
    if (numGroups === 2) {
      pairs.push({ team1Placeholder: 'Group A Winner', team2Placeholder: 'Group B Winner' });
    } else {
      pairs.push({ team1Placeholder: 'Winner of SF1', team2Placeholder: 'Winner of SF2' });
    }
  }

  // Third Place (2 teams)
  if (roundName === 'THIRD_PLACE' && numTeams === 2) {
    pairs.push({ team1Placeholder: 'Loser of SF1', team2Placeholder: 'Loser of SF2' });
  }

  return pairs;
}

/**
 * LEAGUE_PLAYOFF placeholder generation
 */
function generateLeaguePlayoffPlaceholders(
  roundName: RoundName,
  numTeams: number,
  tournament: TournamentInfo
): PlaceholderPair[] {
  const pairs: PlaceholderPair[] = [];

  // Semi Finals (4 teams)
  if (roundName === 'SEMI_FINAL' && numTeams === 4) {
    pairs.push({ team1Placeholder: 'League #1', team2Placeholder: 'League #4' });
    pairs.push({ team1Placeholder: 'League #2', team2Placeholder: 'League #3' });
  }

  // Finals (2 teams)
  if (roundName === 'FINAL' && numTeams === 2) {
    pairs.push({ team1Placeholder: 'Winner of SF1', team2Placeholder: 'Winner of SF2' });
  }

  // Third Place (2 teams)
  if (roundName === 'THIRD_PLACE' && numTeams === 2) {
    pairs.push({ team1Placeholder: 'Loser of SF1', team2Placeholder: 'Loser of SF2' });
  }

  return pairs;
}

/**
 * Seed-based placeholder generation (fallback)
 */
function generateSeedBasedPlaceholders(numTeams: number): PlaceholderPair[] {
  const pairs: PlaceholderPair[] = [];
  const numPairs = numTeams / 2;

  for (let i = 1; i <= numPairs; i++) {
    const topSeed = i;
    const bottomSeed = numTeams - i + 1;
    pairs.push({
      team1Placeholder: `Seed #${topSeed}`,
      team2Placeholder: `Seed #${bottomSeed}`
    });
  }

  return pairs;
}

/**
 * Generate placeholders referencing previous round winners
 */
export function generateWinnerPlaceholders(
  previousRoundName: RoundName,
  numPairings: number
): PlaceholderPair[] {
  const pairs: PlaceholderPair[] = [];
  const previousRoundPrefix = getRoundAbbreviation(previousRoundName);

  for (let i = 0; i < numPairings; i++) {
    const match1 = i * 2 + 1;
    const match2 = i * 2 + 2;
    pairs.push({
      team1Placeholder: `Winner of ${previousRoundPrefix}${match1}`,
      team2Placeholder: `Winner of ${previousRoundPrefix}${match2}`
    });
  }

  return pairs;
}

/**
 * Get round abbreviation for placeholder text
 */
function getRoundAbbreviation(roundName: RoundName): string {
  const abbrevs: Record<RoundName, string> = {
    'ROUND_OF_32': 'R32-',
    'ROUND_OF_16': 'R16-',
    'QUARTER_FINAL': 'QF',
    'SEMI_FINAL': 'SF',
    'THIRD_PLACE': 'TPP',
    'FINAL': 'F'
  };
  return abbrevs[roundName] || 'M';
}
