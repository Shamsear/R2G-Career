const https = require('https');

function getUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function searchGithubDatasets() {
  console.log("Searching public EA FC player datasets...");
  const urls = [
    "https://raw.githubusercontent.com/mzytn/fifa-23-dataset/main/fifa23data.csv",
    "https://raw.githubusercontent.com/bbruns/fifa23-dataset/main/players_23.csv",
    "https://raw.githubusercontent.com/stephane-monnier/fifa-dataset/master/data/fifa23_players.json"
  ];

  for (const url of urls) {
    const data = await getUrl(url);
    console.log(`URL: ${url} -> Length: ${data.length} bytes`);
  }
}

searchGithubDatasets();
