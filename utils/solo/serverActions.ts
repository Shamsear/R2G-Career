"use server";

import { Pool } from 'pg';

const connectionString = process.env.SOLO_DATABASE_URL;

if (!connectionString) {
  console.error("❌ SOLO_DATABASE_URL is not set.");
}

const pool = new Pool({
  connectionString: connectionString || '',
  ssl: { rejectUnauthorized: false } // Standard practice for external Supabase/Neon DBs
});

async function logTransaction(
  managerId: string | number,
  seasonId: string | number,
  currencyType: 'coin' | 'token' | 'voucher',
  amount: number,
  transactionType: string,
  description: string
) {
  try {
    await pool.query(`
      INSERT INTO wallet_transactions (manager_id, season_id, currency_type, amount, transaction_type, description)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [parseInt(managerId.toString()), parseInt(seasonId.toString()), currencyType, amount, transactionType, description]);
  } catch (error) {
    console.error("Error logging transaction:", error);
  }
}

export async function fetchManagers() {
    try {
        const { rows: managersResult } = await pool.query(`
            SELECT DISTINCT ON (m.id)
                m.id, m.name, m.avatar_path as photo,
                c.name as club_name,
                c.logo_path as club_logo,
                ms.manager_rank as age,
                ms.rank_points,
                mw.overall_rating,
                mw.star_rating,
                mw.r2g_token_balance,
                mw.r2g_coin_balance,
                mw.r2g_voucher_balance,
                ms.session_rewards as total_earnings,
                COALESCE((
                    SELECT SUM(base_value) 
                    FROM players p 
                    JOIN player_contracts pc ON p.id = pc.player_id 
                    WHERE pc.current_club_id = mw.current_club_id 
                      AND LOWER(pc.status) = 'active'
                      AND pc.season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
                ), 0) as club_total_value,
                ms.awards,
                ms.competitions,
                mw.current_club_id as club_id,
                ms.wins,
                ms.draws,
                ms.losses,
                ms.matches_played,
                ms.goals_scored,
                ms.goals_conceded,
                ms.clean_sheets,
                m.is_banned
            FROM managers m
            LEFT JOIN manager_wallets mw ON m.id = mw.manager_id AND mw.season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
            LEFT JOIN clubs c ON mw.current_club_id = c.id
            LEFT JOIN manager_seasons ms ON m.id = ms.manager_id AND ms.season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
            ORDER BY m.id, ms.id DESC
        `);

        return managersResult.map((m: any) => {
            let trophies = 0;
            let awardsCount = 0;
            try {
                if (m.competitions) {
                    const comp = typeof m.competitions === 'string' ? JSON.parse(m.competitions) : m.competitions;
                    trophies = Array.isArray(comp) ? comp.length : Object.keys(comp).length;
                }
            } catch (e) { console.error("Error parsing competitions:", e); }
            try {
                if (m.awards) {
                    const awds = typeof m.awards === 'string' ? JSON.parse(m.awards) : m.awards;
                    awardsCount = Array.isArray(awds) ? awds.length : Object.keys(awds).length;
                }
            } catch (e) { console.error("Error parsing awards:", e); }

            return {
                id: m.id,
                name: m.name,
                photo: m.photo || '',
                club: m.club_name || 'No Club',
                club_id: m.club_id,
                club_logo: m.club_logo || '',
                age: m.age || 0,
                overall_rating: m.overall_rating || 0,
                star_rating: m.star_rating || 0,
                r2g_coin_balance: m.r2g_coin_balance || 0,
                r2g_token_balance: m.r2g_token_balance || 0,
                r2g_voucher_balance: m.r2g_voucher_balance || 0,
                wins: m.wins || 0,
                draws: m.draws || 0,
                losses: m.losses || 0,
                matches_played: m.matches_played || 0,
                goals_scored: m.goals_scored || 0,
                goals_conceded: m.goals_conceded || 0,
                clean_sheets: m.clean_sheets || 0,
                is_banned: m.is_banned || false,
                club_total_value: Math.floor(m.club_total_value / 1000000) || 0,
                trophies,
                awards: awardsCount,
                balance: (Number(m.r2g_coin_balance) || 0) + (Number(m.r2g_token_balance) || 0),
                bio: "Experienced tactician.",
                favorite_formation: "4-3-3",
                play_style: "Attacking"
            };
        });
    } catch (error: any) {
        console.error("Error fetching managers:", error);
        return { error: `Failed to fetch managers: ${error?.message || 'Database connection error'}` } as any;
    }
}

export async function fetchManagerByName(name: string) {
    try {
        const decodedName = decodeURIComponent(name);
        const { rows: managersResult } = await pool.query(`
            SELECT 
                m.id, m.name, m.avatar_path as photo,
                c.name as club_name,
                ms.manager_rank as age,
                mw.overall_rating,
                mw.star_rating,
                mw.r2g_token_balance,
                mw.r2g_coin_balance,
                mw.r2g_voucher_balance,
                ms.session_rewards as total_earnings,
                ms.awards,
                ms.competitions,
                ms.wins, ms.draws, ms.losses, ms.matches_played,
                ms.goals_scored, ms.goals_conceded, ms.clean_sheets,
                mw.current_club_id as club_id
            FROM managers m
            LEFT JOIN manager_wallets mw ON m.id = mw.manager_id AND mw.season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
            LEFT JOIN clubs c ON mw.current_club_id = c.id
            LEFT JOIN manager_seasons ms ON m.id = ms.manager_id AND ms.season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
            WHERE LOWER(m.name) = LOWER($1)
            LIMIT 1
        `, [decodedName]);

        if (managersResult.length === 0) return null;
        
        const m = managersResult[0];
        
        // Fetch players for this manager's club
        const { rows: playersResult } = await pool.query(`
            SELECT p.id, p.name, p.position, p.card_type as star, p.base_value as value, p.image_path as imagePath
            FROM players p
            JOIN player_contracts pc ON p.id = pc.player_id
            WHERE pc.current_club_id = $1 
              AND pc.status = 'active'
              AND pc.season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
        `, [m.club_id]);

        // Fetch seasons history for this manager
        const { rows: seasonsResult } = await pool.query(`
            SELECT 
                ms.manager_rank, ms.rank_points, ms.team_income, ms.team_expense, ms.team_profit, ms.session_rewards,
                ms.matches_played, ms.wins, ms.draws, ms.losses, ms.goals_scored, ms.goals_conceded, ms.clean_sheets,
                ms.awards, ms.competitions,
                s.season_number
            FROM manager_seasons ms
            JOIN seasons s ON ms.season_id = s.id
            WHERE ms.manager_id = $1
            ORDER BY s.season_number DESC
        `, [m.id]);

        const seasons = seasonsResult.map((s: any) => ({
            number: s.season_number,
            manager_rank: s.manager_rank || 0,
            rank_point: s.rank_points || 0,
            team_income: s.team_income || 0,
            team_expense: s.team_expense || 0,
            team_profit: s.team_profit || 0,
            session_rewards: s.session_rewards || 0,
            sp_tour_stats: {
                matches: s.matches_played || 0,
                wins: s.wins || 0,
                draws: s.draws || 0,
                losses: s.losses || 0,
                goals_scored: s.goals_scored || 0,
                goals_conceded: s.goals_conceded || 0,
                goal_difference: (s.goals_scored || 0) - (s.goals_conceded || 0),
                clean_sheets: s.clean_sheets || 0
            },
            season_stats: {
                matches: s.matches_played || 0,
                wins: s.wins || 0,
                draws: s.draws || 0,
                losses: s.losses || 0,
                goals_scored: s.goals_scored || 0,
                goals_conceded: s.goals_conceded || 0,
                goal_difference: (s.goals_scored || 0) - (s.goals_conceded || 0),
                clean_sheets: s.clean_sheets || 0
            },
            competitions: (() => {
                try {
                    if (!s.competitions) return {};
                    return typeof s.competitions === 'string' ? JSON.parse(s.competitions) : s.competitions;
                } catch { return {}; }
            })(),
            awards: (() => {
                try {
                    if (!s.awards) return [];
                    return typeof s.awards === 'string' ? JSON.parse(s.awards) : s.awards;
                } catch { return []; }
            })()
        }));

        return {
            id: m.id,
            name: m.name,
            photo: m.photo || '',
            club: m.club_name || 'No Club',
            age: m.age || 0,
            overall_rating: m.overall_rating || 0,
            star_rating: m.star_rating || 0,
            balance: (Number(m.r2g_coin_balance) || 0) + (Number(m.r2g_token_balance) || 0),
            total_earnings: m.total_earnings || 0,
            bio: "Experienced tactician.",
            favorite_formation: "4-3-3",
            play_style: "Attacking",
            stats: {
                matches: m.matches_played || 0,
                wins: m.wins || 0,
                draws: m.draws || 0,
                losses: m.losses || 0,
                goalsFor: m.goals_scored || 0,
                goalsAgainst: m.goals_conceded || 0,
                cleanSheets: m.clean_sheets || 0
            },
            trophies: (() => {
                try {
                    if (!m.competitions) return 0;
                    const comp = typeof m.competitions === 'string' ? JSON.parse(m.competitions) : m.competitions;
                    return Array.isArray(comp) ? comp.length : Object.keys(comp).length;
                } catch { return 0; }
            })(),
            awards: (() => {
                try {
                    if (!m.awards) return 0;
                    const awds = typeof m.awards === 'string' ? JSON.parse(m.awards) : m.awards;
                    return Array.isArray(awds) ? awds.length : Object.keys(awds).length;
                } catch { return 0; }
            })(),
            players: playersResult.map((p: any) => ({
                id: p.id,
                name: p.name,
                position: p.position,
                value: p.value || 0,
                star: p.star || '3-star-standard',
                imagePath: p.imagepath || `/assets/images/players/${p.id}.png`
            })),
            seasons: seasons
        };
    } catch (error) {
        console.error("Error fetching manager by name:", error);
        throw new Error("Failed to fetch manager details");
    }
}

export async function fetchPlayerById(id: string | number) {
    try {
        const playerId = parseInt(id.toString(), 10);
        if (isNaN(playerId)) return null;

        const { rows: playerResult } = await pool.query(`
            SELECT 
                p.id, p.name, p.position, p.card_type as star, p.base_value as value, p.image_path as imagePath,
                c.name as club_name, pc.salary, pc.start_season, pc.expire_season, pc.status as contract_status,
                pss.status_type as tier_status, pss.valid_until
            FROM players p
            LEFT JOIN player_contracts pc ON p.id = pc.player_id AND (LOWER(pc.status) = 'active' OR pc.status IS NULL)
            LEFT JOIN clubs c ON pc.current_club_id = c.id
            LEFT JOIN player_seasonal_statuses pss ON p.id = pss.player_id
            WHERE p.id = $1
            LIMIT 1
        `, [playerId]);

        if (playerResult.length === 0) return null;

        const p = playerResult[0];

        // Fallback stats history using current contract value or base value
        const stats = p.club_name ? [
            {
                season: p.start_season ? p.start_season.replace(/[^0-9.]/g, '') : '6',
                expireSeason: p.expire_season ? p.expire_season.replace(/[^0-9.]/g, '') : '9.5',
                team: p.club_name,
                value: p.value || 0
            }
        ] : [];

        return {
            id: p.id,
            name: p.name,
            club: p.club_name || 'FREE AGENT',
            position: p.position || '',
            value: p.value || 0,
            star: p.star || '3-star-standard',
            level: p.tier_status || 'undefined',
            imagePath: p.imagepath || `/assets/images/players/${p.id}.png`,
            salary: p.salary || 0,
            startSeason: p.start_season || '',
            expireSeason: p.expire_season || '',
            contractStatus: p.contract_status || '',
            validUntil: p.valid_until || '',
            stats: stats
        };
    } catch (error) {
        console.error("Error fetching player by ID:", error);
        throw new Error("Failed to fetch player details");
    }
}

export async function fetchPlayersDb() {
    try {
        const { rows: playersResult } = await pool.query(`
            SELECT 
                p.id, p.name, p.position, p.card_type as star, p.base_value as value, p.image_path as imagePath,
                c.name as club_name, pc.status
            FROM players p
            LEFT JOIN player_contracts pc ON p.id = pc.player_id AND (LOWER(pc.status) = 'active' OR pc.status IS NULL)
            LEFT JOIN clubs c ON pc.current_club_id = c.id
        `);
        
        return playersResult.map((p: any) => ({
            id: p.id,
            name: p.name,
            club: p.club_name || 'FREE AGENT',
            position: p.position || '',
            value: p.value || 0,
            star: p.star || '3-star-standard',
            level: 'undefined',
            imagePath: p.imagepath || `/assets/images/players/${p.id}.png`,
            stats: []
        }));
    } catch (error) {
        console.error("Error fetching players:", error);
        throw new Error("Failed to fetch players");
    }
}

export async function fetchPlayerAuctionData() {
    try {
        const { rows: auctionResult } = await pool.query(`
            SELECT 
                p.id, p.name, p.position, p.base_value,
                c.name as current_club,
                pc.start_season, pc.expire_season, pc.salary, pc.signed_value,
                a.reserve_price, a.winning_bid_amount, a.status
            FROM players p
            LEFT JOIN player_contracts pc ON p.id = pc.player_id AND LOWER(pc.status) = 'active'
            LEFT JOIN clubs c ON pc.current_club_id = c.id
            LEFT JOIN auctions a ON p.id = a.player_id
        `);
        
        return auctionResult.map((p: any) => {
            const formatSeason = (val: string) => val ? val.replace(/[^0-9.]/g, '').trim() : '?';
            return {
                name: p.name,
                position: p.position,
                team: p.current_club || 'Unsold',
                rating: p.base_value || 0,
                bidAmount: Number(p.signed_value || p.winning_bid_amount || 0),
                rowId: p.id,
                contract: p.current_club ? `${formatSeason(p.start_season)} - ${formatSeason(p.expire_season)}` : 'None',
            reservePrice: p.reserve_price || p.base_value || 0,
            salary: p.salary || 0
            };
        });
    } catch (error) {
        console.error("Error fetching auction data:", error);
        throw new Error("Failed to fetch player auction data");
    }
}

export async function fetchManagerRanking() {
    try {
        const { rows: result } = await pool.query(`SELECT m.name, ms.manager_rank as rank, ms.rank_points as score, m.avatar_path as img FROM managers m JOIN manager_seasons ms ON m.id = ms.manager_id ORDER BY ms.manager_rank ASC NULLS LAST`);
        return result;
    } catch (e) { console.error(e); return []; }
}

export async function fetchRegisteredClubs() {
    try {
        const { rows: result } = await pool.query(`SELECT c.id, c.name, m.name as manager, c.logo_path as image FROM clubs c JOIN managers m ON c.id = m.id`);
        return result;
    } catch (e) { console.error(e); return []; }
}

export async function fetchSelectedCandidates(tournamentName: string) {
    try {
        const { rows: result } = await pool.query(`
            SELECT DISTINCT ON (c.id)
                c.id, c.name as club_name, c.logo_path,
                m.name as manager_name, m.avatar_path,
                tt.selection_status, tt.custom_team_name, tt.use_existing_club, tt.custom_logo_path,
                mw.overall_rating,
                ms.wins, ms.losses, ms.matches_played, ms.competitions
            FROM tournament_teams tt
            JOIN clubs c ON tt.club_id = c.id
            LEFT JOIN managers m ON c.id = m.id
            LEFT JOIN manager_seasons ms ON m.id = ms.manager_id AND ms.season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
            LEFT JOIN manager_wallets mw ON m.id = mw.manager_id AND mw.season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
            WHERE tt.tournament_name = $1
            ORDER BY c.id, ms.id DESC
        `, [tournamentName]);

        return result.map((row: any) => {
            let trophies = 0;
            try {
                if (row.competitions) {
                    const comp = typeof row.competitions === 'string' ? JSON.parse(row.competitions) : row.competitions;
                    trophies = Array.isArray(comp) ? comp.length : Object.keys(comp).length;
                }
            } catch (e) { console.error("Error parsing competitions:", e); }

            const winRate = row.matches_played > 0 ? Math.round((row.wins / row.matches_played) * 100) : 0;

            const displayName = (!row.use_existing_club && row.custom_team_name) 
              ? row.custom_team_name 
              : row.club_name;

            return {
                id: row.id,
                name: row.manager_name || 'Unknown',
                club: displayName,
                customTeamName: row.custom_team_name,
                useExistingClub: row.use_existing_club,
                customLogoPath: row.custom_logo_path,
                role: 'Tactical Manager',
                status: row.selection_status,
                rating: row.overall_rating || 85,
                avatar: row.avatar_path || '',
                stat1: { label: "Win Rate", value: `${winRate}%` },
                stat2: { label: "Matches", value: String(row.matches_played || 0) },
                stat3: { label: "Cups", value: String(trophies) }
            };
        });
    } catch (error) {
        console.error("Error fetching selected candidates:", error);
        return [];
    }
}

export async function fetchTournaments() {
  try {
    const { rows } = await pool.query(`
      SELECT t.id, t.name, t.format_type, t.financial_rule_id, t.tournament_type, s.season_number
      FROM tournaments t
      JOIN seasons s ON t.season_id = s.id
      ORDER BY t.id ASC
    `);
    return rows;
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return [];
  }
}

export async function fetchFixtures(tournamentId?: number) {
  try {
    let query = `
      SELECT f.id, f.tournament_id, f.season_id, f.home_score, f.away_score, f.match_events, f.round_number,
             t.name as tournament_name,
             hc.name as home_club_name, hc.logo_path as home_club_logo,
             tth.custom_team_name as home_custom_name, tth.use_existing_club as home_use_existing,
             ac.name as away_club_name, ac.logo_path as away_club_logo,
             tta.custom_team_name as away_custom_name, tta.use_existing_club as away_use_existing
      FROM fixtures f
      JOIN tournaments t ON f.tournament_id = t.id
      JOIN clubs hc ON f.home_club_id = hc.id
      JOIN clubs ac ON f.away_club_id = ac.id
      LEFT JOIN tournament_teams tth ON (tth.tournament_name = t.name OR (t.tournament_type = 'rws' AND tth.tournament_name = 'R2G World Series')) AND tth.club_id = f.home_club_id
      LEFT JOIN tournament_teams tta ON (tta.tournament_name = t.name OR (t.tournament_type = 'rws' AND tta.tournament_name = 'R2G World Series')) AND tta.club_id = f.away_club_id
    `;
    const params = [];
    if (tournamentId !== undefined) {
      query += ` WHERE f.tournament_id = $1`;
      params.push(tournamentId);
    }
    query += ` ORDER BY f.id ASC`;

    const { rows } = await pool.query(query, params);
    return rows.map(r => {
      const homeName = (!r.home_use_existing && r.home_custom_name) ? r.home_custom_name : r.home_club_name;
      const awayName = (!r.away_use_existing && r.away_custom_name) ? r.away_custom_name : r.away_club_name;
      return {
        id: r.id,
        tournamentId: r.tournament_id,
        tournamentName: r.tournament_name,
        homeClub: homeName,
        homeLogo: r.home_club_logo,
        awayClub: awayName,
        awayLogo: r.away_club_logo,
        homeScore: r.home_score,
        awayScore: r.away_score,
        roundNumber: r.round_number,
        matchEvents: typeof r.match_events === 'string' ? JSON.parse(r.match_events) : r.match_events
      };
    });
  } catch (error) {
    console.error("Error fetching fixtures:", error);
    return [];
  }
}

export async function fetchFixtureById(fixtureId: number) {
  try {
    const { rows } = await pool.query(`
      SELECT f.id, f.tournament_id, f.season_id, f.home_score, f.away_score, f.match_events, f.round_number, f.match_status, f.match_status_reason,
             t.name as tournament_name,
             hc.name as home_club_name, hc.logo_path as home_club_logo,
             ac.name as away_club_name, ac.logo_path as away_club_logo
      FROM fixtures f
      JOIN tournaments t ON f.tournament_id = t.id
      JOIN clubs hc ON f.home_club_id = hc.id
      JOIN clubs ac ON f.away_club_id = ac.id
      WHERE f.id = $1
      LIMIT 1
    `, [fixtureId]);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      tournamentId: r.tournament_id,
      tournamentName: r.tournament_name,
      homeClub: r.home_club_name,
      homeLogo: r.home_club_logo,
      awayClub: r.away_club_name,
      awayLogo: r.away_club_logo,
      homeScore: r.home_score,
      awayScore: r.away_score,
      roundNumber: r.round_number,
      matchStatus: r.match_status,
      matchStatusReason: r.match_status_reason,
      matchEvents: typeof r.match_events === 'string' ? JSON.parse(r.match_events) : r.match_events
    };
  } catch (error) {
    console.error("Error fetching fixture by ID:", error);
    return null;
  }
}

export async function fetchTournamentById(tournamentId: number) {
  try {
    const { rows } = await pool.query(`
      SELECT t.id, t.name, t.format_type, t.financial_rule_id, t.tournament_type, s.season_number
      FROM tournaments t
      JOIN seasons s ON t.season_id = s.id
      WHERE t.id = $1
      LIMIT 1
    `, [tournamentId]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error fetching tournament by ID:", error);
    return null;
  }
}

export async function fetchTournamentStandings(tournamentId: number) {
  try {
    const { rows } = await pool.query(`
      SELECT ts.club_id, ts.matches_played, ts.points, ts.goals_scored, ts.goals_against, ts.goal_difference,
             c.name as club_name, c.logo_path as club_logo,
             tt.custom_team_name, tt.use_existing_club
      FROM tournament_standings ts
      JOIN clubs c ON ts.club_id = c.id
      JOIN tournaments t ON ts.tournament_id = t.id
      LEFT JOIN tournament_teams tt ON tt.tournament_name = t.name AND tt.club_id = ts.club_id
      WHERE ts.tournament_id = $1
      ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_scored DESC
    `, [tournamentId]);
    return rows.map((r: any) => ({
      ...r,
      club_name: (!r.use_existing_club && r.custom_team_name) ? r.custom_team_name : r.club_name
    }));
  } catch (error) {
    console.error("Error fetching tournament standings:", error);
    return [];
  }
}

export async function fetchActiveSeason() {
  try {
    const { rows } = await pool.query(`
      SELECT id, season_number, is_active, has_rws, rws_year,
             start_bonus_rc, start_bonus_rt, start_bonus_voucher,
             finale_bonus_rc, finale_bonus_rt, finale_bonus_voucher
      FROM seasons s
      ORDER BY season_number DESC
      LIMIT 1
    `);
    return rows.length > 0 ? rows[0] : {
      id: 6,
      season_number: 9,
      is_active: true,
      has_rws: true,
      rws_year: 2026,
      start_bonus_rc: 1500,
      start_bonus_rt: 50,
      start_bonus_voucher: 5,
      finale_bonus_rc: 2000,
      finale_bonus_rt: 80,
      finale_bonus_voucher: 10
    };
  } catch (error) {
    console.error("Error fetching active season:", error);
    return {
      id: 6,
      season_number: 9,
      is_active: true,
      has_rws: true,
      rws_season_number: 3,
      start_bonus_rc: 1500,
      start_bonus_rt: 50,
      start_bonus_voucher: 5,
      finale_bonus_rc: 2000,
      finale_bonus_rt: 80,
      finale_bonus_voucher: 10
    };
  }
}

export async function fetchClubPlayers(clubId: string | number) {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.name, p.position, p.card_type as star, p.base_value as value, p.image_path as imagePath, p.is_suspended
      FROM players p
      JOIN player_contracts pc ON p.id = pc.player_id
      WHERE pc.current_club_id = $1 
        AND pc.status = 'active'
        AND pc.season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
      ORDER BY p.name ASC
    `, [clubId]);
    return rows.map((p: any) => ({
      id: p.id,
      name: p.name,
      position: p.position || '',
      value: p.value || 0,
      star: p.star || '3-star-standard',
      imagePath: p.imagepath || `/assets/images/players/${p.id}.png`,
      isSuspended: p.is_suspended || false
    }));
  } catch (e) {
    console.error("Error fetching club players:", e);
    return [];
  }
}

export async function fetchAppearances(clubId: string | number, seasonId: string | number) {
  try {
    const { rows } = await pool.query(`
      SELECT player_id, matchday
      FROM career_matchday_appearances
      WHERE team_id = $1 AND season_id = $2
    `, [clubId, seasonId]);
    return rows;
  } catch (e) {
    console.error("Error fetching appearances:", e);
    return [];
  }
}

export async function saveAppearances(clubId: string | number, seasonId: string | number, matchday: number, playerIds: (string | number)[]) {
  try {
    await pool.query('BEGIN');
    
    await pool.query(`
      DELETE FROM career_matchday_appearances
      WHERE team_id = $1 AND season_id = $2 AND matchday = $3
    `, [clubId, seasonId, matchday]);
    
    for (const playerId of playerIds) {
      await pool.query(`
        INSERT INTO career_matchday_appearances (team_id, season_id, matchday, player_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (season_id, matchday, team_id, player_id) DO NOTHING
      `, [clubId, seasonId, matchday, playerId.toString()]);
    }
    
    await pool.query('COMMIT');
    return { success: true };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error saving appearances:", e);
    throw e;
  }
}

export async function fetchRwsAlbumPhotos(seasonId?: number) {
  try {
    const targetSeasonId = seasonId || await fetchActiveSeason().then(s => s?.id);
    if (!targetSeasonId) return [];
    const { rows } = await pool.query(`SELECT * FROM rws_album WHERE season_id = $1 ORDER BY id DESC`, [targetSeasonId]);
    return rows;
  } catch (e) {
    console.error("Error fetching album photos:", e);
    return [];
  }
}

export async function addRwsAlbumPhoto(title: string, tag: string, imageUrl: string, dateStr: string, seasonId?: number) {
  try {
    const targetSeasonId = seasonId || await fetchActiveSeason().then(s => s?.id);
    const { rows } = await pool.query(`
      INSERT INTO rws_album (title, tag, image_url, date_str, season_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [title, tag, imageUrl, dateStr, targetSeasonId]);
    return rows[0];
  } catch (e) {
    console.error("Error adding photo:", e);
    throw e;
  }
}

export async function deleteRwsAlbumPhoto(id: number) {
  try {
    await pool.query(`DELETE FROM rws_album WHERE id = $1`, [id]);
    return { success: true };
  } catch (e) {
    console.error("Error deleting photo:", e);
    throw e;
  }
}

export async function fetchFinancialRules() {
  try {
    const { rows } = await pool.query(`SELECT * FROM career_financial_rules ORDER BY id ASC`);
    return rows;
  } catch (e) {
    console.error("Error fetching financial rules:", e);
    return [];
  }
}

export async function createFinancialRule(rule: any) {
  try {
    const p = (v: any) => (v === "" || v === null || v === undefined) ? null : Number(v);
    const { rows } = await pool.query(`
      INSERT INTO career_financial_rules (
        name, 
        match_bonus_rc, match_bonus_rt, match_bonus_voucher,
        match_win_bonus_rc, match_win_bonus_rt, match_win_bonus_voucher,
        match_draw_bonus_rc, match_draw_bonus_rt, match_draw_bonus_voucher,
        match_loss_bonus_rc, match_loss_bonus_rt, match_loss_bonus_voucher,
        tournament_bonus_rc, tournament_bonus_rt, tournament_bonus_voucher,
        season_bonus_rc, season_bonus_rt, season_bonus_voucher,
        walkover_fine_rc, walkover_fine_rt, walkover_fine_voucher,
        match_extension_fee_rc, match_extension_fee_rt, match_extension_fee_voucher
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *
    `, [
      rule.name,
      p(rule.match_bonus_rc), p(rule.match_bonus_rt), p(rule.match_bonus_voucher),
      p(rule.match_win_bonus_rc), p(rule.match_win_bonus_rt), p(rule.match_win_bonus_voucher),
      p(rule.match_draw_bonus_rc), p(rule.match_draw_bonus_rt), p(rule.match_draw_bonus_voucher),
      p(rule.match_loss_bonus_rc), p(rule.match_loss_bonus_rt), p(rule.match_loss_bonus_voucher),
      p(rule.tournament_bonus_rc), p(rule.tournament_bonus_rt), p(rule.tournament_bonus_voucher),
      p(rule.season_bonus_rc), p(rule.season_bonus_rt), p(rule.season_bonus_voucher),
      p(rule.walkover_fine_rc), p(rule.walkover_fine_rt), p(rule.walkover_fine_voucher),
      p(rule.match_extension_fee_rc), p(rule.match_extension_fee_rt), p(rule.match_extension_fee_voucher)
    ]);
    return rows[0];
  } catch (e) {
    console.error("Error creating financial rule:", e);
    throw e;
  }
}

export async function updateFinancialRule(id: number, rule: any) {
  try {
    const p = (v: any) => (v === "" || v === null || v === undefined) ? null : Number(v);
    const { rows } = await pool.query(`
      UPDATE career_financial_rules SET
        name = $1, 
        match_bonus_rc = $2, match_bonus_rt = $3, match_bonus_voucher = $4,
        match_win_bonus_rc = $5, match_win_bonus_rt = $6, match_win_bonus_voucher = $7,
        match_draw_bonus_rc = $8, match_draw_bonus_rt = $9, match_draw_bonus_voucher = $10,
        match_loss_bonus_rc = $11, match_loss_bonus_rt = $12, match_loss_bonus_voucher = $13,
        tournament_bonus_rc = $14, tournament_bonus_rt = $15, tournament_bonus_voucher = $16,
        season_bonus_rc = $17, season_bonus_rt = $18, season_bonus_voucher = $19,
        walkover_fine_rc = $20, walkover_fine_rt = $21, walkover_fine_voucher = $22,
        match_extension_fee_rc = $23, match_extension_fee_rt = $24, match_extension_fee_voucher = $25,
        updated_at = NOW()
      WHERE id = $26
      RETURNING *
    `, [
      rule.name,
      p(rule.match_bonus_rc), p(rule.match_bonus_rt), p(rule.match_bonus_voucher),
      p(rule.match_win_bonus_rc), p(rule.match_win_bonus_rt), p(rule.match_win_bonus_voucher),
      p(rule.match_draw_bonus_rc), p(rule.match_draw_bonus_rt), p(rule.match_draw_bonus_voucher),
      p(rule.match_loss_bonus_rc), p(rule.match_loss_bonus_rt), p(rule.match_loss_bonus_voucher),
      p(rule.tournament_bonus_rc), p(rule.tournament_bonus_rt), p(rule.tournament_bonus_voucher),
      p(rule.season_bonus_rc), p(rule.season_bonus_rt), p(rule.season_bonus_voucher),
      p(rule.walkover_fine_rc), p(rule.walkover_fine_rt), p(rule.walkover_fine_voucher),
      p(rule.match_extension_fee_rc), p(rule.match_extension_fee_rt), p(rule.match_extension_fee_voucher),
      id
    ]);
    return rows[0];
  } catch (e) {
    console.error("Error updating financial rule:", e);
    throw e;
  }
}

export async function deleteFinancialRule(id: number) {
  try {
    await pool.query(`DELETE FROM career_financial_rules WHERE id = $1`, [id]);
    return { success: true };
  } catch (e) {
    console.error("Error deleting financial rule:", e);
    throw e;
  }
}

export async function createClubAndManager(data: any) {
  try {
    await pool.query('BEGIN');
    
    const { rows: maxIdRows } = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM managers');
    const nextId = maxIdRows[0].next_id;
    
    await pool.query(`
      INSERT INTO managers (id, name, avatar_path)
      VALUES ($1, $2, $3)
    `, [nextId, data.managerName, data.avatarPath || '']);
    
    await pool.query(`
      INSERT INTO clubs (id, name, logo_path)
      VALUES ($1, $2, $3)
    `, [nextId, data.clubName, data.logoPath || '']);
    
    const activeSeason = await fetchActiveSeason();
    if (activeSeason) {
      await pool.query(`
        INSERT INTO manager_wallets (manager_id, season_id, current_club_id, r2g_coin_balance, r2g_token_balance, r2g_voucher_balance, overall_rating, star_rating)
        VALUES ($1, $2, $1, $3, $4, $5, $6, $7)
      `, [nextId, activeSeason.id, data.coinBalance || 0, data.tokenBalance || 0, data.voucherBalance || 0, data.rating || 80, data.starRating || 3]);
      
      await pool.query(`
        INSERT INTO manager_seasons (manager_id, season_id, club_id, matches_played, wins, draws, losses, goals_scored, goals_conceded, clean_sheets, team_income, team_expense, team_profit)
        VALUES ($1, $2, $1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
      `, [nextId, activeSeason.id]);

      if ((data.coinBalance || 0) > 0) {
        await logTransaction(nextId, activeSeason.id, 'coin', data.coinBalance, 'initial', 'Starting coins balance');
      }
      if ((data.tokenBalance || 0) > 0) {
        await logTransaction(nextId, activeSeason.id, 'token', data.tokenBalance, 'initial', 'Starting tokens balance');
      }
      if ((data.voucherBalance || 0) > 0) {
        await logTransaction(nextId, activeSeason.id, 'voucher', data.voucherBalance, 'initial', 'Starting vouchers balance');
      }
    }
    
    await pool.query('COMMIT');
    return { success: true, id: nextId };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error creating club and manager:", e);
    throw e;
  }
}

export async function updateManagerDetails(data: any) {
  try {
    await pool.query('BEGIN');
    
    const activeSeason = await fetchActiveSeason();
    const seasonId = activeSeason ? activeSeason.id : 6;
    
    // Determine the club ID. If data.clubId is provided, we use it (reassignment).
    // Otherwise, we fetch the current club ID from the wallet.
    let clubId = data.clubId ? parseInt(data.clubId) : null;
    
    if (!clubId) {
      const { rows: walletRows } = await pool.query(`
        SELECT current_club_id FROM manager_wallets 
        WHERE manager_id = $1 AND season_id = $2
      `, [data.id, seasonId]);
      clubId = walletRows.length > 0 ? walletRows[0].current_club_id : data.id;
    }
    
    // Update the manager's basic info
    await pool.query(`
      UPDATE managers SET name = $1, avatar_path = $2, is_banned = $3 WHERE id = $4
    `, [data.name, data.photo || '', data.isBanned || false, data.id]);
    
    // Update the club details (name and logo) for this club
    await pool.query(`
      UPDATE clubs SET name = $1, logo_path = $2 WHERE id = $3
    `, [data.clubName, data.logoPath || '', clubId]);
    
    if (activeSeason) {
      const { rows: oldWalletRows } = await pool.query(`
        SELECT r2g_coin_balance, r2g_token_balance, r2g_voucher_balance 
        FROM manager_wallets 
        WHERE manager_id = $1 AND season_id = $2
      `, [data.id, activeSeason.id]);

      const oldCoins = oldWalletRows.length > 0 ? parseInt(oldWalletRows[0].r2g_coin_balance) || 0 : 0;
      const oldTokens = oldWalletRows.length > 0 ? parseInt(oldWalletRows[0].r2g_token_balance) || 0 : 0;
      const oldVouchers = oldWalletRows.length > 0 ? parseInt(oldWalletRows[0].r2g_voucher_balance) || 0 : 0;

      const { rowCount } = await pool.query(`
        UPDATE manager_wallets SET
          current_club_id = $1,
          r2g_coin_balance = $2,
          r2g_token_balance = $3,
          r2g_voucher_balance = $4,
          overall_rating = $5,
          star_rating = $6
        WHERE manager_id = $7 AND season_id = $8
      `, [clubId, data.coinBalance || 0, data.tokenBalance || 0, data.voucherBalance || 0, data.rating || 80, data.starRating || 3, data.id, activeSeason.id]);
      
      if (rowCount === 0) {
        await pool.query(`
          INSERT INTO manager_wallets (manager_id, season_id, current_club_id, r2g_coin_balance, r2g_token_balance, r2g_voucher_balance, overall_rating, star_rating)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [data.id, activeSeason.id, clubId, data.coinBalance || 0, data.tokenBalance || 0, data.voucherBalance || 0, data.rating || 80, data.starRating || 3]);
      }

      const diffCoins = (data.coinBalance || 0) - oldCoins;
      const diffTokens = (data.tokenBalance || 0) - oldTokens;
      const diffVouchers = (data.voucherBalance || 0) - oldVouchers;
      
      if (diffCoins !== 0) {
        await logTransaction(data.id, activeSeason.id, 'coin', diffCoins, 'custom_adjustment', 'Admin wallet balance override');
      }
      if (diffTokens !== 0) {
        await logTransaction(data.id, activeSeason.id, 'token', diffTokens, 'custom_adjustment', 'Admin wallet balance override');
      }
      if (diffVouchers !== 0) {
        await logTransaction(data.id, activeSeason.id, 'voucher', diffVouchers, 'custom_adjustment', 'Admin wallet balance override');
      }
      
      // Update manager seasons
      const { rowCount: sCount } = await pool.query(`
        UPDATE manager_seasons SET
          club_id = $1,
          wins = $2, draws = $3, losses = $4, matches_played = $5,
          goals_scored = $6, goals_conceded = $7, clean_sheets = $8
        WHERE manager_id = $9 AND season_id = $10
      `, [clubId, data.wins || 0, data.draws || 0, data.losses || 0, data.matchesPlayed || 0, data.goalsFor || 0, data.goalsAgainst || 0, data.cleanSheets || 0, data.id, activeSeason.id]);
      
      if (sCount === 0) {
        await pool.query(`
          INSERT INTO manager_seasons (manager_id, season_id, club_id, matches_played, wins, draws, losses, goals_scored, goals_conceded, clean_sheets, team_income, team_expense, team_profit)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, 0, 0)
        `, [data.id, activeSeason.id, clubId, data.matchesPlayed || 0, data.wins || 0, data.draws || 0, data.losses || 0, data.goalsFor || 0, data.goalsAgainst || 0, data.cleanSheets || 0]);
      }
    }
    
    await pool.query('COMMIT');
    return { success: true };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error updating manager:", e);
    throw e;
  }
}

export async function deleteClubAndManager(id: number) {
  try {
    await pool.query('BEGIN');
    await pool.query(`DELETE FROM player_contracts WHERE current_club_id = $1`, [id]);
    await pool.query(`DELETE FROM manager_wallets WHERE manager_id = $1`, [id]);
    await pool.query(`DELETE FROM manager_seasons WHERE manager_id = $1`, [id]);
    await pool.query(`DELETE FROM clubs WHERE id = $1`, [id]);
    await pool.query(`DELETE FROM managers WHERE id = $1`, [id]);
    await pool.query('COMMIT');
    return { success: true };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error deleting manager:", e);
    throw e;
  }
}

export async function createTournament(name: string, formatType: string, seasonId: number, financialRuleId: number | null, tournamentType: string = 'solo') {
  try {
    const { rows } = await pool.query(`
      INSERT INTO tournaments (name, format_type, season_id, financial_rule_id, tournament_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, formatType, seasonId, financialRuleId, tournamentType]);
    return rows[0];
  } catch (e) {
    console.error("Error creating tournament:", e);
    throw e;
  }
}

export async function deleteTournament(id: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 1. Delete referencing fixtures
    await client.query(`DELETE FROM fixtures WHERE tournament_id = $1`, [id]);
    // 2. Delete referencing standings
    await client.query(`DELETE FROM tournament_standings WHERE tournament_id = $1`, [id]);
    // 3. Delete referencing rewards
    await client.query(`DELETE FROM tournament_rewards WHERE tournament_id = $1`, [id]);
    // 4. Delete the tournament itself
    await client.query(`DELETE FROM tournaments WHERE id = $1`, [id]);
    await client.query('COMMIT');
    return { success: true };
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Error deleting tournament:", e);
    throw e;
  } finally {
    client.release();
  }
}

export async function updateTournamentDetails(id: number, name: string, formatType: string, financialRuleId: number | null, tournamentType: string) {
  try {
    const { rows } = await pool.query(`
      UPDATE tournaments 
      SET name = $1, format_type = $2, financial_rule_id = $3, tournament_type = $4
      WHERE id = $5
      RETURNING *
    `, [name, formatType, financialRuleId, tournamentType, id]);
    return rows[0];
  } catch (e) {
    console.error("Error updating tournament details:", e);
    throw e;
  }
}

export async function fetchTournamentTypes() {
  try {
    const { rows } = await pool.query(`
      SELECT name, display_name
      FROM tournament_types
      ORDER BY id ASC
    `);
    return rows;
  } catch (error) {
    console.error("Error fetching tournament types:", error);
    return [];
  }
}

export async function createTournamentType(name: string, displayName: string) {
  try {
    const { rows } = await pool.query(`
      INSERT INTO tournament_types (name, display_name)
      VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE SET display_name = $2
      RETURNING *
    `, [name, displayName]);
    return rows[0];
  } catch (error) {
    console.error("Error creating tournament type:", error);
    throw error;
  }
}

export async function deleteTournamentType(name: string) {
  try {
    await pool.query(`
      DELETE FROM tournament_types
      WHERE name = $1
    `, [name]);
    return { success: true };
  } catch (error) {
    console.error("Error deleting tournament type:", error);
    throw error;
  }
}

export async function createFixture(data: any) {
  try {
    const activeSeason = await fetchActiveSeason();
    const seasonId = activeSeason ? activeSeason.id : 6;
    const { rows } = await pool.query(`
      INSERT INTO fixtures (tournament_id, season_id, home_club_id, away_club_id, home_score, away_score, match_events)
      VALUES ($1, $2, $3, $4, $5, $6, '[]'::jsonb)
      RETURNING *
    `, [data.tournamentId, seasonId, data.homeClubId, data.awayClubId, data.homeScore ?? null, data.awayScore ?? null]);
    return rows[0];
  } catch (e) {
    console.error("Error creating fixture:", e);
    throw e;
  }
}

export async function updateFixture(
  id: number,
  homeScore: number | null,
  awayScore: number | null,
  matchStatus: string = 'played',
  matchStatusReason: string | null = null
) {
  try {
    await pool.query('BEGIN');

    // 1. Fetch fixture and tournament details
    const { rows: fixtureRows } = await pool.query(`
      SELECT f.id, f.tournament_id, f.season_id, f.home_club_id, f.away_club_id, f.home_score, f.away_score, f.match_status,
             t.name as tournament_name, t.financial_rule_id
      FROM fixtures f
      JOIN tournaments t ON f.tournament_id = t.id
      WHERE f.id = $1
    `, [id]);

    if (fixtureRows.length === 0) {
      throw new Error("Fixture not found");
    }

    const fixture = fixtureRows[0];
    const tournamentId = fixture.tournament_id;
    const seasonId = fixture.season_id;
    const homeClubId = fixture.home_club_id;
    const awayClubId = fixture.away_club_id;
    const tournamentName = fixture.tournament_name;

    // 2. Revert any previous financial transactions recorded in match_bonuses_given for this fixture
    const { rows: prevPayouts } = await pool.query(`
      SELECT manager_id, reward_type, coins_given, tokens_given, vouchers_given
      FROM match_bonuses_given
      WHERE fixture_id = $1
    `, [id]);

    for (const payout of prevPayouts) {
      const pCoins = Number(payout.coins_given) || 0;
      const pTokens = Number(payout.tokens_given) || 0;
      const pVouchers = Number(payout.vouchers_given) || 0;
      const mgrId = payout.manager_id;

      // Revert from manager wallet
      await pool.query(`
        UPDATE manager_wallets
        SET r2g_coin_balance = r2g_coin_balance - $1,
            r2g_token_balance = r2g_token_balance - $2,
            r2g_voucher_balance = r2g_voucher_balance - $3
        WHERE manager_id = $4 AND season_id = $5
      `, [pCoins, pTokens, pVouchers, mgrId, seasonId]);

      // Revert from manager seasons stats (deduct from income & profit / add back to expenses)
      if (payout.reward_type === 'walkover_fine') {
        await pool.query(`
          UPDATE manager_seasons
          SET team_expense = team_expense - $1,
              team_profit = team_profit + $1
          WHERE manager_id = $2 AND season_id = $3
        `, [Math.abs(pCoins), mgrId, seasonId]);
      } else {
        await pool.query(`
          UPDATE manager_seasons
          SET team_income = team_income - $1,
              team_profit = team_profit - $1
          WHERE manager_id = $2 AND season_id = $3
        `, [pCoins, mgrId, seasonId]);
      }

      // Log revert transaction
      const revertDesc = `Reversal of ${payout.reward_type} reward for match #${id}`;
      if (pCoins !== 0) {
        await logTransaction(mgrId, seasonId, 'coin', -pCoins, 'reversal', revertDesc);
      }
      if (pTokens !== 0) {
        await logTransaction(mgrId, seasonId, 'token', -pTokens, 'reversal', revertDesc);
      }
      if (pVouchers !== 0) {
        await logTransaction(mgrId, seasonId, 'voucher', -pVouchers, 'reversal', revertDesc);
      }
    }

    // Delete previous payout records
    await pool.query(`DELETE FROM match_bonuses_given WHERE fixture_id = $1`, [id]);

    // 3. Update the fixture's score and status in the DB
    let finalHomeScore = homeScore;
    let finalAwayScore = awayScore;

    if (matchStatus === 'wo_home') {
      finalHomeScore = 3;
      finalAwayScore = 0;
    } else if (matchStatus === 'wo_away') {
      finalHomeScore = 0;
      finalAwayScore = 3;
    } else if (matchStatus === 'void') {
      finalHomeScore = null;
      finalAwayScore = null;
    }

    const { rows: updatedRows } = await pool.query(`
      UPDATE fixtures
      SET home_score = $1, away_score = $2, match_status = $3, match_status_reason = $4
      WHERE id = $5
      RETURNING *
    `, [finalHomeScore, finalAwayScore, matchStatus, matchStatusReason, id]);
    const updatedFixture = updatedRows[0];

    // 4. Calculate and apply new bonuses/fines if the match is completed
    const { rows: ruleRows } = await pool.query(`
      SELECT r.*
      FROM career_financial_rules r
      WHERE r.id = $1
    `, [fixture.financial_rule_id]);

    if (ruleRows.length > 0) {
      const rule = ruleRows[0];
      const payoutsToApply: { managerId: number; type: string; rc: number; rt: number; voucher: number; isBonus: boolean; desc: string }[] = [];

      if (matchStatus === 'played') {
        if (finalHomeScore !== null && finalAwayScore !== null) {
          let homeOutcome: 'win' | 'draw' | 'loss' = 'draw';
          let awayOutcome: 'win' | 'draw' | 'loss' = 'draw';

          if (finalHomeScore > finalAwayScore) {
            homeOutcome = 'win';
            awayOutcome = 'loss';
          } else if (finalHomeScore < finalAwayScore) {
            homeOutcome = 'loss';
            awayOutcome = 'win';
          }

          // Fetch win/loss/draw bonuses from template
          const getBonuses = (outcome: 'win' | 'draw' | 'loss') => {
            if (outcome === 'win') {
              return {
                rc: Number(rule.match_win_bonus_rc) || 0,
                rt: Number(rule.match_win_bonus_rt) || 0,
                v: Number(rule.match_win_bonus_voucher) || 0
              };
            } else if (outcome === 'draw') {
              return {
                rc: Number(rule.match_draw_bonus_rc) || 0,
                rt: Number(rule.match_draw_bonus_rt) || 0,
                v: Number(rule.match_draw_bonus_voucher) || 0
              };
            } else {
              return {
                rc: Number(rule.match_loss_bonus_rc) || 0,
                rt: Number(rule.match_loss_bonus_rt) || 0,
                v: Number(rule.match_loss_bonus_voucher) || 0
              };
            }
          };

          const hb = getBonuses(homeOutcome);
          const ab = getBonuses(awayOutcome);

          payoutsToApply.push({
            managerId: homeClubId,
            type: `match_${homeOutcome}`,
            rc: hb.rc,
            rt: hb.rt,
            voucher: hb.v,
            isBonus: true,
            desc: `Match ${homeOutcome} bonus (${tournamentName} Round ${updatedFixture.round_number})`
          });

          payoutsToApply.push({
            managerId: awayClubId,
            type: `match_${awayOutcome}`,
            rc: ab.rc,
            rt: ab.rt,
            voucher: ab.v,
            isBonus: true,
            desc: `Match ${awayOutcome} bonus (${tournamentName} Round ${updatedFixture.round_number})`
          });
        }
      } else if (matchStatus === 'wo_home') {
        // Home wins by walkover, Away team absent & fined
        const hb = {
          rc: Number(rule.match_win_bonus_rc) || 0,
          rt: Number(rule.match_win_bonus_rt) || 0,
          v: Number(rule.match_win_bonus_voucher) || 0
        };
        const af = {
          rc: Number(rule.walkover_fine_rc) || 0,
          rt: Number(rule.walkover_fine_rt) || 0,
          v: Number(rule.walkover_fine_voucher) || 0
        };

        payoutsToApply.push({
          managerId: homeClubId,
          type: 'walkover_win',
          rc: hb.rc,
          rt: hb.rt,
          voucher: hb.v,
          isBonus: true,
          desc: `Walkover win bonus (${tournamentName} Round ${updatedFixture.round_number})`
        });

        payoutsToApply.push({
          managerId: awayClubId,
          type: 'walkover_fine',
          rc: af.rc,
          rt: af.rt,
          voucher: af.v,
          isBonus: false,
          desc: `Walkover fine - Absent (${tournamentName} Round ${updatedFixture.round_number})`
        });
      } else if (matchStatus === 'wo_away') {
        // Away wins by walkover, Home team absent & fined
        const ab = {
          rc: Number(rule.match_win_bonus_rc) || 0,
          rt: Number(rule.match_win_bonus_rt) || 0,
          v: Number(rule.match_win_bonus_voucher) || 0
        };
        const hf = {
          rc: Number(rule.walkover_fine_rc) || 0,
          rt: Number(rule.walkover_fine_rt) || 0,
          v: Number(rule.walkover_fine_voucher) || 0
        };

        payoutsToApply.push({
          managerId: homeClubId,
          type: 'walkover_fine',
          rc: hf.rc,
          rt: hf.rt,
          voucher: hf.v,
          isBonus: false,
          desc: `Walkover fine - Absent (${tournamentName} Round ${updatedFixture.round_number})`
        });

        payoutsToApply.push({
          managerId: awayClubId,
          type: 'walkover_win',
          rc: ab.rc,
          rt: ab.rt,
          voucher: ab.v,
          isBonus: true,
          desc: `Walkover win bonus (${tournamentName} Round ${updatedFixture.round_number})`
        });
      }

      // Execute new payouts
      for (const p of payoutsToApply) {
        const factor = p.isBonus ? 1 : -1;
        const adjustedRc = p.rc * factor;
        const adjustedRt = p.rt * factor;
        const adjustedVoucher = p.voucher * factor;

        // Update manager wallet
        await pool.query(`
          UPDATE manager_wallets
          SET r2g_coin_balance = r2g_coin_balance + $1,
              r2g_token_balance = r2g_token_balance + $2,
              r2g_voucher_balance = r2g_voucher_balance + $3
          WHERE manager_id = $4 AND season_id = $5
        `, [adjustedRc, adjustedRt, adjustedVoucher, p.managerId, seasonId]);

        // Update manager seasons stats (income/profit)
        if (p.isBonus) {
          await pool.query(`
            UPDATE manager_seasons
            SET team_income = team_income + $1,
                team_profit = team_profit + $1
            WHERE manager_id = $2 AND season_id = $3
          `, [p.rc, p.managerId, seasonId]);
        } else {
          // Fine is team expense
          await pool.query(`
            UPDATE manager_seasons
            SET team_expense = team_expense + $1,
                team_profit = team_profit - $1
            WHERE manager_id = $2 AND season_id = $3
          `, [p.rc, p.managerId, seasonId]);
        }

        // Log transaction
        const logType = p.isBonus ? 'coin' : 'coin_expense';
        if (p.rc > 0) {
          await logTransaction(p.managerId, seasonId, logType === 'coin' ? 'coin' : 'coin', adjustedRc, p.type, p.desc);
        }
        if (p.rt > 0) {
          await logTransaction(p.managerId, seasonId, logType === 'coin' ? 'token' : 'token', adjustedRt, p.type, p.desc);
        }
        if (p.voucher > 0) {
          await logTransaction(p.managerId, seasonId, logType === 'coin' ? 'voucher' : 'voucher', adjustedVoucher, p.type, p.desc);
        }

        // Record in match_bonuses_given
        await pool.query(`
          INSERT INTO match_bonuses_given (fixture_id, manager_id, season_id, reward_type, coins_given, tokens_given, vouchers_given)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [id, p.managerId, seasonId, p.type, adjustedRc, adjustedRt, adjustedVoucher]);
      }
    }

    await pool.query('COMMIT');
    return updatedFixture;
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error updating fixture details & match payouts:", e);
    throw e;
  }
}

export async function deleteFixture(id: number) {
  try {
    await pool.query(`DELETE FROM fixtures WHERE id = $1`, [id]);
    return { success: true };
  } catch (e) {
    console.error("Error deleting fixture:", e);
    throw e;
  }
}

export async function createPlayer(data: any) {
  try {
    const { rows } = await pool.query(`
      INSERT INTO players (name, position, card_type, base_value, image_path)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [data.name, data.position, data.star || '3-star-standard', data.value || 80, data.imagePath || '']);
    return rows[0];
  } catch (e) {
    console.error("Error creating player:", e);
    throw e;
  }
}

export async function updatePlayer(data: any) {
  try {
    const { rows } = await pool.query(`
      UPDATE players SET
        name = $1, position = $2, card_type = $3, base_value = $4, image_path = $5, is_suspended = $6
      WHERE id = $7
      RETURNING *
    `, [data.name, data.position, data.star || '3-star-standard', data.value || 80, data.imagePath || '', data.isSuspended || false, data.id]);
    return rows[0];
  } catch (e) {
    console.error("Error updating player:", e);
    throw e;
  }
}

export async function deletePlayer(id: number) {
  try {
    await pool.query(`DELETE FROM players WHERE id = $1`, [id]);
    return { success: true };
  } catch (e) {
    console.error("Error deleting player:", e);
    throw e;
  }
}

export async function createPlayerContract(data: any) {
  try {
    const activeSeason = await fetchActiveSeason();
    const seasonId = activeSeason ? activeSeason.id : 6;
    
    await pool.query(`
      UPDATE player_contracts SET status = 'inactive' WHERE player_id = $1 AND season_id = $2
    `, [data.playerId, seasonId]);

    const { rows } = await pool.query(`
      INSERT INTO player_contracts (player_id, season_id, current_club_id, signed_value, salary, start_season, expire_season, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING *
    `, [data.playerId, seasonId, data.clubId, data.signedValue || 0, data.salary || 0, data.startSeason || '', data.expireSeason || '']);
    return rows[0];
  } catch (e) {
    console.error("Error creating contract:", e);
    throw e;
  }
}

export async function deletePlayerContract(id: number) {
  try {
    await pool.query(`DELETE FROM player_contracts WHERE id = $1`, [id]);
    return { success: true };
  } catch (e) {
    console.error("Error deleting contract:", e);
    throw e;
  }
}

export async function nominateRwsCandidate(
  clubId: number,
  status: string,
  customTeamName: string | null = null,
  useExistingClub: boolean = true,
  customLogoPath: string | null = null
) {
  try {
    const { rowCount } = await pool.query(`
      UPDATE tournament_teams 
      SET selection_status = $1, custom_team_name = $2, use_existing_club = $3, custom_logo_path = $4
      WHERE tournament_name = 'R2G World Series' AND club_id = $5
    `, [status, customTeamName, useExistingClub, customLogoPath, clubId]);
    
    if (rowCount === 0) {
      await pool.query(`
        INSERT INTO tournament_teams (tournament_name, club_id, selection_status, custom_team_name, use_existing_club, custom_logo_path)
        VALUES ('R2G World Series', $1, $2, $3, $4, $5)
      `, [clubId, status, customTeamName, useExistingClub, customLogoPath]);
    }
    return { success: true };
  } catch (e) {
    console.error("Error nominating candidate:", e);
    throw e;
  }
}

export async function removeRwsCandidate(clubId: number) {
  try {
    await pool.query(`
      DELETE FROM tournament_teams 
      WHERE tournament_name = 'R2G World Series' AND club_id = $1
    `, [clubId]);
    return { success: true };
  } catch (e) {
    console.error("Error removing candidate:", e);
    throw e;
  }
}

export async function fetchPlayerAwards(seasonId: string | number, tournamentId?: string | number) {
  try {
    let query = `SELECT * FROM player_awards WHERE season_id = $1`;
    const params = [seasonId.toString()];
    if (tournamentId) {
      query += ` AND tournament_id = $2`;
      params.push(tournamentId.toString());
    } else {
      query += ` AND tournament_id IS NULL`;
    }
    const { rows } = await pool.query(query, params);
    return rows;
  } catch (e) {
    console.error("Error fetching player awards:", e);
    return [];
  }
}

export async function givePlayerAward(data: any) {
  try {
    await pool.query('BEGIN');
    
    const { rows } = await pool.query(`
      INSERT INTO player_awards (
        player_id, player_name, season_id, tournament_id, 
        award_category, award_type, award_position, notes,
        reward_rc, reward_rt, reward_voucher
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (player_id, season_id, tournament_id, award_category, award_type, award_position) 
      DO UPDATE SET notes = EXCLUDED.notes, reward_rc = EXCLUDED.reward_rc, reward_rt = EXCLUDED.reward_rt, reward_voucher = EXCLUDED.reward_voucher
      RETURNING *
    `, [
      data.playerId, data.playerName, data.seasonId.toString(), data.tournamentId ? data.tournamentId.toString() : null,
      data.category || 'individual', data.type, data.position || 'Winner', data.notes || '',
      data.rewardRc || 0, data.rewardRt || 0, data.rewardVoucher || 0
    ]);
    
    const { rows: contractRows } = await pool.query(`
      SELECT current_club_id 
      FROM player_contracts 
      WHERE player_id = $1 AND status = 'active'
      LIMIT 1
    `, [data.playerId]);
    
    if (contractRows.length > 0) {
      const clubId = contractRows[0].current_club_id;
      const rc = Number(data.rewardRc) || 0;
      const rt = Number(data.rewardRt) || 0;
      const voucher = Number(data.rewardVoucher) || 0;
      
      if (rc > 0 || rt > 0 || voucher > 0) {
        await pool.query(`
          UPDATE manager_wallets 
          SET r2g_coin_balance = r2g_coin_balance + $1,
              r2g_token_balance = r2g_token_balance + $2,
              r2g_voucher_balance = r2g_voucher_balance + $3
          WHERE manager_id = $4 AND season_id = $5
        `, [rc, rt, voucher, clubId, data.seasonId]);

        await pool.query(`
          UPDATE manager_seasons
          SET team_income = team_income + $1,
              team_profit = team_profit + $1
          WHERE manager_id = $2 AND season_id = $3
        `, [rc, clubId, data.seasonId]);

        const { rows: playerRows } = await pool.query('SELECT name FROM players WHERE id = $1', [data.playerId]);
        const playerName = playerRows.length > 0 ? playerRows[0].name : `Player #${data.playerId}`;

        if (rc > 0) {
          await logTransaction(clubId, data.seasonId, 'coin', rc, 'award', `${data.awardName} Award - ${playerName}`);
        }
        if (rt > 0) {
          await logTransaction(clubId, data.seasonId, 'token', rt, 'award', `${data.awardName} Award - ${playerName}`);
        }
        if (voucher > 0) {
          await logTransaction(clubId, data.seasonId, 'voucher', voucher, 'award', `${data.awardName} Award - ${playerName}`);
        }
      }
    }
    
    await pool.query('COMMIT');
    return rows[0];
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error giving player award:", e);
    throw e;
  }
}

export async function revokePlayerAward(id: number) {
  try {
    await pool.query(`DELETE FROM player_awards WHERE id = $1`, [id]);
    return { success: true };
  } catch (e) {
    console.error("Error revoking award:", e);
    throw e;
  }
}

export async function applyFine(managerId: number, seasonId: string | number, rc: number, rt: number, voucher: number) {
  try {
    await pool.query('BEGIN');
    
    await pool.query(`
      UPDATE manager_wallets 
      SET r2g_coin_balance = r2g_coin_balance - $1,
          r2g_token_balance = r2g_token_balance - $2,
          r2g_voucher_balance = r2g_voucher_balance - $3
      WHERE manager_id = $4 AND season_id = $5
    `, [rc, rt, voucher, managerId, seasonId]);

    await pool.query(`
      UPDATE manager_seasons
      SET team_expense = team_expense + $1,
          team_profit = team_profit - $1
      WHERE manager_id = $2 AND season_id = $3
    `, [rc, managerId, seasonId]);

    if (rc > 0) {
      await logTransaction(managerId, seasonId, 'coin', -rc, 'fine', 'Fine applied - Manager ban/infraction');
    }
    if (rt > 0) {
      await logTransaction(managerId, seasonId, 'token', -rt, 'fine', 'Fine applied - Manager ban/infraction');
    }
    if (voucher > 0) {
      await logTransaction(managerId, seasonId, 'voucher', -voucher, 'fine', 'Fine applied - Manager ban/infraction');
    }
    
    await pool.query('COMMIT');
    return { success: true };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error applying fine:", e);
    throw e;
  }
}

export async function deductMatchdayPlayerSalaries(seasonId: string | number, matchday: number) {
  try {
    await pool.query('BEGIN');
    
    const { rows: appearancesRows } = await pool.query(`
      SELECT a.player_id, a.team_id, pc.salary
      FROM career_matchday_appearances a
      JOIN player_contracts pc ON a.player_id = pc.player_id AND pc.status = 'active' AND pc.season_id = $1
      WHERE a.season_id = $1 AND a.matchday = $2
    `, [seasonId.toString(), matchday]);
    
    const summary: Record<string, { name: string; amount: number }> = {};
    
    for (const row of appearancesRows) {
      const teamId = row.team_id;
      const salary = Number(row.salary) || 0;
      if (salary <= 0) continue;
      
      await pool.query(`
        UPDATE manager_wallets 
        SET r2g_coin_balance = r2g_coin_balance - $1
        WHERE manager_id = $2 AND season_id = $3
      `, [salary, teamId, seasonId]);

      await pool.query(`
        UPDATE manager_seasons
        SET team_expense = team_expense + $1,
            team_profit = team_profit - $1
        WHERE manager_id = $2 AND season_id = $3
      `, [salary, teamId, seasonId]);

      const { rows: pRows } = await pool.query('SELECT name FROM players WHERE id = $1', [row.player_id]);
      const pName = pRows.length > 0 ? pRows[0].name : `Player #${row.player_id}`;
      await logTransaction(teamId, seasonId, 'coin', -salary, 'salary', `Salary deduction (Matchday ${matchday}) - ${pName}`);
      
      if (!summary[teamId]) {
        const { rows: mgrRows } = await pool.query('SELECT name FROM managers WHERE id = $1', [teamId]);
        summary[teamId] = {
          name: mgrRows.length > 0 ? mgrRows[0].name : `Team #${teamId}`,
          amount: 0
        };
      }
      summary[teamId].amount += salary;
    }
    
    await pool.query('COMMIT');
    return { success: true, summary: Object.values(summary) };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error deducting salaries:", e);
    throw e;
  }
}

export async function applyTemplateAdjustment(
  type: 'match_bonus' | 'tournament_bonus' | 'season_bonus' | 'walkover_fine' | 'match_extension',
  managerId: string | number,
  seasonId: string | number,
  tournamentId: string | number
) {
  try {
    await pool.query('BEGIN');
    
    let rc = 0, rt = 0, voucher = 0;
    let isBonus = true;
    
    if (type === 'season_bonus') {
      const { rows: seasonRows } = await pool.query(`
        SELECT finale_bonus_rc, finale_bonus_rt, finale_bonus_voucher
        FROM seasons
        WHERE id = $1
      `, [seasonId]);
      if (seasonRows.length > 0) {
        rc = Number(seasonRows[0].finale_bonus_rc) || 0;
        rt = Number(seasonRows[0].finale_bonus_rt) || 0;
        voucher = Number(seasonRows[0].finale_bonus_voucher) || 0;
      }
    } else {
      const { rows: tourneyRows } = await pool.query(`
        SELECT t.financial_rule_id, r.*
        FROM tournaments t
        JOIN career_financial_rules r ON t.financial_rule_id = r.id
        WHERE t.id = $1
      `, [tournamentId]);
      
      if (tourneyRows.length === 0) {
        throw new Error("Tournament has no financial template linked.");
      }
      
      const rule = tourneyRows[0];
      
      if (type === 'match_bonus') {
        rc = Number(rule.match_bonus_rc) || 0;
        rt = Number(rule.match_bonus_rt) || 0;
        voucher = Number(rule.match_bonus_voucher) || 0;
      } else if (type === 'tournament_bonus') {
        rc = Number(rule.tournament_bonus_rc) || 0;
        rt = Number(rule.tournament_bonus_rt) || 0;
        voucher = Number(rule.tournament_bonus_voucher) || 0;
      } else if (type === 'walkover_fine') {
        rc = Number(rule.walkover_fine_rc) || 0;
        rt = Number(rule.walkover_fine_rt) || 0;
        voucher = Number(rule.walkover_fine_voucher) || 0;
        isBonus = false;
      } else if (type === 'match_extension') {
        rc = Number(rule.match_extension_fee_rc) || 0;
        rt = Number(rule.match_extension_fee_rt) || 0;
        voucher = Number(rule.match_extension_fee_voucher) || 0;
        isBonus = false;
      }
    }
    
    if (isBonus) {
      await pool.query(`
        UPDATE manager_wallets 
        SET r2g_coin_balance = r2g_coin_balance + $1,
            r2g_token_balance = r2g_token_balance + $2,
            r2g_voucher_balance = r2g_voucher_balance + $3
        WHERE manager_id = $4 AND season_id = $5
      `, [rc, rt, voucher, managerId, seasonId]);

      await pool.query(`
        UPDATE manager_seasons
        SET team_income = team_income + $1,
            team_profit = team_profit + $1
        WHERE manager_id = $2 AND season_id = $3
      `, [rc, managerId, seasonId]);

      if (rc > 0) {
        await logTransaction(managerId, seasonId, 'coin', rc, type, `Template payout - ${type.replace('_', ' ')}`);
      }
      if (rt > 0) {
        await logTransaction(managerId, seasonId, 'token', rt, type, `Template payout - ${type.replace('_', ' ')}`);
      }
      if (voucher > 0) {
        await logTransaction(managerId, seasonId, 'voucher', voucher, type, `Template payout - ${type.replace('_', ' ')}`);
      }
    } else {
      await pool.query(`
        UPDATE manager_wallets 
        SET r2g_coin_balance = r2g_coin_balance - $1,
            r2g_token_balance = r2g_token_balance - $2,
            r2g_voucher_balance = r2g_voucher_balance - $3
        WHERE manager_id = $4 AND season_id = $5
      `, [rc, rt, voucher, managerId, seasonId]);

      await pool.query(`
        UPDATE manager_seasons
        SET team_expense = team_expense + $1,
            team_profit = team_profit - $1
        WHERE manager_id = $2 AND season_id = $3
      `, [rc, managerId, seasonId]);

      if (rc > 0) {
        await logTransaction(managerId, seasonId, 'coin', -rc, type, `Template fine - ${type.replace('_', ' ')}`);
      }
      if (rt > 0) {
        await logTransaction(managerId, seasonId, 'token', -rt, type, `Template fine - ${type.replace('_', ' ')}`);
      }
      if (voucher > 0) {
        await logTransaction(managerId, seasonId, 'voucher', -voucher, type, `Template fine - ${type.replace('_', ' ')}`);
      }
    }
    
    await pool.query('COMMIT');
    return { success: true, rc, rt, voucher };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error applying template adjustment:", e);
    throw e;
  }
}

export async function applyCustomAdjustment(
  managerId: string | number,
  seasonId: string | number,
  type: string,
  rc: number,
  rt: number,
  voucher: number,
  notes?: string
) {
  try {
    await pool.query('BEGIN');
    
    const isCredit = ['reg_bonus', 'custom_credit', 'season_reward', 'ballon_dor_ceremony'].includes(type);
    const rcAmt = Number(rc) || 0;
    const rtAmt = Number(rt) || 0;
    const vchAmt = Number(voucher) || 0;
    
    if (isCredit) {
      await pool.query(`
        UPDATE manager_wallets 
        SET r2g_coin_balance = r2g_coin_balance + $1,
            r2g_token_balance = r2g_token_balance + $2,
            r2g_voucher_balance = r2g_voucher_balance + $3
        WHERE manager_id = $4 AND season_id = $5
      `, [rcAmt, rtAmt, vchAmt, managerId, seasonId]);

      if (type === 'season_reward') {
        await pool.query(`
          UPDATE manager_seasons
          SET session_rewards = session_rewards + $1,
              team_profit = team_profit + $1
          WHERE manager_id = $2 AND season_id = $3
        `, [rcAmt, managerId, seasonId]);
      } else {
        await pool.query(`
          UPDATE manager_seasons
          SET team_income = team_income + $1,
              team_profit = team_profit + $1
          WHERE manager_id = $2 AND season_id = $3
        `, [rcAmt, managerId, seasonId]);
      }

      if (rcAmt > 0) {
        await logTransaction(managerId, seasonId, 'coin', rcAmt, type, notes || `Custom adjustment credit (${type})`);
      }
      if (rtAmt > 0) {
        await logTransaction(managerId, seasonId, 'token', rtAmt, type, notes || `Custom adjustment credit (${type})`);
      }
      if (vchAmt > 0) {
        await logTransaction(managerId, seasonId, 'voucher', vchAmt, type, notes || `Custom adjustment credit (${type})`);
      }
    } else {
      await pool.query(`
        UPDATE manager_wallets 
        SET r2g_coin_balance = r2g_coin_balance - $1,
            r2g_token_balance = r2g_token_balance - $2,
            r2g_voucher_balance = r2g_voucher_balance - $3
        WHERE manager_id = $4 AND season_id = $5
      `, [rcAmt, rtAmt, vchAmt, managerId, seasonId]);

      await pool.query(`
        UPDATE manager_seasons
        SET team_expense = team_expense + $1,
            team_profit = team_profit - $1
        WHERE manager_id = $2 AND season_id = $3
      `, [rcAmt, managerId, seasonId]);

      if (rcAmt > 0) {
        await logTransaction(managerId, seasonId, 'coin', -rcAmt, type, notes || `Custom adjustment deduction (${type})`);
      }
      if (rtAmt > 0) {
        await logTransaction(managerId, seasonId, 'token', -rtAmt, type, notes || `Custom adjustment deduction (${type})`);
      }
      if (vchAmt > 0) {
        await logTransaction(managerId, seasonId, 'voucher', -vchAmt, type, notes || `Custom adjustment deduction (${type})`);
      }
    }
    
    await pool.query('COMMIT');
    return { success: true };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error applying custom adjustment:", e);
    throw e;
  }
}

export async function autoGenerateFixtures(tournamentId: number, legs: string) {
  try {
    // 1. Fetch tournament to find format
    const { rows: tourneyRows } = await pool.query('SELECT format_type, season_id FROM tournaments WHERE id = $1', [tournamentId]);
    if (tourneyRows.length === 0) throw new Error("Tournament not found");
    const { format_type: format, season_id: seasonId } = tourneyRows[0];

    // 2. Fetch clubs registered for this tournament in tournament_standings
    const { rows: clubsRows } = await pool.query('SELECT club_id as id FROM tournament_standings WHERE tournament_id = $1', [tournamentId]);
    const clubIds = clubsRows.map(c => c.id);
    if (clubIds.length < 2) throw new Error("Need at least 2 participating clubs to auto-generate fixtures.");

    // 3. Clear existing fixtures for this tournament
    await pool.query('DELETE FROM fixtures WHERE tournament_id = $1', [tournamentId]);

    // 4. Generate matchups
    const fixturesToInsert: { home: number, away: number, round: number }[] = [];

    // Round Robincircle method
    const list = [...clubIds];
    const hasBye = list.length % 2 !== 0;
    if (hasBye) {
      list.push(null as any);
    }

    const numTeams = list.length;
    const rounds = numTeams - 1;
    const half = numTeams / 2;

    // Leg 1
    for (let r = 0; r < rounds; r++) {
      for (let m = 0; m < half; m++) {
        const home = list[m];
        const away = list[numTeams - 1 - m];

        if (home !== null && away !== null) {
          fixturesToInsert.push({ home, away, round: r + 1 });
        }
      }
      // Rotate list (keeping first element fixed)
      list.splice(1, 0, list.pop() as any);
    }

    // Leg 2 (if Double Leg requested)
    if (legs === "double") {
      const leg1Count = fixturesToInsert.length;
      for (let idx = 0; idx < leg1Count; idx++) {
        const f = fixturesToInsert[idx];
        fixturesToInsert.push({
          home: f.away,
          away: f.home,
          round: f.round + rounds
        });
      }
    }

    // 5. Bulk insert matches
    for (const f of fixturesToInsert) {
      await pool.query(`
        INSERT INTO fixtures (tournament_id, season_id, home_club_id, away_club_id, round_number)
        VALUES ($1, $2, $3, $4, $5)
      `, [tournamentId, seasonId, f.home, f.away, f.round]);
    }

    return { success: true, count: fixturesToInsert.length };
  } catch (error: any) {
    console.error("Error auto generating fixtures:", error);
    throw error;
  }
}

export async function fetchTournamentClubs(tournamentId: number) {
  try {
    const { rows } = await pool.query(`
      SELECT ts.club_id, c.name, c.logo_path,
             tt.custom_team_name, tt.use_existing_club
      FROM tournament_standings ts
      JOIN clubs c ON ts.club_id = c.id
      JOIN tournaments t ON ts.tournament_id = t.id
      LEFT JOIN tournament_teams tt ON tt.tournament_name = t.name AND tt.club_id = ts.club_id
      WHERE ts.tournament_id = $1
      ORDER BY c.name ASC
    `, [tournamentId]);
    return rows.map((r: any) => ({
      club_id: r.club_id,
      name: (!r.use_existing_club && r.custom_team_name) ? r.custom_team_name : r.name,
      logo_path: r.logo_path,
      custom_team_name: r.custom_team_name,
      use_existing_club: r.use_existing_club ?? true,
      original_name: r.name
    }));
  } catch (e) {
    console.error("Error fetching tournament clubs:", e);
    throw e;
  }
}

export async function addClubToTournament(
  tournamentId: number, 
  clubId: number,
  customTeamName: string | null = null,
  useExistingClub: boolean = true
) {
  try {
    const activeSeason = await fetchActiveSeason();
    const seasonId = activeSeason ? activeSeason.id : 6;
    
    // Check if already added
    const { rows: exists } = await pool.query(`
      SELECT 1 FROM tournament_standings 
      WHERE tournament_id = $1 AND club_id = $2
    `, [tournamentId, clubId]);
    
    if (exists.length === 0) {
      await pool.query(`
        INSERT INTO tournament_standings (tournament_id, season_id, club_id, matches_played, points, goals_scored, goals_against, goal_difference)
        VALUES ($1, $2, $3, 0, 0, 0, 0, 0)
      `, [tournamentId, seasonId, clubId]);
    }

    // Update or insert tournament_teams
    const { rows: tourney } = await pool.query(`SELECT name FROM tournaments WHERE id = $1`, [tournamentId]);
    if (tourney.length > 0) {
      const tourneyName = tourney[0].name;
      const { rowCount } = await pool.query(`
        UPDATE tournament_teams 
        SET custom_team_name = $1, use_existing_club = $2
        WHERE tournament_name = $3 AND club_id = $4
      `, [customTeamName, useExistingClub, tourneyName, clubId]);

      if (rowCount === 0) {
        await pool.query(`
          INSERT INTO tournament_teams (tournament_name, club_id, selection_status, custom_team_name, use_existing_club)
          VALUES ($1, $2, 'selected', $3, $4)
        `, [tourneyName, clubId, customTeamName, useExistingClub]);
      }
    }
    
    return { success: true };
  } catch (e) {
    console.error("Error adding club to tournament:", e);
    throw e;
  }
}

export async function removeClubFromTournament(tournamentId: number, clubId: number) {
  try {
    const { rows: tourney } = await pool.query(`SELECT name FROM tournaments WHERE id = $1`, [tournamentId]);

    await pool.query(`
      DELETE FROM tournament_standings 
      WHERE tournament_id = $1 AND club_id = $2
    `, [tournamentId, clubId]);

    if (tourney.length > 0) {
      await pool.query(`
        DELETE FROM tournament_teams
        WHERE tournament_name = $1 AND club_id = $2
      `, [tourney[0].name, clubId]);
    }

    return { success: true };
  } catch (e) {
    console.error("Error removing club from tournament:", e);
    throw e;
  }
}

// Admin login & session management actions
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'solo-admin-secret-key-1234567890');

export async function loginSoloAdmin(data: any) {
  try {
    const { username, password } = data;
    if (!username || !password) {
      return { success: false, error: "Username and password required" };
    }

    const { rows } = await pool.query('SELECT * FROM solo_admins WHERE username = $1', [username]);
    if (rows.length === 0) {
      return { success: false, error: "Invalid credentials" };
    }

    const adminUser = rows[0];
    const passwordMatch = bcrypt.compareSync(password, adminUser.password_hash);
    if (!passwordMatch) {
      return { success: false, error: "Invalid credentials" };
    }

    // Generate JWT
    const jwt = await new SignJWT({ username: adminUser.username, id: adminUser.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('2h')
      .sign(SECRET_KEY);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('solo_admin_session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7200 // 2 hours
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error in loginSoloAdmin:", error);
    return { success: false, error: "Server authentication error" };
  }
}

export async function logoutSoloAdmin() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('solo_admin_session');
    return { success: true };
  } catch (error: any) {
    console.error("Error in logoutSoloAdmin:", error);
    return { success: false };
  }
}

export async function fetchManagerTransactions(managerId: number, currencyType: 'coin' | 'token' | 'voucher') {
  try {
    const { rows } = await pool.query(`
      SELECT amount, transaction_type, description, created_at
      FROM wallet_transactions
      WHERE manager_id = $1 AND currency_type = $2
      ORDER BY created_at DESC
    `, [managerId, currencyType]);
    return rows;
  } catch (error) {
    console.error("Error fetching manager transactions:", error);
    return [];
  }
}

export async function fetchTournamentsByType(type: string) {
  try {
    const { rows } = await pool.query(`
      SELECT t.id, t.name, t.format_type, t.financial_rule_id, t.tournament_type, s.season_number
      FROM tournaments t
      JOIN seasons s ON t.season_id = s.id
      WHERE t.tournament_type = $1
      ORDER BY t.id ASC
    `, [type]);
    return rows;
  } catch (error) {
    console.error("Error fetching tournaments by type:", error);
    return [];
  }
}

export async function processTournamentMatchBonuses(tournamentId: number, seasonId: string | number) {
  try {
    await pool.query('BEGIN');

    // 1. Get the financial rule template for the tournament
    const { rows: tourneyRows } = await pool.query(`
      SELECT t.name as tournament_name, r.* 
      FROM tournaments t
      JOIN career_financial_rules r ON t.financial_rule_id = r.id
      WHERE t.id = $1
    `, [tournamentId]);

    if (tourneyRows.length === 0) {
      throw new Error("Tournament not found or has no financial rule template linked.");
    }
    const rule = tourneyRows[0];
    const tournamentName = rule.tournament_name;

    // 2. Fetch all completed/played fixtures for this tournament in the current season
    const { rows: fixtures } = await pool.query(`
      SELECT f.id, f.home_club_id, f.away_club_id, f.home_score, f.away_score, f.round_number
      FROM fixtures f
      WHERE f.tournament_id = $1 AND f.season_id = $2 
        AND f.home_score IS NOT NULL AND f.away_score IS NOT NULL
    `, [tournamentId, seasonId]);

    let processedCount = 0;
    let rewardSummary: any[] = [];

    // 3. Process each fixture
    for (const fix of fixtures) {
      const homeId = fix.home_club_id;
      const awayId = fix.away_club_id;
      const homeScore = Number(fix.home_score);
      const awayScore = Number(fix.away_score);
      
      // Determine match outcomes
      let homeOutcome: 'win' | 'draw' | 'loss' = 'draw';
      let awayOutcome: 'win' | 'draw' | 'loss' = 'draw';

      if (homeScore > awayScore) {
        homeOutcome = 'win';
        awayOutcome = 'loss';
      } else if (homeScore < awayScore) {
        homeOutcome = 'loss';
        awayOutcome = 'win';
      }

      const teamResults = [
        { managerId: homeId, outcome: homeOutcome, role: 'home', opponent: awayId },
        { managerId: awayId, outcome: awayOutcome, role: 'away', opponent: homeId }
      ];

      for (const res of teamResults) {
        // Check if already paid
        const { rows: paidCheck } = await pool.query(`
          SELECT id FROM match_bonuses_given 
          WHERE fixture_id = $1 AND manager_id = $2
        `, [fix.id, res.managerId]);

        if (paidCheck.length > 0) {
          continue; // Already rewarded, skip
        }

        // Determine bonus values
        let rc = 0, rt = 0, voucher = 0;
        if (res.outcome === 'win') {
          rc = Number(rule.match_win_bonus_rc) || 0;
          rt = Number(rule.match_win_bonus_rt) || 0;
          voucher = Number(rule.match_win_bonus_voucher) || 0;
        } else if (res.outcome === 'draw') {
          rc = Number(rule.match_draw_bonus_rc) || 0;
          rt = Number(rule.match_draw_bonus_rt) || 0;
          voucher = Number(rule.match_draw_bonus_voucher) || 0;
        } else if (res.outcome === 'loss') {
          rc = Number(rule.match_loss_bonus_rc) || 0;
          rt = Number(rule.match_loss_bonus_rt) || 0;
          voucher = Number(rule.match_loss_bonus_voucher) || 0;
        }

        // Apply bonus to wallet
        await pool.query(`
          UPDATE manager_wallets 
          SET r2g_coin_balance = r2g_coin_balance + $1,
              r2g_token_balance = r2g_token_balance + $2,
              r2g_voucher_balance = r2g_voucher_balance + $3
          WHERE manager_id = $4 AND season_id = $5
        `, [rc, rt, voucher, res.managerId, seasonId]);

        // Update manager season stats (income/profit)
        await pool.query(`
          UPDATE manager_seasons
          SET team_income = team_income + $1,
              team_profit = team_profit + $1
          WHERE manager_id = $2 AND season_id = $3
        `, [rc, res.managerId, seasonId]);

        // Get opponent club name for log description
        const { rows: oppClubRows } = await pool.query('SELECT name FROM clubs WHERE id = $1', [res.opponent]);
        const oppName = oppClubRows.length > 0 ? oppClubRows[0].name : `Club #${res.opponent}`;

        const desc = `Match ${res.outcome} bonus (${tournamentName} Round ${fix.round_number} vs ${oppName})`;

        // Log transaction
        await logTransaction(res.managerId, seasonId, 'coin', rc, `match_${res.outcome}`, desc);
        if (rt > 0) {
          await logTransaction(res.managerId, seasonId, 'token', rt, `match_${res.outcome}`, desc);
        }
        if (voucher > 0) {
          await logTransaction(res.managerId, seasonId, 'voucher', voucher, `match_${res.outcome}`, desc);
        }

        // Insert log in match_bonuses_given
        await pool.query(`
          INSERT INTO match_bonuses_given (fixture_id, manager_id, season_id, reward_type, coins_given, tokens_given, vouchers_given)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [fix.id, res.managerId, seasonId, res.outcome, rc, rt, voucher]);

        processedCount++;

        // Get manager/club name for return
        const { rows: mgrNameRows } = await pool.query('SELECT name FROM managers WHERE id = $1', [res.managerId]);
        const mgrName = mgrNameRows.length > 0 ? mgrNameRows[0].name : `Manager #${res.managerId}`;
        rewardSummary.push({
          managerName: mgrName,
          outcome: res.outcome,
          rc,
          rt,
          voucher,
          fixtureId: fix.id
        });
      }
    }

    await pool.query('COMMIT');
    return { success: true, processedCount, rewardSummary };
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error("Error processing tournament match bonuses:", error);
    throw error;
  }
}

export async function fetchSeasonsList() {
  try {
    const { rows } = await pool.query(`
      SELECT id, season_number, is_active, has_rws, rws_year,
             start_bonus_rc, start_bonus_rt, start_bonus_voucher,
             finale_bonus_rc, finale_bonus_rt, finale_bonus_voucher
      FROM seasons s
      ORDER BY season_number DESC
    `);
    return rows;
  } catch (error) {
    console.error("Error fetching seasons list:", error);
    throw error;
  }
}

export async function createSoloSeason(
  seasonNumber: number,
  makeActive: boolean,
  carryOver: boolean,
  hasRws: boolean,
  rwsYear: number | null,
  startRc: number,
  startRt: number,
  startVoucher: number,
  finaleRc: number,
  finaleRt: number,
  finaleVoucher: number
) {
  try {
    await pool.query('BEGIN');

    // 1. Check if season already exists
    const { rows: existing } = await pool.query('SELECT id FROM seasons WHERE season_number = $1', [seasonNumber]);
    if (existing.length > 0) {
      throw new Error(`Season ${seasonNumber} already exists.`);
    }

    // 2. Fetch previously active season (before inserting new one) to carry over from
    const { rows: activeRows } = await pool.query('SELECT id FROM seasons WHERE is_active = true LIMIT 1');
    const oldSeasonId = activeRows.length > 0 ? activeRows[0].id : null;

    // 3. Deactivate current active season(s) if we are making this one active
    if (makeActive) {
      await pool.query('UPDATE seasons SET is_active = FALSE');
    }

    // 4. Insert new season
    const { rows: newSeasonRows } = await pool.query(`
      INSERT INTO seasons (
        season_number, is_active, has_rws, rws_year,
        start_bonus_rc, start_bonus_rt, start_bonus_voucher,
        finale_bonus_rc, finale_bonus_rt, finale_bonus_voucher
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, season_number, is_active, has_rws, rws_year
    `, [seasonNumber, makeActive, hasRws, hasRws ? rwsYear : null, startRc, startRt, startVoucher, finaleRc, finaleRt, finaleVoucher]);
    const newSeason = newSeasonRows[0];
    const newSeasonId = newSeason.id;

    // 5. Carry over wallets and stats if requested and old season exists
    if (carryOver && oldSeasonId) {
      // Carry over wallets
      await pool.query(`
        INSERT INTO manager_wallets (manager_id, season_id, current_club_id, r2g_coin_balance, r2g_token_balance, r2g_voucher_balance, overall_rating, star_rating)
        SELECT manager_id, $1, current_club_id, r2g_coin_balance, r2g_token_balance, r2g_voucher_balance, overall_rating, star_rating
        FROM manager_wallets
        WHERE season_id = $2
      `, [newSeasonId, oldSeasonId]);

      // Initialize manager seasons stats
      await pool.query(`
        INSERT INTO manager_seasons (manager_id, season_id, club_id, matches_played, wins, draws, losses, goals_scored, goals_conceded, clean_sheets, team_income, team_expense, team_profit)
        SELECT manager_id, $1, club_id, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        FROM manager_seasons
        WHERE season_id = $2
      `, [newSeasonId, oldSeasonId]);
      
      // Carry over active player contracts if they exist
      await pool.query(`
        INSERT INTO player_contracts (player_id, season_id, current_club_id, signed_value, salary, start_season, expire_season, status)
        SELECT player_id, $1, current_club_id, signed_value, salary, start_season, expire_season, status
        FROM player_contracts
        WHERE season_id = $2 AND status = 'active'
      `, [newSeasonId, oldSeasonId]);
    }

    await pool.query('COMMIT');
    return { success: true, season: newSeason };
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error("Error creating solo season:", error);
    throw error;
  }
}

export async function updateSoloSeasonDetails(
  id: number,
  seasonNumber: number,
  hasRws: boolean,
  rwsYear: number | null,
  startRc: number,
  startRt: number,
  startVoucher: number,
  finaleRc: number,
  finaleRt: number,
  finaleVoucher: number
) {
  try {
    const { rows } = await pool.query(`
      UPDATE seasons
      SET season_number = $1, has_rws = $2, rws_year = $3,
          start_bonus_rc = $4, start_bonus_rt = $5, start_bonus_voucher = $6,
          finale_bonus_rc = $7, finale_bonus_rt = $8, finale_bonus_voucher = $9
      WHERE id = $10
      RETURNING id, season_number, has_rws, rws_year, is_active
    `, [seasonNumber, hasRws, hasRws ? rwsYear : null, startRc, startRt, startVoucher, finaleRc, finaleRt, finaleVoucher, id]);
    return rows[0];
  } catch (error) {
    console.error("Error updating solo season details:", error);
    throw error;
  }
}

export async function toggleSoloSeasonActive(seasonId: number, makeActive: boolean) {
  try {
    await pool.query('BEGIN');

    if (makeActive) {
      // Deactivate all first
      await pool.query('UPDATE seasons SET is_active = FALSE');
      
      // Make this one active
      await pool.query('UPDATE seasons SET is_active = TRUE WHERE id = $1', [seasonId]);
    } else {
      // Just deactivate this one
      await pool.query('UPDATE seasons SET is_active = FALSE WHERE id = $1', [seasonId]);
    }

    await pool.query('COMMIT');
    return { success: true };
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error("Error toggling solo season active status:", error);
    throw error;
  }
}

export async function deleteSoloSeason(seasonId: number) {
  try {
    // Check if it's active
    const { rows: season } = await pool.query('SELECT is_active, season_number FROM seasons WHERE id = $1', [seasonId]);
    if (season.length === 0) {
      throw new Error("Season not found.");
    }
    if (season[0].is_active) {
      throw new Error("Cannot delete the currently active season.");
    }

    // Check check dependencies in tournaments
    const { rows: tournaments } = await pool.query('SELECT COUNT(*) as count FROM tournaments WHERE season_id = $1', [seasonId]);
    if (parseInt(tournaments[0].count) > 0) {
      throw new Error(`Cannot delete Season ${season[0].season_number} because it has associated tournaments.`);
    }

    await pool.query('BEGIN');
    
    // Delete seasonal tables for this season
    await pool.query('DELETE FROM manager_seasons WHERE season_id = $1', [seasonId]);
    await pool.query('DELETE FROM manager_wallets WHERE season_id = $1', [seasonId]);
    await pool.query('DELETE FROM player_contracts WHERE season_id = $1', [seasonId]);
    await pool.query('DELETE FROM player_seasonal_statuses WHERE season_id = $1', [seasonId]);
    
    // Delete the season itself
    await pool.query('DELETE FROM seasons WHERE id = $1', [seasonId]);

    await pool.query('COMMIT');
    return { success: true };
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error("Error deleting solo season:", error);
    throw error;
  }
}

export async function fetchSeasonByRwsYear(rwsYear: number) {
  try {
    const { rows } = await pool.query(`
      SELECT id, season_number, is_active, has_rws, rws_year,
             start_bonus_rc, start_bonus_rt, start_bonus_voucher,
             finale_bonus_rc, finale_bonus_rt, finale_bonus_voucher
      FROM seasons
      WHERE has_rws = true AND rws_year = $1
      LIMIT 1
    `, [rwsYear]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error fetching season by RWS year:", error);
    throw error;
  }
}
