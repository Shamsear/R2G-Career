const https = require('https');
const fs = require('fs');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function searchEfootballLegends() {
  console.log("Searching eFootball Hub for Legend players...\n");

  const legendsToTest = [
    "Ronaldinho", "Del Piero", "Maradona", "Cruyff", "Nesta", "Pirlo",
    "Buffon", "Beckham", "Kaka", "Pele", "Shevchenko", "Drogba", "Torres", "Maldini", "Puyol"
  ];

  for (const name of legendsToTest) {
    // Test efhub search endpoint
    const url = `https://efhub.com/api/search?q=${encodeURIComponent(name)}`;
    const data = await fetchJson(url);
    if (data && Array.isArray(data)) {
      console.log(`[FOUND] ${name} -> ${data.length} results.`);
      if (data[0]) {
        console.log(`  Top result: ${data[0].name} | Card ID: ${data[0].card_id || data[0].id}`);
      }
    } else {
      console.log(`[SEARCH] ${name} -> Response format:`, typeof data);
    }
  }
}

searchEfootballLegends();
