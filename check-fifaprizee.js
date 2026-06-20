const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('test.html', 'utf-8');
const $ = cheerio.load(html);

const playerImgs = [];
$('.playerimg').each((i, el) => {
    playerImgs.push($(el).attr('src'));
});
console.log("Player Imgs:", playerImgs);

const cardImgs = [];
$('img').each((i, el) => {
    if($(el).attr('src') && $(el).attr('src').includes('download_24')) {
        cardImgs.push($(el).attr('src'));
    }
});
console.log("Card Imgs:", cardImgs);
