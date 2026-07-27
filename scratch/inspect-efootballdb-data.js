const https = require('https');

function fetchHtml(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function inspectNextData() {
  const html = await fetchHtml("https://www.efootballdb.com/players");
  console.log("HTML length:", html.length);

  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
  if (nextDataMatch) {
    try {
      const parsed = JSON.parse(nextDataMatch[1]);
      console.log("NEXT_DATA buildId:", parsed.buildId);
      console.log("NEXT_DATA pageProps keys:", Object.keys(parsed.props.pageProps || {}));
      console.log("Sample pageProps:", JSON.stringify(parsed.props.pageProps).substring(0, 1000));
    } catch (e) {
      console.error("JSON parse error:", e.message);
    }
  } else {
    console.log("No NEXT_DATA script found.");
  }
}

inspectNextData();
