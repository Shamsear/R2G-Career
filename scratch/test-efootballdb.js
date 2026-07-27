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

async function inspectEfootballdbPage() {
  console.log("Fetching efootballdb player profile...");
  const html = await fetchHtml("https://www.efootballdb.com/players/profile?id=17592186179024");
  console.log("HTML length:", html.length);

  // Extract all img tags or asset URLs
  const imgMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
  console.log("Image sources on page:", imgMatches.map(m => m[1]));

  // Also test search page
  console.log("\nFetching efootballdb search page for 'Ronaldinho'...");
  const searchHtml = await fetchHtml("https://www.efootballdb.com/players?search=Ronaldinho");
  console.log("Search HTML length:", searchHtml.length);
  const searchImgs = [...searchHtml.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
  console.log("Search page image sources:", searchImgs.slice(0, 15).map(m => m[1]));
}

inspectEfootballdbPage();
