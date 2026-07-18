"use server";

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

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
                m.id, m.name, m.avatar_path as photo, m.r2g_id, m.mob_no, m.place,
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
                m.is_banned,
                m.is_active
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
                r2g_id: m.r2g_id || '',
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
                is_active: m.is_active !== false,
                mob_no: m.mob_no || '',
                place: m.place || '',
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
                m.id, m.name, m.avatar_path as photo, m.r2g_id,
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
              AND LOWER(pc.status) = 'active'
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
            r2g_id: m.r2g_id || '',
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
        const { rows: result } = await pool.query(`SELECT m.name, ms.manager_rank as rank, ms.rank_points as score, m.avatar_path as img FROM managers m JOIN manager_seasons ms ON m.id = ms.manager_id WHERE m.is_active IS NOT FALSE ORDER BY ms.manager_rank ASC NULLS LAST`);
        return result;
    } catch (e) { console.error(e); return []; }
}

export async function fetchRegisteredClubs(includeInactive: boolean = false) {
    try {
        const queryStr = includeInactive 
          ? `SELECT m.id, COALESCE(c.name, m.name) as name, m.name as manager, m.r2g_id, c.logo_path as image FROM managers m LEFT JOIN clubs c ON m.id = c.id`
          : `SELECT m.id, COALESCE(c.name, m.name) as name, m.name as manager, m.r2g_id, c.logo_path as image FROM managers m LEFT JOIN clubs c ON m.id = c.id WHERE m.is_active IS NOT FALSE`;
        const { rows: result } = await pool.query(queryStr);
        return result;
    } catch (e) { console.error(e); return []; }
}

export async function fetchSelectedCandidates(tournamentName: string) {
    try {
        const { rows: result } = await pool.query(`
            SELECT DISTINCT ON (m.id)
                m.id, c.name as club_name, c.logo_path,
                m.name as manager_name, m.avatar_path, m.r2g_id as manager_r2g_id,
                tt.selection_status, tt.custom_team_name, tt.use_existing_club, tt.custom_logo_path,
                mw.overall_rating,
                ms.wins, ms.losses, ms.matches_played, ms.competitions
            FROM tournament_teams tt
            JOIN managers m ON tt.club_id = m.id
            LEFT JOIN clubs c ON m.id = c.id
            LEFT JOIN manager_seasons ms ON m.id = ms.manager_id AND ms.season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
            LEFT JOIN manager_wallets mw ON m.id = mw.manager_id AND mw.season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
            WHERE tt.tournament_name = $1
            ORDER BY m.id, ms.id DESC
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
                r2g_id: row.manager_r2g_id || '',
                club: displayName,
                customTeamName: row.custom_team_name,
                useExistingClub: row.use_existing_club,
                customLogoPath: row.custom_logo_path,
                logoPath: row.logo_path,
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
      SELECT t.id, t.name, t.format_type, t.financial_rule_id, t.tournament_type, s.season_number,
             t.num_groups, t.teams_per_group, t.qualified_per_group, t.num_teams
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
             f.match_status, f.match_status_reason, f.group_name,
             t.name as tournament_name,
             hc.name as home_club_name, hc.logo_path as home_club_logo, hm.name as home_manager,
             tth.custom_team_name as home_custom_name, tth.use_existing_club as home_use_existing, tth.custom_logo_path as home_custom_logo,
             ac.name as away_club_name, ac.logo_path as away_club_logo, am.name as away_manager,
             tta.custom_team_name as away_custom_name, tta.use_existing_club as away_use_existing, tta.custom_logo_path as away_custom_logo
      FROM fixtures f
      JOIN tournaments t ON f.tournament_id = t.id
      JOIN managers hm ON f.home_club_id = hm.id
      LEFT JOIN clubs hc ON hm.id = hc.id
      JOIN managers am ON f.away_club_id = am.id
      LEFT JOIN clubs ac ON am.id = ac.id
      LEFT JOIN tournament_teams tth ON (tth.tournament_name = t.name OR (t.tournament_type = 'rws' AND tth.tournament_name = 'R2G World Series')) AND tth.club_id = f.home_club_id
      LEFT JOIN tournament_teams tta ON (tta.tournament_name = t.name OR (t.tournament_type = 'rws' AND tta.tournament_name = 'R2G World Series')) AND tta.club_id = f.away_club_id
    `;
    const params = [];
    if (tournamentId !== undefined) {
      query += ` WHERE f.tournament_id = $1`;
      params.push(tournamentId);
    }
    query += ` ORDER BY f.round_number ASC, f.group_name ASC, f.id ASC`;

    const { rows } = await pool.query(query, params);
    return rows.map(r => {
      const homeName = (!r.home_use_existing && r.home_custom_name) ? r.home_custom_name : r.home_club_name;
      const awayName = (!r.away_use_existing && r.away_custom_name) ? r.away_custom_name : r.away_club_name;
      const homeLogo = (!r.home_use_existing && r.home_custom_logo) ? r.home_custom_logo : r.home_club_logo;
      const awayLogo = (!r.away_use_existing && r.away_custom_logo) ? r.away_custom_logo : r.away_club_logo;
      return {
        id: r.id,
        tournamentId: r.tournament_id,
        tournamentName: r.tournament_name,
        homeClub: homeName,
        homeLogo: homeLogo,
        homeManager: r.home_manager || "Unknown",
        awayClub: awayName,
        awayLogo: awayLogo,
        awayManager: r.away_manager || "Unknown",
        homeScore: r.home_score,
        awayScore: r.away_score,
        roundNumber: r.round_number,
        match_status: r.match_status,
        match_status_reason: r.match_status_reason,
        groupName: r.group_name,
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
             t.name as tournament_name, t.tournament_type,
             hc.name as home_club_name, hc.logo_path as home_club_logo,
             tth.custom_team_name as home_custom_name, tth.use_existing_club as home_use_existing, tth.custom_logo_path as home_custom_logo,
             ac.name as away_club_name, ac.logo_path as away_club_logo,
             tta.custom_team_name as away_custom_name, tta.use_existing_club as away_use_existing, tta.custom_logo_path as away_custom_logo
      FROM fixtures f
      JOIN tournaments t ON f.tournament_id = t.id
      JOIN managers hm ON f.home_club_id = hm.id
      LEFT JOIN clubs hc ON hm.id = hc.id
      JOIN managers am ON f.away_club_id = am.id
      LEFT JOIN clubs ac ON am.id = ac.id
      LEFT JOIN tournament_teams tth ON (tth.tournament_name = t.name OR (t.tournament_type = 'rws' AND tth.tournament_name = 'R2G World Series')) AND tth.club_id = f.home_club_id
      LEFT JOIN tournament_teams tta ON (tta.tournament_name = t.name OR (t.tournament_type = 'rws' AND tta.tournament_name = 'R2G World Series')) AND tta.club_id = f.away_club_id
      WHERE f.id = $1
      LIMIT 1
    `, [fixtureId]);

    if (rows.length === 0) return null;
    const r = rows[0];

    const homeName = (!r.home_use_existing && r.home_custom_name) ? r.home_custom_name : r.home_club_name;
    const awayName = (!r.away_use_existing && r.away_custom_name) ? r.away_custom_name : r.away_club_name;
    const homeLogo = (!r.home_use_existing && r.home_custom_logo) ? r.home_custom_logo : r.home_club_logo;
    const awayLogo = (!r.away_use_existing && r.away_custom_logo) ? r.away_custom_logo : r.away_club_logo;

    return {
      id: r.id,
      tournamentId: r.tournament_id,
      tournamentName: r.tournament_name,
      tournamentType: r.tournament_type,
      homeClub: homeName,
      homeLogo: homeLogo,
      awayClub: awayName,
      awayLogo: awayLogo,
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
      SELECT t.id, t.name, t.format_type, t.financial_rule_id, t.tournament_type, s.season_number,
             t.num_groups, t.teams_per_group, t.qualified_per_group, t.num_teams
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
      SELECT ts.club_id, ts.matches_played, ts.points, ts.goals_scored, ts.goals_against, ts.goal_difference, ts.group_name,
             c.name as club_name, c.logo_path as club_logo,
             tt.custom_team_name, tt.custom_logo_path, tt.use_existing_club,
             m.name as manager
      FROM tournament_standings ts
      JOIN managers m ON ts.club_id = m.id
      LEFT JOIN clubs c ON m.id = c.id
      JOIN tournaments t ON ts.tournament_id = t.id
      LEFT JOIN tournament_teams tt ON tt.tournament_name = t.name AND tt.club_id = ts.club_id
      WHERE ts.tournament_id = $1
      ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_scored DESC
    `, [tournamentId]);
    return rows.map((r: any) => ({
      ...r,
      club_name: (!r.use_existing_club && r.custom_team_name) ? r.custom_team_name : r.club_name,
      club_logo: (!r.use_existing_club && r.custom_logo_path) ? r.custom_logo_path : r.club_logo,
      manager: r.manager || "Unknown"
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
        AND LOWER(pc.status) = 'active'
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

export async function fetchClubTournamentsForSeason(clubId: string | number, seasonId: string | number) {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT t.id, t.name
      FROM fixtures f
      JOIN tournaments t ON f.tournament_id = t.id
      WHERE f.season_id = $1 
        AND (f.home_club_id = $2 OR f.away_club_id = $2)
      ORDER BY t.name ASC
    `, [seasonId.toString(), clubId.toString()]);
    return rows.map(r => ({ id: r.id.toString(), name: r.name }));
  } catch (e) {
    console.error("Error fetching club tournaments for season:", e);
    return [];
  }
}

export async function fetchCompletedFixturesForClub(clubId: string | number, seasonId: string | number) {
  try {
    const { rows } = await pool.query(`
      SELECT f.id, f.round_number, f.tournament_id, t.name as tournament_name,
             f.home_club_id, f.away_club_id, f.home_score, f.away_score,
             COALESCE(hc.name, hm.name) as home_club_name, COALESCE(ac.name, am.name) as away_club_name
      FROM fixtures f
      JOIN tournaments t ON f.tournament_id = t.id
      JOIN managers hm ON f.home_club_id = hm.id
      LEFT JOIN clubs hc ON hm.id = hc.id
      JOIN managers am ON f.away_club_id = am.id
      LEFT JOIN clubs ac ON am.id = ac.id
      WHERE f.season_id = $1 
        AND (f.home_club_id = $2 OR f.away_club_id = $2)
        AND f.home_score IS NOT NULL 
        AND f.away_score IS NOT NULL
      ORDER BY t.name ASC, f.round_number ASC
    `, [seasonId.toString(), clubId.toString()]);
    return rows.map(r => ({
      id: r.id.toString(),
      roundNumber: Number(r.round_number),
      tournamentId: r.tournament_id.toString(),
      tournamentName: r.tournament_name,
      homeClubId: r.home_club_id.toString(),
      awayClubId: r.away_club_id.toString(),
      homeClubName: r.home_club_name,
      awayClubName: r.away_club_name,
      homeScore: r.home_score,
      awayScore: r.away_score,
    }));
  } catch (e) {
    console.error("Error fetching completed fixtures for club:", e);
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

export async function fetchSeasonMatchdays(seasonId: string | number) {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT round_number
      FROM fixtures
      WHERE season_id = $1
      ORDER BY round_number ASC
    `, [seasonId.toString()]);
    if (rows.length === 0) {
      return Array.from({ length: 10 }, (_, i) => i + 1);
    }
    return rows.map(r => Number(r.round_number));
  } catch (e) {
    console.error("Error fetching season matchdays:", e);
    return Array.from({ length: 10 }, (_, i) => i + 1);
  }
}

export async function fetchCompletedMatchdays(clubId: string | number, seasonId: string | number) {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT round_number
      FROM fixtures
      WHERE season_id = $1 
        AND (home_club_id = $2 OR away_club_id = $2)
        AND home_score IS NOT NULL 
        AND away_score IS NOT NULL
      ORDER BY round_number ASC
    `, [seasonId.toString(), clubId.toString()]);
    return rows.map(r => Number(r.round_number));
  } catch (e) {
    console.error("Error fetching completed matchdays:", e);
    return [];
  }
}

export async function saveAppearances(clubId: string | number, seasonId: string | number, matchday: number, playerIds: (string | number)[]) {
  const isAdmin = await checkIsSoloAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized: Admin privilege required");
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const normalizedNewPlayerIds = playerIds.map(id => id.toString());
    const targetTeamId = clubId.toString();
    const targetSeasonId = seasonId.toString();
    
    // 1. Get previous appearances for this club, season, and matchday
    const { rows: oldApps } = await client.query(`
      SELECT player_id 
      FROM career_matchday_appearances 
      WHERE team_id = $1 AND season_id = $2 AND matchday = $3
    `, [targetTeamId, targetSeasonId, matchday]);
    const oldPlayerIds = oldApps.map(r => r.player_id.toString());
    
    // 2. Get active player contracts for salary mapping
    const { rows: contracts } = await client.query(`
      SELECT player_id, salary 
      FROM player_contracts 
      WHERE current_club_id = $1 AND LOWER(status) = 'active' AND season_id = $2
    `, [targetTeamId, targetSeasonId]);
    const salaryMap = new Map<string, number>();
    contracts.forEach(c => {
      salaryMap.set(c.player_id.toString(), Number(c.salary) || 0);
    });
    
    // 3. Batch retrieve player names for transaction logging description
    const allPlayerIds = Array.from(new Set([...oldPlayerIds, ...normalizedNewPlayerIds]));
    const nameMap = new Map<string, string>();
    if (allPlayerIds.length > 0) {
      const { rows: playersData } = await client.query(`
        SELECT id, name 
        FROM players 
        WHERE id = ANY($1)
      `, [allPlayerIds]);
      playersData.forEach(p => {
        nameMap.set(p.id.toString(), p.name);
      });
    }
    
    // 4. Calculate added/removed players
    const removedPlayerIds = oldPlayerIds.filter(id => !normalizedNewPlayerIds.includes(id));
    const addedPlayerIds = normalizedNewPlayerIds.filter(id => !oldPlayerIds.includes(id));
    
    let totalRefund = 0;
    let totalDeduction = 0;
    const logEntries: {
      managerId: string | number;
      seasonId: string | number;
      currencyType: 'coin';
      amount: number;
      transactionType: string;
      description: string;
    }[] = [];
    
    // Refund removed players
    for (const pId of removedPlayerIds) {
      const salary = salaryMap.get(pId) || 0;
      if (salary > 0) {
        totalRefund += salary;
        const pName = nameMap.get(pId) || `Player #${pId}`;
        logEntries.push({
          managerId: clubId,
          seasonId,
          currencyType: 'coin',
          amount: salary,
          transactionType: 'salary_reversal',
          description: `Salary refund (Matchday ${matchday} Reversal) - ${pName}`
        });
      }
    }
    
    // Deduct added players
    for (const pId of addedPlayerIds) {
      const salary = salaryMap.get(pId) || 0;
      if (salary > 0) {
        totalDeduction += salary;
        const pName = nameMap.get(pId) || `Player #${pId}`;
        logEntries.push({
          managerId: clubId,
          seasonId,
          currencyType: 'coin',
          amount: -salary,
          transactionType: 'salary',
          description: `Salary deduction (Matchday ${matchday}) - ${pName}`
        });
      }
    }
    
    const netChange = totalRefund - totalDeduction;
    
    // 5. Delete previous appearances
    await client.query(`
      DELETE FROM career_matchday_appearances
      WHERE team_id = $1 AND season_id = $2 AND matchday = $3
    `, [targetTeamId, targetSeasonId, matchday]);
    
    // 6. Batch insert new appearances
    if (normalizedNewPlayerIds.length > 0) {
      const placeholders = normalizedNewPlayerIds.map((_, i) => `($1, $2, $3, $${i + 4})`).join(', ');
      const params = [targetTeamId, targetSeasonId, matchday, ...normalizedNewPlayerIds];
      await client.query(`
        INSERT INTO career_matchday_appearances (team_id, season_id, matchday, player_id)
        VALUES ${placeholders}
        ON CONFLICT (season_id, matchday, team_id, player_id) DO NOTHING
      `, params);
    }
    
    // 7. Update manager wallet and seasons statistics
    if (netChange !== 0) {
      await client.query(`
        UPDATE manager_wallets
        SET r2g_coin_balance = r2g_coin_balance + $1
        WHERE manager_id = $2 AND season_id = $3
      `, [netChange, targetTeamId, targetSeasonId]);
      
      await client.query(`
        UPDATE manager_seasons
        SET team_expense = team_expense - $1,
            team_profit = team_profit + $1
        WHERE manager_id = $2 AND season_id = $3
      `, [netChange, targetTeamId, targetSeasonId]);
    }
    
    // 8. Batch insert transaction logs
    if (logEntries.length > 0) {
      const placeholders = logEntries.map((_, i) => 
        `($${i*6 + 1}, $${i*6 + 2}, $${i*6 + 3}, $${i*6 + 4}, $${i*6 + 5}, $${i*6 + 6})`
      ).join(', ');
      const params = logEntries.flatMap(e => [
        parseInt(e.managerId.toString()),
        parseInt(e.seasonId.toString()),
        e.currencyType,
        e.amount,
        e.transactionType,
        e.description
      ]);
      await client.query(`
        INSERT INTO wallet_transactions (manager_id, season_id, currency_type, amount, transaction_type, description)
        VALUES ${placeholders}
      `, params);
    }
    
    await client.query('COMMIT');
    return { success: true, netChange };
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Error saving appearances transaction:", e);
    throw e;
  } finally {
    client.release();
  }
}

export async function revertAppearancesAndSalaries(clubId: string | number, seasonId: string | number, matchday: number) {
  return saveAppearances(clubId, seasonId, matchday, []);
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
        match_extension_fee_rc, match_extension_fee_rt, match_extension_fee_voucher,
        
        goals_scored_bonus_rc, goals_scored_bonus_rt, goals_scored_bonus_voucher,
        clean_sheet_bonus_rc, clean_sheet_bonus_rt, clean_sheet_bonus_voucher,
        rule_violation_fine_rc, rule_violation_fine_rt, rule_violation_fine_voucher,
        match_extension_half_fee_rc, match_extension_half_fee_rt, match_extension_half_fee_voucher,
        tournament_start_bonus_rc, tournament_start_bonus_rt, tournament_start_bonus_voucher,
        position_2nd_bonus_rc, position_2nd_bonus_rt, position_2nd_bonus_voucher,
        position_3rd_bonus_rc, position_3rd_bonus_rt, position_3rd_bonus_voucher,
        position_4th_bonus_rc, position_4th_bonus_rt, position_4th_bonus_voucher,
        position_rewards
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
        $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49,
        $50
      )
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
      
      p(rule.goals_scored_bonus_rc), p(rule.goals_scored_bonus_rt), p(rule.goals_scored_bonus_voucher),
      p(rule.clean_sheet_bonus_rc), p(rule.clean_sheet_bonus_rt), p(rule.clean_sheet_bonus_voucher),
      p(rule.rule_violation_fine_rc), p(rule.rule_violation_fine_rt), p(rule.rule_violation_fine_voucher),
      p(rule.match_extension_half_fee_rc), p(rule.match_extension_half_fee_rt), p(rule.match_extension_half_fee_voucher),
      p(rule.tournament_start_bonus_rc), p(rule.tournament_start_bonus_rt), p(rule.tournament_start_bonus_voucher),
      p(rule.position_2nd_bonus_rc), p(rule.position_2nd_bonus_rt), p(rule.position_2nd_bonus_voucher),
      p(rule.position_3rd_bonus_rc), p(rule.position_3rd_bonus_rt), p(rule.position_3rd_bonus_voucher),
      p(rule.position_4th_bonus_rc), p(rule.position_4th_bonus_rt), p(rule.position_4th_bonus_voucher),
      JSON.stringify(rule.position_rewards || [])
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
        
        goals_scored_bonus_rc = $26, goals_scored_bonus_rt = $27, goals_scored_bonus_voucher = $28,
        clean_sheet_bonus_rc = $29, clean_sheet_bonus_rt = $30, clean_sheet_bonus_voucher = $31,
        rule_violation_fine_rc = $32, rule_violation_fine_rt = $33, rule_violation_fine_voucher = $34,
        match_extension_half_fee_rc = $35, match_extension_half_fee_rt = $36, match_extension_half_fee_voucher = $37,
        tournament_start_bonus_rc = $38, tournament_start_bonus_rt = $39, tournament_start_bonus_voucher = $40,
        position_2nd_bonus_rc = $41, position_2nd_bonus_rt = $42, position_2nd_bonus_voucher = $43,
        position_3rd_bonus_rc = $44, position_3rd_bonus_rt = $45, position_3rd_bonus_voucher = $46,
        position_4th_bonus_rc = $47, position_4th_bonus_rt = $48, position_4th_bonus_voucher = $49,
        position_rewards = $50,
        updated_at = NOW()
      WHERE id = $51
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
      
      p(rule.goals_scored_bonus_rc), p(rule.goals_scored_bonus_rt), p(rule.goals_scored_bonus_voucher),
      p(rule.clean_sheet_bonus_rc), p(rule.clean_sheet_bonus_rt), p(rule.clean_sheet_bonus_voucher),
      p(rule.rule_violation_fine_rc), p(rule.rule_violation_fine_rt), p(rule.rule_violation_fine_voucher),
      p(rule.match_extension_half_fee_rc), p(rule.match_extension_half_fee_rt), p(rule.match_extension_half_fee_voucher),
      p(rule.tournament_start_bonus_rc), p(rule.tournament_start_bonus_rt), p(rule.tournament_start_bonus_voucher),
      p(rule.position_2nd_bonus_rc), p(rule.position_2nd_bonus_rt), p(rule.position_2nd_bonus_voucher),
      p(rule.position_3rd_bonus_rc), p(rule.position_3rd_bonus_rt), p(rule.position_3rd_bonus_voucher),
      p(rule.position_4th_bonus_rc), p(rule.position_4th_bonus_rt), p(rule.position_4th_bonus_voucher),
      JSON.stringify(rule.position_rewards || []),
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
    
    const managerName = data.managerName || data.name;
    const avatarPath = data.avatarPath || data.photo || '';
    const mobNo = data.mobNo || data.mob_no || '';
    const place = data.place || '';
    const r2gId = data.r2gId || data.r2g_id || managerName;
    
    await pool.query(`
      INSERT INTO managers (id, r2g_id, name, avatar_path, is_active, mob_no, place)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [nextId, r2gId, managerName, avatarPath, data.isActive !== false, mobNo, place]);
    
    if (data.clubName) {
      await pool.query(`
        INSERT INTO clubs (id, name, logo_path)
        VALUES ($1, $2, $3)
      `, [nextId, data.clubName, data.logoPath || '']);
    }
    
    const activeSeason = await fetchActiveSeason();
    if (activeSeason && !data.isGuest) {
      const dbClubId = data.clubName ? nextId : null;
      
      await pool.query(`
        INSERT INTO manager_wallets (manager_id, season_id, current_club_id, r2g_coin_balance, r2g_token_balance, r2g_voucher_balance, overall_rating, star_rating)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [nextId, activeSeason.id, dbClubId, data.coinBalance || 0, data.tokenBalance || 0, data.voucherBalance || 0, data.rating || 80, data.starRating || 3]);
      
      await pool.query(`
        INSERT INTO manager_seasons (manager_id, season_id, club_id, matches_played, wins, draws, losses, goals_scored, goals_conceded, clean_sheets, team_income, team_expense, team_profit)
        VALUES ($1, $2, $3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
      `, [nextId, activeSeason.id, dbClubId]);

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
    
    let clubId = data.clubId ? parseInt(data.clubId) : null;
    
    if (!clubId) {
      const { rows: walletRows } = await pool.query(`
        SELECT current_club_id FROM manager_wallets 
        WHERE manager_id = $1 AND season_id = $2
      `, [data.id, seasonId]);
      clubId = walletRows.length > 0 ? walletRows[0].current_club_id : data.id;
    }
    
    const managerName = data.managerName || data.name;
    const avatarPath = data.avatarPath || data.photo || '';
    const mobNo = data.mobNo || data.mob_no || '';
    const place = data.place || '';
    const r2gId = data.r2gId || data.r2g_id || managerName;
    
    await pool.query(`
      UPDATE managers 
      SET name = $1, avatar_path = $2, is_banned = $3, is_active = $4, mob_no = $5, place = $6, r2g_id = $7 
      WHERE id = $8
    `, [managerName, avatarPath, data.isBanned || false, data.isActive !== false, mobNo, place, r2gId, data.id]);
    
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
    console.error("Error updating manager details:", e);
    throw e;
  }
}

export async function updateManagerProfileOnly(data: any) {
  try {
    const managerName = data.managerName || data.name;
    const avatarPath = data.avatarPath || data.photo || '';
    const mobNo = data.mobNo || data.mob_no || '';
    const place = data.place || '';
    const managerId = parseInt(data.id, 10);
    const r2gId = data.r2gId || data.r2g_id || managerName;
    
    await pool.query(`
      UPDATE managers 
      SET name = $1, avatar_path = $2, is_active = $3, mob_no = $4, place = $5, r2g_id = $6
      WHERE id = $7
    `, [managerName, avatarPath, data.isActive !== false, mobNo, place, r2gId, managerId]);
    return { success: true };
  } catch (e) {
    console.error("Error updating manager profile:", e);
    throw e;
  }
}

export async function updateManagerClubOnly(data: any) {
  try {
    await pool.query('BEGIN');
    
    const activeSeason = await fetchActiveSeason();
    const seasonId = activeSeason ? activeSeason.id : 6;
    const managerId = parseInt(data.id, 10);
    
    let clubId = data.clubId ? parseInt(data.clubId) : null;
    
    if (!clubId) {
      const { rows: walletRows } = await pool.query(`
        SELECT current_club_id FROM manager_wallets 
        WHERE manager_id = $1 AND season_id = $2
      `, [managerId, seasonId]);
      clubId = walletRows.length > 0 ? walletRows[0].current_club_id : null;
    }

    if (!clubId) {
      const { rows: maxIdRows } = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM clubs');
      clubId = maxIdRows[0].next_id;
      await pool.query(`
        INSERT INTO clubs (id, name, logo_path)
        VALUES ($1, $2, $3)
      `, [clubId, data.clubName, data.logoPath || '']);
      
      await pool.query(`
        UPDATE manager_wallets SET current_club_id = $1
        WHERE manager_id = $2 AND season_id = $3
      `, [clubId, managerId, seasonId]);
    } else {
      await pool.query(`
        UPDATE clubs SET name = $1, logo_path = $2 WHERE id = $3
      `, [data.clubName, data.logoPath || '', clubId]);
      
      await pool.query(`
        UPDATE manager_wallets SET current_club_id = $1
        WHERE manager_id = $2 AND season_id = $3
      `, [clubId, managerId, seasonId]);
    }
    
    await pool.query('COMMIT');
    return { success: true };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error updating manager club details:", e);
    throw e;
  }
}

export async function updateManagerWalletAndStatsOnly(data: any) {
  try {
    await pool.query('BEGIN');
    
    const activeSeason = await fetchActiveSeason();
    if (!activeSeason) throw new Error("No active season found");
    const managerId = parseInt(data.id, 10);
    
    const { rows: oldWalletRows } = await pool.query(`
      SELECT r2g_coin_balance, r2g_token_balance, r2g_voucher_balance 
      FROM manager_wallets 
      WHERE manager_id = $1 AND season_id = $2
    `, [managerId, activeSeason.id]);

    const oldCoins = oldWalletRows.length > 0 ? parseInt(oldWalletRows[0].r2g_coin_balance) || 0 : 0;
    const oldTokens = oldWalletRows.length > 0 ? parseInt(oldWalletRows[0].r2g_token_balance) || 0 : 0;
    const oldVouchers = oldWalletRows.length > 0 ? parseInt(oldWalletRows[0].r2g_voucher_balance) || 0 : 0;

    await pool.query(`
      UPDATE manager_wallets SET
        r2g_coin_balance = $1,
        r2g_token_balance = $2,
        r2g_voucher_balance = $3,
        overall_rating = $4,
        star_rating = $5
      WHERE manager_id = $6 AND season_id = $7
    `, [data.coinBalance || 0, data.tokenBalance || 0, data.voucherBalance || 0, data.rating || 80, data.starRating || 3, managerId, activeSeason.id]);

    const coinDiff = (data.coinBalance || 0) - oldCoins;
    if (coinDiff !== 0) {
      await logTransaction(managerId, activeSeason.id, 'coin', Math.abs(coinDiff), coinDiff > 0 ? 'admin_credit' : 'admin_debit', 'Admin wallet balance override');
    }
    const tokenDiff = (data.tokenBalance || 0) - oldTokens;
    if (tokenDiff !== 0) {
      await logTransaction(managerId, activeSeason.id, 'token', Math.abs(tokenDiff), tokenDiff > 0 ? 'admin_credit' : 'admin_debit', 'Admin wallet balance override');
    }
    const voucherDiff = (data.voucherBalance || 0) - oldVouchers;
    if (voucherDiff !== 0) {
      await logTransaction(managerId, activeSeason.id, 'voucher', Math.abs(voucherDiff), voucherDiff > 0 ? 'admin_credit' : 'admin_debit', 'Admin wallet balance override');
    }

    await pool.query(`
      UPDATE manager_seasons SET
        wins = $1, draws = $2, losses = $3, matches_played = $4,
        goals_scored = $5, goals_conceded = $6, clean_sheets = $7
      WHERE manager_id = $8 AND season_id = $9
    `, [data.wins || 0, data.draws || 0, data.losses || 0, data.matchesPlayed || 0, data.goalsFor || 0, data.goalsAgainst || 0, data.cleanSheets || 0, managerId, activeSeason.id]);

    await pool.query('COMMIT');
    return { success: true };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error updating manager wallet and stats:", e);
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

export async function createTournament(
  name: string, 
  formatType: string, 
  seasonId: number, 
  financialRuleId: number | null, 
  tournamentType: string = 'solo',
  numGroups: number | null = null,
  teamsPerGroup: number | null = null,
  qualifiedPerGroup: number | null = null,
  numTeams: number | null = null,
  divisionTier: number | null = null,
  promotionCount: number | null = 0,
  relegationCount: number | null = 0
) {
  try {
    const { rows } = await pool.query(`
      INSERT INTO tournaments (name, format_type, season_id, financial_rule_id, tournament_type, num_groups, teams_per_group, qualified_per_group, num_teams, division_tier, promotion_count, relegation_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [name, formatType, seasonId, financialRuleId, tournamentType, numGroups, teamsPerGroup, qualifiedPerGroup, numTeams, divisionTier, promotionCount, relegationCount]);
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

export async function updateTournamentDetails(
  id: number, 
  name: string, 
  formatType: string, 
  financialRuleId: number | null, 
  tournamentType: string,
  numGroups: number | null = null,
  teamsPerGroup: number | null = null,
  qualifiedPerGroup: number | null = null,
  numTeams: number | null = null,
  divisionTier: number | null = null,
  promotionCount: number | null = 0,
  relegationCount: number | null = 0
) {
  try {
    const { rows } = await pool.query(`
      UPDATE tournaments 
      SET name = $1, format_type = $2, financial_rule_id = $3, tournament_type = $4,
          num_groups = $5, teams_per_group = $6, qualified_per_group = $7, num_teams = $8,
          division_tier = $9, promotion_count = $10, relegation_count = $11
      WHERE id = $12
      RETURNING *
    `, [name, formatType, financialRuleId, tournamentType, numGroups, teamsPerGroup, qualifiedPerGroup, numTeams, divisionTier, promotionCount, relegationCount, id]);
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
             t.name as tournament_name, t.financial_rule_id, t.tournament_type
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
    const tournamentType = fixture.tournament_type;

    // Flag: skip all financial logic for RWS and Special Tour
    const skipFinancial = tournamentType === 'rws' || tournamentType === 'special';

    // 2. Revert any previous financial transactions recorded in match_bonuses_given for this fixture
    if (!skipFinancial) {
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
    } // end !skipFinancial (step 2)

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
    if (!skipFinancial) {
    const { rows: ruleRows } = await pool.query(`
      SELECT r.*
      FROM career_financial_rules r
      WHERE r.id = $1
    `, [fixture.financial_rule_id]);

    if (ruleRows.length > 0) {
      const rule = ruleRows[0];
      const payoutsToApply: { managerId: number; type: string; rc: number; rt: number; voucher: number; isBonus: boolean; desc: string }[] = [];

      if (matchStatus === 'played' || matchStatus === 'extended_full' || matchStatus === 'extended_half') {
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

          // 1. Match Played flat bonus
          const playedRc = Number(rule.match_bonus_rc) || 0;
          const playedRt = Number(rule.match_bonus_rt) || 0;
          const playedV = Number(rule.match_bonus_voucher) || 0;
          if (playedRc > 0 || playedRt > 0 || playedV > 0) {
            payoutsToApply.push({
              managerId: homeClubId,
              type: 'match_played',
              rc: playedRc,
              rt: playedRt,
              voucher: playedV,
              isBonus: true,
              desc: `Match played bonus (${tournamentName} Round ${updatedFixture.round_number})`
            });
            payoutsToApply.push({
              managerId: awayClubId,
              type: 'match_played',
              rc: playedRc,
              rt: playedRt,
              voucher: playedV,
              isBonus: true,
              desc: `Match played bonus (${tournamentName} Round ${updatedFixture.round_number})`
            });
          }

          // 2. Win/Draw/Loss outcome bonus
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

          // 3. Goals Scored bonus
          const goalRc = Number(rule.goals_scored_bonus_rc) || 0;
          const goalRt = Number(rule.goals_scored_bonus_rt) || 0;
          const goalV = Number(rule.goals_scored_bonus_voucher) || 0;

          if (finalHomeScore > 0 && (goalRc > 0 || goalRt > 0 || goalV > 0)) {
            payoutsToApply.push({
              managerId: homeClubId,
              type: 'goals_scored',
              rc: goalRc * finalHomeScore,
              rt: goalRt * finalHomeScore,
              voucher: goalV * finalHomeScore,
              isBonus: true,
              desc: `Goals scored bonus (${finalHomeScore} goals in ${tournamentName} Round ${updatedFixture.round_number})`
            });
          }
          if (finalAwayScore > 0 && (goalRc > 0 || goalRt > 0 || goalV > 0)) {
            payoutsToApply.push({
              managerId: awayClubId,
              type: 'goals_scored',
              rc: goalRc * finalAwayScore,
              rt: goalRt * finalAwayScore,
              voucher: goalV * finalAwayScore,
              isBonus: true,
              desc: `Goals scored bonus (${finalAwayScore} goals in ${tournamentName} Round ${updatedFixture.round_number})`
            });
          }

          // 4. Clean Sheet bonus
          const csRc = Number(rule.clean_sheet_bonus_rc) || 0;
          const csRt = Number(rule.clean_sheet_bonus_rt) || 0;
          const csV = Number(rule.clean_sheet_bonus_voucher) || 0;

          if (finalAwayScore === 0 && (csRc > 0 || csRt > 0 || csV > 0)) {
            payoutsToApply.push({
              managerId: homeClubId,
              type: 'clean_sheet',
              rc: csRc,
              rt: csRt,
              voucher: csV,
              isBonus: true,
              desc: `Clean sheet bonus (${tournamentName} Round ${updatedFixture.round_number})`
            });
          }
          if (finalHomeScore === 0 && (csRc > 0 || csRt > 0 || csV > 0)) {
            payoutsToApply.push({
              managerId: awayClubId,
              type: 'clean_sheet',
              rc: csRc,
              rt: csRt,
              voucher: csV,
              isBonus: true,
              desc: `Clean sheet bonus (${tournamentName} Round ${updatedFixture.round_number})`
            });
          }

          // 5. Extension fee (Full or Half)
          if (matchStatus === 'extended_full') {
            const extRc = Number(rule.match_extension_fee_rc) || 0;
            const extRt = Number(rule.match_extension_fee_rt) || 0;
            const extV = Number(rule.match_extension_fee_voucher) || 0;

            if (extRc > 0 || extRt > 0 || extV > 0) {
              payoutsToApply.push({
                managerId: homeClubId,
                type: 'match_extension',
                rc: extRc,
                rt: extRt,
                voucher: extV,
                isBonus: false,
                desc: `Full match extension fee (${tournamentName} Round ${updatedFixture.round_number})`
              });
              payoutsToApply.push({
                managerId: awayClubId,
                type: 'match_extension',
                rc: extRc,
                rt: extRt,
                voucher: extV,
                isBonus: false,
                desc: `Full match extension fee (${tournamentName} Round ${updatedFixture.round_number})`
              });
            }
          } else if (matchStatus === 'extended_half') {
            const extHalfRc = Number(rule.match_extension_half_fee_rc) || 0;
            const extHalfRt = Number(rule.match_extension_half_fee_rt) || 0;
            const extHalfV = Number(rule.match_extension_half_fee_voucher) || 0;

            if (extHalfRc > 0 || extHalfRt > 0 || extHalfV > 0) {
              payoutsToApply.push({
                managerId: homeClubId,
                type: 'match_extension_half',
                rc: extHalfRc,
                rt: extHalfRt,
                voucher: extHalfV,
                isBonus: false,
                desc: `Half match extension fee (${tournamentName} Round ${updatedFixture.round_number})`
              });
              payoutsToApply.push({
                managerId: awayClubId,
                type: 'match_extension_half',
                rc: extHalfRc,
                rt: extHalfRt,
                voucher: extHalfV,
                isBonus: false,
                desc: `Half match extension fee (${tournamentName} Round ${updatedFixture.round_number})`
              });
            }
          }
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
    } // end !skipFinancial (step 4)

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

function savePlayerImage(playerId: number, base64Data: string): string {
  if (!base64Data || !base64Data.startsWith('data:image/')) return base64Data;
  
  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64Data;
    
    const buffer = Buffer.from(matches[2], 'base64');
    const uploadDir = path.join(process.cwd(), 'public', 'assets', 'images', 'players');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const fileName = `${playerId}.png`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);
    
    return `/assets/images/players/${fileName}`;
  } catch (e) {
    console.error("Error saving player image to file:", e);
    return base64Data;
  }
}

export async function createPlayer(data: any) {
  try {
    const { rows } = await pool.query(`
      INSERT INTO players (name, position, card_type, base_value, image_path)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [data.name, data.position, data.star || '3-star-standard', data.value || 80, '']);
    
    const newPlayer = rows[0];
    
    if (data.imagePath && data.imagePath.startsWith('data:image/')) {
      const savedPath = savePlayerImage(newPlayer.id, data.imagePath);
      await pool.query(`
        UPDATE players SET image_path = $1 WHERE id = $2
      `, [savedPath, newPlayer.id]);
      newPlayer.image_path = savedPath;
    }
    
    return newPlayer;
  } catch (e) {
    console.error("Error creating player:", e);
    throw e;
  }
}

export async function updatePlayer(data: any) {
  try {
    let finalPath = data.imagePath || '';
    if (finalPath.startsWith('data:image/')) {
      finalPath = savePlayerImage(parseInt(data.id), finalPath);
    }
    
    const { rows } = await pool.query(`
      UPDATE players SET
        name = $1, position = $2, card_type = $3, base_value = $4, image_path = $5, is_suspended = $6
      WHERE id = $7
      RETURNING *
    `, [data.name, data.position, data.star || '3-star-standard', data.value || 80, finalPath, data.isSuspended || false, data.id]);
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

    const cleanStart = (data.startSeason || '').replace(/[^\d.]/g, '');
    const cleanExpire = (data.expireSeason || '').replace(/[^\d.]/g, '');

    const { rows } = await pool.query(`
      INSERT INTO player_contracts (player_id, season_id, current_club_id, signed_value, salary, start_season, expire_season, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING *
    `, [data.playerId, seasonId, data.clubId, data.signedValue || 0, data.salary || 0, cleanStart, cleanExpire]);
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
  tournamentName: string,
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
      WHERE tournament_name = $5 AND club_id = $6
    `, [status, customTeamName, useExistingClub, customLogoPath, tournamentName, clubId]);
    
    if (rowCount === 0) {
      await pool.query(`
        INSERT INTO tournament_teams (tournament_name, club_id, selection_status, custom_team_name, use_existing_club, custom_logo_path)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [tournamentName, clubId, status, customTeamName, useExistingClub, customLogoPath]);
    }
    return { success: true };
  } catch (e) {
    console.error("Error nominating candidate:", e);
    throw e;
  }
}

export async function removeRwsCandidate(tournamentName: string, clubId: number) {
  try {
    await pool.query(`
      DELETE FROM tournament_teams 
      WHERE tournament_name = $1 AND club_id = $2
    `, [tournamentName, clubId]);
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
      WHERE player_id = $1 AND LOWER(status) = 'active'
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
      JOIN player_contracts pc ON a.player_id = pc.player_id AND LOWER(pc.status) = 'active' AND pc.season_id = $1
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

export async function applyTournamentStartBonus(tournamentId: number, clubId: number) {
  try {
    const { rows: tourneyRows } = await pool.query(`
      SELECT t.season_id, t.tournament_type, r.tournament_start_bonus_rc, r.tournament_start_bonus_rt, r.tournament_start_bonus_voucher
      FROM tournaments t
      JOIN career_financial_rules r ON t.financial_rule_id = r.id
      WHERE t.id = $1
    `, [tournamentId]);

    if (tourneyRows.length === 0) return;
    const tourney = tourneyRows[0];
    
    if (tourney.tournament_type === 'rws' || tourney.tournament_type === 'special') return;

    const rc = Number(tourney.tournament_start_bonus_rc) || 0;
    const rt = Number(tourney.tournament_start_bonus_rt) || 0;
    const voucher = Number(tourney.tournament_start_bonus_voucher) || 0;

    if (rc === 0 && rt === 0 && voucher === 0) return;

    const seasonId = tourney.season_id;
    const rewardType = `start_bonus_${tournamentId}`;

    const { rows: existing } = await pool.query(`
      SELECT 1 FROM match_bonuses_given
      WHERE manager_id = $1 AND season_id = $2 AND reward_type = $3
    `, [clubId, seasonId, rewardType]);

    if (existing.length > 0) return;

    await pool.query(`
      UPDATE manager_wallets 
      SET r2g_coin_balance = r2g_coin_balance + $1,
          r2g_token_balance = r2g_token_balance + $2,
          r2g_voucher_balance = r2g_voucher_balance + $3
      WHERE manager_id = $4 AND season_id = $5
    `, [rc, rt, voucher, clubId, seasonId]);

    await pool.query(`
      UPDATE manager_seasons
      SET team_income = team_income + $1,
          team_profit = team_profit + $1
      WHERE manager_id = $2 AND season_id = $3
    `, [rc, clubId, seasonId]);

    const desc = `Tournament starting bonus`;
    if (rc > 0) await logTransaction(clubId, seasonId, 'coin', rc, rewardType, desc);
    if (rt > 0) await logTransaction(clubId, seasonId, 'token', rt, rewardType, desc);
    if (voucher > 0) await logTransaction(clubId, seasonId, 'voucher', voucher, rewardType, desc);

    await pool.query(`
      INSERT INTO match_bonuses_given (fixture_id, manager_id, season_id, reward_type, coins_given, tokens_given, vouchers_given)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [-tournamentId, clubId, seasonId, rewardType, rc, rt, voucher]);

    console.log(`✅ Disbursed starting bonus to Manager ${clubId} for Tourney ${tournamentId}`);
  } catch (error) {
    console.error("Error applying tournament start bonus:", error);
  }
}

export async function revertTournamentStartBonus(tournamentId: number, clubId: number) {
  try {
    const { rows: tourneyRows } = await pool.query(`
      SELECT season_id FROM tournaments WHERE id = $1
    `, [tournamentId]);
    if (tourneyRows.length === 0) return;
    const seasonId = tourneyRows[0].season_id;
    const rewardType = `start_bonus_${tournamentId}`;

    const { rows: payoutRows } = await pool.query(`
      SELECT coins_given, tokens_given, vouchers_given
      FROM match_bonuses_given
      WHERE manager_id = $1 AND season_id = $2 AND reward_type = $3
    `, [clubId, seasonId, rewardType]);

    if (payoutRows.length === 0) return;
    const payout = payoutRows[0];
    const rc = Number(payout.coins_given) || 0;
    const rt = Number(payout.tokens_given) || 0;
    const voucher = Number(payout.vouchers_given) || 0;

    await pool.query(`
      UPDATE manager_wallets 
      SET r2g_coin_balance = r2g_coin_balance - $1,
          r2g_token_balance = r2g_token_balance - $2,
          r2g_voucher_balance = r2g_voucher_balance - $3
      WHERE manager_id = $4 AND season_id = $5
    `, [rc, rt, voucher, clubId, seasonId]);

    await pool.query(`
      UPDATE manager_seasons
      SET team_income = team_income - $1,
          team_profit = team_profit - $1
      WHERE manager_id = $2 AND season_id = $3
    `, [rc, clubId, seasonId]);

    const desc = `Reversal of tournament starting bonus`;
    if (rc > 0) await logTransaction(clubId, seasonId, 'coin', -rc, rewardType, desc);
    if (rt > 0) await logTransaction(clubId, seasonId, 'token', -rt, rewardType, desc);
    if (voucher > 0) await logTransaction(clubId, seasonId, 'voucher', -voucher, rewardType, desc);

    await pool.query(`
      DELETE FROM match_bonuses_given
      WHERE manager_id = $1 AND season_id = $2 AND reward_type = $3
    `, [clubId, seasonId, rewardType]);

    console.log(`✅ Reverted starting bonus from Manager ${clubId} for Tourney ${tournamentId}`);
  } catch (error) {
    console.error("Error reverting tournament start bonus:", error);
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
    const fixturesToInsert: { home: number, away: number, round: number, groupName: string | null }[] = [];

    if (format === "Group + Knockout" || format === "League + Knockout") {
      // Group matchups
      // Get group assignments for the clubs in this tournament
      const { rows: standings } = await pool.query('SELECT club_id, group_name FROM tournament_standings WHERE tournament_id = $1', [tournamentId]);
      const groupMap: Record<number, string> = {};
      standings.forEach(s => {
        if (s.group_name) {
          groupMap[s.club_id] = s.group_name;
        }
      });

      // Group teams by their group name
      const teamsByGroup: Record<string, number[]> = {};
      clubIds.forEach(id => {
        const gn = groupMap[id] || "Unassigned";
        if (!teamsByGroup[gn]) teamsByGroup[gn] = [];
        teamsByGroup[gn].push(id);
      });

      // For each group, generate round-robin matchups
      for (const [groupName, gClubIds] of Object.entries(teamsByGroup)) {
        if (groupName === "Unassigned") continue; // Don't schedule matches for unassigned teams
        
        const list = [...gClubIds];
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
              fixturesToInsert.push({ home, away, round: r + 1, groupName });
            }
          }
          // Rotate list
          list.splice(1, 0, list.pop() as any);
        }
      }

      // Leg 2 (if Double Leg requested)
      if (legs === "double") {
        const leg1Count = fixturesToInsert.length;
        let maxRounds = 0;
        for (const list of Object.values(teamsByGroup)) {
          const l = list.length % 2 === 0 ? list.length : list.length + 1;
          if (l - 1 > maxRounds) maxRounds = l - 1;
        }
        for (let idx = 0; idx < leg1Count; idx++) {
          const f = fixturesToInsert[idx];
          fixturesToInsert.push({
            home: f.away,
            away: f.home,
            round: f.round + maxRounds,
            groupName: f.groupName
          });
        }
      }
    } else {
      // Standard single league round robin
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
            fixturesToInsert.push({ home, away, round: r + 1, groupName: null });
          }
        }
        // Rotate list
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
            round: f.round + rounds,
            groupName: null
          });
        }
      }
    }

    // 5. Bulk insert matches
    for (const f of fixturesToInsert) {
      await pool.query(`
        INSERT INTO fixtures (tournament_id, season_id, home_club_id, away_club_id, round_number, group_name)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [tournamentId, seasonId, f.home, f.away, f.round, f.groupName]);
    }

    // Disburse start bonus as fixtures are now generated!
    for (const clubId of clubIds) {
      await applyTournamentStartBonus(tournamentId, clubId);
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
      SELECT ts.club_id, COALESCE(c.name, m.name) as name, c.logo_path,
             tt.custom_team_name, tt.custom_logo_path, tt.use_existing_club,
             m.name as manager, ts.group_name
      FROM tournament_standings ts
      JOIN managers m ON ts.club_id = m.id
      LEFT JOIN clubs c ON m.id = c.id
      JOIN tournaments t ON ts.tournament_id = t.id
      LEFT JOIN tournament_teams tt ON tt.tournament_name = t.name AND tt.club_id = ts.club_id
      WHERE ts.tournament_id = $1
      ORDER BY COALESCE(c.name, m.name) ASC
    `, [tournamentId]);
    return rows.map((r: any) => ({
      club_id: r.club_id,
      name: (!r.use_existing_club && r.custom_team_name) ? r.custom_team_name : r.name,
      logo_path: (!r.use_existing_club && r.custom_logo_path) ? r.custom_logo_path : r.logo_path,
      custom_team_name: r.custom_team_name,
      custom_logo_path: r.custom_logo_path,
      use_existing_club: r.use_existing_club ?? true,
      original_name: r.name,
      manager: r.manager || "Unknown",
      group_name: r.group_name
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
  useExistingClub: boolean = true,
  customLogoPath: string | null = null
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
        SET custom_team_name = $1, use_existing_club = $2, custom_logo_path = $3
        WHERE tournament_name = $4 AND club_id = $5
      `, [customTeamName, useExistingClub, customLogoPath, tourneyName, clubId]);

      if (rowCount === 0) {
        await pool.query(`
          INSERT INTO tournament_teams (tournament_name, club_id, selection_status, custom_team_name, use_existing_club, custom_logo_path)
          VALUES ($1, $2, 'selected', $3, $4, $5)
        `, [tourneyName, clubId, customTeamName, useExistingClub, customLogoPath]);
      }
    }

    // If fixtures already exist, disburse start bonus immediately
    const { rows: fixturesCount } = await pool.query('SELECT COUNT(1) as count FROM fixtures WHERE tournament_id = $1', [tournamentId]);
    if (Number(fixturesCount[0].count) > 0) {
      await applyTournamentStartBonus(tournamentId, clubId);
    }
    
    return { success: true };
  } catch (e) {
    console.error("Error adding club to tournament:", e);
    throw e;
  }
}

export async function addMultipleClubsToTournament(
  tournamentId: number, 
  clubIds: number[],
  customNames: (string | null)[] = [],
  customLogos: (string | null)[] = []
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const activeSeason = await fetchActiveSeason();
    const seasonId = activeSeason ? activeSeason.id : 6;

    const { rows: tourney } = await client.query(`SELECT name FROM tournaments WHERE id = $1`, [tournamentId]);
    if (tourney.length === 0) throw new Error("Tournament not found");
    const tourneyName = tourney[0].name;

    for (let i = 0; i < clubIds.length; i++) {
      const clubId = clubIds[i];
      const customName = customNames[i] || null;
      const customLogo = customLogos[i] || null;
      const useExistingClub = !customName;

      // Check if already added
      const { rows: exists } = await client.query(`
        SELECT 1 FROM tournament_standings 
        WHERE tournament_id = $1 AND club_id = $2
      `, [tournamentId, clubId]);
      
      if (exists.length === 0) {
        await client.query(`
          INSERT INTO tournament_standings (tournament_id, season_id, club_id, matches_played, points, goals_scored, goals_against, goal_difference)
          VALUES ($1, $2, $3, 0, 0, 0, 0, 0)
        `, [tournamentId, seasonId, clubId]);
      }

      const { rowCount } = await client.query(`
        UPDATE tournament_teams 
        SET custom_team_name = $1, use_existing_club = $2, custom_logo_path = $3
        WHERE tournament_name = $4 AND club_id = $5
      `, [customName, useExistingClub, customLogo, tourneyName, clubId]);

      if (rowCount === 0) {
        await client.query(`
          INSERT INTO tournament_teams (tournament_name, club_id, selection_status, custom_team_name, use_existing_club, custom_logo_path)
          VALUES ($1, $2, 'selected', $3, $4, $5)
        `, [tourneyName, clubId, customName, useExistingClub, customLogo]);
      }
    }

    // If fixtures already exist, disburse start bonus immediately
    const { rows: fixturesCount } = await client.query('SELECT COUNT(1) as count FROM fixtures WHERE tournament_id = $1', [tournamentId]);
    if (Number(fixturesCount[0].count) > 0) {
      for (const clubId of clubIds) {
        await applyTournamentStartBonus(tournamentId, clubId);
      }
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Error adding multiple clubs to tournament:", e);
    throw e;
  } finally {
    client.release();
  }
}

export async function removeClubFromTournament(tournamentId: number, clubId: number) {
  try {
    const { rows: tourney } = await pool.query(`SELECT name FROM tournaments WHERE id = $1`, [tournamentId]);

    // Revert starting bonus if no fixtures have been generated yet
    const { rows: fixturesCount } = await pool.query('SELECT COUNT(1) as count FROM fixtures WHERE tournament_id = $1', [tournamentId]);
    if (Number(fixturesCount[0].count) === 0) {
      await revertTournamentStartBonus(tournamentId, clubId);
    }

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

export async function assignClubToGroup(
  tournamentId: number, 
  clubId: number, 
  groupName: string | null
) {
  try {
    await pool.query(`
      UPDATE tournament_standings 
      SET group_name = $1
      WHERE tournament_id = $2 AND club_id = $3
    `, [groupName, tournamentId, clubId]);
    return { success: true };
  } catch (e) {
    console.error("Error assigning club to group:", e);
    throw e;
  }
}

export async function autoAssignGroups(tournamentId: number, numGroups: number) {
  try {
    // Fetch all standings records for this tournament
    const { rows } = await pool.query(`
      SELECT club_id FROM tournament_standings 
      WHERE tournament_id = $1
    `, [tournamentId]);

    if (rows.length === 0) return { success: true };

    const clubIds = rows.map((r: any) => r.club_id);
    
    // Shuffle clubIds for random distribution
    for (let i = clubIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [clubIds[i], clubIds[j]] = [clubIds[j], clubIds[i]];
    }

    await pool.query('BEGIN');
    for (let idx = 0; idx < clubIds.length; idx++) {
      const clubId = clubIds[idx];
      const groupLetter = String.fromCharCode(65 + (idx % numGroups)); // A, B, C, D...
      await pool.query(`
        UPDATE tournament_standings 
        SET group_name = $1
        WHERE tournament_id = $2 AND club_id = $3
      `, [groupLetter, tournamentId, clubId]);
    }
    await pool.query('COMMIT');
    return { success: true };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error auto assigning groups:", e);
    throw e;
  }
}

export async function clearAllGroups(tournamentId: number) {
  try {
    await pool.query(`
      UPDATE tournament_standings 
      SET group_name = NULL
      WHERE tournament_id = $1
    `, [tournamentId]);
    return { success: true };
  } catch (e) {
    console.error("Error clearing groups:", e);
    throw e;
  }
}

// Admin login & session management actions
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'solo-admin-secret-key-1234567890');

export async function checkIsSoloAdmin() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('solo_admin_session')?.value;
    if (!sessionCookie) return false;
    await jwtVerify(sessionCookie, SECRET_KEY);
    return true;
  } catch {
    return false;
  }
}

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

    // Automatically create RWS tournament for the new season if enabled
    if (hasRws) {
      const tourName = `RWS ${rwsYear}`;
      await pool.query(`
        INSERT INTO tournaments (name, format_type, season_id, financial_rule_id, tournament_type)
        VALUES ($1, 'Knockout', $2, NULL, 'rws')
      `, [tourName, newSeasonId]);
    }

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
        WHERE season_id = $2 AND LOWER(status) = 'active'
      `, [newSeasonId, oldSeasonId]);

      // --- Division Carryover & Team Re-assignment ---
      const { rows: oldDivisions } = await pool.query(`
        SELECT name, format_type, financial_rule_id, tournament_type, division_tier, promotion_count, relegation_count, num_groups, teams_per_group, qualified_per_group, num_teams
        FROM tournaments
        WHERE season_id = $1 AND division_tier IS NOT NULL
      `, [oldSeasonId]);

      if (oldDivisions.length > 0) {
        const divisionMap: Record<number, number> = {};
        for (const d of oldDivisions) {
          const { rows: newTourney } = await pool.query(`
            INSERT INTO tournaments (name, format_type, season_id, financial_rule_id, tournament_type, division_tier, promotion_count, relegation_count, num_groups, teams_per_group, qualified_per_group, num_teams)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
          `, [d.name, d.format_type, newSeasonId, d.financial_rule_id, d.tournament_type, d.division_tier, d.promotion_count, d.relegation_count, d.num_groups, d.teams_per_group, d.qualified_per_group, d.num_teams]);
          
          divisionMap[d.division_tier] = newTourney[0].id;
        }

        const { rows: oldSeasonRows } = await pool.query(`
          SELECT division_transition FROM seasons WHERE id = $1
        `, [oldSeasonId]);
        
        const transition = oldSeasonRows.length > 0 ? oldSeasonRows[0].division_transition : null;
        
        if (transition && Array.isArray(transition)) {
          console.log("Applying division transition plan for the new season:", transition);
          for (const item of transition) {
            const newTourneyId = divisionMap[item.divisionTier];
            if (newTourneyId) {
              await pool.query(`
                INSERT INTO tournament_standings (tournament_id, season_id, club_id, matches_played, points, goals_scored, goals_against, goal_difference)
                VALUES ($1, $2, $3, 0, 0, 0, 0, 0)
              `, [newTourneyId, newSeasonId, item.clubId]);

              const { rows: oldTeam } = await pool.query(`
                SELECT tt.selection_status, tt.custom_team_name, tt.use_existing_club, tt.custom_logo_path
                FROM tournament_teams tt
                JOIN tournaments t ON tt.tournament_name = t.name
                WHERE t.season_id = $1 AND t.division_tier IS NOT NULL AND tt.club_id = $2
                LIMIT 1
              `, [oldSeasonId, item.clubId]);

              const tourneyName = oldDivisions.find(d => d.division_tier === item.divisionTier)?.name || `Division ${item.divisionTier}`;

              if (oldTeam.length > 0) {
                const ot = oldTeam[0];
                await pool.query(`
                  INSERT INTO tournament_teams (tournament_name, club_id, selection_status, custom_team_name, use_existing_club, custom_logo_path)
                  VALUES ($1, $2, $3, $4, $5, $6)
                `, [tourneyName, item.clubId, ot.selection_status, ot.custom_team_name, ot.use_existing_club, ot.custom_logo_path]);
              } else {
                await pool.query(`
                  INSERT INTO tournament_teams (tournament_name, club_id, selection_status)
                  VALUES ($1, $2, 'selected')
                `, [tourneyName, item.clubId]);
              }
            }
          }
        } else {
          console.log("No transition plan found. Carrying over division teams exactly as-is.");
          const { rows: oldStandings } = await pool.query(`
            SELECT ts.club_id, t.division_tier, t.name as old_tourney_name
            FROM tournament_standings ts
            JOIN tournaments t ON ts.tournament_id = t.id
            WHERE t.season_id = $1 AND t.division_tier IS NOT NULL
          `, [oldSeasonId]);

          for (const s of oldStandings) {
            const newTourneyId = divisionMap[s.division_tier];
            if (newTourneyId) {
              await pool.query(`
                INSERT INTO tournament_standings (tournament_id, season_id, club_id, matches_played, points, goals_scored, goals_against, goal_difference)
                VALUES ($1, $2, $3, 0, 0, 0, 0, 0)
              `, [newTourneyId, newSeasonId, s.club_id]);

              const { rows: oldTeam } = await pool.query(`
                SELECT selection_status, custom_team_name, use_existing_club, custom_logo_path
                FROM tournament_teams
                WHERE tournament_name = $1 AND club_id = $2
                LIMIT 1
              `, [s.old_tourney_name, s.club_id]);

              const tourneyName = oldDivisions.find(d => d.division_tier === s.division_tier)?.name || `Division ${s.division_tier}`;

              if (oldTeam.length > 0) {
                const ot = oldTeam[0];
                await pool.query(`
                  INSERT INTO tournament_teams (tournament_name, club_id, selection_status, custom_team_name, use_existing_club, custom_logo_path)
                  VALUES ($1, $2, $3, $4, $5, $6)
                `, [tourneyName, s.club_id, ot.selection_status, ot.custom_team_name, ot.use_existing_club, ot.custom_logo_path]);
              } else {
                await pool.query(`
                  INSERT INTO tournament_teams (tournament_name, club_id, selection_status)
                  VALUES ($1, $2, 'selected')
                `, [tourneyName, s.club_id]);
              }
            }
          }
        }
      }
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
    await pool.query('BEGIN');

    const { rows } = await pool.query(`
      UPDATE seasons
      SET season_number = $1, has_rws = $2, rws_year = $3,
          start_bonus_rc = $4, start_bonus_rt = $5, start_bonus_voucher = $6,
          finale_bonus_rc = $7, finale_bonus_rt = $8, finale_bonus_voucher = $9
      WHERE id = $10
      RETURNING id, season_number, has_rws, rws_year, is_active
    `, [seasonNumber, hasRws, hasRws ? rwsYear : null, startRc, startRt, startVoucher, finaleRc, finaleRt, finaleVoucher, id]);

    const updatedSeason = rows[0];

    if (hasRws && rwsYear) {
      const newTourName = `RWS ${rwsYear}`;
      
      // Check if RWS tournament already exists for this season
      const { rows: tourneyRows } = await pool.query(`
        SELECT id, name FROM tournaments 
        WHERE season_id = $1 AND tournament_type = 'rws'
      `, [id]);

      if (tourneyRows.length > 0) {
        const oldTourName = tourneyRows[0].name;
        if (oldTourName !== newTourName) {
          // Rename tournament
          await pool.query(`
            UPDATE tournaments 
            SET name = $1 
            WHERE id = $2
          `, [newTourName, tourneyRows[0].id]);

          // Sync nominee references in tournament_teams
          await pool.query(`
            UPDATE tournament_teams 
            SET tournament_name = $1 
            WHERE tournament_name = $2
          `, [newTourName, oldTourName]);
        }
      } else {
        // Create new RWS tournament if it doesn't exist yet
        await pool.query(`
          INSERT INTO tournaments (name, format_type, season_id, financial_rule_id, tournament_type)
          VALUES ($1, 'Knockout', $2, NULL, 'rws')
        `, [newTourName, id]);
      }
    }

    await pool.query('COMMIT');
    return updatedSeason;
  } catch (error) {
    await pool.query('ROLLBACK');
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

export async function fetchRuleViolations(seasonId?: number) {
  try {
    let query = `
      SELECT rv.*, COALESCE(c.name, m.name) as club_name, c.logo_path as club_logo,
             f.round_number, t.name as tournament_name
      FROM rule_violations rv
      JOIN managers m ON rv.club_id = m.id
      LEFT JOIN clubs c ON m.id = c.id
      LEFT JOIN fixtures f ON rv.fixture_id = f.id
      LEFT JOIN tournaments t ON f.tournament_id = t.id
    `;
    const params: any[] = [];
    if (seasonId) {
      query += ` WHERE rv.season_id = $1`;
      params.push(seasonId);
    }
    query += ` ORDER BY rv.violation_date DESC`;
    const { rows } = await pool.query(query, params);
    return rows;
  } catch (error) {
    console.error("Error fetching rule violations:", error);
    return [];
  }
}

export async function createRuleViolation(data: {
  fixtureId: number | null;
  clubId: number;
  seasonId: number;
  notes: string;
  useTemplateFine: boolean;
  customCoins?: number;
  customTokens?: number;
  customVouchers?: number;
}) {
  try {
    await pool.query('BEGIN');

    let rc = Number(data.customCoins) || 0;
    let rt = Number(data.customTokens) || 0;
    let voucher = Number(data.customVouchers) || 0;

    if (data.useTemplateFine && data.fixtureId) {
      const { rows: ruleRows } = await pool.query(`
        SELECT r.rule_violation_fine_rc, r.rule_violation_fine_rt, r.rule_violation_fine_voucher
        FROM fixtures f
        JOIN tournaments t ON f.tournament_id = t.id
        JOIN career_financial_rules r ON t.financial_rule_id = r.id
        WHERE f.id = $1
      `, [data.fixtureId]);

      if (ruleRows.length > 0) {
        rc = Number(ruleRows[0].rule_violation_fine_rc) || 0;
        rt = Number(ruleRows[0].rule_violation_fine_rt) || 0;
        voucher = Number(ruleRows[0].rule_violation_fine_voucher) || 0;
      }
    }

    const { rows } = await pool.query(`
      INSERT INTO rule_violations (fixture_id, club_id, season_id, notes, fine_coins, fine_tokens, fine_vouchers)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [data.fixtureId, data.clubId, data.seasonId, data.notes, rc, rt, voucher]);

    await pool.query(`
      UPDATE manager_wallets 
      SET r2g_coin_balance = r2g_coin_balance - $1,
          r2g_token_balance = r2g_token_balance - $2,
          r2g_voucher_balance = r2g_voucher_balance - $3
      WHERE manager_id = $4 AND season_id = $5
    `, [rc, rt, voucher, data.clubId, data.seasonId]);

    await pool.query(`
      UPDATE manager_seasons
      SET team_expense = team_expense + $1,
          team_profit = team_profit - $1
      WHERE manager_id = $2 AND season_id = $3
    `, [rc, data.clubId, data.seasonId]);

    const desc = `Rule violation fine: ${data.notes.substring(0, 100)}`;
    const rewardType = 'rule_violation_fine';
    if (rc > 0) await logTransaction(data.clubId, data.seasonId, 'coin', -rc, rewardType, desc);
    if (rt > 0) await logTransaction(data.clubId, data.seasonId, 'token', -rt, rewardType, desc);
    if (voucher > 0) await logTransaction(data.clubId, data.seasonId, 'voucher', -voucher, rewardType, desc);

    await pool.query('COMMIT');
    return { success: true, violation: rows[0] };
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error("Error creating rule violation:", error);
    throw error;
  }
}

export async function deleteRuleViolation(id: number) {
  try {
    await pool.query('BEGIN');
    
    const { rows } = await pool.query(`SELECT * FROM rule_violations WHERE id = $1`, [id]);
    if (rows.length === 0) throw new Error("Violation not found");
    const rv = rows[0];

    await pool.query(`
      UPDATE manager_wallets 
      SET r2g_coin_balance = r2g_coin_balance + $1,
          r2g_token_balance = r2g_token_balance + $2,
          r2g_voucher_balance = r2g_voucher_balance + $3
      WHERE manager_id = $4 AND season_id = $5
    `, [rv.fine_coins, rv.fine_tokens, rv.fine_vouchers, rv.club_id, rv.season_id]);

    await pool.query(`
      UPDATE manager_seasons
      SET team_expense = team_expense - $1,
          team_profit = team_profit + $1
      WHERE manager_id = $2 AND season_id = $3
    `, [rv.fine_coins, rv.club_id, rv.season_id]);

    const desc = `Reversal of rule violation fine`;
    const rewardType = 'rule_violation_reversal';
    if (Number(rv.fine_coins) > 0) await logTransaction(rv.club_id, rv.season_id, 'coin', Number(rv.fine_coins), rewardType, desc);
    if (Number(rv.fine_tokens) > 0) await logTransaction(rv.club_id, rv.season_id, 'token', Number(rv.fine_tokens), rewardType, desc);
    if (Number(rv.fine_vouchers) > 0) await logTransaction(rv.club_id, rv.season_id, 'voucher', Number(rv.fine_vouchers), rewardType, desc);

    await pool.query(`DELETE FROM rule_violations WHERE id = $1`, [id]);

    await pool.query('COMMIT');
    return { success: true };
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error("Error deleting rule violation:", error);
    throw error;
  }
}

export async function fetchActiveSeasonDivisions() {
  try {
    const activeSeason = await fetchActiveSeason();
    if (!activeSeason) return [];
    
    const { rows } = await pool.query(`
      SELECT t.id, t.name, t.division_tier, t.promotion_count, t.relegation_count, t.financial_rule_id,
             (SELECT COUNT(1) FROM tournament_standings ts WHERE ts.tournament_id = t.id) as team_count
      FROM tournaments t
      WHERE t.season_id = $1 AND t.division_tier IS NOT NULL
      ORDER BY t.division_tier ASC
    `, [activeSeason.id]);
    return rows;
  } catch (error) {
    console.error("Error fetching active season divisions:", error);
    return [];
  }
}

export async function fetchDivisionStandings(seasonId: number) {
  try {
    const { rows: divisions } = await pool.query(`
      SELECT id, name, division_tier, promotion_count, relegation_count
      FROM tournaments
      WHERE season_id = $1 AND division_tier IS NOT NULL
      ORDER BY division_tier ASC
    `, [seasonId]);

    const result: any[] = [];
    for (const d of divisions) {
      const { rows: standings } = await pool.query(`
        SELECT ts.*, c.name as club_name, c.logo_path as club_logo,
               tt.custom_team_name, tt.custom_logo_path, tt.use_existing_club,
               m.name as manager_name
        FROM tournament_standings ts
        JOIN managers m ON ts.club_id = m.id
        LEFT JOIN clubs c ON m.id = c.id
        LEFT JOIN tournaments t ON ts.tournament_id = t.id
        LEFT JOIN tournament_teams tt ON tt.tournament_name = t.name AND tt.club_id = ts.club_id
        WHERE ts.tournament_id = $1
        ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_scored DESC
      `, [d.id]);
      
      const formattedStandings = standings.map((s: any) => ({
        club_id: s.club_id,
        name: (!s.use_existing_club && s.custom_team_name) ? s.custom_team_name : s.club_name,
        logo_path: (!s.use_existing_club && s.custom_logo_path) ? s.custom_logo_path : s.club_logo,
        custom_team_name: s.custom_team_name,
        custom_logo_path: s.custom_logo_path,
        use_existing_club: s.use_existing_club ?? true,
        manager: s.manager_name || "Unknown",
        points: s.points,
        goal_difference: s.goal_difference,
        goals_scored: s.goals_scored,
        matches_played: s.matches_played
      }));

      result.push({
        ...d,
        standings: formattedStandings
      });
    }
    return result;
  } catch (error) {
    console.error("Error fetching division standings:", error);
    return [];
  }
}

export async function saveDivisionTransition(seasonId: number, transition: any[]) {
  try {
    await pool.query(`
      UPDATE seasons
      SET division_transition = $1
      WHERE id = $2
    `, [JSON.stringify(transition), seasonId]);
    return { success: true };
  } catch (error) {
    console.error("Error saving division transition:", error);
    throw error;
  }
}

export async function fetchTournamentPositionRewardsPreview(tournamentId: number, seasonId: number) {
  try {
    const standings = await fetchTournamentStandings(tournamentId);
    
    const { rows: ruleRows } = await pool.query(`
      SELECT r.*
      FROM tournaments t
      JOIN career_financial_rules r ON t.financial_rule_id = r.id
      WHERE t.id = $1
    `, [tournamentId]);

    const rule = ruleRows.length > 0 ? ruleRows[0] : null;
    const positionRewards = rule && Array.isArray(rule.position_rewards) ? rule.position_rewards : [];

    const previewList = [];
    for (let i = 0; i < standings.length; i++) {
      const row = standings[i];
      const rank = i + 1;
      
      let rc = 0, rt = 0, voucher = 0;

      // Try matching position from rules
      const customReward = positionRewards.find((item: any) => Number(item.position) === rank);
      if (customReward) {
        rc = Number(customReward.rc) || 0;
        rt = Number(customReward.rt) || 0;
        voucher = Number(customReward.voucher) || 0;
      } else {
        // Fallback to hardcoded columns
        if (rank === 1 && rule) {
          rc = Number(rule.tournament_bonus_rc) || 0;
          rt = Number(rule.tournament_bonus_rt) || 0;
          voucher = Number(rule.tournament_bonus_voucher) || 0;
        } else if (rank === 2 && rule) {
          rc = Number(rule.position_2nd_bonus_rc) || 0;
          rt = Number(rule.position_2nd_bonus_rt) || 0;
          voucher = Number(rule.position_2nd_bonus_voucher) || 0;
        } else if (rank === 3 && rule) {
          rc = Number(rule.position_3rd_bonus_rc) || 0;
          rt = Number(rule.position_3rd_bonus_rt) || 0;
          voucher = Number(rule.position_3rd_bonus_voucher) || 0;
        } else if (rank === 4 && rule) {
          rc = Number(rule.position_4th_bonus_rc) || 0;
          rt = Number(rule.position_4th_bonus_rt) || 0;
          voucher = Number(rule.position_4th_bonus_voucher) || 0;
        }
      }

      // Check if already disbursed
      const { rows: existing } = await pool.query(`
        SELECT 1 FROM match_bonuses_given
        WHERE fixture_id = $1 AND club_id = $2 AND reward_type = $3
      `, [-tournamentId, row.club_id, `tournament_standings_pos_${rank}_${tournamentId}`]);
      const disbursed = existing.length > 0;

      previewList.push({
        club_id: row.club_id,
        club_name: row.club_name,
        club_logo: row.club_logo,
        manager: row.manager || "Unknown",
        rank,
        rc,
        rt,
        voucher,
        disbursed
      });
    }

    return previewList;
  } catch (error) {
    console.error("Error fetching tournament standings rewards preview:", error);
    return [];
  }
}

export async function disburseTournamentPositionRewards(tournamentId: number, seasonId: number) {
  try {
    const preview = await fetchTournamentPositionRewardsPreview(tournamentId, seasonId);
    const toDisburse = preview.filter(p => !p.disbursed && (p.rc > 0 || p.rt > 0 || p.voucher > 0));
    
    if (toDisburse.length === 0) {
      return { success: true, disbursedCount: 0 };
    }

    await pool.query('BEGIN');
    for (const item of toDisburse) {
      // 1. Credit wallet
      await pool.query(`
        UPDATE manager_wallets 
        SET r2g_coin_balance = r2g_coin_balance + $1,
            r2g_token_balance = r2g_token_balance + $2,
            r2g_voucher_balance = r2g_voucher_balance + $3
        WHERE manager_id = $4 AND season_id = $5
      `, [item.rc, item.rt, item.voucher, item.club_id, seasonId]);

      // 2. Add to income/profit
      await pool.query(`
        UPDATE manager_seasons
        SET team_income = team_income + $1,
            team_profit = team_profit + $1
        WHERE manager_id = $2 AND season_id = $3
      `, [item.rc, item.club_id, seasonId]);

      // 3. Log transactions
      const rewardType = `tournament_standings_pos_${item.rank}_${tournamentId}`;
      if (item.rc > 0) {
        await logTransaction(item.club_id, seasonId, 'coin', item.rc, 'tournament_pos_reward', `Rank #${item.rank} finish reward in ${item.club_name}`);
      }
      if (item.rt > 0) {
        await logTransaction(item.club_id, seasonId, 'token', item.rt, 'tournament_pos_reward', `Rank #${item.rank} finish reward in ${item.club_name}`);
      }
      if (item.voucher > 0) {
        await logTransaction(item.club_id, seasonId, 'voucher', item.voucher, 'tournament_pos_reward', `Rank #${item.rank} finish reward in ${item.club_name}`);
      }

      // 4. Log disburse to prevent duplicate payout
      await pool.query(`
        INSERT INTO match_bonuses_given (fixture_id, club_id, reward_type, coins_given, tokens_given, vouchers_given)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [-tournamentId, item.club_id, rewardType, item.rc, item.rt, item.voucher]);
    }
    await pool.query('COMMIT');
    return { success: true, disbursedCount: toDisburse.length };
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error("Error disbursing tournament standings rewards:", error);
    throw error;
  }
}

export async function fetchSeasonFinaleRewardsPreview(seasonId: number, tournamentId?: number) {
  try {
    let targetTourneyId = tournamentId;
    if (!targetTourneyId) {
      const { rows: tourneys } = await pool.query(`
        SELECT id FROM tournaments 
        WHERE season_id = $1 AND (division_tier = 1 OR division_tier IS NOT NULL)
        ORDER BY division_tier ASC LIMIT 1
      `, [seasonId]);
      if (tourneys.length > 0) {
        targetTourneyId = tourneys[0].id;
      }
    }

    if (!targetTourneyId) {
      // Fallback to any tournament in this season
      const { rows: tourneys } = await pool.query(`
        SELECT id FROM tournaments WHERE season_id = $1 LIMIT 1
      `, [seasonId]);
      if (tourneys.length > 0) {
        targetTourneyId = tourneys[0].id;
      }
    }

    if (!targetTourneyId) return [];

    const standings = await fetchTournamentStandings(targetTourneyId);
    
    // Fetch season finale bonus configs
    const { rows: seasonRows } = await pool.query(`
      SELECT finale_bonus_rc, finale_bonus_rt, finale_bonus_voucher
      FROM seasons WHERE id = $1
    `, [seasonId]);
    const seasonData = seasonRows.length > 0 ? seasonRows[0] : null;

    const { rows: ruleRows } = await pool.query(`
      SELECT r.*
      FROM tournaments t
      JOIN career_financial_rules r ON t.financial_rule_id = r.id
      WHERE t.id = $1
    `, [targetTourneyId]);
    const rule = ruleRows.length > 0 ? ruleRows[0] : null;

    const previewList = [];
    for (let i = 0; i < standings.length; i++) {
      const row = standings[i];
      const rank = i + 1;
      
      let rc = 0, rt = 0, voucher = 0;

      if (rank === 1) {
        // Champion receives both season and template season champion rewards
        rc = (Number(seasonData?.finale_bonus_rc) || 0) + (Number(rule?.season_bonus_rc) || 0);
        rt = (Number(seasonData?.finale_bonus_rt) || 0) + (Number(rule?.season_bonus_rt) || 0);
        voucher = (Number(seasonData?.finale_bonus_voucher) || 0) + (Number(rule?.season_bonus_voucher) || 0);
      }

      // Check if already disbursed
      const { rows: existing } = await pool.query(`
        SELECT 1 FROM match_bonuses_given
        WHERE fixture_id = $1 AND club_id = $2 AND reward_type = $3
      `, [-seasonId, row.club_id, `season_finale_pos_${rank}_${seasonId}`]);
      const disbursed = existing.length > 0;

      previewList.push({
        club_id: row.club_id,
        club_name: row.club_name,
        club_logo: row.club_logo,
        manager: row.manager || "Unknown",
        rank,
        rc,
        rt,
        voucher,
        disbursed
      });
    }

    return previewList;
  } catch (error) {
    console.error("Error fetching season finale rewards preview:", error);
    return [];
  }
}

export async function disburseSeasonFinaleRewards(seasonId: number, tournamentId?: number) {
  try {
    const preview = await fetchSeasonFinaleRewardsPreview(seasonId, tournamentId);
    const toDisburse = preview.filter(p => !p.disbursed && (p.rc > 0 || p.rt > 0 || p.voucher > 0));
    
    if (toDisburse.length === 0) {
      return { success: true, disbursedCount: 0 };
    }

    await pool.query('BEGIN');
    for (const item of toDisburse) {
      // 1. Credit wallet
      await pool.query(`
        UPDATE manager_wallets 
        SET r2g_coin_balance = r2g_coin_balance + $1,
            r2g_token_balance = r2g_token_balance + $2,
            r2g_voucher_balance = r2g_voucher_balance + $3
        WHERE manager_id = $4 AND season_id = $5
      `, [item.rc, item.rt, item.voucher, item.club_id, seasonId]);

      // 2. Add to session rewards / profit
      await pool.query(`
        UPDATE manager_seasons
        SET session_rewards = session_rewards + $1,
            team_profit = team_profit + $1
        WHERE manager_id = $2 AND season_id = $3
      `, [item.rc, item.club_id, seasonId]);

      // 3. Log transactions
      const rewardType = `season_finale_pos_${item.rank}_${seasonId}`;
      if (item.rc > 0) {
        await logTransaction(item.club_id, seasonId, 'coin', item.rc, 'season_finale_reward', `Season finale finish Rank #${item.rank} in ${item.club_name}`);
      }
      if (item.rt > 0) {
        await logTransaction(item.club_id, seasonId, 'token', item.rt, 'season_finale_reward', `Season finale finish Rank #${item.rank} in ${item.club_name}`);
      }
      if (item.voucher > 0) {
        await logTransaction(item.club_id, seasonId, 'voucher', item.voucher, 'season_finale_reward', `Season finale finish Rank #${item.rank} in ${item.club_name}`);
      }

      // 4. Log disburse to prevent duplicate payout
      await pool.query(`
        INSERT INTO match_bonuses_given (fixture_id, club_id, reward_type, coins_given, tokens_given, vouchers_given)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [-seasonId, item.club_id, rewardType, item.rc, item.rt, item.voucher]);
    }
    await pool.query('COMMIT');
    return { success: true, disbursedCount: toDisburse.length };
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error("Error disbursing season standings rewards:", error);
    throw error;
  }
}

export async function fetchFreeAgents() {
  try {
    const activeSeason = await fetchActiveSeason();
    const seasonId = activeSeason ? activeSeason.id : 6;
    
    const { rows } = await pool.query(`
      SELECT p.id, p.name, p.position, p.card_type as star, p.base_value as value, p.image_path as imagepath, p.is_suspended
      FROM players p
      WHERE p.id NOT IN (
        SELECT player_id 
        FROM player_contracts 
        WHERE LOWER(status) = 'active' AND season_id = $1
      )
      ORDER BY p.name ASC
    `, [seasonId]);
    return rows.map((p: any) => ({
      id: p.id,
      name: p.name,
      position: p.position || '',
      value: Number(p.value) || 0,
      star: p.star || '3-star-standard',
      imagePath: p.imagepath || `/assets/images/players/${p.id}.png`,
      isSuspended: p.is_suspended || false
    }));
  } catch (e) {
    console.error("Error fetching free agents:", e);
    return [];
  }
}

export async function fetchAuctions() {
  try {
    const activeSeason = await fetchActiveSeason();
    const seasonId = activeSeason ? activeSeason.id : 6;
    const { rows } = await pool.query(`
      SELECT a.*, p.name as player_name, p.position, p.card_type as star, COALESCE(c.name, m.name) as club_name
      FROM auctions a
      JOIN players p ON a.player_id = p.id
      LEFT JOIN managers m ON a.bidding_club_id = m.id
      LEFT JOIN clubs c ON m.id = c.id
      WHERE a.season_id = $1
      ORDER BY a.id DESC
    `, [seasonId]);
    return rows;
  } catch (e) {
    console.error("Error fetching auctions:", e);
    return [];
  }
}

export async function createAuction(playerId: number, reservePrice: number) {
  try {
    const activeSeason = await fetchActiveSeason();
    const seasonId = activeSeason ? activeSeason.id : 6;
    const { rows } = await pool.query(`
      INSERT INTO auctions (player_id, season_id, reserve_price, status, updated_at)
      VALUES ($1, $2, $3, 'pending', NOW())
      RETURNING *
    `, [playerId, seasonId, reservePrice]);
    return rows[0];
  } catch (e) {
    console.error("Error creating auction:", e);
    throw e;
  }
}

export async function completeAuction(auctionId: number, clubId: number, winningBid: number, expireSeason: string) {
  try {
    const activeSeason = await fetchActiveSeason();
    const seasonId = activeSeason ? activeSeason.id : 6;
    const seasonNumber = activeSeason ? activeSeason.season_number : 9;

    await pool.query('BEGIN');

    const { rows: aucRows } = await pool.query('SELECT player_id FROM auctions WHERE id = $1', [auctionId]);
    if (aucRows.length === 0) throw new Error("Auction not found");
    const playerId = aucRows[0].player_id;

    await pool.query(`
      UPDATE manager_wallets
      SET r2g_coin_balance = r2g_coin_balance - $1
      WHERE manager_id = $2 AND season_id = $3
    `, [winningBid, clubId, seasonId]);

    const { rows: pRows } = await pool.query('SELECT name FROM players WHERE id = $1', [playerId]);
    const pName = pRows.length > 0 ? pRows[0].name : `Player #${playerId}`;
    await logTransaction(clubId, seasonId, 'coin', -winningBid, 'auction_buy', `Auction win: signed ${pName} for ${winningBid} Coins`);

    await pool.query(`
      UPDATE player_contracts SET status = 'inactive' WHERE player_id = $1 AND season_id = $2
    `, [playerId, seasonId]);

    const cleanExpire = (expireSeason || '').replace(/[^\d.]/g, '');
    const salary = Number(winningBid) * 0.05;
    await pool.query(`
      INSERT INTO player_contracts (player_id, season_id, current_club_id, signed_value, salary, start_season, expire_season, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
    `, [playerId, seasonId, clubId, winningBid, salary, seasonNumber.toString(), cleanExpire]);

    await pool.query(`
      UPDATE auctions
      SET bidding_club_id = $1, winning_bid_amount = $2, status = 'completed', updated_at = NOW()
      WHERE id = $3
    `, [clubId, winningBid, auctionId]);

    await pool.query('COMMIT');
    return { success: true };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error completing auction:", e);
    throw e;
  }
}

export async function executeTransferBuy(clubId: number, playerId: number, price: number, timing: 'start' | 'mid') {
  try {
    const activeSeason = await fetchActiveSeason();
    const seasonId = activeSeason ? activeSeason.id : 6;
    const seasonNumber = activeSeason ? activeSeason.season_number : 9;

    await pool.query('BEGIN');

    await pool.query(`
      UPDATE manager_wallets
      SET r2g_coin_balance = r2g_coin_balance - $1
      WHERE manager_id = $2 AND season_id = $3
    `, [price, clubId, seasonId]);

    const { rows: pRows } = await pool.query('SELECT name FROM players WHERE id = $1', [playerId]);
    const pName = pRows.length > 0 ? pRows[0].name : `Player #${playerId}`;
    await logTransaction(clubId, seasonId, 'coin', -price, 'transfer_buy', `Transfer buy: signed ${pName} for ${price} Coins`);

    await pool.query(`
      UPDATE player_contracts SET status = 'inactive' WHERE player_id = $1 AND season_id = $2
    `, [playerId, seasonId]);

    const startSeasonValue = timing === 'mid' ? Number(seasonNumber) + 0.5 : Number(seasonNumber);
    const expireSeasonValue = startSeasonValue + 2.0;
    const salary = Number(price) * 0.05;

    await pool.query(`
      INSERT INTO player_contracts (player_id, season_id, current_club_id, signed_value, salary, start_season, expire_season, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
    `, [playerId, seasonId, clubId, price, salary, startSeasonValue.toString(), expireSeasonValue.toString()]);

    await pool.query('COMMIT');
    return { success: true };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error executing buy transfer:", e);
    throw e;
  }
}

export async function executeTransferSale(clubId: number, playerId: number, price: number, buyingClubId: number) {
  try {
    const activeSeason = await fetchActiveSeason();
    const seasonId = activeSeason ? activeSeason.id : 6;
    const seasonNumber = activeSeason ? activeSeason.season_number : 9;

    await pool.query('BEGIN');

    // 1. Verify buying club exists and has enough coins
    const { rows: walletRows } = await pool.query(`
      SELECT r2g_coin_balance FROM manager_wallets
      WHERE manager_id = $1 AND season_id = $2
    `, [buyingClubId, seasonId]);

    if (walletRows.length === 0) {
      throw new Error("Buying club does not have a wallet for this season.");
    }

    const buyingBalance = Number(walletRows[0].r2g_coin_balance) || 0;
    if (buyingBalance < price) {
      throw new Error("Buying club has insufficient balance.");
    }

    // 2. Fetch player and club names for transactions logging
    const { rows: pRows } = await pool.query('SELECT name FROM players WHERE id = $1', [playerId]);
    const pName = pRows.length > 0 ? pRows[0].name : `Player #${playerId}`;

    const { rows: clubRows } = await pool.query('SELECT id, name FROM clubs WHERE id IN ($1, $2)', [clubId, buyingClubId]);
    const clubMap = Object.fromEntries(clubRows.map((r: any) => [r.id, r.name]));
    const sellingClubName = clubMap[clubId] || `Club #${clubId}`;
    const buyingClubName = clubMap[buyingClubId] || `Club #${buyingClubId}`;

    // 3. Deduct coins from buying club
    await pool.query(`
      UPDATE manager_wallets
      SET r2g_coin_balance = r2g_coin_balance - $1
      WHERE manager_id = $2 AND season_id = $3
    `, [price, buyingClubId, seasonId]);

    // 4. Add coins to selling club
    await pool.query(`
      UPDATE manager_wallets
      SET r2g_coin_balance = r2g_coin_balance + $1
      WHERE manager_id = $2 AND season_id = $3
    `, [price, clubId, seasonId]);

    // 5. Log transactions
    await logTransaction(clubId, seasonId, 'coin', price, 'transfer_sale', `Transfer sell: sold ${pName} to ${buyingClubName} for ${price} Coins`);
    await logTransaction(buyingClubId, seasonId, 'coin', -price, 'transfer_buy', `Transfer buy: bought ${pName} from ${sellingClubName} for ${price} Coins`);

    // 6. Deactivate old contract and retrieve the expire_season
    const currentSeasonStr = seasonNumber.toString();
    const { rows: oldContractRows } = await pool.query(`
      UPDATE player_contracts 
      SET status = 'inactive', expire_season = $1
      WHERE player_id = $2 AND current_club_id = $3 AND LOWER(status) = 'active' AND season_id = $4
      RETURNING expire_season
    `, [currentSeasonStr, playerId, clubId, seasonId]);

    if (oldContractRows.length === 0) {
      throw new Error("Active contract for the player not found.");
    }
    const expireSeason = oldContractRows[0].expire_season;

    // 7. Insert new active contract for buying club carrying over expire_season
    const cleanExpire = (expireSeason || '').replace(/[^\d.]/g, '');
    const salary = Number(price) * 0.05;
    await pool.query(`
      INSERT INTO player_contracts (player_id, season_id, current_club_id, signed_value, salary, start_season, expire_season, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
    `, [playerId, seasonId, buyingClubId, price, salary, currentSeasonStr, cleanExpire]);

    await pool.query('COMMIT');
    return { success: true };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error executing sale transfer:", e);
    throw e;
  }
}

export async function executeBulkTransfers(transfers: { sellingClubId: number; playerId: number; price: number; buyingClubId: number }[]) {
  try {
    const activeSeason = await fetchActiveSeason();
    const seasonId = activeSeason ? activeSeason.id : 6;
    const seasonNumber = activeSeason ? activeSeason.season_number : 9;

    await pool.query('BEGIN');

    for (const t of transfers) {
      const { sellingClubId, playerId, price, buyingClubId } = t;

      // 1. Verify buying club exists and has enough coins
      const { rows: walletRows } = await pool.query(`
        SELECT r2g_coin_balance FROM manager_wallets
        WHERE manager_id = $1 AND season_id = $2
      `, [buyingClubId, seasonId]);

      if (walletRows.length === 0) {
        throw new Error(`Buying club does not have a wallet for this season.`);
      }

      const buyingBalance = Number(walletRows[0].r2g_coin_balance) || 0;
      if (buyingBalance < price) {
        throw new Error(`Buying club has insufficient balance.`);
      }

      // 2. Fetch player and club names for transactions logging
      const { rows: pRows } = await pool.query('SELECT name FROM players WHERE id = $1', [playerId]);
      const pName = pRows.length > 0 ? pRows[0].name : `Player #${playerId}`;

      const { rows: clubRows } = await pool.query('SELECT id, name FROM clubs WHERE id IN ($1, $2)', [sellingClubId, buyingClubId]);
      const clubMap = Object.fromEntries(clubRows.map((r: any) => [r.id, r.name]));
      const sellingClubName = clubMap[sellingClubId] || `Club #${sellingClubId}`;
      const buyingClubName = clubMap[buyingClubId] || `Club #${buyingClubId}`;

      // 3. Deactivate old contract and retrieve the expire_season & signed_value first to validate price
      const currentSeasonStr = seasonNumber.toString();
      const { rows: oldContractRows } = await pool.query(`
        UPDATE player_contracts 
        SET status = 'inactive', expire_season = $1
        WHERE player_id = $2 AND current_club_id = $3 AND LOWER(status) = 'active' AND season_id = $4
        RETURNING expire_season, signed_value
      `, [currentSeasonStr, playerId, sellingClubId, seasonId]);

      if (oldContractRows.length === 0) {
        throw new Error(`Active contract for ${pName} not found at selling club.`);
      }
      const expireSeason = oldContractRows[0].expire_season;
      const prevSignedValue = Number(oldContractRows[0].signed_value) || 0;

      // Validation 1: No odd numbers allowed
      if (price % 2 !== 0) {
        throw new Error(`Transfer price for ${pName} must be an even number. Odd values like ${price} are not allowed.`);
      }

      // Validation 2: Price must be between 50% and 200% of current contract value
      const minPrice = 0.5 * prevSignedValue;
      const maxPrice = 2.0 * prevSignedValue;
      if (price < minPrice || price > maxPrice) {
        throw new Error(`Transfer price for ${pName} must be between 50% (${minPrice}) and 200% (${maxPrice}) of current value (${prevSignedValue}).`);
      }

      // Calculate new signed contract value (highest of current contract value and sale price)
      const newSignedValue = Math.max(prevSignedValue, price);

      // 4. Deduct coins from buying club
      await pool.query(`
        UPDATE manager_wallets
        SET r2g_coin_balance = r2g_coin_balance - $1
        WHERE manager_id = $2 AND season_id = $3
      `, [price, buyingClubId, seasonId]);

      // 5. Add coins to selling club
      await pool.query(`
        UPDATE manager_wallets
        SET r2g_coin_balance = r2g_coin_balance + $1
        WHERE manager_id = $2 AND season_id = $3
      `, [price, sellingClubId, seasonId]);

      // 6. Log transactions
      await logTransaction(sellingClubId, seasonId, 'coin', price, 'transfer_sale', `Transfer sell: sold ${pName} to ${buyingClubName} for ${price} Coins`);
      await logTransaction(buyingClubId, seasonId, 'coin', -price, 'transfer_buy', `Transfer buy: bought ${pName} from ${sellingClubName} for ${price} Coins`);

      // 7. Insert new active contract for buying club carrying over expire_season and using newSignedValue
      const cleanExpire = (expireSeason || '').replace(/[^\d.]/g, '');
      const salary = Number(newSignedValue) * 0.05;
      await pool.query(`
        INSERT INTO player_contracts (player_id, season_id, current_club_id, signed_value, salary, start_season, expire_season, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      `, [playerId, seasonId, buyingClubId, newSignedValue, salary, currentSeasonStr, cleanExpire]);
    }

    await pool.query('COMMIT');
    return { success: true };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error executing bulk transfers:", e);
    throw e;
  }
}

export async function executeTransferSwap(
  clubAId: number,
  playerAId: number,
  clubBId: number,
  playerBId: number,
  cashAdjustmentAtoB: number
) {
  try {
    const activeSeason = await fetchActiveSeason();
    const seasonId = activeSeason ? activeSeason.id : 6;

    await pool.query('BEGIN');

    const { rows: nameRows } = await pool.query('SELECT id, name FROM players WHERE id IN ($1, $2)', [playerAId, playerBId]);
    const nameMap = Object.fromEntries(nameRows.map((r: any) => [r.id, r.name]));
    const playerAName = nameMap[playerAId] || `Player #${playerAId}`;
    const playerBName = nameMap[playerBId] || `Player #${playerBId}`;

    const { rows: clubRows } = await pool.query('SELECT id, name FROM clubs WHERE id IN ($1, $2)', [clubAId, clubBId]);
    const clubMap = Object.fromEntries(clubRows.map((r: any) => [r.id, r.name]));
    const clubAName = clubMap[clubAId] || `Club #${clubAId}`;
    const clubBName = clubMap[clubBId] || `Club #${clubBId}`;

    if (cashAdjustmentAtoB !== 0) {
      await pool.query(`
        UPDATE manager_wallets
        SET r2g_coin_balance = r2g_coin_balance - $1
        WHERE manager_id = $2 AND season_id = $3
      `, [cashAdjustmentAtoB, clubAId, seasonId]);

      await pool.query(`
        UPDATE manager_wallets
        SET r2g_coin_balance = r2g_coin_balance + $1
        WHERE manager_id = $2 AND season_id = $3
      `, [cashAdjustmentAtoB, clubBId, seasonId]);

      await logTransaction(clubAId, seasonId, 'coin', -cashAdjustmentAtoB, 'swap_adjustment', `Paid swap cash adjustment to ${clubBName}`);
      await logTransaction(clubBId, seasonId, 'coin', cashAdjustmentAtoB, 'swap_adjustment', `Received swap cash adjustment from ${clubAName}`);
    }

    // Fetch active contract for Player A at Club A
    const { rows: contractARows } = await pool.query(`
      SELECT * FROM player_contracts 
      WHERE player_id = $1 AND current_club_id = $2 AND LOWER(status) = 'active' AND season_id = $3
    `, [playerAId, clubAId, seasonId]);

    // Fetch active contract for Player B at Club B
    const { rows: contractBRows } = await pool.query(`
      SELECT * FROM player_contracts 
      WHERE player_id = $1 AND current_club_id = $2 AND LOWER(status) = 'active' AND season_id = $3
    `, [playerBId, clubBId, seasonId]);

    if (contractARows.length === 0 || contractBRows.length === 0) {
      throw new Error("One or both players do not have an active contract in this club.");
    }

    const contractA = contractARows[0];
    const contractB = contractBRows[0];
    const currentSeasonStr = (activeSeason?.season_number || 9).toString();

    // Auto swap value = max of the two values
    const valA = Number(contractA.signed_value) || 0;
    const valB = Number(contractB.signed_value) || 0;
    const swapValue = Math.max(valA, valB);

    // Terminate old contracts and set expire_season to swap moment
    await pool.query(`
      UPDATE player_contracts
      SET status = 'inactive', expire_season = $1
      WHERE id = $2
    `, [currentSeasonStr, contractA.id]);

    await pool.query(`
      UPDATE player_contracts
      SET status = 'inactive', expire_season = $1
      WHERE id = $2
    `, [currentSeasonStr, contractB.id]);

    // Create new contracts at swapped clubs
    const salaryA = Number(swapValue) * 0.05;
    await pool.query(`
      INSERT INTO player_contracts (player_id, season_id, current_club_id, signed_value, salary, start_season, expire_season, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
    `, [playerAId, seasonId, clubBId, swapValue, salaryA, currentSeasonStr, contractA.expire_season]);

    const salaryB = Number(swapValue) * 0.05;
    await pool.query(`
      INSERT INTO player_contracts (player_id, season_id, current_club_id, signed_value, salary, start_season, expire_season, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
    `, [playerBId, seasonId, clubAId, swapValue, salaryB, currentSeasonStr, contractB.expire_season]);

    await logTransaction(clubAId, seasonId, 'coin', 0, 'swap_player', `Swapped out ${playerAName} and received ${playerBName}`);
    await logTransaction(clubBId, seasonId, 'coin', 0, 'swap_player', `Swapped out ${playerBName} and received ${playerAName}`);

    await pool.query('COMMIT');
    return { success: true };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error executing swap transfer:", e);
    throw e;
  }
}

export async function executeBulkSwaps(swaps: {
  clubAId: number;
  playerAId: number;
  clubBId: number;
  playerBId: number;
  cashAdjustmentAtoB: number;
}[]) {
  try {
    const activeSeason = await fetchActiveSeason();
    const seasonId = activeSeason ? activeSeason.id : 6;
    const currentSeasonStr = (activeSeason?.season_number || 9).toString();

    await pool.query('BEGIN');

    for (const s of swaps) {
      const { clubAId, playerAId, clubBId, playerBId, cashAdjustmentAtoB } = s;

      const { rows: nameRows } = await pool.query('SELECT id, name FROM players WHERE id IN ($1, $2)', [playerAId, playerBId]);
      const nameMap = Object.fromEntries(nameRows.map((r: any) => [r.id, r.name]));
      const playerAName = nameMap[playerAId] || `Player #${playerAId}`;
      const playerBName = nameMap[playerBId] || `Player #${playerBId}`;

      const { rows: clubRows } = await pool.query('SELECT id, name FROM clubs WHERE id IN ($1, $2)', [clubAId, clubBId]);
      const clubMap = Object.fromEntries(clubRows.map((r: any) => [r.id, r.name]));
      const clubAName = clubMap[clubAId] || `Club #${clubAId}`;
      const clubBName = clubMap[clubBId] || `Club #${clubBId}`;

      if (cashAdjustmentAtoB !== 0) {
        await pool.query(`
          UPDATE manager_wallets
          SET r2g_coin_balance = r2g_coin_balance - $1
          WHERE manager_id = $2 AND season_id = $3
        `, [cashAdjustmentAtoB, clubAId, seasonId]);

        await pool.query(`
          UPDATE manager_wallets
          SET r2g_coin_balance = r2g_coin_balance + $1
          WHERE manager_id = $2 AND season_id = $3
        `, [cashAdjustmentAtoB, clubBId, seasonId]);

        await logTransaction(clubAId, seasonId, 'coin', -cashAdjustmentAtoB, 'swap_adjustment', `Paid swap cash adjustment to ${clubBName}`);
        await logTransaction(clubBId, seasonId, 'coin', cashAdjustmentAtoB, 'swap_adjustment', `Received swap cash adjustment from ${clubAName}`);
      }

      // Fetch active contract for Player A at Club A
      const { rows: contractARows } = await pool.query(`
        SELECT * FROM player_contracts 
        WHERE player_id = $1 AND current_club_id = $2 AND LOWER(status) = 'active' AND season_id = $3
      `, [playerAId, clubAId, seasonId]);

      // Fetch active contract for Player B at Club B
      const { rows: contractBRows } = await pool.query(`
        SELECT * FROM player_contracts 
        WHERE player_id = $1 AND current_club_id = $2 AND LOWER(status) = 'active' AND season_id = $3
      `, [playerBId, clubBId, seasonId]);

      if (contractARows.length === 0 || contractBRows.length === 0) {
        throw new Error("One or both players do not have an active contract in this club.");
      }

      const contractA = contractARows[0];
      const contractB = contractBRows[0];

      // Auto swap value = max of the two values
      const valA = Number(contractA.signed_value) || 0;
      const valB = Number(contractB.signed_value) || 0;
      const swapValue = Math.max(valA, valB);

      // Terminate old contracts and set expire_season to swap moment
      await pool.query(`
        UPDATE player_contracts
        SET status = 'inactive', expire_season = $1
        WHERE id = $2
      `, [currentSeasonStr, contractA.id]);

      await pool.query(`
        UPDATE player_contracts
        SET status = 'inactive', expire_season = $1
        WHERE id = $2
      `, [currentSeasonStr, contractB.id]);

      // Create new contracts at swapped clubs
      const salaryA = Number(swapValue) * 0.05;
      await pool.query(`
        INSERT INTO player_contracts (player_id, season_id, current_club_id, signed_value, salary, start_season, expire_season, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      `, [playerAId, seasonId, clubBId, swapValue, salaryA, currentSeasonStr, contractA.expire_season]);

      const salaryB = Number(swapValue) * 0.05;
      await pool.query(`
        INSERT INTO player_contracts (player_id, season_id, current_club_id, signed_value, salary, start_season, expire_season, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      `, [playerBId, seasonId, clubAId, swapValue, salaryB, currentSeasonStr, contractB.expire_season]);

      await logTransaction(clubAId, seasonId, 'coin', 0, 'swap_player', `Swapped out ${playerAName} and received ${playerBName}`);
      await logTransaction(clubBId, seasonId, 'coin', 0, 'swap_player', `Swapped out ${playerBName} and received ${playerAName}`);
    }

    await pool.query('COMMIT');
    return { success: true };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error executing bulk swaps:", e);
    throw e;
  }
}

export async function fetchPlayersToBeReleased(seasonNumber: number) {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.name AS player_name,
        p.position,
        pc.expire_season,
        pc.start_season,
        c.name AS club_name,
        c.logo_path AS club_logo,
        CASE
          WHEN CAST(NULLIF(regexp_replace(pc.expire_season, '[^0-9.]', '', 'g'), '') AS NUMERIC) = $1 + 0.5
            THEN 'mid'
          ELSE 'start'
        END AS contract_type
      FROM player_contracts pc
      JOIN players p ON pc.player_id = p.id
      LEFT JOIN clubs c ON pc.current_club_id = c.id
      WHERE LOWER(pc.status) = 'active'
        AND CAST(NULLIF(regexp_replace(pc.expire_season, '[^0-9.]', '', 'g'), '') AS NUMERIC) <= $1 + 0.5
      ORDER BY c.name, p.position, p.name
    `, [seasonNumber]);
    return { success: true, players: rows };
  } catch (e) {
    console.error("Error fetching players to be released:", e);
    throw e;
  }
}

export async function releaseExpiredContractsForSeason(seasonNumber: number) {
  try {
    const { rowCount } = await pool.query(`
      UPDATE player_contracts
      SET status = 'inactive'
      WHERE LOWER(status) = 'active'
        AND CAST(NULLIF(regexp_replace(expire_season, '[^0-9.]', '', 'g'), '') AS NUMERIC) <= $1
    `, [seasonNumber]);
    return { success: true, releasedCount: rowCount };
  } catch (e) {
    console.error("Error releasing expired contracts:", e);
    throw e;
  }
}

export async function releaseMidSeasonContracts(seasonNumber: number) {
  try {
    const { rowCount } = await pool.query(`
      UPDATE player_contracts
      SET status = 'inactive'
      WHERE LOWER(status) = 'active'
        AND CAST(NULLIF(regexp_replace(expire_season, '[^0-9.]', '', 'g'), '') AS NUMERIC) = $1 + 0.5
    `, [seasonNumber]);
    return { success: true, releasedCount: rowCount };
  } catch (e) {
    console.error("Error releasing mid-season contracts:", e);
    throw e;
  }
}

export async function fetchPlayerCombinedStats(identifier: string | number) {
  try {
    let queryParam: any = identifier;
    let queryField = 'm.id';
    
    // Check if it is a number or numeric string
    const isNumeric = !isNaN(Number(identifier.toString().trim()));
    if (isNumeric) {
      queryParam = parseInt(identifier.toString(), 10);
      queryField = 'm.id';
    } else if (identifier.toString().trim().toUpperCase().startsWith('R2GP')) {
      queryParam = identifier.toString().trim().toUpperCase();
      queryField = 'm.r2g_id';
    } else {
      queryParam = identifier.toString().trim();
      queryField = 'LOWER(m.name)';
    }

    const valuePlaceholder = queryField === 'LOWER(m.name)' ? 'LOWER($1)' : '$1';

    // 1. Fetch manager details
    const { rows: managerRows } = await pool.query(`
      SELECT m.id, m.name, m.avatar_path, m.r2g_id, m.is_active, m.mob_no, m.place,
             c.name as club_name, c.logo_path as club_logo, c.id as club_id,
             mw.overall_rating, mw.star_rating,
             mw.r2g_coin_balance, mw.r2g_token_balance, mw.r2g_voucher_balance
      FROM managers m
      LEFT JOIN manager_wallets mw ON m.id = mw.manager_id AND mw.season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
      LEFT JOIN clubs c ON mw.current_club_id = c.id
      WHERE ${queryField} = ${valuePlaceholder}
      LIMIT 1
    `, [queryParam]);

    if (managerRows.length === 0) return null;
    const manager = managerRows[0];

    console.log(`📊 Fetching stats for manager ID: ${manager.id}, Name: ${manager.name}`);

    // 2. Fetch SOLO TOUR stats from manager_seasons (all historical data - already aggregated)
    const { rows: soloStatsRows } = await pool.query(`
      SELECT 
          COALESCE(SUM(matches_played), 0) as matches_played,
          COALESCE(SUM(wins), 0) as wins,
          COALESCE(SUM(draws), 0) as draws,
          COALESCE(SUM(losses), 0) as losses,
          COALESCE(SUM(goals_scored), 0) as goals_scored,
          COALESCE(SUM(goals_conceded), 0) as goals_conceded,
          COALESCE(SUM(clean_sheets), 0) as clean_sheets
      FROM manager_seasons
      WHERE manager_id = $1
    `, [manager.id]);

    const soloStats = soloStatsRows[0] || { 
      matches_played: 0, wins: 0, draws: 0, losses: 0, 
      goals_scored: 0, goals_conceded: 0, clean_sheets: 0 
    };

    console.log(`✅ Solo stats from manager_seasons:`, soloStats);

    // Initialize stats with solo data
    const statsMap: Record<string, any> = {
      solo: {
        matches_played: parseInt(soloStats.matches_played) || 0,
        wins: parseInt(soloStats.wins) || 0,
        draws: parseInt(soloStats.draws) || 0,
        losses: parseInt(soloStats.losses) || 0,
        goals_scored: parseInt(soloStats.goals_scored) || 0,
        goals_conceded: parseInt(soloStats.goals_conceded) || 0,
        clean_sheets: parseInt(soloStats.clean_sheets) || 0
      },
      special: { matches_played: 0, wins: 0, draws: 0, losses: 0, goals_scored: 0, goals_conceded: 0, clean_sheets: 0 },
      rws: { matches_played: 0, wins: 0, draws: 0, losses: 0, goals_scored: 0, goals_conceded: 0, clean_sheets: 0 }
    };

    // 3. Fetch all club IDs this manager has ever managed (for Special and RWS)
    const { rows: clubHistory } = await pool.query(`
      SELECT DISTINCT club_id 
      FROM manager_seasons 
      WHERE manager_id = $1 AND club_id IS NOT NULL
      UNION
      SELECT DISTINCT current_club_id as club_id
      FROM manager_wallets
      WHERE manager_id = $1 AND current_club_id IS NOT NULL
    `, [manager.id]);

    const clubIds = clubHistory.map(row => row.club_id).filter(id => id !== null);
    console.log(`🏢 Club IDs found for Special/RWS:`, clubIds);

    // 4. Fetch SPECIAL and RWS stats from fixtures (if manager has clubs)
    if (clubIds.length > 0) {
      const { rows: nonSoloStatsRows } = await pool.query(`
        SELECT 
            t.tournament_type,
            COUNT(*) as matches_played,
            SUM(CASE WHEN (f.home_club_id = ANY($1) AND f.home_score > f.away_score) OR (f.away_club_id = ANY($1) AND f.away_score > f.home_score) THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN f.home_score = f.away_score THEN 1 ELSE 0 END) as draws,
            SUM(CASE WHEN (f.home_club_id = ANY($1) AND f.home_score < f.away_score) OR (f.away_club_id = ANY($1) AND f.away_score < f.home_score) THEN 1 ELSE 0 END) as losses,
            SUM(CASE WHEN f.home_club_id = ANY($1) THEN f.home_score ELSE f.away_score END) as goals_scored,
            SUM(CASE WHEN f.home_club_id = ANY($1) THEN f.away_score ELSE f.home_score END) as goals_conceded,
            SUM(CASE WHEN (f.home_club_id = ANY($1) AND f.away_score = 0) OR (f.away_club_id = ANY($1) AND f.home_score = 0) THEN 1 ELSE 0 END) as clean_sheets
        FROM fixtures f
        JOIN tournaments t ON f.tournament_id = t.id
        WHERE (f.home_club_id = ANY($1) OR f.away_club_id = ANY($1))
          AND f.home_score IS NOT NULL
          AND f.away_score IS NOT NULL
          AND t.tournament_type IN ('special', 'rws')
        GROUP BY t.tournament_type
      `, [clubIds]);

      console.log(`🎯 Non-solo stats (special/rws):`, nonSoloStatsRows);

      // Merge non-solo stats
      nonSoloStatsRows.forEach(row => {
        const type = row.tournament_type;
        if (statsMap[type]) {
          statsMap[type] = {
            matches_played: parseInt(row.matches_played) || 0,
            wins: parseInt(row.wins) || 0,
            draws: parseInt(row.draws) || 0,
            losses: parseInt(row.losses) || 0,
            goals_scored: parseInt(row.goals_scored) || 0,
            goals_conceded: parseInt(row.goals_conceded) || 0,
            clean_sheets: parseInt(row.clean_sheets) || 0
          };
        }
      });
    }

    console.log(`📈 Final stats map:`, statsMap);

    return {
      manager,
      stats: statsMap
    };
  } catch (error) {
    console.error("Error fetching player combined stats:", error);
    throw error;
  }
}

export async function fetchAllPlayersDirectory() {
  try {
    const { rows } = await pool.query(`
      SELECT m.id, m.name, m.avatar_path, m.r2g_id, m.is_active,
             c.name as club_name, c.logo_path as club_logo,
             mw.overall_rating, mw.star_rating
      FROM managers m
      LEFT JOIN manager_wallets mw ON m.id = mw.manager_id AND mw.season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
      LEFT JOIN clubs c ON mw.current_club_id = c.id
      ORDER BY m.name ASC
    `);
    return rows;
  } catch (error) {
    console.error("Error fetching all players directory:", error);
    return [];
  }
}

export async function fetchActivePlayerContract(playerId: number, seasonId: number) {
  try {
    const { rows } = await pool.query(`
      SELECT * 
      FROM player_contracts 
      WHERE player_id = $1 AND season_id = $2 AND LOWER(status) = 'active'
      LIMIT 1
    `, [playerId, seasonId]);
    return rows[0] || null;
  } catch (e) {
    console.error("Error fetching active contract:", e);
    throw e;
  }
}

export async function releasePlayerContract(
  playerId: number,
  seasonId: number,
  releaseTiming: 'start' | 'mid'
) {
  try {
    await pool.query('BEGIN');

    // 1. Fetch active contract for player in current season
    const { rows: contractRows } = await pool.query(`
      SELECT pc.*, p.name as player_name, p.base_value 
      FROM player_contracts pc
      JOIN players p ON pc.player_id = p.id
      WHERE pc.player_id = $1 
        AND pc.season_id = $2 
        AND LOWER(pc.status) = 'active'
    `, [playerId, seasonId]);

    if (contractRows.length === 0) {
      throw new Error("No active contract found for this player in the current season.");
    }

    const contract = contractRows[0];
    const clubId = contract.current_club_id;
    const pName = contract.player_name;
    const baseValue = Number(contract.base_value) || 0;

    // 2. Fetch season number
    const { rows: seasonRows } = await pool.query(`
      SELECT season_number FROM seasons WHERE id = $1
    `, [seasonId]);
    
    if (seasonRows.length === 0) {
      throw new Error("Active season not found.");
    }
    const currentSeasonNum = Number(seasonRows[0].season_number);

    const parseSeason = (s: string) => {
      const cleaned = s.replace(/[^\d.]/g, '');
      return parseFloat(cleaned) || 0.0;
    };

    const startSeasonNum = parseSeason(contract.start_season || '');
    const expireSeasonNum = parseSeason(contract.expire_season || '');
    const releaseSeasonNum = currentSeasonNum + (releaseTiming === 'mid' ? 0.5 : 0);

    // 3. Compute remaining contract duration
    const remainingDuration = expireSeasonNum - releaseSeasonNum;

    let refundAmount = 0;
    if (remainingDuration >= 1.0) {
      refundAmount = Math.round(baseValue * 0.5);
    } else {
      refundAmount = 0;
    }

    // 4. Update manager wallet (refund)
    await pool.query(`
      UPDATE manager_wallets
      SET r2g_coin_balance = r2g_coin_balance + $1
      WHERE manager_id = $2 AND season_id = $3
    `, [refundAmount, clubId, seasonId]);

    // 5. Log transaction
    const desc = `Released ${pName} (${releaseTiming === 'mid' ? 'Mid-Season' : 'Season Start'}): Refunded ${refundAmount} Coins`;
    await logTransaction(clubId, seasonId, 'coin', refundAmount, 'player_release', desc);

    const releaseSeasonStr = releaseSeasonNum.toString();

    // 6. Terminate contract (make inactive)
    await pool.query(`
      UPDATE player_contracts
      SET status = 'inactive', expire_season = $1
      WHERE id = $2
    `, [releaseSeasonStr, contract.id]);

    await pool.query('COMMIT');
    return {
      success: true,
      refundAmount,
      playerName: pName,
      clubId
    };
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error("Error releasing contract:", e);
    throw e;
  }
}

export async function fetchAdminPlayersList() {
  try {
    const activeSeason = await fetchActiveSeason();
    const seasonId = activeSeason ? activeSeason.id : 6;

    const { rows } = await pool.query(`
      SELECT 
        p.id, 
        p.name, 
        p.position, 
        p.card_type as star, 
        p.base_value as value, 
        p.image_path as imagepath, 
        p.is_suspended,
        pc.current_club_id as club_id,
        c.name as club_name
      FROM players p
      LEFT JOIN player_contracts pc ON p.id = pc.player_id AND LOWER(pc.status) = 'active' AND pc.season_id = $1
      LEFT JOIN clubs c ON pc.current_club_id = c.id
      ORDER BY p.name ASC
    `, [seasonId]);

    return rows.map((p: any) => ({
      id: p.id,
      name: p.name,
      position: p.position || '',
      value: p.value || 80,
      star: p.star || '3-star-standard',
      imagePath: p.imagepath || '',
      isSuspended: p.is_suspended || false,
      clubId: p.club_id,
      clubName: p.club_name || null
    }));
  } catch (e) {
    console.error("Error fetching admin players list:", e);
    return [];
  }
}

export async function fetchClubPlayersWithContracts(clubId: string | number, seasonId: string | number) {
  try {
    const { rows } = await pool.query(`
      SELECT 
        p.id, 
        p.name, 
        p.position, 
        p.card_type as star, 
        p.base_value as value, 
        p.image_path as imagepath, 
        p.is_suspended,
        pc.start_season,
        pc.expire_season,
        pc.signed_value
      FROM players p
      JOIN player_contracts pc ON p.id = pc.player_id
      WHERE pc.current_club_id = $1 
        AND LOWER(pc.status) = 'active'
        AND pc.season_id = $2
      ORDER BY p.name ASC
    `, [clubId, seasonId]);
    return rows.map((p: any) => ({
      id: p.id,
      name: p.name,
      position: p.position || '',
      value: p.value || 0,
      star: p.star || '3-star-standard',
      imagePath: p.imagepath || `/assets/images/players/${p.id}.png`,
      isSuspended: p.is_suspended || false,
      startSeason: p.start_season || '',
      expireSeason: p.expire_season || '',
      signedValue: p.signed_value || 0
    }));
  } catch (e) {
    console.error("Error fetching club players with contracts:", e);
    return [];
  }
}

export async function fetchAllClubs() {
  try {
    const { rows } = await pool.query('SELECT id, name, logo_path FROM clubs ORDER BY name ASC');
    return rows;
  } catch (e) {
    console.error("Error fetching all clubs:", e);
    return [];
  }
}

export async function updateClubDetails(clubId: number, name: string, logoPath: string) {
  try {
    await pool.query('UPDATE clubs SET name = $1, logo_path = $2 WHERE id = $3', [name, logoPath || '', clubId]);
    return { success: true };
  } catch (e) {
    console.error("Error updating club details:", e);
    throw e;
  }
}

export async function createClub(name: string, logoPath: string) {
  try {
    const { rows: maxIdRows } = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM clubs');
    const nextId = maxIdRows[0].next_id;
    await pool.query(`
      INSERT INTO clubs (id, name, logo_path)
      VALUES ($1, $2, $3)
    `, [nextId, name, logoPath || '']);
    return { success: true, id: nextId };
  } catch (e) {
    console.error("Error creating club:", e);
    throw e;
  }
}

export async function deleteClub(id: number) {
  try {
    await pool.query('DELETE FROM clubs WHERE id = $1', [id]);
    return { success: true };
  } catch (e) {
    console.error("Error deleting club:", e);
    throw e;
  }
}


