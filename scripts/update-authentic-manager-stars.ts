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

function parseStarRating(cellStr: string): number {
  if (!cellStr) return 0;
  const s = cellStr.trim();
  if (s === '☆☆ ☆ ☆☆' || s === '★★ ★ ★★') return 6; // Special tier
  const starCount = (s.match(/[☆★]/g) || []).length;
  return starCount;
}

async function updateStars() {
  try {
    console.log('=== UPDATING AUTHENTIC MANAGER STARS FROM EXCEL ===\n');

    const updates: { id: number; name: string; starsStr: string; starNum: number }[] = [];

    for (const sheetName of workbook.SheetNames) {
      if (['Summary', 'NEW SLOT', 'AL AHLI', 'BAYER LEVERKUSEN'].includes(sheetName) || sheetName.startsWith('Sheet')) continue;
      const ws = workbook.Sheets[sheetName];
      if (!ws) continue;

      const mapping = SHEET_TO_DB_MGR[sheetName];
      if (!mapping) continue;

      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      let starsStr = '';
      for (let r = 0; r < 20; r++) {
        const row = data[r] || [];
        const str = row.join(' ');
        if (str.includes('MANAGER RATING')) {
          const starCol = row.find(c => typeof c === 'string' && (c.includes('☆') || c.includes('★')));
          if (starCol) starsStr = String(starCol).trim();
          break;
        }
      }

      const starNum = parseStarRating(starsStr);
      updates.push({ id: mapping.id, name: mapping.name, starsStr, starNum });
    }

    console.log(`Found ${updates.length} manager star ratings to apply.`);

    const { rows: activeSeason } = await soloPool.query(`SELECT id FROM seasons WHERE is_active = true LIMIT 1`);
    const activeSeasonId = activeSeason[0]?.id;

    for (const u of updates) {
      await soloPool.query(`
        UPDATE manager_wallets
        SET star_rating = $1
        WHERE manager_id = $2 AND season_id = $3
      `, [u.starNum, u.id, activeSeasonId]);

      console.log(`Updated ${u.name.padEnd(20)} -> ${u.starNum} stars (from '${u.starsStr}')`);
    }

    console.log('\n✅ Successfully updated all manager star ratings in active season!');
  } catch (err) {
    console.error('Error updating stars:', err);
  } finally {
    await soloPool.end();
  }
}

updateStars();
