// Google Sheets Fetcher - Fetches data from Google Sheets
// More reliable for web applications due to better CORS support

/**
 * Fetches data from Google Sheets
 * @param {string} spreadsheetId - Google Sheets ID
 * @param {string} sheetName - Name of the sheet to read (default: "summary")
 * @returns {Promise<Array>} Array of manager objects
 */
export async function getManagersFromGoogleSheets(spreadsheetId, sheetName = 'summary') {
    try {
        console.log('Fetching data from Google Sheets...');
        
        // Google Sheets CSV export URL (no API key needed for public sheets)
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
        
        console.log('Fetching from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch Google Sheets: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        console.log('CSV data received');
        
        // Parse CSV
        const managers = parseCSVToManagers(csvText);
        console.log(`Parsed ${managers.length} managers from Google Sheets`);
        
        return managers;
    } catch (error) {
        console.error('Error fetching from Google Sheets:', error);
        throw error;
    }
}

/**
 * Parses CSV text to manager objects
 * @param {string} csvText - CSV text data
 * @returns {Array} Array of manager objects
 */
function parseCSVToManagers(csvText) {
    // Split into lines
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        console.warn('No data found in CSV');
        return [];
    }
    
    // Skip header row
    const dataLines = lines.slice(1);
    
    const managers = [];
    
    for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        
        // Parse CSV line (handle quoted values)
        const values = parseCSVLine(line);
        
        // Skip empty rows
        if (!values[0] || values[0].trim() === '') continue;
        
        // Create manager object
        const manager = {
            id: i + 1,
            name: cleanValue(values[0]),
            age: parseNumber(values[1]),
            club: cleanValue(values[2]) || 'No Club',
            overall_rating: parseNumber(values[3]),
            r2g_coin_balance: parseNumber(values[4]),
            r2g_token_balance: parseNumber(values[5]),
            club_total_value: parseNumber(values[6]),
            star_rating: parseNumber(values[7]),
            trophies: parseNumber(values[8]),
            awards: parseNumber(values[9]),
            performance: {
                matches: parseNumber(values[10]),
                wins: parseNumber(values[11]),
                draws: parseNumber(values[12]),
                losses: parseNumber(values[13]),
                goals_scored: parseNumber(values[14]),
                goals_conceded: parseNumber(values[15]),
                goal_difference: parseNumber(values[16]),
                clean_sheets: parseNumber(values[17])
            },
            squad: {
                players: []
            },
            seasons: []
        };
        
        managers.push(manager);
    }
    
    return managers;
}

/**
 * Parses a CSV line handling quoted values
 * @param {string} line - CSV line
 * @returns {Array} Array of values
 */
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current);
    return values;
}

/**
 * Cleans a value (removes quotes, trims)
 * @param {string} value - Value to clean
 * @returns {string} Cleaned value
 */
function cleanValue(value) {
    if (!value) return '';
    return value.replace(/^"|"$/g, '').trim();
}

/**
 * Parses a number value
 * @param {string} value - Value to parse
 * @returns {number} Parsed number
 */
function parseNumber(value) {
    const cleaned = cleanValue(value);
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

/**
 * Gets a specific manager by name from Google Sheets
 * @param {string} spreadsheetId - Google Sheets ID
 * @param {string} managerName - Name of the manager to find
 * @param {string} sheetName - Name of the sheet (default: "summary")
 * @returns {Promise<Object>} Manager object
 */
export async function getManagerByNameFromGoogleSheets(spreadsheetId, managerName, sheetName = 'summary') {
    try {
        const managers = await getManagersFromGoogleSheets(spreadsheetId, sheetName);
        const manager = managers.find(m => m.name.toLowerCase() === managerName.toLowerCase());
        
        if (!manager) {
            throw new Error(`Manager not found: ${managerName}`);
        }
        
        // Fetch detailed squad data from the club's sheet (sheets are named by club/team name)
        console.log(`Fetching detailed squad data for club: ${manager.club}...`);
        try {
            const squadData = await getManagerSquadData(spreadsheetId, manager.club);
            manager.squad = { players: squadData.players };
            manager.seasons = squadData.seasons;
        } catch (error) {
            console.warn(`Could not fetch squad data for ${manager.club}:`, error.message);
            // Keep the default empty squad if club sheet doesn't exist
        }
        
        return manager;
    } catch (error) {
        console.error('Error getting manager by name from Google Sheets:', error);
        throw error;
    }
}

/**
 * Fetches squad data from a club's sheet
 * @param {string} spreadsheetId - Google Sheets ID
 * @param {string} clubName - Name of the club (sheet name)
 * @returns {Promise<Object>} Squad object with players array and seasons data
 */
async function getManagerSquadData(spreadsheetId, clubName) {
    try {
        // Fetch data from the club's sheet
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(clubName)}`;
        
        console.log(`Fetching squad from sheet: ${clubName}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch squad data: ${response.status}`);
        }
        
        const csvText = await response.text();
        
        // Parse CSV to squad data and seasons
        const players = parseSquadCSV(csvText);
        const seasons = parseSeasonsCSV(csvText);
        
        console.log(`Loaded ${players.length} players and ${seasons.length} seasons for ${clubName}`);
        
        return {
            players: players,
            seasons: seasons
        };
    } catch (error) {
        console.error(`Error fetching squad for ${clubName}:`, error);
        throw error;
    }
}

/**
 * Parses squad CSV data to player objects
 * @param {string} csvText - CSV text data
 * @returns {Array} Array of player objects
 */
function parseSquadCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        console.warn('No lines in CSV');
        return [];
    }
    
    // Find the header row - look for row containing "PLAYER NAME" or "PLAYER" and "POS"
    let headerRowIndex = -1;
    let headers = [];
    
    for (let i = 0; i < Math.min(30, lines.length); i++) {
        const testHeaders = parseCSVLine(lines[i]).map(h => cleanValue(h).toLowerCase());
        
        // Check if this row has player-related headers
        const hasPlayerName = testHeaders.some(h => h.includes('player') && h.includes('name'));
        const hasPos = testHeaders.some(h => h === 'pos' || h === 'position');
        
        if (hasPlayerName || hasPos) {
            headerRowIndex = i;
            headers = testHeaders;
            console.log(`Found header row at line ${i + 1}`);
            break;
        }
    }
    
    if (headerRowIndex === -1) {
        console.error('Could not find header row with PLAYER NAME');
        return [];
    }
    
    console.log('Squad CSV headers:', headers);
    
    // Find column indices - be flexible with header names
    const playerNameIdx = headers.findIndex(h => 
        h.includes('player') || (h.includes('name') && !h.includes('manager'))
    );
    const posIdx = headers.findIndex(h => 
        h === 'pos' || h === 'position' || h.includes('pos')
    );
    const valueIdx = headers.findIndex(h => 
        h === 'value' || h.includes('value')
    );
    const contractIdx = headers.findIndex(h => 
        h === 'contract' || h.includes('contract')
    );
    const salaryIdx = headers.findIndex(h => 
        h === 'salary' || h.includes('salary')
    );
    const cardTypeIdx = headers.findIndex(h => 
        (h.includes('card') && h.includes('type')) || h === 'card type'
    );
    const validityIdx = headers.findIndex(h => 
        h === 'validity' || h.includes('validity')
    );
    
    console.log('Column indices:', {
        playerName: playerNameIdx,
        pos: posIdx,
        value: valueIdx,
        contract: contractIdx,
        salary: salaryIdx,
        cardType: cardTypeIdx,
        validity: validityIdx
    });
    
    if (playerNameIdx === -1) {
        console.error('Could not find player name column');
        return [];
    }
    
    const players = [];
    
    // Parse data rows (start after header row)
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        const values = parseCSVLine(line);
        
        // Skip empty rows or rows without player name
        const playerName = cleanValue(values[playerNameIdx] || '');
        
        // Skip if no player name or if it's a summary row
        if (!playerName || 
            playerName.toLowerCase() === 'total' || 
            playerName.toLowerCase().includes('players') ||
            playerName.toLowerCase().includes('2✫') ||
            playerName.toLowerCase().includes('1✫') ||
            playerName.toLowerCase().includes('2*') ||
            playerName.toLowerCase().includes('1*')) {
            continue;
        }
        
        // Parse player data
        const player = {
            player_name: playerName,
            position: posIdx !== -1 ? cleanValue(values[posIdx] || '') : '',
            value: valueIdx !== -1 ? parseNumber(values[valueIdx] || '0') : 0,
            contract: contractIdx !== -1 ? cleanValue(values[contractIdx] || '') : '',
            salary: salaryIdx !== -1 ? parseNumber(values[salaryIdx] || '0') : 0,
            card_type: cardTypeIdx !== -1 ? cleanValue(values[cardTypeIdx] || '') : '',
            validity: validityIdx !== -1 ? cleanValue(values[validityIdx] || '') : '',
            player_type: cardTypeIdx !== -1 ? determinePlayerType(cleanValue(values[cardTypeIdx] || '')) : 'standard'
        };
        
        players.push(player);
    }
    
    console.log(`Parsed ${players.length} players from CSV`);
    if (players.length > 0) {
        console.log('First player:', players[0]);
    }
    
    return players;
}

/**
 * Determines player type based on card type
 * @param {string} cardType - Card type value
 * @returns {string} Player type
 */
function determinePlayerType(cardType) {
    if (!cardType) return 'standard';
    
    const cardLower = cardType.toLowerCase();
    
    if (cardLower.includes('prime')) return 'prime';
    if (cardLower.includes('icon')) return 'icon';
    if (cardLower.includes('hero')) return 'hero';
    if (cardLower.includes('legend')) return 'legend';
    
    return 'standard';
}

/**
 * Parses seasons CSV data
 * @param {string} csvText - CSV text data
 * @returns {Array} Array of season objects
 */
function parseSeasonsCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        return [];
    }
    
    // Find the season data header rows - headers are split across 2 rows (52-53)
    // Row 52: ['sesn', 'manager', 'rank', 'team', 'team', 'team', 'sesn', 'awards', ...]
    // Row 53: ['', 'rank', 'point', 'income', 'expense', 'profit', 'rewards', '', ...]
    let headerRow1Index = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]).map(h => cleanValue(h).toLowerCase());
        
        // Look for row with "sesn", "manager", "rank", "team" pattern
        const hasSesn = row.includes('sesn');
        const hasManager = row.includes('manager');
        const hasRank = row.includes('rank');
        const hasTeam = row.filter(h => h === 'team').length >= 3; // At least 3 "team" columns
        
        if (hasSesn && hasManager && hasRank && hasTeam) {
            headerRow1Index = i;
            console.log(`Found season header row 1 at line ${i + 1}`);
            break;
        }
    }
    
    if (headerRow1Index === -1 || headerRow1Index + 1 >= lines.length) {
        console.warn('Could not find season data headers (looking for SESN/MANAGER/RANK/TEAM)');
        console.log(`Searched through ${lines.length} lines`);
        return [];
    }
    
    // Parse both header rows
    const row1 = parseCSVLine(lines[headerRow1Index]).map(h => cleanValue(h).toLowerCase());
    const row2 = parseCSVLine(lines[headerRow1Index + 1]).map(h => cleanValue(h).toLowerCase());
    
    console.log(`Row ${headerRow1Index + 1} (header row 1):`, row1);
    console.log(`Row ${headerRow1Index + 2} (header row 2):`, row2);
    
    // Find column indices by looking at both rows
    // SESN column: row1='sesn', row2=''
    const sesnIdx = row1.findIndex((h, idx) => h === 'sesn' && row2[idx] === '');
    
    // MANAGER RANK: row1='manager', row2='rank'
    const managerRankIdx = row1.findIndex((h, idx) => h === 'manager' && row2[idx] === 'rank');
    
    // RANK POINT: row1='rank', row2='point'
    const rankPointIdx = row1.findIndex((h, idx) => h === 'rank' && row2[idx] === 'point');
    
    // TEAM INCOME: row1='team', row2='income'
    const teamIncomeIdx = row1.findIndex((h, idx) => h === 'team' && row2[idx] === 'income');
    
    // TEAM EXPENSE: row1='team', row2='expense'
    const teamExpenseIdx = row1.findIndex((h, idx) => h === 'team' && row2[idx] === 'expense');
    
    // TEAM PROFIT: row1='team', row2='profit'
    const teamProfitIdx = row1.findIndex((h, idx) => h === 'team' && row2[idx] === 'profit');
    
    // SESN REWARDS: row1='sesn', row2='rewards'
    const sesnRewardsIdx = row1.findIndex((h, idx) => h === 'sesn' && row2[idx] === 'rewards');
    
    // AWARDS: row1='awards', row2=''
    const awardsIdx = row1.findIndex((h, idx) => h === 'awards' && row2[idx] === '');
    
    // SP TOUR and SEASON columns: They start right after AWARDS
    // Look for the first numeric values in row1 after AWARDS column
    let spTourIdx = -1;
    let seasonIdx = -1;
    
    // Find first two columns with numeric data after AWARDS
    if (awardsIdx !== -1) {
        for (let i = awardsIdx + 1; i < row1.length; i++) {
            const val = cleanValue(row1[i]);
            // Check if this column has a number (the stats start in the header row)
            if (val && /^\d+/.test(val)) {
                if (spTourIdx === -1) {
                    spTourIdx = i;
                } else if (seasonIdx === -1) {
                    seasonIdx = i;
                    break;
                }
            }
        }
    }
    
    // Fallback: SP TOUR is column 13, SEASON is column 14
    if (spTourIdx === -1) spTourIdx = 13;
    if (seasonIdx === -1) seasonIdx = 14;
    
    // If both are the same, increment seasonIdx
    if (spTourIdx === seasonIdx) {
        seasonIdx = spTourIdx + 1;
    }
    
    // Force columns: SP TOUR = column 14, SEASON = column 13
    // (Swapped based on actual data)
    spTourIdx = 14;
    seasonIdx = 13;
    
    console.log('Season column indices:', {
        sesn: sesnIdx,
        managerRank: managerRankIdx,
        rankPoint: rankPointIdx,
        teamIncome: teamIncomeIdx,
        teamExpense: teamExpenseIdx,
        teamProfit: teamProfitIdx,
        sesnRewards: sesnRewardsIdx,
        awards: awardsIdx,
        spTour: spTourIdx,
        season: seasonIdx
    });
    
    if (sesnIdx === -1) {
        console.warn('Could not find SESN column');
        return [];
    }
    
    const seasons = [];
    const dataStartRow = headerRow1Index + 2; // Data starts 2 rows after first header
    
    // Each season block is exactly 9 rows tall and 13 columns wide
    // Structure:
    // Row 0: Roman numeral (i, ii, iii) + manager rank + rank point + income/expense/profit + rewards
    // Row 1: Actual season number (4, 5, 6, etc.)
    // Row 2-8: Tournament results and match statistics
    const SEASON_BLOCK_HEIGHT = 9;
    
    const romanToNumber = { 
        'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 
        'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10 
    };
    
    let i = dataStartRow;
    while (i < lines.length) {
        const line = lines[i];
        const values = parseCSVLine(line);
        
        // Get the value in SESN column
        const sesnValue = cleanValue(values[sesnIdx] || '').toLowerCase();
        
        // Check if this is a Roman numeral row (i, ii, iii, etc.)
        if (!romanToNumber[sesnValue]) {
            i++;
            continue;
        }
        
        console.log(`Found season block starting at row ${i + 1} with Roman numeral: ${sesnValue}`);
        
        // Get basic season data from current row (row 0 of the block)
        const managerRank = managerRankIdx !== -1 ? cleanValue(values[managerRankIdx] || '') : '';
        const rankPoint = rankPointIdx !== -1 ? cleanValue(values[rankPointIdx] || '0') : '0';
        const teamIncome = teamIncomeIdx !== -1 ? cleanValue(values[teamIncomeIdx] || '0') : '0';
        const teamExpense = teamExpenseIdx !== -1 ? cleanValue(values[teamExpenseIdx] || '0') : '0';
        const teamProfit = teamProfitIdx !== -1 ? cleanValue(values[teamProfitIdx] || '0') : '0';
        const sesnRewards = sesnRewardsIdx !== -1 ? cleanValue(values[sesnRewardsIdx] || '0') : '0';
        
        // Get the ACTUAL season number from row 1 of the block
        let seasonNumber = sesnValue; // fallback to Roman numeral
        const awards = [];
        
        if (i + 1 < lines.length) {
            const row1Line = lines[i + 1];
            const row1Values = parseCSVLine(row1Line);
            const row1SesnValue = cleanValue(row1Values[sesnIdx] || '');
            
            // Check if row 1 has a numeric season number
            if (/^\d+$/.test(row1SesnValue)) {
                seasonNumber = parseInt(row1SesnValue);
                console.log(`Season number: ${seasonNumber}`);
            }
        }
        
        // Get awards from column 9 (awardsIdx) in rows i through i+5 (6 rows total)
        console.log(`=== AWARDS DEBUG for Season ${seasonNumber} ===`);
        console.log(`Awards column: ${awardsIdx}`);
        console.log(`Reading awards from rows ${i + 1} to ${i + 5 + 1}`);
        
        if (awardsIdx !== -1) {
            for (let j = i; j <= i + 5 && j < lines.length; j++) {
                const awardLine = lines[j];
                const awardValues = parseCSVLine(awardLine);
                const awardText = cleanValue(awardValues[awardsIdx] || '');
                
                console.log(`  Row ${j + 1}, Col ${awardsIdx}: "${awardText}"`);
                
                if (awardText && awardText !== '' && awardText !== '-') {
                    console.log(`  ✓ Found award: "${awardText}"`);
                    awards.push(awardText);
                }
            }
        }
        
        console.log(`=== Found ${awards.length} awards for season ${seasonNumber} ===`);
        console.log('Awards:', awards);
        
        // Parse competitions from tournament columns
        // Competitions are in columns 3 and 6
        // They appear in rows 47, 48, 49, 50 (which is i+2, i+3, i+4, i+5)
        // Sometimes the placement is in the next row (e.g., competition name in row 47, placement in row 48)
        const competitions = {};
        
        // Tournament columns: Based on your data, competitions are in columns 3, 6
        const tournamentColumns = [3, 6]; // Main competition columns
        
        console.log(`=== COMPETITIONS DEBUG for Season ${seasonNumber} ===`);
        console.log(`Checking tournament columns: ${tournamentColumns.join(', ')}`);
        console.log(`Reading rows ${i + 2 + 1} to ${Math.min(i + 6, lines.length)}`);
        
        // Read rows i+2 through i+5 (rows 47-50 if i=45)
        const competitionRows = [];
        for (let j = i + 2; j <= i + 5 && j < lines.length; j++) {
            const compLine = lines[j];
            const compValues = parseCSVLine(compLine);
            competitionRows.push(compValues);
            console.log(`Row ${j + 1} all values:`, compValues);
        }
        
        // Process each tournament column
        for (const k of tournamentColumns) {
            console.log(`\n  Processing column ${k}:`);
            
            let i = 0;
            while (i < competitionRows.length) {
                const compText = cleanValue(competitionRows[i][k] || '');
                console.log(`    Row ${i}: "${compText}"`);
                
                if (compText && compText !== '' && compText !== '-') {
                    // Check if next row in same column has a placement keyword
                    let nextRowText = '';
                    if (i + 1 < competitionRows.length) {
                        nextRowText = cleanValue(competitionRows[i + 1][k] || '');
                    }
                    
                    // Common placement keywords that appear alone (NOT competition names)
                    const placementKeywords = ['KO', 'CHAMP', 'CHAMPION', 'R8', 'R16', 'R32', 'SEMI', 'SEMI FINAL', 'FINAL', 'QF', 'SF', 
                                               '1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH',
                                               '4TH STAGE', 'SEMI FINAL', 'QUARTER FINAL', 'GROUP STAGE', 'ROUND OF 16', 'ROUND OF 8'];
                    
                    // Competition names (NOT placements)
                    const competitionNames = ['UCL', 'UEL', 'UECL', 'DIVISION', 'SUPER CUP', 'ELITE CUP', 'AUTHENTIC', 'CLUB WC', 
                                             'CHAMPIONS LEAGUE', 'EUROPA LEAGUE', 'CONFERENCE LEAGUE'];
                    
                    const isPlacementKeyword = (text) => {
                        const upper = text.toUpperCase().trim();
                        // Check if it's a placement keyword and NOT a competition name
                        const isPlacement = placementKeywords.some(kw => upper === kw || upper.includes(kw));
                        const isCompetition = competitionNames.some(cn => upper.includes(cn));
                        return isPlacement && !isCompetition;
                    };
                    
                    // Check if next row is a placement for current competition
                    if (nextRowText && isPlacementKeyword(nextRowText)) {
                        console.log(`    ✓ Found competition: "${compText}" with placement in next row: "${nextRowText}"`);
                        
                        // Parse current row as competition name
                        let name = compText;
                        let placement = nextRowText;
                        
                        // Check for ">" separator in name
                        if (compText.includes('>')) {
                            const parts = compText.split('>');
                            name = parts[0].trim();
                            placement = parts[1] ? parts[1].trim() + ' ' + nextRowText : nextRowText;
                        }
                        
                        competitions[compText + ' ' + nextRowText] = {
                            name: name,
                            placement: placement,
                            stage: placement
                        };
                        
                        i += 2; // Skip next row since we used it
                    } else {
                        console.log(`    ✓ Found competition: "${compText}"`);
                        
                        // Parse competition name and placement from single row
                        let name = compText;
                        let placement = '';
                        
                        // Check for ">" separator (e.g., "DIVISION 1> 6th")
                        if (compText.includes('>')) {
                            const parts = compText.split('>');
                            name = parts[0].trim();
                            placement = parts[1] ? parts[1].trim() : '';
                        } 
                        // Check for space-separated patterns (e.g., "UCL KO", "SUPER CUP CHAMP")
                        else {
                            const words = compText.split(' ');
                            // Common stage/placement keywords
                            const stageKeywords = ['KO', 'CHAMP', 'R8', 'R16', 'R32', 'SEMI', 'FINAL', 'QF', 'SF', '1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH'];
                            
                            // Find if last word(s) are stage keywords
                            if (words.length > 1) {
                                const lastWord = words[words.length - 1].toUpperCase();
                                const secondLastWord = words.length > 2 ? words[words.length - 2].toUpperCase() : '';
                                
                                // Check if last word is a stage keyword
                                if (stageKeywords.includes(lastWord)) {
                                    placement = lastWord;
                                    name = words.slice(0, -1).join(' ');
                                }
                                // Check if last two words form a stage (e.g., "4TH STAGE")
                                else if (secondLastWord && stageKeywords.includes(secondLastWord)) {
                                    placement = words.slice(-2).join(' ');
                                    name = words.slice(0, -2).join(' ');
                                }
                            }
                        }
                        
                        console.log(`      Parsed - Name: "${name}", Placement: "${placement}"`);
                        
                        // Use the full text as key to avoid duplicates
                        competitions[compText] = {
                            name: name,
                            placement: placement || name,
                            stage: placement || ''
                        };
                        
                        i += 1;
                    }
                } else {
                    i += 1;
                }
            }
        }
        
        console.log(`=== Found ${Object.keys(competitions).length} competitions for season ${seasonNumber} ===`);
        console.log('Competitions:', competitions);
        
        // Parse match statistics from columns 13 (SP TOUR) and 14 (SEASON)
        // Stats START from the header row (row 43) and continue for 8 rows
        // Each season block has its own set of stats starting from its header row
        
        let spTourStats = { matches: 0, wins: 0, draws: 0, losses: 0, goals_scored: 0, goals_conceded: 0, goal_difference: 0, clean_sheets: 0 };
        let seasonStats = { matches: 0, wins: 0, draws: 0, losses: 0, goals_scored: 0, goals_conceded: 0, goal_difference: 0, clean_sheets: 0 };
        
        // Calculate which season block this is (0-indexed)
        const seasonBlockIndex = Math.floor((i - dataStartRow) / SEASON_BLOCK_HEIGHT);
        
        // The stats for this season start at the header row for this block
        // Header rows appear every 9 rows starting from headerRow1Index
        const thisSeasonStatsStartRow = headerRow1Index + (seasonBlockIndex * SEASON_BLOCK_HEIGHT);
        
        console.log(`Looking for stats at column indices - SP TOUR: ${spTourIdx}, SEASON: ${seasonIdx} for season ${seasonNumber}`);
        console.log(`Season block index: ${seasonBlockIndex}, Stats start row: ${thisSeasonStatsStartRow + 1}`);
        
        // Read 8 rows for stats starting from the header row for this season
        const spTourValues = [];
        const seasonValues = [];
        
        for (let j = thisSeasonStatsStartRow; j < thisSeasonStatsStartRow + 8 && j < lines.length; j++) {
            const statsLine = lines[j];
            const statsValues = parseCSVLine(statsLine);
            
            // Get values from SP TOUR and SEASON columns
            const spTourValue = parseNumber(statsValues[spTourIdx] || '0');
            const seasonValue = parseNumber(statsValues[seasonIdx] || '0');
            
            console.log(`  Row ${j + 1}: SP TOUR[${spTourIdx}]=${spTourValue}, SEASON[${seasonIdx}]=${seasonValue}`);
            
            spTourValues.push(spTourValue);
            seasonValues.push(seasonValue);
        }
        
        console.log(`SP TOUR stats for season ${seasonNumber}:`, spTourValues);
        console.log(`SEASON stats for season ${seasonNumber}:`, seasonValues);
        
        // Map the 8 values to stats (Matches, Win, Draw, Loss, GF, GA, GD, CS)
        if (spTourValues.length >= 8) {
            spTourStats = {
                matches: spTourValues[0] || 0,
                wins: spTourValues[1] || 0,
                draws: spTourValues[2] || 0,
                losses: spTourValues[3] || 0,
                goals_scored: spTourValues[4] || 0,
                goals_conceded: spTourValues[5] || 0,
                goal_difference: spTourValues[6] || 0,
                clean_sheets: spTourValues[7] || 0
            };
        }
        
        if (seasonValues.length >= 8) {
            seasonStats = {
                matches: seasonValues[0] || 0,
                wins: seasonValues[1] || 0,
                draws: seasonValues[2] || 0,
                losses: seasonValues[3] || 0,
                goals_scored: seasonValues[4] || 0,
                goals_conceded: seasonValues[5] || 0,
                goal_difference: seasonValues[6] || 0,
                clean_sheets: seasonValues[7] || 0
            };
        }
        
        console.log(`Season ${seasonNumber} SP TOUR:`, spTourStats);
        console.log(`Season ${seasonNumber} SEASON:`, seasonStats);
        
        // Create season object
        const season = {
            number: seasonNumber,
            manager_rank: managerRank === '-' ? '-' : parseNumber(managerRank),
            rank_point: parseFloat(rankPoint) || 0,
            team_income: parseNumber(teamIncome) || 0,
            team_expense: parseFloat(teamExpense) || 0,
            team_profit: parseNumber(teamProfit) || 0,
            session_rewards: parseNumber(sesnRewards) || 0,
            awards: awards,
            competitions: competitions,
            sp_tour_stats: spTourStats,
            season_stats: seasonStats
        };
        
        seasons.push(season);
        console.log(`Parsed season ${seasonNumber}:`, season);
        
        // Move to the next season block (skip exactly 9 rows)
        i += SEASON_BLOCK_HEIGHT;
    }
    
    console.log(`Parsed ${seasons.length} seasons total`);
    
    return seasons;
}
