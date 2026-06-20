const https = require('https');

const urls = [
    'https://fifaprizee.com/api/search?q=ronaldo',
    'https://fifaprizee.com/api/players?search=ronaldo',
    'https://fifaprizee.com/api/players?name=ronaldo',
    'https://fifaprizee.com/api/players/search?query=ronaldo'
];

urls.forEach(url => {
    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`URL: ${url} -> Status: ${res.statusCode}, Body snippet: ${data.substring(0, 100)}`);
        });
    }).on('error', err => console.log(url, err.message));
});
