const https = require('https');

function fetchHtml(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function testWebSearch() {
  const searchTerms = ["Ronaldinho", "Del Piero", "Cruyff", "Maradona", "Beckham", "Pirlo"];
  
  for (const term of searchTerms) {
    const url = `https://www.efootballdb.com/players?search=${encodeURIComponent(term)}`;
    console.log(`Fetching ${url}...`);
    const html = await fetchHtml(url);
    
    // Extract profile links / IDs
    const matches = [...html.matchAll(/\/players\/profile\?id=(\d+)/g)];
    const ids = Array.from(new Set(matches.map(m => m[1])));
    
    console.log(`Term: "${term}" -> Found ${ids.length} card IDs:`, ids);
    console.log("-----------------------------------------------");
  }
}

testWebSearch();
