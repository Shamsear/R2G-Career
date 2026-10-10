import * as XLSX from 'xlsx';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const filePath = "C:\\Users\\shams\\OneDrive\\Documents\\MANAGER'S DATA.xlsx";
const workbook = XLSX.readFile(filePath);

const soloPool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const SHEET_TO_DB_MGR: { [sheetName: string]: { id: number; name: string } } = {
  'AC MILAN': { id: 29, name: 'MUBASHIR' },
  'AL NASSR': { id: 2, name: 'DHANUS (DKM)' },
  'ARSENAL FC': { id: 3, name: 'FAYIS' },
  'ATLETICO DE MADRID': { id: 4, name: 'SAINU KT' },
  'BORUSSIA DORTMUND': { id: 6, name: 'FAYAZ' },
  'BRIGHTON': { id: 7, name: 'ABU' },
  'EVERTON': { id: 8, name: 'DAVEEN' },
  'EXCELSIOR': { id: 9, name: 'SINAN (IEMXSIN)' },
  'FC BARCALONA': { id: 10, name: 'ADIL' },
  'BAYERN MUNICH': { id: 31, name: 'AJAS' },
  'FC GOA': { id: 11, name: 'UMAR' },
  'INTER MIAMI': { id: 32, name: 'SREEVISHNU DAYAL' },
  'LOSC LILLE ': { id: 16, name: 'FAZI' },
  'MANCHESTER CITY': { id: 17, name: 'AFSAL' },
  'MAN UTD': { id: 33, name: 'AJMAL (AJU)' },
  'NEWCASTLE UNITED': { id: 19, name: 'ADITH' },
  'NEWELLS OLD BOYS': { id: 20, name: 'SAYAND' },
  'REAL BETIS': { id: 34, name: 'ADHIL' },
  'REAL MADRID CF': { id: 21, name: 'ANVAR (SHADOW_4A)' },
  'SANTOS FC': { id: 22, name: 'ROHITH' },
  'SEPAHAN SC': { id: 23, name: 'SIRAJ (BECKHAM)' },
  'SS LAZIO': { id: 24, name: 'SHAHANAB' },
  'SSC NAPOLI': { id: 25, name: 'SHAMIL' },
  'TOTTENHAM HOTSPUR': { id: 26, name: 'NABEEL' },
  'VILLAREAL': { id: 27, name: 'FAJAS' },
  'WOLVES': { id: 28, name: 'AKSHAYLAL' },
  'LIVERPOOL': { id: 15, name: 'AMEEN K' },
  'FSV MAINZ 05': { id: 13, name: 'KAISER (FASAL)' },
  'JUVENTUS': { id: 14, name: 'VIMAL' },
  'aston villa': { id: 37, name: 'IRFAN' },
  'PSG': { id: 36, name: 'AASHIQUE (DARKSOUL)' },
  'Fulham': { id: 35, name: 'ASHRAF (BLACKSTORM)' }
};

function parseCompetition(str: string) {
  const trimmed = str.trim();
  if (trimmed.includes('>')) {
    const parts = trimmed.split('>');
    const name = parts[0].trim();
    const stage = parts.slice(1).join('>').trim();
    return { name, stage, placement: stage };
  }
  const match = trimmed.match(/^(.*?)\s+(CHAMPION|CHAMP|RUNNERS|RUNNRS|1ST|2ND|3RD|4TH|1st|2nd|3rd|4th|R16|R32|32|KO|KNOCKOUT|QUARTER FINAL|SEMI FINAL|2ND STAGE|WC CHAMPION|WORLD CUP R8|WORLD CUP KO)$/i);
  if (match) {
    return { name: match[1].trim(), stage: match[2].trim(), placement: match[2].trim() };
  }
  return { name: trimmed, stage: '', placement: trimmed };
}

async function syncAllStats() {
  try {
    console.log('=== SYNCHRONIZING ALL MANAGERS WITH COMBINED (SP TOUR + SEASON) STATS ===\n');

    await soloPool.query('BEGIN');

    const { rows: dbSeasons } = await soloPool.query(`SELECT * FROM seasons ORDER BY season_number`);
    const seasonMap = new Map<number, number>();
    dbSeasons.forEach(s => seasonMap.set(s.season_number, s.id));

    const { rows: dbManagers } = await soloPool.query(`
      SELECT m.id, m.name, m.r2g_id, mw.current_club_id
      FROM managers m
      LEFT JOIN manager_wallets mw ON (mw.manager_id = m.id AND mw.season_id = 7)
    `);

    // Fix Beto contract signed value to 80 RC
    await soloPool.query(`
      UPDATE player_contracts
      SET signed_value = 80, salary = 4
      WHERE player_id = (SELECT id FROM players WHERE name ILIKE 'beto%' LIMIT 1)
        AND current_club_id = 23
        AND season_id = 7
    `);
    console.log('Updated Beto contract value to 80 RC in Sepahan SC.');

    let totalUpdated = 0;

    for (const sheetName of workbook.SheetNames) {
      if (sheetName === 'Summary' || sheetName === 'NEW SLOT' || sheetName.startsWith('Sheet') || sheetName === 'AL AHLI' || sheetName === 'BAYER LEVERKUSEN') continue;

      const ws = workbook.Sheets[sheetName];
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      const dbMapping = SHEET_TO_DB_MGR[sheetName];
      if (!dbMapping) continue;

      const managerId = dbMapping.id;
      const dbMgr = dbManagers.find(m => m.id === managerId);
      const clubId = dbMgr ? dbMgr.current_club_id : null;

      for (let r = 50; r < data.length; r++) {
        const row = data[r] || [];
        const rowStr = row.map(c => String(c || '').trim()).join(' ');

        if (rowStr.includes('SESN') && rowStr.includes('MANAGER') && rowStr.includes('RANK')) {
          const rVal1 = data[r + 2] || [];
          const rVal2 = data[r + 3] || [];

          let seasonNum = 0;
          if (rVal2[1] !== undefined && !isNaN(Number(rVal2[1]))) {
            seasonNum = Number(rVal2[1]);
          } else if (rVal1[1] !== undefined && !isNaN(Number(rVal1[1]))) {
            seasonNum = Number(rVal1[1]);
          }

          if (!seasonNum || seasonNum < 1) continue;

          const seasonId = seasonMap.get(seasonNum);
          if (!seasonId) continue;

          let mgrRank: number | null = null;
          if (rVal1[2] !== undefined && !isNaN(Number(rVal1[2]))) {
            mgrRank = Number(rVal1[2]);
          }

          const rankPoints = Number(rVal1[3]) || 0;
          const income = Number(rVal1[4]) || 0;
          const expense = Number(rVal1[5]) || 0;
          const profit = Number(rVal1[6]) || 0;
          const rewards = Number(rVal1[7]) || 0;

          // Helper to get total numbers from end cells (SP TOUR + SEASON)
          const getCombinedStat = (rowIdx: number): number => {
            const rowData = data[rowIdx] || [];
            const endCells = rowData.slice(11).filter(c => typeof c === 'number');
            return endCells.reduce((a, b) => a + b, 0);
          };

          let mp = getCombinedStat(r);
          let w = getCombinedStat(r + 1);
          let d = getCombinedStat(r + 2);
          let l = getCombinedStat(r + 3);
          let gf = getCombinedStat(r + 4);
          let ga = getCombinedStat(r + 5);
          let cs = getCombinedStat(r + 7);

          // For new managers who haven't played in S9 (IRFAN, DARKSOUL, BLACKSTORM with 0 matches)
          if (['aston villa', 'PSG', 'Fulham'].includes(sheetName) && seasonNum === 9) {
            mp = 0;
            w = 0;
            d = 0;
            l = 0;
            gf = 0;
            ga = 0;
            cs = 0;
          }

          const compsObj: { [key: string]: { name: string; stage: string; placement: string } } = {};
          const awds: string[] = [];

          for (let subR = r + 2; subR <= r + 8 && subR < data.length; subR++) {
            const subRow = data[subR] || [];
            for (let c = 2; c < Math.min(subRow.length, 12); c++) {
              const cell = String(subRow[c] || '').trim();
              if (!cell || cell === 'i' || cell === '-' || cell.startsWith('#')) continue;

              const isAward = cell.includes('G. Boot') || cell.includes('G. Glove') || cell.includes('G.Boot') || cell.includes('G.Glove') || cell.includes('Boot & Glove') || cell.includes('TOP SCORER') || cell.includes('PLAYER OF SEASON') || cell.includes('POTS') || cell.includes('BEST') || cell.includes('GOLDEN');
              const isComp = !isAward && (cell.includes('DIVISION') || cell.includes('UCL') || cell.includes('UEL') || cell.includes('UCEL') || cell.includes('SUPER CUP') || cell.includes('KINGS') || cell.includes('AUTHENTIC') || cell.includes('CHAMP') || cell.includes('RUNNRS') || cell.includes('INTER CLASH') || cell.includes('WORLD CUP') || cell.includes('SHOW DOWN') || cell.includes('SEMI FINAL') || cell.includes('QUARTER FINAL') || cell.includes('RUNNERS') || cell.includes('SUPER LEAGUE') || cell.includes('ELITE CUP') || cell.includes('CLUB WC'));

              if (isAward) {
                if (!awds.includes(cell)) awds.push(cell);
              } else if (isComp) {
                compsObj[cell] = parseCompetition(cell);
              }
            }
          }

          // Check if record exists
          const { rows: existingRows } = await soloPool.query(`
            SELECT id FROM manager_seasons 
            WHERE manager_id = $1 AND season_id = $2
          `, [managerId, seasonId]);

          if (existingRows.length > 0) {
            await soloPool.query(`
              UPDATE manager_seasons
              SET 
                matches_played = $1,
                wins = $2,
                draws = $3,
                losses = $4,
                goals_scored = $5,
                goals_conceded = $6,
                clean_sheets = $7,
                rank_points = $8,
                manager_rank = $9,
                team_income = $10,
                team_expense = $11,
                team_profit = $12,
                session_rewards = $13,
                awards = $14::jsonb,
                competitions = $15::jsonb
              WHERE id = $16
            `, [
              mp, w, d, l, gf, ga, cs,
              rankPoints, mgrRank,
              income, expense, profit, rewards,
              JSON.stringify(awds), JSON.stringify(compsObj),
              existingRows[0].id
            ]);
            totalUpdated++;
          } else {
            await soloPool.query(`
              INSERT INTO manager_seasons (
                manager_id, season_id, club_id,
                matches_played, wins, draws, losses,
                goals_scored, goals_conceded, clean_sheets,
                rank_points, manager_rank,
                team_income, team_expense, team_profit, session_rewards,
                awards, competitions
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb, $18::jsonb)
            `, [
              managerId, seasonId, clubId,
              mp, w, d, l, gf, ga, cs,
              rankPoints, mgrRank,
              income, expense, profit, rewards,
              JSON.stringify(awds), JSON.stringify(compsObj)
            ]);
            totalUpdated++;
          }
        }
      }
    }

    await soloPool.query('COMMIT');
    console.log(`✅ Synchronized ${totalUpdated} season records with full combined stats!`);

  } catch (err) {
    await soloPool.query('ROLLBACK');
    console.error('Sync failed:', err);
  } finally {
    await soloPool.end();
  }
}

syncAllStats();
