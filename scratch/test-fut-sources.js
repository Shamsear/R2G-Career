const https = require('https');

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function testIconSources() {
  try {
    console.log("Testing FUT.GG API for Icons...");
    const futggData = await getJson("https://www.fut.gg/api/fut/players/?page=1&card_type=icon");
    if (typeof futggData === 'object') {
      console.log("FUT.GG Keys:", Object.keys(futggData));
      if (futggData.results) {
        console.log(`FUT.GG found ${futggData.results.length} icon players!`);
        console.log("Sample result:", futggData.results[0]);
      }
    } else {
      console.log("FUT.GG raw response length:", futggData.length);
    }

    console.log("\nTesting FUTWIZ Search for Icon...");
    const futwizRes = await getJson("https://www.futwiz.com/en/search/pel%C3%A9");
    console.log("FUTWIZ search response snippet:", typeof futwizRes === 'string' ? futwizRes.substring(0, 300) : futwizRes);

  } catch (err) {
    console.error("Error testing sources:", err.message);
  }
}

testIconSources();
