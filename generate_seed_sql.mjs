import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./spreadsheet_data.json', 'utf8'));
const globalPlayersData = JSON.parse(fs.readFileSync('./global_players_parsed.json', 'utf8'));

// Maps to keep track of IDs
const clubs = new Map();
const managers = new Map();
const players = new Map();
const seasons = new Set();

let nextClubId = 1;
let nextManagerId = 1;
let nextPlayerId = 1;

let sql = `-- ==========================================
-- R2G SOLO TOUR - SUPABASE SEED DATA
-- ==========================================
-- Clear existing data
TRUNCATE TABLE player_history, manager_seasons, fixtures, tournament_standings, auctions, player_seasonal_statuses, player_contracts, manager_wallets, tournament_rewards, tournaments, players, managers, clubs, seasons RESTART IDENTITY CASCADE;

`;

// 1. Collect all distinct seasons
for (const m of data) {
    if (m.seasons && Array.isArray(m.seasons)) {
        for (const s of m.seasons) {
            seasons.add(s.number);
        }
    }
}
if (seasons.size === 0) seasons.add(9);
seasons.add(9);

sql += `-- SEASONS\n`;
sql += `INSERT INTO seasons (season_number, is_active) VALUES\n`;
const seasonValues = [];
for (const s of Array.from(seasons).sort((a,b)=>a-b)) {
    seasonValues.push(`(${s}, ${s === 9 ? 'TRUE' : 'FALSE'})`);
}
sql += seasonValues.join(',\n') + `;\n\n`;

// 2. Process Clubs and Managers
sql += `-- CLUBS\n`;
const clubValues = [];
const managerValues = [];
const walletValues = [];

for (const m of data) {
    const clubName = m.club && m.club !== 'No Club' ? m.club.replace(/'/g, "''").trim() : null;
    let clubId = null;
    
    if (clubName) {
        if (!clubs.has(clubName)) {
            clubs.set(clubName, nextClubId++);
            clubValues.push(`('${clubName}')`);
        }
        clubId = clubs.get(clubName);
    }
    
    const managerName = m.name.replace(/'/g, "''").trim();
    managers.set(managerName, nextManagerId);
    const managerId = nextManagerId++;
    
    managerValues.push(`('${managerName}')`);
    walletValues.push(`(${managerId}, (SELECT id FROM seasons WHERE season_number = 9), ${clubId || 'NULL'}, ${m.r2g_token_balance || 0}, ${m.r2g_coin_balance || 0}, 0, ${m.overall_rating || 0}, ${m.star_rating || 0})`);
}

if (clubValues.length > 0) sql += `INSERT INTO clubs (name) VALUES\n${clubValues.join(',\n')};\n\n`;
if (managerValues.length > 0) sql += `INSERT INTO managers (name) VALUES\n${managerValues.join(',\n')};\n\n`;
if (walletValues.length > 0) {
    sql += `-- MANAGER WALLETS\n`;
    sql += `INSERT INTO manager_wallets (manager_id, season_id, current_club_id, r2g_token_balance, r2g_coin_balance, r2g_voucher_balance, overall_rating, star_rating) VALUES\n`;
    sql += walletValues.join(',\n') + `;\n\n`;
}

// 3. Process Players and Contracts
sql += `-- PLAYERS & CONTRACTS\n`;
const playerValues = [];
const contractValues = [];
const playerSeasonalValues = [];

// Prepare global players map for quick lookup
const globalPlayersMap = new Map();
for(const gp of globalPlayersData) {
    const key = `${gp.name.trim().toLowerCase()}_${gp.position.trim().toLowerCase()}`;
    globalPlayersMap.set(key, gp);
    // Also store by name only as fallback
    if(!globalPlayersMap.has(gp.name.trim().toLowerCase())) {
        globalPlayersMap.set(gp.name.trim().toLowerCase(), gp);
    }
}

// We will track which global players have been processed to add the rest later
const processedGlobalPlayers = new Set();

// Function to resolve card type
function resolveCardType(baseValue) {
    if (baseValue === 150) return 'Legend';
    return 'Standard';
}

// Process squad players first (they get contracts)
for (const m of data) {
    const clubName = m.club && m.club !== 'No Club' ? m.club.replace(/'/g, "''").trim() : null;
    const clubId = clubName ? clubs.get(clubName) : null;
    
    if (m.squad && m.squad.players) {
        for (const p of m.squad.players) {
            const rawName = p.player_name.trim();
            const playerName = rawName.replace(/'/g, "''");
            const rawPos = p.position ? p.position.trim() : '';
            
            const keyWithPos = `${rawName.toLowerCase()}_${rawPos.toLowerCase()}`;
            const keyNameOnly = rawName.toLowerCase();
            
            // Find global stats if available
            let globalStats = globalPlayersMap.get(keyWithPos) || globalPlayersMap.get(keyNameOnly);
            
            // Determine base value and rarity
            let baseValue = globalStats ? globalStats.baseValue : (p.value || 0);
            
            // Determine card type ('Standard' or 'Legend')
            let cardType = resolveCardType(baseValue);
            
            // The manager sheet specifies if they are 'prime'
            let isPrime = (p.player_type && p.player_type.toLowerCase() === 'prime');
            
            // Mark global player as processed
            if (globalStats) {
                processedGlobalPlayers.add(`${globalStats.name.toLowerCase()}_${globalStats.position.toLowerCase()}`);
            }
            
            // Generate player ID
            const playerKey = `${playerName}_${rawPos}`;
            let playerId;
            if (!players.has(playerKey)) {
                players.set(playerKey, nextPlayerId);
                playerId = nextPlayerId++;
                playerValues.push(`('${playerName}', ${rawPos ? `'${rawPos}'` : 'NULL'}, '${cardType}', ${baseValue})`);
            } else {
                playerId = players.get(playerKey);
            }
            
            // Prevent duplicate contracts if a player appears multiple times
            if (!processedGlobalPlayers.has(`contracted_${playerId}`)) {
                processedGlobalPlayers.add(`contracted_${playerId}`);
                
                let expireSeason = p.contract ? `'${p.contract.replace(/'/g, "''")}'` : 'NULL';
                let startSeason = 'NULL';
                
                // Extract number to calculate start season (assume 2 seasons prior)
                if (p.contract) {
                    let expireNum = parseFloat(p.contract.replace(/[^\d.]/g, ''));
                    if (!isNaN(expireNum)) {
                        startSeason = `'${Math.max(1, expireNum - 2)}'`;
                    }
                }
                
                const salary = p.salary || 0;
                
                contractValues.push(`(${playerId}, (SELECT id FROM seasons WHERE season_number = 9), ${clubId || 'NULL'}, ${salary}, ${startSeason}, ${expireSeason}, 'Active')`);
                
                if (isPrime) {
                    let validUntil = p.validity ? `'${p.validity.replace(/'/g, "''")}'` : 'NULL';
                    playerSeasonalValues.push(`(${playerId}, (SELECT id FROM seasons WHERE season_number = 9), 'Prime', ${validUntil})`);
                }
            }
        }
    }
}

// Now process the REST of the global players (Free agents)
for (const gp of globalPlayersData) {
    const key = `${gp.name.toLowerCase()}_${gp.position.toLowerCase()}`;
    if (!processedGlobalPlayers.has(key)) {
        const playerName = gp.name.replace(/'/g, "''").trim();
        const rawPos = gp.position.trim();
        const baseValue = gp.baseValue || 0;
        
        let cardType = resolveCardType(baseValue);
        
        const playerKey = `${playerName}_${rawPos}`;
        if (!players.has(playerKey)) {
            players.set(playerKey, nextPlayerId);
            const playerId = nextPlayerId++;
            playerValues.push(`('${playerName}', '${rawPos}', '${cardType}', ${baseValue})`);
        }
    }
}

if (playerValues.length > 0) {
    // Batch inserts for players
    sql += `INSERT INTO players (name, position, card_type, base_value) VALUES\n`;
    sql += playerValues.join(',\n') + `;\n\n`;
    
    if (contractValues.length > 0) {
        sql += `-- PLAYER CONTRACTS\n`;
        sql += `INSERT INTO player_contracts (player_id, season_id, current_club_id, salary, start_season, expire_season, status) VALUES\n`;
        sql += contractValues.join(',\n') + `;\n\n`;
    }
    
    if (playerSeasonalValues.length > 0) {
        sql += `-- PLAYER SEASONAL STATUSES\n`;
        sql += `INSERT INTO player_seasonal_statuses (player_id, season_id, status_type, valid_until) VALUES\n`;
        sql += playerSeasonalValues.join(',\n') + `;\n\n`;
    }
}

// 4. Process Manager Seasons (History)
sql += `-- MANAGER SEASONS (HISTORY)\n`;
const historyValues = [];

for (const m of data) {
    const managerName = m.name.replace(/'/g, "''").trim();
    const managerId = managers.get(managerName);
    const clubName = m.club && m.club !== 'No Club' ? m.club.replace(/'/g, "''").trim() : null;
    const clubId = clubName ? clubs.get(clubName) : null;
    
    if (m.seasons && m.seasons.length > 0) {
        for (const s of m.seasons) {
            const seasonIdQuery = `(SELECT id FROM seasons WHERE season_number = ${s.number})`;
            
            const rank = s.manager_rank === '-' ? 'NULL' : s.manager_rank || 'NULL';
            const rankPoints = s.rank_point || 0;
            const income = s.team_income || 0;
            const expense = s.team_expense || 0;
            const profit = s.team_profit || 0;
            const rewards = s.session_rewards || 0;
            
            const stats = s.sp_tour_stats || {};
            const mp = stats.matches || 0;
            const wins = stats.wins || 0;
            const draws = stats.draws || 0;
            const losses = stats.losses || 0;
            const gs = stats.goals_scored || 0;
            const gc = stats.goals_conceded || 0;
            const cs = stats.clean_sheets || 0;
            
            const awardsJson = `'${JSON.stringify(s.awards || []).replace(/'/g, "''")}'::jsonb`;
            const compJson = `'${JSON.stringify(s.competitions || {}).replace(/'/g, "''")}'::jsonb`;
            
            historyValues.push(`(${managerId}, ${seasonIdQuery}, ${clubId || 'NULL'}, ${rank}, ${rankPoints}, ${income}, ${expense}, ${profit}, ${rewards}, ${mp}, ${wins}, ${draws}, ${losses}, ${gs}, ${gc}, ${cs}, ${awardsJson}, ${compJson})`);
        }
    }
}

if (historyValues.length > 0) {
    sql += `INSERT INTO manager_seasons (manager_id, season_id, club_id, manager_rank, rank_points, team_income, team_expense, team_profit, session_rewards, matches_played, wins, draws, losses, goals_scored, goals_conceded, clean_sheets, awards, competitions) VALUES\n`;
    sql += historyValues.join(',\n') + `;\n\n`;
}

sql += `-- ==========================================\n`;
sql += `-- SEEDING COMPLETE\n`;
sql += `-- ==========================================\n`;

fs.writeFileSync('seed_data.sql', sql);
console.log('Successfully generated seed_data.sql with global players');
