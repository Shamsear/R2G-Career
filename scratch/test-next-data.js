const https = require('https');

function fetchHtml(url) {
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

async function testNextData() {
  const url = "https://www.efootballdb.com/players";
  console.log(`Fetching ${url}...`);
  const html = await fetchHtml(url);
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
  if (match) {
    const json = JSON.parse(match[1]);
    console.log("Next Data pageProps keys:", Object.keys(json.props.pageProps || {}));
    if (json.props.pageProps.initialState) {
      console.log("Initial state keys:", Object.keys(json.props.pageProps.initialState));
    }
    const jsonStr = JSON.stringify(json);
    const ids = [...jsonStr.matchAll(/"pes_id":\s*(\d+)/g)].map(m => m[1]);
    console.log(`Found ${ids.length} pes_ids in __NEXT_DATA__! Sample:`, ids.slice(0, 10));
  } else {
    console.log("__NEXT_DATA__ not found");
  }
}

testNextData();
