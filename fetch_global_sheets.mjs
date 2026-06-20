import https from 'https';
import fs from 'fs';

const url = 'https://docs.google.com/spreadsheets/d/1DO93v-xB2cPZn31-drgOggeVFgaH-0V0XLPjhfkB5Ek/htmlview';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    // Regex to match sheet IDs and names in the Google Sheets HTML
    const regex = /{gid:"?(\d+)"?,name:"?([^"]+)"?/g;
    const sheets = [];
    let match;
    while ((match = regex.exec(data)) !== null) {
      sheets.push({ gid: match[1], name: match[2] });
    }
    console.log(`Found ${sheets.length} sheets`);
    fs.writeFileSync('sheets.json', JSON.stringify(sheets, null, 2));
    
    // Download each sheet as CSV
    for (const sheet of sheets) {
      const csvUrl = `https://docs.google.com/spreadsheets/d/1DO93v-xB2cPZn31-drgOggeVFgaH-0V0XLPjhfkB5Ek/export?format=csv&gid=${sheet.gid}`;
      https.get(csvUrl, (csvRes) => {
        let csvData = '';
        csvRes.on('data', (c) => { csvData += c; });
        csvRes.on('end', () => {
          fs.writeFileSync(`global_players_${sheet.name}.csv`, csvData);
          console.log(`Saved ${sheet.name}.csv`);
        });
      });
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
