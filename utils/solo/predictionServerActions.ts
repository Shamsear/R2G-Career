"use server";

import { Pool } from 'pg';
import { getCurrentAdminUsername, logSoloAdminAction } from './serverActions';

const connectionString = process.env.SOLO_DATABASE_URL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.error("❌ Database URL is not configured for Prediction Server Actions.");
}

const pool = new Pool({
  connectionString: connectionString || '',
  ssl: { rejectUnauthorized: false }
});

export interface PredictionSeason {
  id: number;
  season_number: number;
  name: string;
  total_days: number;
  total_weeks: number;
  days_per_week: number;
  status: 'active' | 'completed' | 'upcoming';
  current_day: number;
  notes?: string;
  completed_days?: number;
  total_members?: number;
  leader_name?: string;
  leader_points?: number;
  created_at: string;
}

export interface PredictionDay {
  id: number;
  season_id: number;
  day_number: number;
  week_number: number;
  title: string;
  match_date: string | null;
  is_completed: boolean;
  notes?: string;
}

export interface MemberDayScore {
  member_id: number;
  name: string;
  r2g_id: string;
  photo: string;
  points: number;
  notes?: string;
}

export interface LeaderboardEntry {
  rank: number;
  member_id: number;
  name: string;
  r2g_id: string;
  photo: string;
  total_points: number;
  days_played: number;
  avg_points: number;
  max_day_points: number;
  recent_form: number[]; // last 5 entered scores
  is_champion?: boolean;
}

export interface WeeklyLeaderboard {
  week_number: number;
  start_day: number;
  end_day: number;
  completed_days: number;
  is_completed: boolean;
  motw: {
    member_id: number;
    name: string;
    r2g_id: string;
    photo: string;
    points: number;
  } | null;
  standings: {
    rank: number;
    member_id: number;
    name: string;
    r2g_id: string;
    photo: string;
    points: number;
    days_played: number;
  }[];
}

export interface ScoreMatrixEntry {
  member_id: number;
  name: string;
  r2g_id: string;
  photo: string;
  daily_scores: Record<number, number>; // day_number -> points
  weekly_totals: Record<number, number>; // week_number -> points
  total_points: number;
  rank: number;
}

/**
 * Fetch all prediction seasons
 */
export async function fetchPredictionSeasons(): Promise<PredictionSeason[]> {
  try {
    const { rows: seasons } = await pool.query(`
      SELECT 
        ps.*,
        (SELECT COUNT(*) FROM prediction_days pd WHERE pd.season_id = ps.id AND pd.is_completed = true) AS completed_days,
        (SELECT COUNT(DISTINCT member_id) FROM prediction_scores psc WHERE psc.season_id = ps.id) AS active_scorers
      FROM prediction_seasons ps
      ORDER BY ps.season_number DESC
    `);

    // For each season, fetch the top leader
    const result: PredictionSeason[] = [];
    for (const s of seasons) {
      const { rows: topLeader } = await pool.query(`
        SELECT 
          m.name as leader_name,
          COALESCE(SUM(psc.points), 0) as leader_points
        FROM prediction_scores psc
        JOIN managers m ON psc.member_id = m.id
        WHERE psc.season_id = $1
        GROUP BY m.id, m.name
        ORDER BY leader_points DESC
        LIMIT 1
      `, [s.id]);

      result.push({
        id: s.id,
        season_number: s.season_number,
        name: s.name,
        total_days: s.total_days || 36,
        total_weeks: s.total_weeks || 6,
        days_per_week: s.days_per_week || 6,
        status: s.status || 'active',
        current_day: s.current_day || 1,
        notes: s.notes,
        completed_days: Number(s.completed_days) || 0,
        total_members: Number(s.active_scorers) || 0,
        leader_name: topLeader[0]?.leader_name || 'TBD',
        leader_points: Number(topLeader[0]?.leader_points) || 0,
        created_at: s.created_at
      });
    }

    return result;
  } catch (error) {
    console.error("Error fetching prediction seasons:", error);
    return [];
  }
}

/**
 * Fetch single season by ID or season_number
 */
export async function fetchPredictionSeasonById(seasonIdentifier: number | string): Promise<{
  season: PredictionSeason | null;
  days: PredictionDay[];
}> {
  try {
    const isId = typeof seasonIdentifier === 'number' || !isNaN(Number(seasonIdentifier));
    const num = Number(seasonIdentifier);

    let seasonQuery = `SELECT * FROM prediction_seasons WHERE id = $1 LIMIT 1`;
    let seasonParam: any = [num];

    // If not matching by ID, try season_number
    let { rows: seasonRows } = await pool.query(seasonQuery, seasonParam);
    if (seasonRows.length === 0) {
      const { rows: fallbackRows } = await pool.query(
        `SELECT * FROM prediction_seasons WHERE season_number = $1 LIMIT 1`,
        [num]
      );
      seasonRows = fallbackRows;
    }

    if (seasonRows.length === 0) {
      return { season: null, days: [] };
    }

    const seasonData = seasonRows[0];
    const { rows: days } = await pool.query(`
      SELECT * FROM prediction_days 
      WHERE season_id = $1 
      ORDER BY day_number ASC
    `, [seasonData.id]);

    const { rows: completedDaysCount } = await pool.query(`
      SELECT COUNT(*) as count FROM prediction_days WHERE season_id = $1 AND is_completed = true
    `, [seasonData.id]);

    return {
      season: {
        id: seasonData.id,
        season_number: seasonData.season_number,
        name: seasonData.name,
        total_days: seasonData.total_days || 36,
        total_weeks: seasonData.total_weeks || 6,
        days_per_week: seasonData.days_per_week || 6,
        status: seasonData.status || 'active',
        current_day: seasonData.current_day || 1,
        notes: seasonData.notes,
        completed_days: Number(completedDaysCount[0]?.count) || 0,
        created_at: seasonData.created_at
      },
      days: days.map((d: any) => ({
        id: d.id,
        season_id: d.season_id,
        day_number: d.day_number,
        week_number: d.week_number,
        title: d.title || `Day ${d.day_number}`,
        match_date: d.match_date ? d.match_date.toISOString().split('T')[0] : null,
        is_completed: Boolean(d.is_completed),
        notes: d.notes || ''
      }))
    };
  } catch (error) {
    console.error("Error fetching prediction season by id:", error);
    return { season: null, days: [] };
  }
}

/**
 * Create a new Prediction Season with 36 seeded days
 */
export async function createPredictionSeason(seasonNumber: number, name: string, notes?: string) {
  try {
    const admin = await getCurrentAdminUsername();

    const { rows: newSeason } = await pool.query(`
      INSERT INTO prediction_seasons (season_number, name, total_days, total_weeks, days_per_week, status, current_day, notes)
      VALUES ($1, $2, 36, 6, 6, 'active', 1, $3)
      RETURNING *
    `, [seasonNumber, name, notes || '']);

    const seasonId = newSeason[0].id;

    // Seed 36 days
    for (let d = 1; d <= 36; d++) {
      const w = Math.ceil(d / 6);
      await pool.query(`
        INSERT INTO prediction_days (season_id, day_number, week_number, title, is_completed)
        VALUES ($1, $2, $3, $4, FALSE)
        ON CONFLICT (season_id, day_number) DO NOTHING
      `, [seasonId, d, w, `Day ${d} (Week ${w})`]);
    }

    await logSoloAdminAction('CREATE_PREDICTION_SEASON', {
      season_id: seasonId,
      season_number: seasonNumber,
      name,
      admin
    });

    return { success: true, season: newSeason[0] };
  } catch (error: any) {
    console.error("Error creating prediction season:", error);
    return { success: false, error: error.message || 'Failed to create season' };
  }
}

/**
 * Fetch day info and all members with their points for a specific day
 */
export async function fetchPredictionDayData(seasonId: number, dayNumber: number) {
  try {
    // 1. Fetch day info
    const { rows: dayRows } = await pool.query(`
      SELECT * FROM prediction_days 
      WHERE season_id = $1 AND day_number = $2 
      LIMIT 1
    `, [seasonId, dayNumber]);

    const dayInfo: PredictionDay | null = dayRows.length > 0 ? {
      id: dayRows[0].id,
      season_id: dayRows[0].season_id,
      day_number: dayRows[0].day_number,
      week_number: dayRows[0].week_number,
      title: dayRows[0].title || `Day ${dayNumber}`,
      match_date: dayRows[0].match_date ? dayRows[0].match_date.toISOString().split('T')[0] : null,
      is_completed: Boolean(dayRows[0].is_completed),
      notes: dayRows[0].notes || ''
    } : null;

    // 2. Fetch all members with their points for this day (left join prediction_scores)
    const { rows: memberRows } = await pool.query(`
      SELECT 
        m.id as member_id,
        m.name,
        m.r2g_id,
        m.avatar_path as photo,
        COALESCE(psc.points, 0) as points,
        psc.notes as score_notes
      FROM managers m
      LEFT JOIN prediction_scores psc 
        ON m.id = psc.member_id 
        AND psc.season_id = $1 
        AND psc.day_number = $2
      WHERE m.is_banned = false OR m.is_banned IS NULL
      ORDER BY 
        CASE WHEN psc.points IS NOT NULL AND psc.points > 0 THEN 0 ELSE 1 END,
        psc.points DESC NULLS LAST,
        m.name ASC
    `, [seasonId, dayNumber]);

    return {
      dayInfo,
      members: memberRows.map((r: any) => ({
        member_id: r.member_id,
        name: r.name,
        r2g_id: r.r2g_id || '',
        photo: r.photo || '',
        points: Number(r.points) || 0,
        notes: r.score_notes || ''
      }))
    };
  } catch (error) {
    console.error("Error fetching prediction day data:", error);
    return { dayInfo: null, members: [] };
  }
}

/**
 * Save / Update points for all members on a specific Day
 */
export async function savePredictionDayScores(
  seasonId: number,
  dayNumber: number,
  scores: { member_id: number; points: number; notes?: string }[],
  dayInfo?: { title?: string; match_date?: string | null; is_completed?: boolean; notes?: string }
) {
  try {
    const admin = await getCurrentAdminUsername();
    const weekNumber = Math.ceil(dayNumber / 6);

    // 1. Update day info
    if (dayInfo) {
      await pool.query(`
        UPDATE prediction_days
        SET 
          title = COALESCE($1, title),
          match_date = $2,
          is_completed = COALESCE($3, is_completed),
          notes = COALESCE($4, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE season_id = $5 AND day_number = $6
      `, [
        dayInfo.title || `Day ${dayNumber} (Week ${weekNumber})`,
        dayInfo.match_date ? new Date(dayInfo.match_date) : null,
        dayInfo.is_completed !== undefined ? dayInfo.is_completed : false,
        dayInfo.notes || null,
        seasonId,
        dayNumber
      ]);

      // If marked completed, update current_day in season if higher
      if (dayInfo.is_completed) {
        await pool.query(`
          UPDATE prediction_seasons
          SET current_day = GREATEST(current_day, $1),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [Math.min(36, dayNumber + 1), seasonId]);
      }
    }

    // 2. Batch upsert scores
    for (const score of scores) {
      const points = Number(score.points) || 0;
      await pool.query(`
        INSERT INTO prediction_scores (season_id, day_number, week_number, member_id, points, notes, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (season_id, day_number, member_id)
        DO UPDATE SET 
          points = EXCLUDED.points,
          notes = EXCLUDED.notes,
          week_number = EXCLUDED.week_number,
          updated_at = CURRENT_TIMESTAMP
      `, [
        seasonId,
        dayNumber,
        weekNumber,
        score.member_id,
        points,
        score.notes || null
      ]);
    }

    await logSoloAdminAction('SAVE_PREDICTION_SCORES', {
      season_id: seasonId,
      day_number: dayNumber,
      week_number: weekNumber,
      updated_members_count: scores.length,
      is_completed: dayInfo?.is_completed,
      admin
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error saving prediction day scores:", error);
    return { success: false, error: error.message || 'Failed to save scores' };
  }
}

/**
 * Fetch Full Leaderboard, Weekly Standings, MOTW, and 36-Day Matrix
 */
export async function fetchPredictionLeaderboard(seasonId: number) {
  try {
    // 1. Fetch Season Info
    const { rows: seasonRows } = await pool.query(
      `SELECT * FROM prediction_seasons WHERE id = $1 LIMIT 1`,
      [seasonId]
    );
    if (seasonRows.length === 0) return null;
    const season = seasonRows[0];

    // 2. Fetch All Days
    const { rows: daysRows } = await pool.query(
      `SELECT * FROM prediction_days WHERE season_id = $1 ORDER BY day_number ASC`,
      [seasonId]
    );

    const completedDayNumbers = new Set(
      daysRows.filter((d: any) => d.is_completed).map((d: any) => Number(d.day_number))
    );

    // 3. Fetch All Scores for this season
    const { rows: scoresRows } = await pool.query(`
      SELECT 
        psc.member_id,
        psc.day_number,
        psc.week_number,
        psc.points,
        m.name,
        m.r2g_id,
        m.avatar_path as photo
      FROM prediction_scores psc
      JOIN managers m ON psc.member_id = m.id
      WHERE psc.season_id = $1
      ORDER BY psc.member_id, psc.day_number ASC
    `, [seasonId]);

    // Also get all registered managers so even 0-point members appear in overall table
    const { rows: allManagers } = await pool.query(`
      SELECT id as member_id, name, r2g_id, avatar_path as photo
      FROM managers
      WHERE is_banned = false OR is_banned IS NULL
      ORDER BY name ASC
    `);

    // Build data structure per member
    const memberMap = new Map<number, {
      member_id: number;
      name: string;
      r2g_id: string;
      photo: string;
      daily_scores: Record<number, number>;
      weekly_totals: Record<number, number>;
      total_points: number;
      days_played: number;
      max_day_points: number;
      scores_list: { day: number; points: number }[];
    }>();

    // Initialize all managers
    for (const m of allManagers) {
      memberMap.set(m.member_id, {
        member_id: m.member_id,
        name: m.name,
        r2g_id: m.r2g_id || '',
        photo: m.photo || '',
        daily_scores: {},
        weekly_totals: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        total_points: 0,
        days_played: 0,
        max_day_points: 0,
        scores_list: []
      });
    }

    // Populate actual scores
    for (const s of scoresRows) {
      const mId = s.member_id;
      let record = memberMap.get(mId);
      if (!record) {
        record = {
          member_id: mId,
          name: s.name,
          r2g_id: s.r2g_id || '',
          photo: s.photo || '',
          daily_scores: {},
          weekly_totals: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          total_points: 0,
          days_played: 0,
          max_day_points: 0,
          scores_list: []
        };
        memberMap.set(mId, record);
      }

      const pts = Number(s.points) || 0;
      const dayNum = Number(s.day_number);
      const weekNum = Number(s.week_number) || Math.ceil(dayNum / 6);

      record.daily_scores[dayNum] = pts;
      record.weekly_totals[weekNum] = (record.weekly_totals[weekNum] || 0) + pts;
      record.total_points += pts;
      if (pts > 0 || completedDayNumbers.has(dayNum)) {
        record.days_played += 1;
      }
      if (pts > record.max_day_points) {
        record.max_day_points = pts;
      }
      record.scores_list.push({ day: dayNum, points: pts });
    }

    // 4. Calculate Overall Standings with proper ranking & ties
    const membersList = Array.from(memberMap.values());
    membersList.sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      if (b.max_day_points !== a.max_day_points) return b.max_day_points - a.max_day_points;
      return a.name.localeCompare(b.name);
    });

    let currentRank = 1;
    const overallStandings: LeaderboardEntry[] = [];
    const matrixEntries: ScoreMatrixEntry[] = [];

    const isSeasonFinished = completedDayNumbers.size >= 36 || season.status === 'completed';

    for (let i = 0; i < membersList.length; i++) {
      const m = membersList[i];

      if (i > 0) {
        const prev = membersList[i - 1];
        if (m.total_points < prev.total_points) {
          currentRank = i + 1;
        }
      }

      // Recent 5 completed scores form
      const sortedDayScores = Object.entries(m.daily_scores)
        .map(([d, pts]) => ({ day: Number(d), pts }))
        .sort((a, b) => b.day - a.day)
        .slice(0, 5)
        .map(x => x.pts);

      overallStandings.push({
        rank: currentRank,
        member_id: m.member_id,
        name: m.name,
        r2g_id: m.r2g_id,
        photo: m.photo,
        total_points: Math.round(m.total_points * 100) / 100,
        days_played: m.days_played,
        avg_points: m.days_played > 0 ? Math.round((m.total_points / m.days_played) * 10) / 10 : 0,
        max_day_points: m.max_day_points,
        recent_form: sortedDayScores,
        is_champion: currentRank === 1 && isSeasonFinished
      });

      matrixEntries.push({
        member_id: m.member_id,
        name: m.name,
        r2g_id: m.r2g_id,
        photo: m.photo,
        daily_scores: m.daily_scores,
        weekly_totals: m.weekly_totals,
        total_points: Math.round(m.total_points * 100) / 100,
        rank: currentRank
      });
    }

    // 5. Calculate Weekly Standings (Weeks 1 to 6) and determine MOTW for each week
    const weeklyStandings: WeeklyLeaderboard[] = [];

    for (let w = 1; w <= 6; w++) {
      const startDay = (w - 1) * 6 + 1;
      const endDay = w * 6;

      const weekDays = daysRows.filter((d: any) => d.week_number === w || (d.day_number >= startDay && d.day_number <= endDay));
      const completedWeekDays = weekDays.filter((d: any) => d.is_completed).length;
      const isWeekCompleted = completedWeekDays === 6;

      // Calculate member totals for this week
      const weekMembers = membersList.map(m => {
        let weekPts = 0;
        let weekDaysPlayed = 0;
        for (let d = startDay; d <= endDay; d++) {
          if (m.daily_scores[d] !== undefined) {
            weekPts += m.daily_scores[d];
            weekDaysPlayed += 1;
          }
        }
        return {
          member_id: m.member_id,
          name: m.name,
          r2g_id: m.r2g_id,
          photo: m.photo,
          points: Math.round(weekPts * 100) / 100,
          days_played: weekDaysPlayed
        };
      });

      weekMembers.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

      let wRank = 1;
      const rankedWeekStandings = weekMembers.map((wm, idx) => {
        if (idx > 0 && wm.points < weekMembers[idx - 1].points) {
          wRank = idx + 1;
        }
        return {
          rank: wRank,
          ...wm
        };
      });

      // Top scorer of the week is MOTW (if week has started & someone has > 0 points)
      const topScorer = rankedWeekStandings[0];
      const motw = (topScorer && topScorer.points > 0) ? {
        member_id: topScorer.member_id,
        name: topScorer.name,
        r2g_id: topScorer.r2g_id,
        photo: topScorer.photo,
        points: topScorer.points
      } : null;

      weeklyStandings.push({
        week_number: w,
        start_day: startDay,
        end_day: endDay,
        completed_days: completedWeekDays,
        is_completed: isWeekCompleted,
        motw,
        standings: rankedWeekStandings
      });
    }

    return {
      season: {
        id: season.id,
        season_number: season.season_number,
        name: season.name,
        total_days: season.total_days || 36,
        total_weeks: season.total_weeks || 6,
        status: season.status || 'active',
        current_day: season.current_day || 1,
        completed_days: completedDayNumbers.size,
        notes: season.notes
      },
      days: daysRows.map((d: any) => ({
        id: d.id,
        day_number: d.day_number,
        week_number: d.week_number,
        title: d.title,
        match_date: d.match_date ? d.match_date.toISOString().split('T')[0] : null,
        is_completed: Boolean(d.is_completed),
        notes: d.notes
      })),
      overallStandings,
      weeklyStandings,
      matrixEntries
    };
  } catch (error) {
    console.error("Error fetching prediction leaderboard:", error);
    return null;
  }
}

/**
 * Delete a prediction season
 */
export async function deletePredictionSeason(seasonId: number) {
  try {
    const admin = await getCurrentAdminUsername();
    await pool.query(`DELETE FROM prediction_seasons WHERE id = $1`, [seasonId]);
    await logSoloAdminAction('DELETE_PREDICTION_SEASON', { season_id: seasonId, admin });
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting prediction season:", error);
    return { success: false, error: error.message || 'Failed to delete season' };
  }
}
