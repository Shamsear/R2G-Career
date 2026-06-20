"use server";

import { Pool } from '@neondatabase/serverless';

const connectionString = process.env.SOLO_DATABASE_URL;

if (!connectionString) {
  console.error("❌ SOLO_DATABASE_URL is not set.");
}

const pool = new Pool({
  connectionString: connectionString || '',
  ssl: { rejectUnauthorized: false } // Standard practice for external Supabase/Neon DBs
});

export async function fetchManagers() {
    try {
        const { rows: managersResult } = await pool.query(`
            SELECT 
                m.id, m.name, m.avatar_path as photo,
                c.name as club_name,
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
                    WHERE pc.current_club_id = m.id AND pc.status = 'active'
                ), 0) as club_total_value,
                ms.awards,
                ms.competitions
            FROM managers m
            LEFT JOIN clubs c ON m.id = c.id
            LEFT JOIN manager_seasons ms ON m.id = ms.manager_id
            LEFT JOIN manager_wallets mw ON m.id = mw.manager_id
        `);

        return managersResult.map((m: any) => ({
            id: m.id,
            name: m.name,
            photo: m.photo || '',
            club: m.club_name || 'No Club',
            age: m.age || 0,
            overall_rating: m.overall_rating || 0,
            star_rating: m.star_rating || 0,
            club_total_value: Math.floor(m.club_total_value / 1000000) || 0,
            trophies: m.competitions ? (typeof m.competitions === 'string' ? JSON.parse(m.competitions).length : m.competitions.length) : 0,
            awards: m.awards ? (typeof m.awards === 'string' ? JSON.parse(m.awards).length : m.awards.length) : 0,
            balance: (Number(m.r2g_coin_balance) || 0) + (Number(m.r2g_token_balance) || 0),
            bio: "Experienced tactician.",
            favorite_formation: "4-3-3",
            play_style: "Attacking"
        }));
    } catch (error: any) {
        console.error("Error fetching managers:", error);
        return { error: error.message || "Failed to fetch managers" };
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
                ms.goals_scored, ms.goals_conceded, ms.clean_sheets
            FROM managers m
            LEFT JOIN clubs c ON m.id = c.id
            LEFT JOIN manager_seasons ms ON m.id = ms.manager_id
            LEFT JOIN manager_wallets mw ON m.id = mw.manager_id
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
            WHERE pc.current_club_id = $1 AND pc.status = 'active'
        `, [m.id]);

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
            trophies: m.competitions ? (typeof m.competitions === 'string' ? JSON.parse(m.competitions) : m.competitions) : [],
            awards: m.awards ? (typeof m.awards === 'string' ? JSON.parse(m.awards) : m.awards) : [],
            players: playersResult.map((p: any) => ({
                id: p.id,
                name: p.name,
                position: p.position,
                value: p.value || 0,
                star: p.star || '3-star-standard',
                imagePath: p.imagepath || `/assets/images/players/${p.id}.png`
            }))
        };
    } catch (error: any) {
        console.error("Error fetching manager by name:", error);
        return { error: error.message || "Failed to fetch manager details" };
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
    } catch (error: any) {
        console.error("Error fetching player by ID:", error);
        return { error: error.message || "Failed to fetch player details" };
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
    } catch (error: any) {
        console.error("Error fetching players:", error);
        return { error: error.message || "Failed to fetch players" };
    }
}

export async function fetchPlayerAuctionData() {
    try {
        const { rows: auctionResult } = await pool.query(`
            SELECT 
                p.id, p.name, p.position, p.base_value,
                c.name as current_club,
                a.reserve_price, a.winning_bid_amount, a.status
            FROM players p
            LEFT JOIN player_contracts pc ON p.id = pc.player_id AND pc.status = 'active'
            LEFT JOIN clubs c ON pc.current_club_id = c.id
            LEFT JOIN auctions a ON p.id = a.player_id AND a.status = 'active'
        `);
        
        return auctionResult.map((p: any) => ({
            name: p.name,
            position: p.position,
            team: p.current_club || 'FREE AGENT',
            rating: 0,
            bidAmount: p.winning_bid_amount || 0,
            rowId: p.id,
            contract: p.current_club ? 'active' : 'none',
            reservePrice: p.reserve_price || p.base_value || 0
        }));
    } catch (error: any) {
        console.error("Error fetching auction data:", error);
        return { error: error.message || "Failed to fetch player auction data" };
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
