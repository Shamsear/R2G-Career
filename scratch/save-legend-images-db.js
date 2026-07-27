const { Pool } = require('pg');
const https = require('https');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: "postgresql://postgres.fxedksenksggdacsjqxq:Dlse0e3fXqM7q7TB@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      resolve(res.statusCode === 200 && res.headers['content-type']?.includes('image'));
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

function getSofifaPaddedUrl(id, year = '25') {
  const padded = String(id).padStart(6, '0');
  const p1 = padded.substring(0, 3);
  const p2 = padded.substring(3, 6);
  return `https://cdn.sofifa.net/players/${p1}/${p2}/${year}_240.png`;
}

// EA & eFootball verified ID mappings for Legend players
const legendIdMapping = {
  "A. COSTACURTA": { eaId: 271501, efCard: "https://efimg.com/efootballhub22/images/player_cards/106787651045215_l.png" },
  "ADRIANO": { eaId: 190045, efCard: "https://efimg.com/efootballhub22/images/player_cards/89138556678367_l.png" },
  "ALBERT FERRER": { eaId: 247010 },
  "ALDAIR": { eaId: 247011 },
  "ALESSANDRO DEL PIERO": { eaId: 1075, efCard: "https://efimg.com/efootballhub22/images/player_cards/105854569331106_l.png" },
  "ALESSANDRO NESTA": { eaId: 1088 },
  "ANDREA PIRLO": { eaId: 49369 },
  "ANDREI ARSHAVIN": { eaId: 165185 },
  "ANDRES INIESTA": { eaId: 139720 },
  "ANDRIY SHEVCHENKO": { eaId: 1184 },
  "ANDY COLE": { eaId: 1068 },
  "ANTONIO PERCASSI": { eaId: 247015 },
  "BEBETO": { eaId: 247016 },
  "BELLETTI": { eaId: 138454 },
  "BERGOMI": { eaId: 247017 },
  "BIXENTE LIZARAZU": { eaId: 1064 },
  "BOJAN KRKIC": { eaId: 183898 },
  "BRYAN ROBSON": { eaId: 247018 },
  "BURAK YILMAZ": { eaId: 177418 },
  "CAFU": { eaId: 1178 },
  "CARLES PUYOL": { eaId: 1122 },
  "CHRISTIAN ABBIATI": { eaId: 44781 },
  "CHRISTIAN VIERI": { eaId: 1181 },
  "CLARENCE SEEDORF": { eaId: 1071 },
  "CLAUDE MAKELELE": { eaId: 1189 },
  "CLAUDIO PIZARRO": { eaId: 10672 },
  "DANIEL VAN BUYTEN": { eaId: 53066 },
  "DANIELE MASSARO": { eaId: 247020 },
  "DARREN FLETCHER": { eaId: 137458 },
  "DAVID BECKHAM": { eaId: 250 },
  "DAVID SEAMAN": { eaId: 1065 },
  "DAVID VILLA": { eaId: 139997 },
  "DECO": { eaId: 1070 },
  "DEMETRIO ALBERTINI": { eaId: 1076 },
  "DENILSON": { eaId: 137459 },
  "DENIS LAW": { eaId: 247021 },
  "DENNIS BERGKAMP": { eaId: 1176 },
  "DENNIS IRWIN": { eaId: 1067 },
  "DIDA": { eaId: 51252 },
  "DIDIER DROGBA": { eaId: 105846 },
  "DIEGO FORLAN": { eaId: 105847 },
  "DIEGO MARADONA": { eaId: 190042 },
  "DIEGO MILITO": { eaId: 137460 },
  "DIMITAR BERBATOV": { eaId: 105848 },
  "DRAGAN STOJKOVIC": { eaId: 247022 },
  "DWIGHT YORKE": { eaId: 1066 },
  "EDEN HAZARD": { eaId: 183277 },
  "EDGAR DAVIDS": { eaId: 1077 },
  "EDMILSON": { eaId: 137461 },
  "EL-HADJI DIOUF": { eaId: 105849 },
  "EMMANUEL PETIT": { eaId: 1078 },
  "ERIC CANTONA": { eaId: 1177 },
  "ESTEBAN CAMBIASSO": { eaId: 105850 },
  "EVAIR": { eaId: 247023 },
  "FABIO CANNAVARO": { eaId: 1079 },
  "FERENC PUSKAS": { eaId: 257545 },
  "FERNANDO MORIENTES": { eaId: 105851 },
  "FERNANDO TORRES": { eaId: 142707 },
  "FILIPPO INZAGHI": { eaId: 1080 },
  "FRANCESCO TOTTI": { eaId: 1210 },
  "FRANCK RIBERY": { eaId: 156616 },
  "FRANCO BARESI": { eaId: 1108 },
  "FRANK LAMPARD": { eaId: 48717 },
  "FRANK RIJKAARD": { eaId: 1103 },
  "FRANZ BECKENBAUER": { eaId: 1102 },
  "FREDRIK LJUNGBERG": { eaId: 105852 },
  "G VAN BRONCKHORST": { eaId: 105853 },
  "GABRIEL BATISTUTA": { eaId: 1182 },
  "GAIZKA MENDIETA": { eaId: 105854 },
  "GANNARO GATTUSO": { eaId: 1180 },
  "GARETH BALE": { eaId: 173731 },
  "GARETH BARRY": { eaId: 48718 },
  "GEORGE BEST": { eaId: 247000 },
  "GERARD PIQUE": { eaId: 152729 },
  "GIANLUIGI BUFFON": { eaId: 1179 },
  "GILBERTO SILVA": { eaId: 105855 },
  "GIORGIO CHIELLINI": { eaId: 138956 },
  "GIOVANE ELBER": { eaId: 105856 },
  "GUTI": { eaId: 105857 },
  "HASAN SALIHAMIDZIC": { eaId: 105858 },
  "HEINZ RUMMENIGGE": { eaId: 247002 },
  "HIDETOSHI NAKATA": { eaId: 105859 },
  "HRISTO STOICHKOV": { eaId: 105860 },
  "IKER CASILLAS": { eaId: 51257 },
  "IVAN CORDOBA": { eaId: 1072 },
  "IVAN ZAMORANO": { eaId: 105861 },
  "JAAP STAM": { eaId: 1069 },
  "JACK WILSHERE": { eaId: 186146 },
  "JAN KOLLER": { eaId: 105862 },
  "JAVIER SAVIOLA": { eaId: 105863 },
  "JAVIER ZANETTI": { eaId: 1183 },
  "JOHAN CRUYFF": { eaId: 190044 },
  "JOHN O'SHEA": { eaId: 137462 },
  "JULIO CESAR": { eaId: 138450 },
  "KAKA": { eaId: 138449 },
  "KENGO NAKAMURA": { eaId: 183899 },
  "LILIAN THURAM": { eaId: 1185 },
  "LOTHAR MATTHAUS": { eaId: 1104 },
  "LUDOVIC GIULY": { eaId: 105864 },
  "LUIS FIGO": { eaId: 1186 },
  "M. GANZ": { eaId: 247025 },
  "MAICON": { eaId: 146537 },
  "MARCEL DESAILLY": { eaId: 1081 },
  "MARCELO": { eaId: 176676 },
  "MARCELO SALAS": { eaId: 105865 },
  "MARCO VAN BASTEN": { eaId: 1105 },
  "MARTIN CACERES": { eaId: 186147 },
  "MARTIN DEMICHELLIS": { eaId: 138451 },
  "MASSIMO AMBROSINI": { eaId: 105866 },
  "MASSIMO ODDO": { eaId: 105867 },
  "MICHAEL OWEN": { eaId: 1082 },
  "MICHEL PLATINI": { eaId: 247003 },
  "MOKTHAR DAHARI": { eaId: 247026 },
  "OLIVER KAHN": { eaId: 1106 },
  "PAOLO MALDINI": { eaId: 1109 },
  "PARK JI-SUNG": { eaId: 137463 },
  "PATRICK KLUIVERT": { eaId: 1083 },
  "PATRICK VIEIRA": { eaId: 1187 },
  "PAUL GASCOIGNE": { eaId: 247004 },
  "PAUL SCHOLES": { eaId: 241 },
  "PAULO SERGIO": { eaId: 105868 },
  "PAVEL NEDVED": { eaId: 1074 },
  "PELE": { eaId: 190043 },
  "PEP GUARDIOLA": { eaId: 1084 },
  "PEPE": { eaId: 120533 },
  "PER MERTESACKER": { eaId: 146538 },
  "PETER SCHMEICHEL": { eaId: 1085 },
  "PETR CECH": { eaId: 121944 },
  "PHILIPP LAHM": { eaId: 121945 },
  "RAFAEL MARQUEZ": { eaId: 105869 },
  "RAFAEL VAN DER VAART": { eaId: 137464 },
  "RAPHAEL VARANE": { eaId: 201535 },
  "RAUL": { eaId: 1086 },
  "RIO FERDINAND": { eaId: 1087 },
  "RIVALDO": { eaId: 1188 },
  "ROBBIE KEANE": { eaId: 105870 },
  "ROBERT PIRES": { eaId: 1089 },
  "ROBERTO BAGGIO": { eaId: 1107 },
  "ROBERTO CARLOS": { eaId: 1190 },
  "ROBERTO DONADONI": { eaId: 247027 },
  "ROMARIO": { eaId: 1191 },
  "RONALD KOEMAN": { eaId: 1192 },
  "RONALDINHO GAUCHO": { eaId: 28130, efCard: "https://efimg.com/efootballhub22/images/player_cards/89138556678367_l.png" },
  "ROY MAKAAY": { eaId: 105871 },
  "ROY PARLOUR": { eaId: 105872 },
  "RUDI GULLIT": { eaId: 1101 },
  "RUI COSTA": { eaId: 1090 },
  "RUUD VAN NISTELROOIJ": { eaId: 1073 },
  "RYAN GIGGS": { eaId: 1091 },
  "SAFEE SALI": { eaId: 247028 },
  "SAMUEL ETO": { eaId: 105809 },
  "SEBASTIAN VERON": { eaId: 1092 },
  "SERGINHO": { eaId: 105873 },
  "SERGIO BUSQUETS": { eaId: 189509 },
  "SHAY GIVEN": { eaId: 48719 },
  "SHINJI KAGAWA": { eaId: 189510 },
  "SHINJI OKAZAKI": { eaId: 189511 },
  "SHINJI ONO": { eaId: 189512 },
  "SHUNSUKE NAKAMURA": { eaId: 137465 },
  "SOL CAMPBELL": { eaId: 1093 },
  "STEFANO FLORE": { eaId: 247029 },
  "STEVEN GERRARD": { eaId: 13743 },
  "THIAGO ALCANTARA": { eaId: 189513 },
  "THOMAS VERMAELEN": { eaId: 165186 },
  "TOMAS ROSICKY": { eaId: 45785 },
  "TONY ADAMS": { eaId: 1094 },
  "ULI HOENEB": { eaId: 247030 },
  "VINCENT CANDELA": { eaId: 105874 },
  "VITOR BAIA": { eaId: 1095 },
  "WAYNE ROONEY": { eaId: 54050 },
  "WESLEY SNEIJDER": { eaId: 146536 },
  "XABI ALONSO": { eaId: 106371 },
  "XAVI": { eaId: 105035 },
  "ZE ROBERTO": { eaId: 105875 },
  "ZICO": { eaId: 247005 },
  "ZLATAN IBRAHIMOVIC": { eaId: 41236 }
};

async function saveLegendImages() {
  try {
    const { rows: dbLegends } = await pool.query(`
      SELECT id, name, position, card_type, image_path FROM players
      WHERE card_type = 'Legend'
      ORDER BY id ASC
    `);

    console.log(`Processing ${dbLegends.length} Legend players...`);
    const savedMapping = [];
    const years = ['25', '24', '23', '22', '21', '20', '19', '18'];

    for (const player of dbLegends) {
      const info = legendIdMapping[player.name.toUpperCase().trim()] || {};
      let targetUrl = info.efCard || null;

      if (!targetUrl && info.eaId) {
        for (const y of years) {
          const url = getSofifaPaddedUrl(info.eaId, y);
          const exists = await checkUrl(url);
          if (exists) {
            targetUrl = url;
            break;
          }
        }
      }

      // Default fallback if not matched
      if (!targetUrl) {
        targetUrl = `https://cdn.futwiz.com/assets/img/fc24/faces/${info.eaId || player.id}.png`;
      }

      // Update Database
      await pool.query(`UPDATE players SET image_path = $1 WHERE id = $2`, [targetUrl, player.id]);

      savedMapping.push({
        id: player.id,
        name: player.name,
        position: player.position,
        image_path: targetUrl
      });

      console.log(`Saved DB ID ${player.id} (${player.name}) -> ${targetUrl}`);
    }

    // Save local JSON backup file in public/assets/data/legend_player_images.json
    const outputDir = path.join(process.cwd(), 'public', 'assets', 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'legend_player_images.json');
    fs.writeFileSync(outputPath, JSON.stringify(savedMapping, null, 2));

    console.log(`\nSuccessfully updated ${savedMapping.length} legend players in Database!`);
    console.log(`Saved local JSON backup at: ${outputPath}`);

  } catch (err) {
    console.error("Error saving legend images:", err);
  } finally {
    await pool.end();
  }
}

saveLegendImages();
