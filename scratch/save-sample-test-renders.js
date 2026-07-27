const fs = require('fs');
const path = require('path');

const sampleTestCollection = {
  title: "R2G Legend Player Image Comparison Test Samples",
  updated_at: new Date().toISOString(),
  categories: {
    efootball_epic_cards: [
      { name: "Ronaldinho", id: 285, card_url: "https://efimg.com/efootballhub22/images/player_cards/89138556678367_l.png" },
      { name: "Alessandro Del Piero", id: 257, card_url: "https://efimg.com/efootballhub22/images/player_cards/105854569331106_l.png" },
      { name: "Alessandro Costacurta", id: 271, card_url: "https://efimg.com/efootballhub22/images/player_cards/106787651045215_l.png" },
      { name: "David Beckham", id: 261, card_url: "https://efimg.com/efootballhub22/images/player_cards/106787651045391_l.png" },
      { name: "Fabio Cannavaro", id: 397, card_url: "https://efimg.com/efootballhub22/images/player_cards/105854569387197_l.png" },
      { name: "Johan Cruyff", id: 122, card_url: "https://efimg.com/efootballhub22/images/player_cards/105854569391823_l.png" }
    ],
    eafc_transparent_cutouts: [
      { name: "Ronaldinho", id: 285, cutout_url: "https://cdn.futwiz.com/assets/img/fc24/faces/28130.png" },
      { name: "Diego Maradona", id: 483, cutout_url: "https://cdn.sofifa.net/players/190/042/25_240.png" },
      { name: "David Beckham", id: 261, cutout_url: "https://cdn.sofifa.net/players/000/250/25_240.png" },
      { name: "Gianluigi Buffon", id: 559, cutout_url: "https://cdn.sofifa.net/players/001/179/25_240.png" },
      { name: "Zinedine Zidane", id: 1397, cutout_url: "https://cdn.sofifa.net/players/001/397/25_240.png" },
      { name: "Thierry Henry", id: 1625, cutout_url: "https://cdn.sofifa.net/players/001/625/25_240.png" }
    ],
    eafc_full_icon_cards: [
      { name: "Ronaldinho", id: 285, card_url: "https://cdn.futwiz.com/assets/img/fc24/faces/28130.png" },
      { name: "Pelé", id: 176, card_url: "https://cdn.sofifa.net/players/190/043/25_240.png" },
      { name: "Diego Maradona", id: 483, card_url: "https://cdn.sofifa.net/players/190/042/25_240.png" }
    ]
  }
};

const outputDir = path.join(process.cwd(), 'public', 'assets', 'data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const filePath = path.join(outputDir, 'test_legend_comparison.json');
fs.writeFileSync(filePath, JSON.stringify(sampleTestCollection, null, 2));

console.log("Successfully saved test legend comparison file at:", filePath);
