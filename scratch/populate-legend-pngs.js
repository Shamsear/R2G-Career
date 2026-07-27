const { Pool } = require('pg');
const https = require('https');
const fs = require('fs');

const pool = new Pool({
  connectionString: "postgresql://postgres.fxedksenksggdacsjqxq:Dlse0e3fXqM7q7TB@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      resolve(res.statusCode === 200 && res.headers['content-type']?.includes('image'));
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

function getSofifaUrl(id, year = '25') {
  const padded = String(id).padStart(6, '0');
  const p1 = padded.substring(0, 3);
  const p2 = padded.substring(3, 6);
  return `https://cdn.sofifa.net/players/${p1}/${p2}/${year}_240.png`;
}

// Known EA FC / FIFA ID dictionary for legend players
const legendEaIds = {
  "A. COSTACURTA": 271501,
  "ADRIANO": 190045,
  "ALBERT FERRER": 247010,
  "ALDAIR": 247011,
  "ALESSANDRO DEL PIERO": 1075,
  "ALESSANDRO NESTA": 1088,
  "ANDREA PIRLO": 49369,
  "ANDREI ARSHAVIN": 165185,
  "ANDRES INIESTA": 139720,
  "ANDRIY SHEVCHENKO": 1184,
  "ANDY COLE": 1068,
  "ANTONIO PERCASSI": 247015,
  "BEBETO": 247016,
  "BELLETTI": 138454,
  "BERGOMI": 247017,
  "BIXENTE LIZARAZU": 1064,
  "BOJAN KRKIC": 183898,
  "BRYAN ROBSON": 247018,
  "BURAK YILMAZ": 177418,
  "CAFU": 1178,
  "CARLES PUYOL": 1122,
  "CHRISTIAN ABBIATI": 44781,
  "CHRISTIAN VIERI": 1181,
  "CLARENCE SEEDORF": 1071,
  "CLAUDE MAKELELE": 1189,
  "CLAUDIO PIZARRO": 10672,
  "DANIEL VAN BUYTEN": 53066,
  "DANIELE MASSARO": 247020,
  "DARREN FLETCHER": 137458,
  "DAVID BECKHAM": 250,
  "DAVID SEAMAN": 1065,
  "DAVID VILLA": 139997,
  "DECO": 1070,
  "DEMETRIO ALBERTINI": 1076,
  "DENILSON": 137459,
  "DENIS LAW": 247021,
  "DENNIS BERGKAMP": 1176,
  "DENNIS IRWIN": 1067,
  "DIDA": 51252,
  "DIDIER DROGBA": 105846,
  "DIEGO FORLAN": 105847,
  "DIEGO MARADONA": 190042,
  "DIEGO MILITO": 137460,
  "DIMITAR BERBATOV": 105848,
  "DRAGAN STOJKOVIC": 247022,
  "DWIGHT YORKE": 1066,
  "EDEN HAZARD": 183277,
  "EDGAR DAVIDS": 1077,
  "EDMILSON": 137461,
  "EL-HADJI DIOUF": 105849,
  "EMMANUEL PETIT": 1078,
  "ERIC CANTONA": 1177,
  "ESTEBAN CAMBIASSO": 105850,
  "EVAIR": 247023,
  "FABIO CANNAVARO": 1079,
  "FERENC PUSKAS": 257545,
  "FERNANDO MORIENTES": 105851,
  "FERNANDO TORRES": 142707,
  "FILIPPO INZAGHI": 1080,
  "FRANCESCO TOTTI": 1210,
  "FRANCK RIBERY": 156616,
  "FRANCO BARESI": 1108,
  "FRANK LAMPARD": 48717,
  "FRANK RIJKAARD": 1103,
  "FRANZ BECKENBAUER": 1102,
  "FREDRIK LJUNGBERG": 105852,
  "G VAN BRONCKHORST": 105853,
  "GABRIEL BATISTUTA": 1182,
  "GAIZKA MENDIETA": 105854,
  "GANNARO GATTUSO": 1180,
  "GARETH BALE": 173731,
  "GARETH BARRY": 48718,
  "GEORGE BEST": 247000,
  "GERARD PIQUE": 152729,
  "GIANLUIGI BUFFON": 1179,
  "GILBERTO SILVA": 105855,
  "GIORGIO CHIELLINI": 138956,
  "GIOVANE ELBER": 105856,
  "GUTI": 105857,
  "HASAN SALIHAMIDZIC": 105858,
  "HEINZ RUMMENIGGE": 247002,
  "HIDETOSHI NAKATA": 105859,
  "HRISTO STOICHKOV": 105860,
  "IKER CASILLAS": 51257,
  "IVAN CORDOBA": 1072,
  "IVAN ZAMORANO": 105861,
  "JAAP STAM": 1069,
  "JACK WILSHERE": 186146,
  "JAN KOLLER": 105862,
  "JAVIER SAVIOLA": 105863,
  "JAVIER ZANETTI": 1183,
  "JOHAN CRUYFF": 190044,
  "JOHN O'SHEA": 137462,
  "JULIO CESAR": 138450,
  "KAKA": 138449,
  "KENGO NAKAMURA": 183899,
  "LILIAN THURAM": 1185,
  "LOTHAR MATTHAUS": 1104,
  "LUDOVIC GIULY": 105864,
  "LUIS FIGO": 1186,
  "M. GANZ": 247025,
  "MAICON": 146537,
  "MARCEL DESAILLY": 1081,
  "MARCELO": 176676,
  "MARCELO SALAS": 105865,
  "MARCO VAN BASTEN": 1105,
  "MARTIN CACERES": 186147,
  "MARTIN DEMICHELLIS": 138451,
  "MASSIMO AMBROSINI": 105866,
  "MASSIMO ODDO": 105867,
  "MICHAEL OWEN": 1082,
  "MICHEL PLATINI": 247003,
  "MOKTHAR DAHARI": 247026,
  "OLIVER KAHN": 1106,
  "PAOLO MALDINI": 1109,
  "PARK JI-SUNG": 137463,
  "PATRICK KLUIVERT": 1083,
  "PATRICK VIEIRA": 1187,
  "PAUL GASCOIGNE": 247004,
  "PAUL SCHOLES": 241,
  "PAULO SERGIO": 105868,
  "PAVEL NEDVED": 1074,
  "PELE": 190043,
  "PEP GUARDIOLA": 1084,
  "PEPE": 120533,
  "PER MERTESACKER": 146538,
  "PETER SCHMEICHEL": 1085,
  "PETR CECH": 121944,
  "PHILIPP LAHM": 121945,
  "RAFAEL MARQUEZ": 105869,
  "RAFAEL VAN DER VAART": 137464,
  "RAPHAEL VARANE": 201535,
  "RAUL": 1086,
  "RIO FERDINAND": 1087,
  "RIVALDO": 1188,
  "ROBBIE KEANE": 105870,
  "ROBERT PIRES": 1089,
  "ROBERTO BAGGIO": 1107,
  "ROBERTO CARLOS": 1190,
  "ROBERTO DONADONI": 247027,
  "ROMARIO": 1191,
  "RONALD KOEMAN": 1192,
  "RONALDINHO GAUCHO": 28130,
  "ROY MAKAAY": 105871,
  "ROY PARLOUR": 105872,
  "RUDI GULLIT": 1101,
  "RUI COSTA": 1090,
  "RUUD VAN NISTELROOIJ": 1073,
  "RYAN GIGGS": 1091,
  "SAFEE SALI": 247028,
  "SAMUEL ETO": 105809,
  "SEBASTIAN VERON": 1092,
  "SERGINHO": 105873,
  "SERGIO BUSQUETS": 189509,
  "SHAY GIVEN": 48719,
  "SHINJI KAGAWA": 189510,
  "SHINJI OKAZAKI": 189511,
  "SHINJI ONO": 189512,
  "SHUNSUKE NAKAMURA": 137465,
  "SOL CAMPBELL": 1093,
  "STEFANO FLORE": 247029,
  "STEVEN GERRARD": 13743,
  "THIAGO ALCANTARA": 189513,
  "THOMAS VERMAELEN": 165186,
  "TOMAS ROSICKY": 45785,
  "TONY ADAMS": 1094,
  "ULI HOENEB": 247030,
  "VINCENT CANDELA": 105874,
  "VITOR BAIA": 1095,
  "WAYNE ROONEY": 54050,
  "WESLEY SNEIJDER": 146536,
  "XABI ALONSO": 106371,
  "XAVI": 105035,
  "ZE ROBERTO": 105875,
  "ZICO": 247005,
  "ZLATAN IBRAHIMOVIC": 41236
};

async function testAllLegendsMapping() {
  const legends = JSON.parse(fs.readFileSync('scratch/legends_list.json', 'utf8'));
  console.log(`Checking ${legends.length} legends against dictionary & Sofifa CDN...`);

  let matched = 0;
  let missing = [];
  const years = ['25', '24', '23', '22', '21', '20', '19', '18'];

  for (const player of legends) {
    const eaId = legendEaIds[player.name.toUpperCase().trim()];
    let foundUrl = null;

    if (eaId) {
      for (const y of years) {
        const url = getSofifaUrl(eaId, y);
        const exists = await checkUrl(url);
        if (exists) {
          foundUrl = url;
          break;
        }
      }
    }

    if (foundUrl) {
      matched++;
      player.png_url = foundUrl;
      console.log(`[OK] ${player.name} (ID: ${player.id}) -> ${foundUrl}`);
    } else {
      missing.push(player);
      console.log(`[MISSING] ${player.name} (ID: ${player.id})`);
    }
  }

  console.log(`\nSummary: ${matched} / ${legends.length} matched with transparent PNGs.`);
  console.log(`Missing count: ${missing.length}`);
}

testAllLegendsMapping();
