const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('futbin-debug.html', 'utf-8');
const $ = cheerio.load(html);
const row = $('tr').eq(1).html();
console.log(row);
