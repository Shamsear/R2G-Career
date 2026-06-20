const https = require('https');

https.get('https://www.footylogos.com/logos/fc-barcelona', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        const matches = data.match(/<img[^>]+src="([^">]+)"/g);
        console.log(matches);
    });
}).on('error', (err) => {
    console.error('Error: ' + err.message);
});
