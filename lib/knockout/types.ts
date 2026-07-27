/**
 * Knockout Tournament Types and Interfaces
 */

export type TournamentFormat = 
  | 'LEAGUE' 
  | 'KNOCKOUT_ONLY' 
  | 'GROUP_KNOCKOUT' 
  | 'LEAGUE_PLAYOFF' 
  | 'CUSTOM_KNOCKOUT';

export type RoundName = 
  | 'ROUND_OF_32'
  | 'ROUND_OF_16'
  | 'QUARTER_FINAL'
  | 'SEMI_FINAL'
  | 'THIRD_PLACE'
  | 'FINAL';

export type RoundStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export type QualificationMode = 'AUTO' | 'MANUAL';

export type PairingMethod = 'AUTO_SEED' | 'CONSECUTIVE' | 'CUSTOM';

export interface KnockoutConfig {
  defaultLegs: number;
  qualifyingTeams?: number;  // For CUSTOM_KNOCKOUT
  qualifyingRound?: RoundName;  // For CUSTOM_KNOCKOUT
}

export interface KnockoutRound {
  id: string;
  tournamentId: string;
  roundName: RoundName;
  roundOrder: number;
  legs: number;
  status: RoundStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnockoutPairing {
  id: string;
  knockoutRoundId: string;
  pairingNumber: number;
  team1Id?: string;
  team2Id?: string;
  team1Placeholder?: string;
  team2Placeholder?: string;
  winnerId?: string;
  leg1MatchId?: string;
  leg2MatchId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateKnockoutRoundInput {
  tournamentId: string;
  roundName: RoundName;
  legs: number;
  mode: QualificationMode;
  teams?: Array<{ id: string; name: string; seed?: number }>;  // For MANUAL mode
  pairingMethod?: PairingMethod;  // For MANUAL mode
  customPairings?: Array<{ team1Id: string; team2Id: string }>;  // For CUSTOM pairing
  createFullBracket?: boolean;  // Auto-generate all subsequent rounds
}

export interface KnockoutRoundWithPairings extends KnockoutRound {
  pairings: KnockoutPairing[];
  _count?: { pairings: number };
}

export const ROUND_ORDER: Record<RoundName, number> = {
  'ROUND_OF_32': 0,
  'ROUND_OF_16': 1,
  'QUARTER_FINAL': 2,
  'SEMI_FINAL': 3,
  'THIRD_PLACE': 4,
  'FINAL': 5
};

export const ROUND_NAMES: Record<number, RoundName> = {
  0: 'ROUND_OF_32',
  1: 'ROUND_OF_16',
  2: 'QUARTER_FINAL',
  3: 'SEMI_FINAL',
  4: 'THIRD_PLACE',
  5: 'FINAL'
};

export const ROUND_DISPLAY_NAMES: Record<RoundName, string> = {
  'ROUND_OF_32': 'Round of 32',
  'ROUND_OF_16': 'Round of 16',
  'QUARTER_FINAL': 'Quarter Finals',
  'SEMI_FINAL': 'Semi Finals',
  'THIRD_PLACE': 'Third Place Playoff',
  'FINAL': 'Final'
};

export const ROUND_TEAM_COUNTS: Record<RoundName, number> = {
  'ROUND_OF_32': 32,
  'ROUND_OF_16': 16,
  'QUARTER_FINAL': 8,
  'SEMI_FINAL': 4,
  'THIRD_PLACE': 2,
  'FINAL': 2
};

export function getNextRound(currentRound: RoundName): RoundName | null {
  const currentOrder = ROUND_ORDER[currentRound];
  if (currentRound === 'FINAL') return null;
  if (currentRound === 'THIRD_PLACE') return null;
  
  const nextOrder = currentOrder + 1;
  return ROUND_NAMES[nextOrder] || null;
}

export function getRoundForTeamCount(teamCount: number): RoundName | null {
  switch (teamCount) {
    case 32: return 'ROUND_OF_32';
    case 16: return 'ROUND_OF_16';
    case 8: return 'QUARTER_FINAL';
    case 4: return 'SEMI_FINAL';
    case 2: return 'FINAL';
    default: return null;
  }
}
