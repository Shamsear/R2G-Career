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
  // COMMON (14 Medals)
  matches_played: { key: 'matches_played', name: 'Matches Played', category: 'COMMON', thresholds: [100, 250, 500, 1000, 2000], description: 'Matches played in career' },
  goals_scored: { key: 'goals_scored', name: 'Goals Scored', category: 'COMMON', thresholds: [200, 500, 900, 1500, 3000], description: 'Goals scored in career' },
  clean_sheets: { key: 'clean_sheets', name: 'Clean Sheets', category: 'COMMON', thresholds: [25, 75, 150, 250, 500], description: 'Clean Sheets kept in career' },
  draws: { key: 'draws', name: 'Draws', category: 'COMMON', thresholds: [40, 100, 200, 400, 700], description: 'Draws in career' },
  single_match_draw: { key: 'single_match_draw', name: 'Single Match Draw', category: 'COMMON', description: 'Draw score achieved (1-1, 2-2, 0-0, 3-3, 5-5)' },
  single_match_goals: { key: 'single_match_goals', name: 'Goals in a Single Match', category: 'COMMON', thresholds: [1, 3, 5, 7, 10], description: 'Goals scored in a single match' },
  single_match_cs_win: { key: 'single_match_cs_win', name: 'Clean Sheet Win', category: 'COMMON', description: 'Win with clean sheet (1-0, 2-0, 3-0, 5-0, 7-0)' },
  single_match_gd_win: { key: 'single_match_gd_win', name: 'Goal Difference Win', category: 'COMMON', thresholds: [1, 2, 3, 5, 7], description: 'Goal difference in a single match win' },
  participate_div_5: { key: 'participate_div_5', name: 'Participate Career Division 5', category: 'COMMON', thresholds: [1, 3, 5, 10, 15], description: 'Seasons participating in Division 5 exactly' },
  participate_div_4: { key: 'participate_div_4', name: 'Participate Career Division 4', category: 'COMMON', thresholds: [1, 3, 5, 10, 15], description: 'Seasons participating in Division 4 exactly' },
  top_15_rank: { key: 'top_15_rank', name: 'R2G career top 15 rank list', category: 'COMMON', thresholds: [1, 3, 5, 10, 15], description: 'Finishes in R2G Career Top 15' },
  top_15_fantasy: { key: 'top_15_fantasy', name: 'Top 15 fantasy', category: 'COMMON', thresholds: [1, 3, 5, 7, 10], description: 'Finishes in Top 15 Fantasy' },
  participate_team_tour: { key: 'participate_team_tour', name: 'Participate team tour', category: 'COMMON', thresholds: [1, 3, 5, 10, 15], description: 'Times participated in team tour' },
  team_tour_win_margin: { key: 'team_tour_win_margin', name: 'Team Tour Win Margin', category: 'COMMON', thresholds: [3, 5, 7, 10, 15], description: 'Win margin in team tour match' },
 
  // RARE (17 Medals)
  participate_div_3: { key: 'participate_div_3', name: 'Participate Career Division 3', category: 'RARE', thresholds: [1, 3, 5, 10, 15], description: 'Seasons participating in Division 3 exactly' },
  participate_div_2: { key: 'participate_div_2', name: 'Participate Career Division 2', category: 'RARE', thresholds: [1, 3, 5, 10, 15], description: 'Seasons participating in Division 2 exactly' },
  participate_ucl: { key: 'participate_ucl', name: 'Participate R2G CAREER UCL', category: 'RARE', thresholds: [1, 3, 5, 10, 20], description: 'Seasons participated in Career UCL' },
  ballon_dor_nominee: { key: 'ballon_dor_nominee', name: 'Participate Ballon d\'or nominee', category: 'RARE', thresholds: [1, 3, 5, 10, 15], description: 'Times nominated for Ballon d\'Or' },
  top_10_rank: { key: 'top_10_rank', name: 'R2G career top 10 rank list', category: 'RARE', thresholds: [1, 3, 5, 10, 15], description: 'Finishes in R2G Career Top 10' },
  claim_awards: { key: 'claim_awards', name: 'Claim R2G Career Awards', category: 'RARE', thresholds: [2, 5, 10, 25, 50], description: 'R2G Career Awards claimed' },
  claim_golden_boot: { key: 'claim_golden_boot', name: 'Claim Golden Boot', category: 'RARE', thresholds: [1, 5, 10, 20, 40], description: 'Golden Boot awards won' },
  claim_golden_glove: { key: 'claim_golden_glove', name: 'Claim Golden Glove', category: 'RARE', thresholds: [1, 5, 10, 20, 40], description: 'Golden Glove awards won' },
  claim_golden_ball: { key: 'claim_golden_ball', name: 'Claim Golden Ball', category: 'RARE', thresholds: [1, 5, 10, 20, 40], description: 'Golden Ball awards won' },
  claim_maldini_trophy: { key: 'claim_maldini_trophy', name: 'Claim Maldini Trophy', category: 'RARE', thresholds: [1, 3, 5, 10, 20], description: 'Maldini Trophy awards won (Career mode only)' },
  top_10_fantasy: { key: 'top_10_fantasy', name: 'TOP 10 fantacy', category: 'RARE', thresholds: [1, 3, 5, 7, 10], description: 'Finishes in Top 10 Fantasy' },
  runner_up_finish: { key: 'runner_up_finish', name: 'Runner-up Finishes', category: 'RARE', thresholds: [1, 3, 5, 10, 20], description: 'Tournament runner-up finishes' },
  team_tour_unbeaten: { key: 'team_tour_unbeaten', name: 'Team tour unbeaten journey', category: 'RARE', thresholds: [2, 4, 7, 10, 15], description: 'Unbeaten matches run in team tour' },
  season_goals: { key: 'season_goals', name: 'Single Season Goals', category: 'RARE', thresholds: [25, 50, 75, 100, 150], description: 'Goals scored in a single season' },
  season_cs: { key: 'season_cs', name: 'Single Season Clean Sheets', category: 'RARE', thresholds: [5, 10, 15, 20, 30], description: 'Clean Sheets kept in a single season' },
  player_of_day_team_tour: { key: 'player_of_day_team_tour', name: 'Player of the day (team tour)', category: 'RARE', thresholds: [1, 5, 10, 20, 50], description: 'Player of the day awards won' },
  player_of_week_team_tour: { key: 'player_of_week_team_tour', name: 'Player of the week (team tour)', category: 'RARE', thresholds: [1, 3, 5, 10, 20], description: 'Player of the week awards won' },
 
  // MYTHIC (16 Medals)
  participate_div_1: { key: 'participate_div_1', name: 'Participate career Division 1', category: 'MYTHIC', thresholds: [1, 3, 5, 10, 15], description: 'Seasons participating in Division 1 exactly' },
  top_5_rank: { key: 'top_5_rank', name: 'R2G career top 5 rank list', category: 'MYTHIC', thresholds: [1, 3, 5, 10, 15], description: 'Finishes in R2G Career Top 5' },
  claim_ballon_dor: { key: 'claim_ballon_dor', name: 'Claim Ballon d\'Or', category: 'MYTHIC', thresholds: [1, 2, 3, 5, 10], description: 'Ballon d\'Or awards won' },
  claim_r2g_best: { key: 'claim_r2g_best', name: 'Claim R2G Best', category: 'MYTHIC', thresholds: [1, 2, 3, 5, 10], description: 'R2G Best awards won' },
  claim_career_ucl: { key: 'claim_career_ucl', name: 'Claim Career UCL', category: 'MYTHIC', thresholds: [1, 2, 3, 5, 10], description: 'Career UCL Trophies won' },
  participate_rws: { key: 'participate_rws', name: 'PARTICIPATE RWS', category: 'MYTHIC', thresholds: [1, 2, 3, 5, 10], description: 'RWS participation seasons' },
  champion_rws: { key: 'champion_rws', name: 'Champion world (RWS)', category: 'MYTHIC', isDirectLevel5: true, description: 'RWS Champion (Level 5 direct)' },
  runner_up_rws: { key: 'runner_up_rws', name: 'Runners world', category: 'MYTHIC', isDirectLevel5: true, description: 'RWS Runner Up (Level 5 direct)' },
  claim_trophy_career: { key: 'claim_trophy_career', name: 'Claim Career Trophy', category: 'MYTHIC', thresholds: [1, 3, 5, 10, 20], description: 'Career trophies won' },
  claim_trophy_any_tour: { key: 'claim_trophy_any_tour', name: 'Claim Trophies (Any Tour)', category: 'MYTHIC', thresholds: [1, 5, 10, 20, 50], description: 'Total trophies won across any tour' },
  claim_trophy_together: { key: 'claim_trophy_together', name: 'Claim Trophies Together', category: 'MYTHIC', thresholds: [1, 3, 5, 7, 10], description: 'Team trophies won together' },
  champion_fantasy: { key: 'champion_fantasy', name: 'Champion of fantasy', category: 'MYTHIC', isDirectLevel5: true, description: 'Champion of Fantasy (Level 5 direct)' },
  top_5_fantasy: { key: 'top_5_fantasy', name: 'Top 5 fantacy', category: 'MYTHIC', thresholds: [1, 3, 5, 7, 10], description: 'Finishes in Top 5 Fantasy' },
  unbeaten_journey: { key: 'unbeaten_journey', name: 'Unbeaten journey (continues)', category: 'MYTHIC', thresholds: [3, 5, 10, 15, 25], description: 'Consecutive matches unbeaten run' },
  cs_journey: { key: 'cs_journey', name: 'Cs journey (clean sheet)', category: 'MYTHIC', thresholds: [3, 5, 10, 15, 25], description: 'Consecutive clean sheet matches run' },
  player_of_season_team_tour: { key: 'player_of_season_team_tour', name: 'Player of the season (team tour)', category: 'MYTHIC', isDirectLevel5: true, description: 'Player of the Season (Level 5 direct)' }
};

export interface CalculatedMedal {
  key: string;
  name: string;
  category: 'COMMON' | 'RARE' | 'MYTHIC';
  level: number; // 0 to 5 (0 means locked/unearned)
  currentValue: number | string;
  requiredValueForNext: number | string;
  exp: number;
  description: string;
  thresholds?: number[];
}

export function getExpForMedal(category: 'COMMON' | 'RARE' | 'MYTHIC', level: number): number {
  if (level <= 0) return 0;
  const rates = {
    MYTHIC: [0, 400, 800, 1500, 2500, 4000],
    RARE:   [0, 250, 500, 1000, 1750, 2500],
    COMMON: [0, 100, 200,  400,  800, 1500]
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

  // Add stats from manager_seasons (Solo Tour historically aggregated)
  let maxGoalsInSeason = 0;
  let maxCsInSeason = 0;
  let totalRankAwards = 0;
  let goldBootCount = 0;
  let goldGloveCount = 0;
  let goldBallCount = 0;
  let maldiniTrophyCount = 0;
  let ballonDorWinnerCount = 0;
  let r2gBestCount = 0;

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
        if (lower.includes('maldini')) maldiniTrophyCount++;
        if (lower.includes('nominee')) {} // Handled separately
        if (lower.includes("ballon d'or") || (lower.includes('ballon') && !lower.includes('nominee'))) ballonDorWinnerCount++;
        if (lower.includes('best')) r2gBestCount++;
        totalRankAwards++;
      });
    }

    // Parse competitions
    if (s.competitions && typeof s.competitions === 'object') {
      Object.keys(s.competitions).forEach(comp => {
        const lower = comp.toLowerCase();
        // Division check
        if (lower.includes('division 5')) seasonsInDiv5++;
        if (lower.includes('division 4')) seasonsInDiv4++;
        if (lower.includes('division 3')) seasonsInDiv3++;
        if (lower.includes('division 2')) seasonsInDiv2++;
        if (lower.includes('division 1')) seasonsInDiv1++;

        if (lower.includes('ucl') || lower.includes('ucel')) {
          uclParticipations++;
          if (lower.includes('champion') || lower.includes('winner')) uclChampionCount++;
        }
        if (lower.includes('runner') || lower.includes('runrs')) runnerUpCount++;
        if (lower.includes('champion') || lower.includes('winner') || lower.includes('1st')) {
          trophyCareerCount++;
          trophyAnyCount++;
        }
      });
    }

    // Rank list check
    if (s.manager_rank !== null) {
      if (s.manager_rank <= 15) top15RankCount++;
      if (s.manager_rank <= 10) top10RankCount++;
      if (s.manager_rank <= 5) top5RankCount++;
    }
  });

  // Streaks and single match records calculated from individual fixtures
  let maxSingleMatchGoals = 0;
  let maxSingleMatchGD = 0;
  let hasDraw0_0 = false;
  let hasDraw1_1 = false;
  let hasDraw2_2 = false;
  let hasDraw3_3 = false;
  let hasDraw5_5 = false;

  let maxCsWinGoals = 0; // Win with clean sheet goals (e.g. 1-0, 2-0, etc.)

  // Track unbeaten and CS streaks (consecutive matches in same tournament_type)
  let longestUnbeatenStreak = 0;
  let longestCsStreak = 0;

  const currentUnbeatenStreaks: Record<string, number> = {};
  const currentCsStreaks: Record<string, number> = {};

  fixtures.forEach(f => {
    const isHome = clubIds.includes(f.home_club_id);
    const scoreSelf = isHome ? f.home_score : f.away_score;
    const scoreOpp = isHome ? f.away_score : f.home_score;
    const type = f.tournament_type || 'default';

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
    }

    // Streaks calculation per tournament_type
    if (scoreSelf >= scoreOpp) {
      currentUnbeatenStreaks[type] = (currentUnbeatenStreaks[type] || 0) + 1;
      if (currentUnbeatenStreaks[type] > longestUnbeatenStreak) {
        longestUnbeatenStreak = currentUnbeatenStreaks[type];
      }
    } else {
      currentUnbeatenStreaks[type] = 0;
    }

    if (scoreOpp === 0) {
      currentCsStreaks[type] = (currentCsStreaks[type] || 0) + 1;
      if (currentCsStreaks[type] > longestCsStreak) {
        longestCsStreak = currentCsStreaks[type];
      }
    } else {
      currentCsStreaks[type] = 0;
    }

    if (type === 'rws') rwsParticipations++;
  });

  // Calculate medals list
  const computedMedals: CalculatedMedal[] = [];
  let totalMedalExp = 0;

  Object.values(MEDAL_DEFINITIONS).forEach(def => {
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
      // DirectLevel5 medals (RWS champ, Fantasy champ, etc.) are admin-only manual overrides
      level = manualMap.get(def.key) || 0;
      currentValue = level > 0 ? `Level ${level}` : 0;
    } else {
      // All auto-calculated medals: always derive from live stats (ignore DB cache)
      // Automatic calculations
      let stat = 0;
      switch (def.key) {
        case 'matches_played': stat = totalMatches; break;
        case 'goals_scored': stat = totalGoals; break;
        case 'clean_sheets': stat = totalCs; break;
        case 'draws': stat = totalDraws; break;
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
        case 'claim_awards': stat = totalRankAwards; break;
        case 'claim_golden_boot': stat = goldBootCount; break;
        case 'claim_golden_glove': stat = goldGloveCount; break;
        case 'claim_golden_ball': stat = goldBallCount; break;
        case 'claim_maldini_trophy': stat = maldiniTrophyCount; break;
        case 'runner_up_finish': stat = runnerUpCount; break;
        case 'season_goals': stat = maxGoalsInSeason; break;
        case 'season_cs': stat = maxCsInSeason; break;
        case 'claim_ballon_dor': stat = ballonDorWinnerCount; break;
        case 'claim_r2g_best': stat = r2gBestCount; break;
        case 'claim_career_ucl': stat = uclChampionCount; break;
        case 'participate_rws': stat = rwsParticipations > 0 ? 1 : 0; break; // RWS seasons count
        case 'claim_trophy_career': stat = trophyCareerCount; break;
        case 'claim_trophy_any_tour': stat = trophyAnyCount; break;
        case 'unbeaten_journey': stat = longestUnbeatenStreak; break;
        case 'cs_journey': stat = longestCsStreak; break;

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
        reqNext = level < 5 ? def.thresholds[level] : '-';
      }
    }

    const exp = getExpForMedal(def.category, level);
    totalMedalExp += exp;

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
      achievedLevels: [
        def.key === 'single_match_draw' ? hasL1 : (level >= 1),
        def.key === 'single_match_draw' ? hasL2 : (level >= 2),
        def.key === 'single_match_draw' ? hasL3 : (level >= 3),
        def.key === 'single_match_draw' ? hasL4 : (level >= 4),
        def.key === 'single_match_draw' ? hasL5 : (level >= 5),
      ]
    });
  });

  // Calculate Stored vs Calculated Normal EXP
  // Match: 25, Win: 40, Draw: 20, Lose: 10, Goal: 5, CS: 10
  const calculatedNormalExp = (totalMatches * 25) + (totalWins * 40) + (totalDraws * 20) + (totalLosses * 10) + (totalGoals * 5) + (totalCs * 10);
  
  const { rows: mgrRows } = await pool.query('SELECT COALESCE(normal_exp, 0) as normal_exp FROM managers WHERE id = $1', [managerId]);
  const normalExp = mgrRows.length > 0 ? Number(mgrRows[0].normal_exp) : 0;

  const totalExp = normalExp + totalMedalExp;
  const level = calculateLevelFromExp(totalExp);
  const league = getLeagueName(level);

  return {
    normalExp,
    calculatedNormalExp,
    medalExp: totalMedalExp,
    totalExp,
    level,
    league,
    medals: computedMedals,
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

