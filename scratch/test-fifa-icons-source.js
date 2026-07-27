const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function checkFifaIcons() {
  try {
    console.log("Checking FUTWIZ Icons list...");
    // Test FUTWIZ icons page
    const futwizHtml = await fetchUrl("https://www.futwiz.com/en/fc25/players?version=icon");
    const matches = futwizHtml.match(/class="player-name">([^<]+)<\/div>/g);
    console.log(`FUTWIZ FC25 Icons found on page 1:`, matches ? matches.length : 0);

    // Test EA FC renders domain
    console.log("Testing EA FC Renders / FUTBIN APIs...");
    const futbinData = await fetchUrl("https://www.futbin.com/24/playerCards/icon");
    console.log("FUTBIN Icons snippet length:", futbinData.length);

  } catch (err) {
    console.error("Error checking FIFA icons:", err.message);
  }
}

checkFifaIcons();
