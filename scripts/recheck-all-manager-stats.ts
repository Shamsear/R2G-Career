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

function extractTrophiesCount(competitionsRaw: any): number {
  if (!competitionsRaw) return 0;
  const compsArray = Array.isArray(competitionsRaw) ? competitionsRaw : [competitionsRaw];
  let count = 0;
  for (const compData of compsArray) {
    if (!compData || typeof compData !== 'object') continue;
    for (const [key, details] of Object.entries(compData)) {
      const k = key.toUpperCase();
      const det = (details && typeof details === 'object') ? JSON.stringify(details).toUpperCase() : '';
      const isWinner =
        k.includes('CHAMPION') || k.includes('CHAMP') || k.includes('1ST') || k.includes('WINNER') ||
        det.includes('CHAMPION') || det.includes('CHAMP') || det.includes('1ST') || det.includes('WINNER');
      if (isWinner) count++;
    }
  }
  return count;
}

function extractAwardsCount(awardsRaw: any): number {
  if (!awardsRaw) return 0;
  const awardsArray = Array.isArray(awardsRaw) ? awardsRaw : [awardsRaw];
  let count = 0;
  for (const a of awardsArray) {
    if (Array.isArray(a)) count += a.length;
    else if (typeof a === 'string' && a.trim().length > 0) count++;
  }
  return count;
}

async function runCompleteRecheck() {
  try {
    console.log('=== COMPLETE RE-AUDIT OF ALL MANAGER STATS ===\n');

    // 1. Fetch DB Career Aggregates (same query as fetchManagerByName / fetchManagers)
    const { rows: dbCareerStats } = await soloPool.query(`
      SELECT 
        m.id,
        m.name,
        m.r2g_id,
        c.name as club_name,
        COALESCE(SUM(ms.matches_played), 0)::int as total_matches,
        COALESCE(SUM(ms.wins), 0)::int as total_wins,
        COALESCE(SUM(ms.draws), 0)::int as total_draws,
        COALESCE(SUM(ms.losses), 0)::int as total_losses,
        COALESCE(SUM(ms.goals_scored), 0)::int as total_gf,
        COALESCE(SUM(ms.goals_conceded), 0)::int as total_ga,
        COALESCE(SUM(ms.clean_sheets), 0)::int as total_cs,
        ROUND(COALESCE(SUM(CAST(COALESCE(ms.rank_points, '0') AS NUMERIC)), 0), 1) as total_rp,
        json_agg(ms.competitions) FILTER (WHERE ms.competitions IS NOT NULL) as competitions_raw,
        json_agg(ms.awards) FILTER (WHERE ms.awards IS NOT NULL) as awards_raw
      FROM managers m
      LEFT JOIN manager_wallets mw ON (mw.manager_id = m.id AND mw.season_id = 7)
      LEFT JOIN clubs c ON mw.current_club_id = c.id
      LEFT JOIN manager_seasons ms ON ms.manager_id = m.id
      WHERE m.is_active IS NOT FALSE
      GROUP BY m.id, m.name, m.r2g_id, c.name
      ORDER BY m.id
    `);

    // 2. Fetch all individual manager_seasons
    const { rows: dbSeasons } = await soloPool.query(`
      SELECT ms.*, s.season_number
      FROM manager_seasons ms
      JOIN seasons s ON ms.season_id = s.id
      ORDER BY ms.manager_id, s.season_number
    `);

    // 3. Parse Excel Sheets
    let totalCheckedManagers = 0;
    let totalSeasonBlocksChecked = 0;
    let careerDiscrepancies = 0;
    let seasonDiscrepancies = 0;

    console.log('---------------------------------------------------------------------------------------------------------------------------------');
    console.log(
      'Manager'.padEnd(20) +
      'Club'.padEnd(20) +
      'Matches (Ex/DB)'.padEnd(18) +
      'Record (W-D-L)'.padEnd(22) +
      'Goals (GF/GA)'.padEnd(18) +
      'CS (Ex/DB)'.padEnd(14) +
      'RP (Ex/DB)'.padEnd(18) +
      'Status'
    );
    console.log('---------------------------------------------------------------------------------------------------------------------------------');

    for (const sheetName of workbook.SheetNames) {
      if (sheetName === 'Summary' || sheetName === 'NEW SLOT' || sheetName.startsWith('Sheet') || sheetName === 'AL AHLI' || sheetName === 'BAYER LEVERKUSEN') continue;

      const ws = workbook.Sheets[sheetName];
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      const dbMapping = SHEET_TO_DB_MGR[sheetName];
      if (!dbMapping) continue;

      totalCheckedManagers++;

      // Extract Header / Summary Career Stats from Excel
      let exMatches = 0, exWins = 0, exDraws = 0, exLosses = 0, exGf = 0, exGa = 0, exCs = 0;
      let exTrophies = 0, exAwards = 0;

      for (let r = 0; r < Math.min(data.length, 55); r++) {
        const row = data[r] || [];
        const rowStr = row.map(c => String(c || '').trim()).join(' ');

        if (rowStr.includes('TROPHY & AWARDS')) {
          const nums = row.filter(c => typeof c === 'number');
          if (nums.length >= 2) {
            exTrophies = nums[0];
            exAwards = nums[1];
          }
        }

        for (let c = 0; c < row.length; c++) {
          const cell = String(row[c] || '').trim();
          if (cell === 'MATCH') exMatches = Number(row[c + 2]) || Number(row[c + 1]) || 0;
          if (cell === 'WIN') exWins = Number(row[c + 2]) || Number(row[c + 1]) || 0;
          if (cell === 'DRAW') exDraws = Number(row[c + 2]) || Number(row[c + 1]) || 0;
          if (cell === 'LOSE') exLosses = Number(row[c + 2]) || Number(row[c + 1]) || 0;
          if (cell === 'GF') exGf = Number(row[c + 2]) || Number(row[c + 1]) || 0;
          if (cell === 'GA') exGa = Number(row[c + 2]) || Number(row[c + 1]) || 0;
          if (cell === 'CS') exCs = Number(row[c + 2]) || Number(row[c + 1]) || 0;
        }
      }

      // Find DB Career Row
      const dbRow = dbCareerStats.find(m => m.id === dbMapping.id);
      const dbMatches = dbRow ? dbRow.total_matches : 0;
      const dbWins = dbRow ? dbRow.total_wins : 0;
      const dbDraws = dbRow ? dbRow.total_draws : 0;
      const dbLosses = dbRow ? dbRow.total_losses : 0;
      const dbGf = dbRow ? dbRow.total_gf : 0;
      const dbGa = dbRow ? dbRow.total_ga : 0;
      const dbCs = dbRow ? dbRow.total_cs : 0;
      const dbRp = dbRow ? Number(dbRow.total_rp) : 0;

      // Extract Season blocks from Excel and sum Excel RP
      let exSumRp = 0;
      const excelSeasons: any[] = [];

      for (let r = 50; r < data.length; r++) {
        const row = data[r] || [];
        const rowStr = row.map(c => String(c || '').trim()).join(' ');

        if (rowStr.includes('SESN') && rowStr.includes('MANAGER') && rowStr.includes('RANK')) {
          totalSeasonBlocksChecked++;
          const rVal1 = data[r + 2] || [];
          const rVal2 = data[r + 3] || [];

          let seasonNum = 0;
          if (rVal2[1] !== undefined && !isNaN(Number(rVal2[1]))) {
            seasonNum = Number(rVal2[1]);
          } else if (rVal1[1] !== undefined && !isNaN(Number(rVal1[1]))) {
            seasonNum = Number(rVal1[1]);
          }

          if (!seasonNum || seasonNum < 1) continue;

          const rankPoints = Number(rVal1[3]) || 0;
          exSumRp += rankPoints;

          const getStatVal = (rowIdx: number): { total: number; sp: number; regular: number } => {
            const rowData = data[rowIdx] || [];
            const nums = rowData.slice(11).filter((c: any) => typeof c === 'number');
            if (nums.length === 0) return { total: 0, sp: 0, regular: 0 };
            if (nums.length === 1) return { total: nums[0], sp: 0, regular: nums[0] };
            // If 2 numbers in the stat columns:
            // First is SP Tour, second is Regular Season
            const sp = nums[0];
            const regular = nums[1];
            return { total: sp + regular, sp, regular };
          };

          const mp = getStatVal(r).total;
          const w = getStatVal(r + 1).total;
          const d = getStatVal(r + 2).total;
          const l = getStatVal(r + 3).total;
          const gf = getStatVal(r + 4).total;
          const ga = getStatVal(r + 5).total;
          const gd = getStatVal(r + 6).total;
          const cs = getStatVal(r + 7).total;

          excelSeasons.push({ seasonNum, rankPoints, mp, w, d, l, gf, ga, cs });
        }
      }

      exSumRp = Math.round(exSumRp * 10) / 10;

      // Compare Career Totals
      const isMatchesMatch = dbMatches === exMatches;
      const isWdlMatch = dbWins === exWins && dbDraws === exDraws && dbLosses === exLosses;
      const isGoalsMatch = dbGf === exGf && dbGa === exGa;
      const isCsMatch = dbCs === exCs;
      const isRpMatch = Math.abs(dbRp - exSumRp) <= 0.1;

      const isCareerMatch = isMatchesMatch && isWdlMatch && isGoalsMatch && isCsMatch && isRpMatch;
      if (!isCareerMatch) careerDiscrepancies++;

      const statusIcon = isCareerMatch ? '✅' : '❌';

      console.log(
        `${statusIcon} ${dbMapping.name}`.padEnd(20) +
        `${(dbRow?.club_name || sheetName)}`.padEnd(20) +
        `${exMatches} / ${dbMatches}`.padEnd(18) +
        `${exWins}-${exDraws}-${exLosses} / ${dbWins}-${dbDraws}-${dbLosses}`.padEnd(22) +
        `${exGf}-${exGa} / ${dbGf}-${dbGa}`.padEnd(18) +
        `${exCs} / ${dbCs}`.padEnd(14) +
        `${exSumRp} / ${dbRp}`.padEnd(18) +
        (isCareerMatch ? 'MATCH' : 'MISMATCH')
      );

      // Check each season record
      const mgrDbSeasons = dbSeasons.filter(s => s.manager_id === dbMapping.id);
      for (const es of excelSeasons) {
        const ds = mgrDbSeasons.find(s => s.season_number === es.seasonNum);
        if (!ds) {
          console.log(`    ❌ Season ${es.seasonNum} missing in DB!`);
          seasonDiscrepancies++;
        } else {
          const sRp = Number(ds.rank_points) || 0;
          if (Math.abs(sRp - es.rankPoints) > 0.01 || ds.matches_played !== es.mp || ds.wins !== es.w || ds.draws !== es.d || ds.losses !== es.l || ds.goals_scored !== es.gf || ds.goals_conceded !== es.ga || ds.clean_sheets !== es.cs) {
            console.log(`    ⚠️ Season ${es.seasonNum} mismatch: DB=(${ds.matches_played}MP, ${ds.wins}W-${ds.draws}D-${ds.losses}L, ${ds.goals_scored}GF, ${ds.goals_conceded}GA, ${ds.clean_sheets}CS, ${sRp}RP) vs Excel=(${es.mp}MP, ${es.w}W-${es.d}D-${es.l}L, ${es.gf}GF, ${es.ga}GA, ${es.cs}CS, ${es.rankPoints}RP)`);
            seasonDiscrepancies++;
          }
        }
      }
    }

    console.log('---------------------------------------------------------------------------------------------------------------------------------');
    console.log(`Total Active Managers Audited: ${totalCheckedManagers}`);
    console.log(`Total Season Blocks Checked: ${totalSeasonBlocksChecked}`);
    console.log(`Career Stats Discrepancies: ${careerDiscrepancies}`);
    console.log(`Per-Season Discrepancies: ${seasonDiscrepancies}`);
    if (careerDiscrepancies === 0 && seasonDiscrepancies === 0) {
      console.log(`\n🎉 100% PERFECT MATCH ACROSS ALL MANAGERS, ALL SEASONS, AND ALL CAREER TOTALS!`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await soloPool.end();
  }
}

runCompleteRecheck();
