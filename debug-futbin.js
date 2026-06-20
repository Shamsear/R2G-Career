const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://www.futbin.com/players?search=salah', { waitUntil: 'networkidle2' });
  const html = await page.content();
  const fs = require('fs');
  fs.writeFileSync('futbin-debug.html', html);
  await browser.close();
  console.log('done');
}
run();
