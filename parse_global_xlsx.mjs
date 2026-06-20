import https from 'https';
import fs from 'fs';
import xlsx from 'xlsx';

const url = 'https://docs.google.com/spreadsheets/d/1DO93v-xB2cPZn31-drgOggeVFgaH-0V0XLPjhfkB5Ek/export?format=xlsx';
const dest = 'global_players.xlsx';

https.get(url, (res) => {
  if (res.statusCode !== 200) {
    if (res.statusCode === 307 || res.statusCode === 302) {
      https.get(res.headers.location, processFile);
    } else {
      console.error(`Failed to get file: ${res.statusCode}`);
    }
    return;
  }
  processFile(res);
});

function processFile(res) {
  const file = fs.createWriteStream(dest);
  res.pipe(file);
  file.on('finish', () => {
    file.close(() => {
      console.log('Downloaded. Parsing...');
      const workbook = xlsx.readFile(dest);
      const allPlayers = [];
      
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
        
        // Typical columns: "S.NO.", "PLAYER NAME", "TEAM NAME", "BASE VALUE", "PLAYER VALUE"
        for (const row of data) {
          const playerName = row['PLAYER NAME'];
          const baseValue = row['BASE VALUE'];
          if (playerName && baseValue && playerName.trim() !== '') {
            allPlayers.push({
              name: playerName.trim(),
              position: sheetName.trim(), // the sheet name is usually the position like GK, CB, etc.
              baseValue: parseInt(baseValue, 10),
            });
          }
        }
      }
      
      fs.writeFileSync('global_players_parsed.json', JSON.stringify(allPlayers, null, 2));
      console.log(`Parsed ${allPlayers.length} total players.`);
    });
  });
}
