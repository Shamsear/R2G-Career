const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function searchRepos() {
  const testUrls = [
    "https://raw.githubusercontent.com/datasets/football-players/main/data/players.json",
    "https://raw.githubusercontent.com/FUT-API/fifa-23-db/main/players.json",
    "https://raw.githubusercontent.com/fifa-db/fifa-db/master/data/fifa23/players.json",
    "https://raw.githubusercontent.com/stefan-jovanovic/fifa-card-generator/main/data/players.json"
  ];

  for (const url of testUrls) {
    const data = await fetchUrl(url);
    console.log(`URL: ${url} -> ${data.length} bytes`);
  }
}

searchRepos();
