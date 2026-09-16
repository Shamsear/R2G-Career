import { Pool } from 'pg';

export interface MedalDefinition {
  key: string;
  name: string;
  category: 'COMMON' | 'RARE' | 'MYTHIC';
  thresholds?: number[];
  description: string;
  isDirectLevel5?: boolean;
}

export const MEDAL_DEFINITIONS: Record<string, MedalDefinition> = {
  // COMMON (15 Medals)
  matches_played: { key: 'matches_played', name: 'Matches Played (All Tour)', category: 'COMMON', thresholds: [100, 250, 500, 750, 1000, 1500, 2000], description: 'Matches played across all tournaments' },
  goals_scored: { key: 'goals_scored', name: 'Goals Scored', category: 'COMMON', thresholds: [200, 500, 1000, 1500, 2000, 3000, 4000], description: 'Goals scored in career' },
  clean_sheets: { key: 'clean_sheets', name: 'Clean Sheets', category: 'COMMON', thresholds: [20, 50, 100, 150, 200, 300, 400], description: 'Clean sheets kept in career' },
  draws: { key: 'draws', name: 'Draws', category: 'COMMON', thresholds: [40, 100, 200, 350, 500, 750, 1000], description: 'Draws in career' },
  special_tour_matches: { key: 'special_tour_matches', name: 'Special Tour Matches', category: 'COMMON', thresholds: [50, 100, 250, 400, 700, 1000, 1500], description: 'Matches played in Special Tour tournaments' },
  single_match_draw: { key: 'single_match_draw', name: 'Single Match Draw', category: 'COMMON', description: 'Draw score achieved (1-1, 2-2, 0-0, 3-3, 5-5)' },
  single_match_goals: { key: 'single_match_goals', name: 'Goals in a Single Match', category: 'COMMON', thresholds: [1, 3, 5, 7, 10], description: 'Goals scored in a single match' },
  single_match_cs_win: { key: 'single_match_cs_win', name: 'Clean Sheet Win', category: 'COMMON', description: 'Win with clean sheet (1-0, 2-0, 3-0, 5-0, 7-0)' },
  single_match_gd_win: { key: 'single_match_gd_win', name: 'Goal Difference Win', category: 'COMMON', thresholds: [1, 2, 3, 5, 7], description: 'Goal difference in a single match win' },
  participate_div_5: { key: 'participate_div_5', name: 'Participate Career Division 5', category: 'COMMON', thresholds: [1, 3, 5, 10, 15, 20, 25], description: 'Seasons participating in Division 5 or above' },
  participate_div_4: { key: 'participate_div_4', name: 'Participate Career Division 4', category: 'COMMON', thresholds: [1, 3, 5, 10, 15, 20, 25], description: 'Seasons participating in Division 4 or above' },
  top_15_rank: { key: 'top_15_rank', name: 'R2G career top 15 rank list', category: 'COMMON', thresholds: [1, 3, 5, 10, 15, 20, 25], description: 'Finishes in R2G Career Top 15' },
  top_15_fantasy: { key: 'top_15_fantasy', name: 'Top 15 PREDICTION', category: 'COMMON', thresholds: [1, 3, 5, 10, 15, 20, 25], description: 'Finishes in Top 15 Prediction' },
  participate_team_tour: { key: 'participate_team_tour', name: 'Participate team tour', category: 'COMMON', thresholds: [1, 3, 5, 10, 15, 20, 25], description: 'Times participated in team tour' },
  team_tour_win_margin: { key: 'team_tour_win_margin', name: 'Team Tour Win Margin', category: 'COMMON', thresholds: [3, 5, 7, 10, 15], description: 'Win margin in team tour match' },
 
  // RARE (19 Medals)
  participate_div_3: { key: 'participate_div_3', name: 'Participate Career Division 3', category: 'RARE', thresholds: [1, 3, 5, 10, 15, 20, 25], description: 'Seasons participating in Division 3 or above' },
  participate_div_2: { key: 'participate_div_2', name: 'Participate Career Division 2', category: 'RARE', thresholds: [1, 3, 5, 10, 15, 20, 25], description: 'Seasons participating in Division 2 or above' },
  participate_ucl: { key: 'participate_ucl', name: 'Participate R2G CAREER UCL', category: 'RARE', thresholds: [1, 3, 5, 10, 15, 20, 25], description: 'Seasons participated in Career UCL' },
  ballon_dor_nominee: { key: 'ballon_dor_nominee', name: 'Participate Ballon d\'or nominee', category: 'RARE', thresholds: [1, 3, 5, 10, 15, 20, 25], description: 'Times nominated for Ballon d\'Or' },
  top_10_rank: { key: 'top_10_rank', name: 'R2G career top 10 rank list', category: 'RARE', thresholds: [1, 3, 5, 10, 15, 20, 25], description: 'Finishes in R2G Career Top 10' },
  claim_awards: { key: 'claim_awards', name: 'Claim R2G Career Awards', category: 'RARE', thresholds: [2, 5, 10, 25, 50], description: 'R2G Career Awards claimed' },
  claim_golden_boot: { key: 'claim_golden_boot', name: 'Claim Golden Boot', category: 'RARE', thresholds: [1, 5, 10, 25, 50, 75], description: 'Golden Boot awards claimed' },
  claim_golden_glove: { key: 'claim_golden_glove', name: 'Claim Golden Glove', category: 'RARE', thresholds: [1, 5, 10, 25, 50, 75], description: 'Golden Glove awards claimed' },
  claim_golden_ball: { key: 'claim_golden_ball', name: 'Claim Golden Ball', category: 'RARE', thresholds: [1, 5, 10, 25, 50, 75], description: 'Golden Ball awards claimed' },
  claim_best_defender: { key: 'claim_best_defender', name: 'Claim Best Defender', category: 'RARE', thresholds: [1, 5, 10, 25, 50, 75], description: 'Best Defender awards claimed' },
  top_10_fantasy: { key: 'top_10_fantasy', name: 'TOP 10 PREDICTION', category: 'RARE', thresholds: [1, 3, 5, 10, 15, 20, 25], description: 'Finishes in Top 10 Prediction' },
  runner_up_finish: { key: 'runner_up_finish', name: 'The Unlucky (Finale Runners-up)', category: 'RARE', thresholds: [1, 3, 5, 10, 20], description: 'Final runner-up finishes across tournaments' },
  team_tour_unbeaten: { key: 'team_tour_unbeaten', name: 'Team tour unbeaten journey', category: 'RARE', thresholds: [2, 4, 7, 10, 15], description: 'Consecutive unbeaten matches in team tour' },
  special_tour_unbeaten: { key: 'special_tour_unbeaten', name: 'Special tour unbeaten journey', category: 'RARE', thresholds: [2, 4, 7, 10, 15], description: 'Consecutive unbeaten matches in the same special tour' },
  season_goals: { key: 'season_goals', name: 'Single Season Goals', category: 'RARE', thresholds: [25, 50, 75, 100, 150], description: 'Goals scored in a single season' },
  season_cs: { key: 'season_cs', name: 'Single Season Clean Sheets', category: 'RARE', thresholds: [5, 10, 15, 20, 30], description: 'Clean Sheets kept in a single season' },
  player_of_day_team_tour: { key: 'player_of_day_team_tour', name: 'Player of the day (team tour)', category: 'RARE', thresholds: [1, 5, 10, 25, 50, 75], description: 'Player of the day awards won' },
  player_of_week_team_tour: { key: 'player_of_week_team_tour', name: 'Player of the week (team tour)', category: 'RARE', thresholds: [1, 5, 10, 25, 50, 75], description: 'Player of the week awards won' },
  master_of_week_prediction: { key: 'master_of_week_prediction', name: 'Master of the week (prediction)', category: 'RARE', thresholds: [1, 5, 10, 25, 50, 75], description: 'Master of the week awards won in prediction' },
 
  // MYTHIC (20 Medals)
  participate_div_1: { key: 'participate_div_1', name: 'Participate career Division 1', category: 'MYTHIC', thresholds: [1, 3, 5, 10, 15], description: 'Seasons participating in Division 1' },
  top_5_rank: { key: 'top_5_rank', name: 'R2G career top 5 rank list', category: 'MYTHIC', thresholds: [1, 3, 5, 10, 15], description: 'Finishes in R2G Career Top 5' },
  claim_ballon_dor: { key: 'claim_ballon_dor', name: 'Claim Ballon d\'Or', category: 'MYTHIC', thresholds: [1, 2, 3, 5, 10], description: 'Ballon d\'Or awards won' },
  claim_r2g_best: { key: 'claim_r2g_best', name: 'Claim R2G Best', category: 'MYTHIC', thresholds: [1, 2, 3, 5, 10], description: 'R2G Best awards won' },
  claim_gerd_muller: { key: 'claim_gerd_muller', name: 'Claim GERD MULLER', category: 'MYTHIC', thresholds: [1, 2, 3, 5, 10], description: 'Gerd Müller Trophy awards won' },
  claim_yashin_trophy: { key: 'claim_yashin_trophy', name: 'Claim YASHIN TROPHY', category: 'MYTHIC', thresholds: [1, 2, 3, 5, 10], description: 'Yashin Trophy awards won' },
  claim_star_player: { key: 'claim_star_player', name: 'Claim STAR PLAYER', category: 'MYTHIC', thresholds: [1, 2, 3, 5, 10], description: 'Star Player awards won' },
  claim_maldini_trophy: { key: 'claim_maldini_trophy', name: 'Claim MALDINI TROPHY', category: 'MYTHIC', thresholds: [1, 2, 3, 5, 10], description: 'Maldini Trophy awards won' },
  claim_career_ucl: { key: 'claim_career_ucl', name: 'Claim Career UCL', category: 'MYTHIC', thresholds: [1, 2, 3, 5, 10], description: 'Career UCL Trophies won' },
  participate_rws: { key: 'participate_rws', name: 'PARTICIPATE RWS', category: 'MYTHIC', thresholds: [1, 2, 3, 5, 10], description: 'RWS participation seasons' },
  champion_rws: { key: 'champion_rws', name: 'Champion world (RWS)', category: 'MYTHIC', isDirectLevel5: true, description: 'RWS Champion (Direct Level 5)' },
  runner_up_rws: { key: 'runner_up_rws', name: 'Runners world (RWS)', category: 'MYTHIC', isDirectLevel5: true, description: 'RWS Runner Up (Direct Level 5)' },
  claim_trophy_career: { key: 'claim_trophy_career', name: 'Claim Career Trophy', category: 'MYTHIC', thresholds: [1, 3, 5, 10, 20], description: 'Career trophies won' },
  claim_trophy_any_tour: { key: 'claim_trophy_any_tour', name: 'Claim Trophies (Any Tour)', category: 'MYTHIC', thresholds: [1, 5, 10, 20, 50], description: 'Total trophies won across any tour' },
  claim_trophy_together: { key: 'claim_trophy_together', name: 'Claim Trophies Together', category: 'MYTHIC', thresholds: [1, 3, 5, 7, 10], description: 'Team trophies won together' },
  champion_fantasy: { key: 'champion_fantasy', name: 'Champion of PREDICTION', category: 'MYTHIC', thresholds: [1, 2, 3, 5, 10], description: 'Champion titles in Prediction' },
  top_5_fantasy: { key: 'top_5_fantasy', name: 'Top 5 PREDICTION', category: 'MYTHIC', thresholds: [1, 3, 5, 7, 10], description: 'Finishes in Top 5 Prediction' },
  unbeaten_journey: { key: 'unbeaten_journey', name: 'Unbeaten journey (continues)', category: 'MYTHIC', thresholds: [3, 5, 10, 15, 25], description: 'Consecutive matches unbeaten in same tour' },
  cs_journey: { key: 'cs_journey', name: 'Cs journey (clean sheet)', category: 'MYTHIC', thresholds: [3, 5, 7, 10, 15], description: 'Consecutive clean sheet matches in same tour' },
  player_of_season_team_tour: { key: 'player_of_season_team_tour', name: 'Player of the season (team tour)', category: 'MYTHIC', thresholds: [1, 2, 3, 5, 10], description: 'Player of the Season awards won' },

  // META / MILESTONE (1 Medal)
  medal_collector: { key: 'medal_collector', name: 'MEDAL COLLECTOR', category: 'MYTHIC', thresholds: [50, 100, 200, 300, 400], description: 'Total medal tiers unlocked across career' }
};

export interface CalculatedMedal {
  key: string;
  name: string;
  category: 'COMMON' | 'RARE' | 'MYTHIC';
  level: number; // 0 to 7 (0 means locked/unearned)
  currentValue: number | string;
  requiredValueForNext: number | string;
  exp: number;
  description: string;
  thresholds?: number[];
  achievedLevels?: boolean[];
}

export function getExpForMedal(category: 'COMMON' | 'RARE' | 'MYTHIC', level: number): number {
  if (level <= 0) return 0;
  const rates = {
    MYTHIC: [0, 400, 800, 1500, 2500, 4000, 6000, 9000],
    RARE:   [0, 250, 500, 1000, 1750, 2500, 3750, 5500],
    COMMON: [0, 100, 200,  400,  800, 1500, 2500, 4000]
  };
  // Cumulative: sum EXP from level 1 up to current level
  let total = 0;
  for (let l = 1; l <= level; l++) {
    total += rates[category][l] || 0;
  }
  return total;
}

export function calculateLevelFromExp(totalExp: number): number {
  if (totalExp < 0) return 1;
  return Math.floor(Math.sqrt(totalExp / 100)) + 1;
}

export async function fetchManagerMedalsAndLevel(managerId: number, pool: Pool) {
  // 1. Fetch historical seasons
  const { rows: history } = await pool.query(
    `SELECT * FROM manager_seasons WHERE manager_id = $1`,
    [managerId]
  );

  // 2. Fetch clubs managed
  const { rows: clubHistory } = await pool.query(`
    SELECT DISTINCT club_id FROM manager_seasons WHERE manager_id = $1 AND club_id IS NOT NULL
    UNION
    SELECT DISTINCT current_club_id as club_id FROM manager_wallets WHERE manager_id = $1 AND current_club_id IS NOT NULL
  `, [managerId]);
  const clubIds = clubHistory.map(row => row.club_id).filter(id => id !== null);

  // 3. Fetch fixtures for matches / streak calculations
  let fixtures: any[] = [];
  if (clubIds.length > 0) {
    const { rows } = await pool.query(`
      SELECT f.*, t.tournament_type 
      FROM fixtures f
      JOIN tournaments t ON f.tournament_id = t.id
      WHERE (f.home_club_id = ANY($1) OR f.away_club_id = ANY($1))
        AND f.home_score IS NOT NULL
        AND f.away_score IS NOT NULL
      ORDER BY f.season_id ASC, f.round_number ASC
    `, [clubIds]);
    fixtures = rows;
  }

  // 4. Fetch manual medal updates/overrides
  const { rows: manualMedals } = await pool.query(
    `SELECT medal_key, level FROM manager_medals WHERE manager_id = $1`,
    [managerId]
  );
  const manualMap = new Map<string, number>();
  manualMedals.forEach(m => manualMap.set(m.medal_key, m.level));

  // --- STATS ACCUMULATION ---
  let totalMatches = 0;
  let totalWins = 0;
  let totalDraws = 0;
  let totalLosses = 0;
  let totalGoals = 0;
  let totalConceded = 0;
  let totalCs = 0;

  const trophiesList: string[] = [];
  const awardsList: string[] = [];

  // Add stats from manager_seasons (Solo Tour historically aggregated)
  let maxGoalsInSeason = 0;
  let maxCsInSeason = 0;
  let totalRankAwards = 0;
  let goldBootCount = 0;
  let goldGloveCount = 0;
  let goldBallCount = 0;
  let bestDefenderCount = 0;
  let maldiniTrophyCount = 0;
  let gerdMullerCount = 0;
  let yashinTrophyCount = 0;
  let starPlayerCount = 0;
  let r2gBestCount = 0;
  let ballonDorWinnerCount = 0;
  let ballonDorNomineeCount = 0;
  let masterOfWeekCount = 0;
  let predictionChampionCount = 0;
  let playerOfSeasonTeamCount = 0;
  let playerOfDayTeamCount = 0;
  let playerOfWeekTeamCount = 0;
  let teamTourParticipations = 0;
  let trophyTogetherCount = 0;

  let seasonsInDiv5 = 0;
  let seasonsInDiv4 = 0;
  let seasonsInDiv3 = 0;
  let seasonsInDiv2 = 0;
  let seasonsInDiv1 = 0;
  let uclParticipations = 0;
  let uclChampionCount = 0;
  let runnerUpCount = 0;

  let rwsParticipations = 0;
  let trophyCareerCount = 0;
  let trophyAnyCount = 0;

  let top15RankCount = 0;
  let top10RankCount = 0;
  let top5RankCount = 0;
  let top15FantasyCount = 0;
  let top10FantasyCount = 0;
  let top5FantasyCount = 0;

  history.forEach(s => {
    totalMatches += s.matches_played || 0;
    totalWins += s.wins || 0;
    totalDraws += s.draws || 0;
    totalLosses += s.losses || 0;
    totalGoals += s.goals_scored || 0;
    totalConceded += s.goals_conceded || 0;
    totalCs += s.clean_sheets || 0;

    if ((s.goals_scored || 0) > maxGoalsInSeason) maxGoalsInSeason = s.goals_scored;
    if ((s.clean_sheets || 0) > maxCsInSeason) maxCsInSeason = s.clean_sheets;

    // Parse awards list
    if (Array.isArray(s.awards)) {
      s.awards.forEach((award: string) => {
        const lower = award.toLowerCase();
        if (lower.includes('boot')) goldBootCount++;
        if (lower.includes('glove')) goldGloveCount++;
        if (lower.includes('ball') && !lower.includes('best') && !lower.includes('nominee')) goldBallCount++;
        if (lower.includes('best defender')) bestDefenderCount++;
        if (lower.includes('maldini')) maldiniTrophyCount++;
        if (lower.includes('gerd') || lower.includes('muller') || lower.includes('müller')) gerdMullerCount++;
        if (lower.includes('yashin')) yashinTrophyCount++;
        if (lower.includes('star player')) starPlayerCount++;
        if (lower.includes('nominee')) {
          if (lower.includes("ballon")) {
            ballonDorNomineeCount++;
          }
        }
        if (lower.includes("ballon d'or") || (lower.includes('ballon') && !lower.includes('nominee'))) ballonDorWinnerCount++;
        if (lower.includes('r2g best') || (lower.includes('best') && !lower.includes('defender') && !lower.includes('goalkeeper') && !lower.includes('glove'))) r2gBestCount++;
        if (lower.includes('master of the week') || lower.includes('master of week') || lower.includes('motw')) masterOfWeekCount++;
        if (lower.includes('champion of prediction') || lower.includes('prediction champion') || lower.includes('fantasy champion')) predictionChampionCount++;
        if (lower.includes('player of the season') || lower.includes('pots')) playerOfSeasonTeamCount++;
        if (lower.includes('player of the day') || lower.includes('potd')) playerOfDayTeamCount++;
        if (lower.includes('player of the week') || lower.includes('potw')) playerOfWeekTeamCount++;
        totalRankAwards++;
        awardsList.push(`${award} (Season ${s.season_id})`);
      });
    }

    // Parse competitions
    if (s.competitions && typeof s.competitions === 'object') {
      Object.keys(s.competitions).forEach(comp => {
        const lower = comp.toLowerCase();
        // Division check - higher divisions automatically credit/include all lower divisions
        if (lower.includes('division 1')) {
          seasonsInDiv1++;
          seasonsInDiv2++;
          seasonsInDiv3++;
          seasonsInDiv4++;
          seasonsInDiv5++;
        } else if (lower.includes('division 2')) {
          seasonsInDiv2++;
          seasonsInDiv3++;
          seasonsInDiv4++;
          seasonsInDiv5++;
        } else if (lower.includes('division 3')) {
          seasonsInDiv3++;
          seasonsInDiv4++;
          seasonsInDiv5++;
        } else if (lower.includes('division 4')) {
          seasonsInDiv4++;
          seasonsInDiv5++;
        } else if (lower.includes('division 5')) {
          seasonsInDiv5++;
        }

        if (lower.includes('ucl') || lower.includes('ucel')) {
          uclParticipations++;
          if (lower.includes('champion') || lower.includes('winner')) uclChampionCount++;
        }
        if (lower.includes('runner') || lower.includes('runrs')) runnerUpCount++;
        if (lower.includes('champion') || lower.includes('winner') || lower.includes('1st') || lower.includes('champ')) {
          trophyCareerCount++;
          trophyAnyCount++;
          if (lower.includes('team') || lower.includes('together')) trophyTogetherCount++;
          trophiesList.push(`${comp} (Season ${s.season_id})`);
        }
        if (lower.includes('team') || lower.includes('tt')) {
          teamTourParticipations++;
        }
      });
    }

    // Rank list check
    if (s.manager_rank !== null) {
      if (s.manager_rank <= 15) top15RankCount++;
      if (s.manager_rank <= 10) top10RankCount++;
      if (s.manager_rank <= 5) top5RankCount++;
    }

    // Prediction / Fantasy ranks if recorded in history
    if (s.fantasy_rank !== undefined && s.fantasy_rank !== null) {
      if (s.fantasy_rank <= 15) top15FantasyCount++;
      if (s.fantasy_rank <= 10) top10FantasyCount++;
      if (s.fantasy_rank <= 5) top5FantasyCount++;
      if (s.fantasy_rank === 1) predictionChampionCount++;
    }
  });

  // Streaks and single match records calculated from individual fixtures
  let maxSingleMatchGoals = 0;
  let maxSingleMatchGD = 0;
  let maxTeamTourWinMargin = 0;
  let hasDraw0_0 = false;
  let hasDraw1_1 = false;
  let hasDraw2_2 = false;
  let hasDraw3_3 = false;
  let hasDraw5_5 = false;

  let maxCsWinGoals = 0; // Win with clean sheet goals (e.g. 1-0, 2-0, etc.)

  // Track unbeaten and CS streaks (consecutive matches in same tournament)
  let longestUnbeatenStreak = 0;
  let longestCsStreak = 0;
  let specialMatchesCount = 0;
  let longestSpecialTourUnbeatenStreak = 0;
  let longestTeamTourUnbeatenStreak = 0;

  const currentUnbeatenStreaks: Record<string, number> = {};
  const currentCsStreaks: Record<string, number> = {};
  const currentSpecialUnbeatenStreaks: Record<string, number> = {};
  const currentTeamTourUnbeatenStreaks: Record<string, number> = {};

  fixtures.forEach(f => {
    const isHome = clubIds.includes(f.home_club_id);
    const scoreSelf = isHome ? f.home_score : f.away_score;
    const scoreOpp = isHome ? f.away_score : f.home_score;
    const type = f.tournament_type || 'default';
    const tourId = String(f.tournament_id || 'default');

    if (scoreSelf === null || scoreOpp === null) return;

    // Single match goals
    if (scoreSelf > maxSingleMatchGoals) maxSingleMatchGoals = scoreSelf;

    // Draw match checks
    if (scoreSelf === scoreOpp) {
      if (scoreSelf === 0) hasDraw0_0 = true;
      if (scoreSelf === 1) hasDraw1_1 = true;
      if (scoreSelf === 2) hasDraw2_2 = true;
      if (scoreSelf === 3) hasDraw3_3 = true;
      if (scoreSelf === 5) hasDraw5_5 = true;
    }

    // Win with CS
    if (scoreSelf > scoreOpp && scoreOpp === 0) {
      if (scoreSelf > maxCsWinGoals) maxCsWinGoals = scoreSelf;
    }

    // Win GD
    if (scoreSelf > scoreOpp) {
      const gd = scoreSelf - scoreOpp;
      if (gd > maxSingleMatchGD) maxSingleMatchGD = gd;
      if (type === 'team' || type === 'tt') {
        if (gd > maxTeamTourWinMargin) maxTeamTourWinMargin = gd;
      }
    }

    // Streaks calculation per tournament (same tournament continue match)
    if (scoreSelf >= scoreOpp) {
      currentUnbeatenStreaks[tourId] = (currentUnbeatenStreaks[tourId] || 0) + 1;
      if (currentUnbeatenStreaks[tourId] > longestUnbeatenStreak) {
        longestUnbeatenStreak = currentUnbeatenStreaks[tourId];
      }
    } else {
      currentUnbeatenStreaks[tourId] = 0;
    }

    if (scoreOpp === 0) {
      currentCsStreaks[tourId] = (currentCsStreaks[tourId] || 0) + 1;
      if (currentCsStreaks[tourId] > longestCsStreak) {
        longestCsStreak = currentCsStreaks[tourId];
      }
    } else {
      currentCsStreaks[tourId] = 0;
    }

    // Special Tour matches and unbeaten streak
    if (type === 'special') {
      specialMatchesCount++;
      if (scoreSelf >= scoreOpp) {
        currentSpecialUnbeatenStreaks[tourId] = (currentSpecialUnbeatenStreaks[tourId] || 0) + 1;
        if (currentSpecialUnbeatenStreaks[tourId] > longestSpecialTourUnbeatenStreak) {
          longestSpecialTourUnbeatenStreak = currentSpecialUnbeatenStreaks[tourId];
        }
      } else {
        currentSpecialUnbeatenStreaks[tourId] = 0;
      }
    }

    // Team tour matches and unbeaten streak
    if (type === 'team' || type === 'tt') {
      if (scoreSelf >= scoreOpp) {
        currentTeamTourUnbeatenStreaks[tourId] = (currentTeamTourUnbeatenStreaks[tourId] || 0) + 1;
        if (currentTeamTourUnbeatenStreaks[tourId] > longestTeamTourUnbeatenStreak) {
          longestTeamTourUnbeatenStreak = currentTeamTourUnbeatenStreaks[tourId];
        }
      } else {
        currentTeamTourUnbeatenStreaks[tourId] = 0;
      }
    }

    if (type === 'rws') rwsParticipations++;
  });

  // Calculate medals list
  const computedMedals: CalculatedMedal[] = [];
  let totalMedalExp = 0;

  // Process all medals except 'medal_collector' first (it depends on sum of other tiers)
  Object.values(MEDAL_DEFINITIONS).forEach(def => {
    if (def.key === 'medal_collector') return;

    let level = 0;
    let currentValue: number | string = 0;
    let reqNext: number | string = '-';
    
    // Draw logic variables scoped to loop iteration
    const hasL1 = hasDraw1_1 || hasDraw2_2 || hasDraw3_3 || hasDraw5_5;
    const hasL2 = hasDraw2_2 || hasDraw3_3 || hasDraw5_5;
    const hasL3 = hasDraw0_0;
    const hasL4 = hasDraw3_3 || hasDraw5_5;
    const hasL5 = hasDraw5_5;

    if (def.isDirectLevel5) {
      // DirectLevel5 medals (RWS champ, RWS runner up) are admin-only manual overrides
      level = manualMap.get(def.key) || 0;
      currentValue = level > 0 ? `Level ${level}` : 0;
    } else {
      // Automatic calculations
      let stat = 0;
      switch (def.key) {
        case 'matches_played': stat = totalMatches; break;
        case 'goals_scored': stat = totalGoals; break;
        case 'clean_sheets': stat = totalCs; break;
        case 'draws': stat = totalDraws; break;
        case 'special_tour_matches': stat = specialMatchesCount; break;
        case 'single_match_goals': stat = maxSingleMatchGoals; break;
        case 'single_match_gd_win': stat = maxSingleMatchGD; break;
        case 'participate_div_5': stat = seasonsInDiv5; break;
        case 'participate_div_4': stat = seasonsInDiv4; break;
        case 'participate_div_3': stat = seasonsInDiv3; break;
        case 'participate_div_2': stat = seasonsInDiv2; break;
        case 'participate_div_1': stat = seasonsInDiv1; break;
        case 'participate_ucl': stat = uclParticipations; break;
        case 'top_15_rank': stat = top15RankCount; break;
        case 'top_10_rank': stat = top10RankCount; break;
        case 'top_5_rank': stat = top5RankCount; break;
        case 'top_15_fantasy': stat = top15FantasyCount; break;
        case 'top_10_fantasy': stat = top10FantasyCount; break;
        case 'top_5_fantasy': stat = top5FantasyCount; break;
        case 'participate_team_tour': stat = teamTourParticipations; break;
        case 'team_tour_win_margin': stat = maxTeamTourWinMargin; break;
        case 'team_tour_unbeaten': stat = longestTeamTourUnbeatenStreak; break;
        case 'special_tour_unbeaten': stat = longestSpecialTourUnbeatenStreak; break;
        case 'claim_awards': stat = totalRankAwards; break;
        case 'claim_golden_boot': stat = goldBootCount; break;
        case 'claim_golden_glove': stat = goldGloveCount; break;
        case 'claim_golden_ball': stat = goldBallCount; break;
        case 'claim_best_defender': stat = bestDefenderCount; break;
        case 'claim_maldini_trophy': stat = maldiniTrophyCount; break;
        case 'claim_gerd_muller': stat = gerdMullerCount; break;
        case 'claim_yashin_trophy': stat = yashinTrophyCount; break;
        case 'claim_star_player': stat = starPlayerCount; break;
        case 'runner_up_finish': stat = runnerUpCount; break;
        case 'season_goals': stat = maxGoalsInSeason; break;
        case 'season_cs': stat = maxCsInSeason; break;
        case 'claim_ballon_dor': stat = ballonDorWinnerCount; break;
        case 'ballon_dor_nominee': stat = ballonDorNomineeCount; break;
        case 'claim_r2g_best': stat = r2gBestCount; break;
        case 'claim_career_ucl': stat = uclChampionCount; break;
        case 'participate_rws': stat = rwsParticipations > 0 ? 1 : 0; break;
        case 'claim_trophy_career': stat = trophyCareerCount; break;
        case 'claim_trophy_any_tour': stat = trophyAnyCount; break;
        case 'claim_trophy_together': stat = trophyTogetherCount; break;
        case 'champion_fantasy': stat = predictionChampionCount; break;
        case 'unbeaten_journey': stat = longestUnbeatenStreak; break;
        case 'cs_journey': stat = longestCsStreak; break;
        case 'player_of_day_team_tour': stat = playerOfDayTeamCount; break;
        case 'player_of_week_team_tour': stat = playerOfWeekTeamCount; break;
        case 'player_of_season_team_tour': stat = playerOfSeasonTeamCount; break;
        case 'master_of_week_prediction': stat = masterOfWeekCount; break;

        // Draw score exact / higher logic
        case 'single_match_draw':
          if (hasL1 && hasL2 && hasL3 && hasL4 && hasL5) level = 5;
          else if (hasL1 && hasL2 && hasL3 && hasL4) level = 4;
          else if (hasL1 && hasL2 && hasL3) level = 3;
          else if (hasL1 && hasL2) level = 2;
          else if (hasL1) level = 1;
          
          currentValue = hasDraw5_5 ? '5-5' : hasDraw3_3 ? '3-3' : hasDraw0_0 ? '0-0' : hasDraw2_2 ? '2-2' : hasDraw1_1 ? '1-1' : 'None';
          reqNext = level === 0 ? '1-1' : (level < 5 ? ['1-1', '2-2', '0-0', '3-3', '5-5'][level] : '-');
          break;

        // CS win logic (1-0, 2-0, 3-0, 5-0, 7-0)
        case 'single_match_cs_win':
          if (maxCsWinGoals >= 7) level = 5;
          else if (maxCsWinGoals >= 5) level = 4;
          else if (maxCsWinGoals >= 3) level = 3;
          else if (maxCsWinGoals >= 2) level = 2;
          else if (maxCsWinGoals >= 1) level = 1;
          currentValue = maxCsWinGoals > 0 ? `Win ${maxCsWinGoals}-0` : 'None';
          reqNext = level < 5 ? ['1-0', '2-0', '3-0', '5-0', '7-0'][level] : '-';
          break;
      }

      // Compute standard threshold based levels
      if (def.thresholds && def.key !== 'single_match_draw' && def.key !== 'single_match_cs_win') {
        currentValue = stat;
        for (let i = 0; i < def.thresholds.length; i++) {
          if (stat >= def.thresholds[i]) {
            level = i + 1;
          }
        }
        reqNext = level < def.thresholds.length ? def.thresholds[level] : '-';
      }

      // Allow manual override if higher
      if (manualMap.has(def.key)) {
        const manualLevel = manualMap.get(def.key)!;
        if (manualLevel > level) {
          level = manualLevel;
          if (def.thresholds && level <= def.thresholds.length) {
            currentValue = Math.max(Number(currentValue) || 0, def.thresholds[level - 1]);
          }
        }
      }
    }

    const exp = getExpForMedal(def.category, level);
    totalMedalExp += exp;

    const numLevels = def.thresholds ? def.thresholds.length : 5;
    computedMedals.push({
      key: def.key,
      name: def.name,
      category: def.category,
      level,
      currentValue: (currentValue ?? '').toString(),
      requiredValueForNext: (reqNext ?? '').toString(),
      exp,
      description: def.description,
      thresholds: def.thresholds,
      achievedLevels: def.key === 'single_match_draw'
        ? [hasL1, hasL2, hasL3, hasL4, hasL5]
        : Array.from({ length: numLevels }, (_, idx) => level >= idx + 1)
    });
  });

  // Calculate MEDAL COLLECTOR milestone based on total tiers achieved across all medals
  const collectorDef = MEDAL_DEFINITIONS['medal_collector'];
  if (collectorDef && collectorDef.thresholds) {
    const totalTiersUnlocked = computedMedals.reduce((sum, m) => sum + m.level, 0);
    let collectorLevel = 0;
    for (let i = 0; i < collectorDef.thresholds.length; i++) {
      if (totalTiersUnlocked >= collectorDef.thresholds[i]) {
        collectorLevel = i + 1;
      }
    }
    const collectorReqNext = collectorLevel < collectorDef.thresholds.length ? collectorDef.thresholds[collectorLevel] : '-';
    const collectorExp = getExpForMedal(collectorDef.category, collectorLevel);
    totalMedalExp += collectorExp;

    computedMedals.push({
      key: collectorDef.key,
      name: collectorDef.name,
      category: collectorDef.category,
      level: collectorLevel,
      currentValue: totalTiersUnlocked.toString(),
      requiredValueForNext: collectorReqNext.toString(),
      exp: collectorExp,
      description: collectorDef.description,
      thresholds: collectorDef.thresholds,
      achievedLevels: Array.from({ length: collectorDef.thresholds.length }, (_, idx) => collectorLevel >= idx + 1)
    });
  }

  // Calculate Stored vs Calculated Normal EXP
  // Match: 25, Win: 40, Draw: 20, Lose: 10, Goal: 5, CS: 10
  const calculatedNormalExp = (totalMatches * 25) + (totalWins * 40) + (totalDraws * 20) + (totalLosses * 10) + (totalGoals * 5) + (totalCs * 10);
  
  const { rows: mgrRows } = await pool.query('SELECT COALESCE(normal_exp, 0) as normal_exp FROM managers WHERE id = $1', [managerId]);
  const storedNormalExp = mgrRows.length > 0 ? Number(mgrRows[0].normal_exp) : 0;
  const normalExp = Math.max(storedNormalExp, calculatedNormalExp);

  const totalExp = normalExp + totalMedalExp;
  const level = calculateLevelFromExp(totalExp);
  const league = getLeagueName(level);

  const currentLevelBase = Math.pow(level - 1, 2) * 100;
  const nextLevelBase = Math.pow(level, 2) * 100;
  const needed = nextLevelBase - currentLevelBase;
  const earnedInCurrent = Math.max(0, totalExp - currentLevelBase);
  const progressPercent = Math.max(0, Math.min(100, Math.round((earnedInCurrent / needed) * 100)));

  return {
    normalExp,
    calculatedNormalExp,
    medalExp: totalMedalExp,
    totalExp,
    level,
    nextLevelExp: nextLevelBase,
    progressPercent,
    league,
    medals: computedMedals,
    trophiesList,
    awardsList,
    awardsCount: {
      goldenBoot: goldBootCount,
      goldenGlove: goldGloveCount,
      goldenBall: goldBallCount + ballonDorWinnerCount + r2gBestCount,
      bestDefender: bestDefenderCount + maldiniTrophyCount
    },
    careerStats: {
      matches: totalMatches,
      wins: totalWins,
      draws: totalDraws,
      losses: totalLosses,
      goals: totalGoals,
      conceded: totalConceded,
      cs: totalCs
    }
  };
}

export function getLeagueName(level: number): string {
  const leagues: Record<number, string> = {
    1: "Amateur", 2: "Novice", 3: "Trainee", 4: "Challenger", 5: "Contender",
    6: "Fighter", 7: "Warrior", 8: "Gladiator", 9: "Knight", 10: "Veteran",
    11: "Elite", 12: "Expert", 13: "Specialist", 14: "Professional", 15: "Master",
    16: "Grandmaster", 17: "Champion", 18: "Hero", 19: "Conqueror", 20: "Titan",
    21: "Immortal", 22: "Apex", 23: "Overlord", 24: "Sovereign", 25: "Monarch",
    26: "Lord", 27: "Baron", 28: "Duke", 29: "Prince", 30: "King",
    31: "Emperor", 32: "Legend", 33: "Mythic", 34: "Eternal", 35: "Absolute"
  };
  return leagues[level] || (level > 35 ? "Absolute" : "Amateur");
}

