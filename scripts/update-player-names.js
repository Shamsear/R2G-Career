const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const updates = [
  { id: 15, name: 'MICHY BATSHUAYI' },
  { id: 16, name: 'VANJA MILINKOVIC-SAVIC' },
  { id: 19, name: 'GIANLUCA MANCINI' },
  { id: 42, name: 'GIANLUIGI DONNARUMMA' },
  { id: 59, name: 'ALISSON' },
  { id: 74, name: 'CESAR AZPILICUETA' },
  { id: 76, name: 'ALESSANDRO BUONGIORNO' },
  { id: 131, name: 'OLIVIER GIROUD' },
  { id: 136, name: 'TAYLOR HARWOOD-BELLIS' },
  { id: 151, name: 'KHVICHA KVARATSKHELIA' },
  { id: 164, name: 'BAFODE DIAKITE' },
  { id: 185, name: 'MARC-ANDRE TER STEGEN' },
  { id: 187, name: 'ANTOINE SEMENYO' },
  { id: 216, name: 'YERAY' },
  { id: 227, name: 'TRENT ALEXANDER-ARNOLD' },
  { id: 272, name: 'HEUNG MIN SON' },
  { id: 280, name: 'KANGIN LEE' },
  { id: 293, name: 'DOMINIC CALVERT-LEWIN' },
  { id: 296, name: 'MIN JAE KIM' },
  { id: 297, name: 'PIERRE-EMERICK AUBAMEYANG' },
  { id: 305, name: 'KONSTANTINOS MAVROPANOS' },
  { id: 323, name: 'LUCAS MARTINEZ QUARTA' },
  { id: 399, name: 'DESIRE DOUE' },
  { id: 403, name: 'WILMAR BARRIOS' },
  { id: 405, name: 'ALEKSANDAR PAVLOVIC' },
  { id: 407, name: 'YOUSSEF EN-NESYRI' },
  { id: 419, name: 'GIORGIAN DE ARRASCAETA' },
  { id: 444, name: 'ALEXANDRE LACAZETTE' },
  { id: 470, name: 'ELJIF ELMAS' },
  { id: 476, name: 'PAPE MATAR SARR' },
  { id: 496, name: 'FEDERICO BERNARDESCHI' },
  { id: 516, name: 'MAXIMILIAN KILMAN' },
  { id: 528, name: 'ERIC MAXIM CHOUPO-MOTING' },
  { id: 563, name: 'EDERSON' },
  { id: 569, name: 'KEYLOR NAVAS' },
  { id: 577, name: 'DJORDJE PETROVIC' },
  { id: 618, name: 'ROGER IBANEZ' },
  { id: 638, name: 'CHANCEL MBEMBA' },
  { id: 643, name: 'REINILDO' },
  { id: 662, name: 'NUNO TAVARES' },
  { id: 665, name: 'MAXIMILIAN MITTELSTADT' },
  { id: 753, name: 'ANDRE-FRANK ZAMBO ANGUISSA' },
  { id: 757, name: 'PASCAL GROSS' },
  { id: 765, name: 'RODRIGO BENTANCUR' },
  { id: 774, name: 'SERGEJ MILINKOVIC-SAVIC' },
  { id: 775, name: 'FRANCK KESSIE' },
  { id: 783, name: 'KIERNAN DEWSBURY-HALL' },
  { id: 790, name: 'JAMES WARD-PROWSE' },
  { id: 795, name: 'PIERRE-EMILE HOJBJERG' },
  { id: 821, name: 'GABRI VEIGA' },
  { id: 867, name: 'MAXIMILIANO ARAUJO' },
  { id: 889, name: 'FRANCISCO TRINCAO' },
  { id: 898, name: 'BARIS ALPER YILMAZ' },
  { id: 905, name: 'ERIC MAXIM CHOUPO-MOTING' },
  { id: 940, name: 'SAMU OMORODION' },
  { id: 945, name: 'ARKADIUSZ MILIK' }
];

async function updatePlayerNames() {
  try {
    for (const p of updates) {
      await pool.query('UPDATE players SET name = $1 WHERE id = $2', [p.name, p.id]);
      console.log(`Updated ID ${p.id} to ${p.name}`);
    }
    console.log('Finished updating player names!');
  } catch (err) {
    console.error('Error updating player names:', err);
  } finally {
    await pool.end();
  }
}

updatePlayerNames();
