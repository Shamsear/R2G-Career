const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function testEfhubSearch() {
  const searchTerms = ["Ronaldinho", "Del Piero", "Cruyff", "Maradona", "Beckham", "Pirlo"];

  for (const term of searchTerms) {
    const url = `https://efhub.com/api/search?q=${encodeURIComponent(term)}`;
    console.log(`Searching efhub.com for "${term}"...`);
    const resp = await fetchUrl(url);
    console.log(` -> Response length: ${resp.length}`);
    if (resp.length > 0 && resp.startsWith('{') || resp.startsWith('[')) {
      console.log(" -> Snippet:", resp.substring(0, 200));
    }
  }
}

testEfhubSearch();
