const fs = require('fs');

const unmatched = require('./unmatched-players.json');
const updatedIds = [
  15, 16, 19, 42, 59, 74, 76, 131, 136, 151, 164, 185, 187, 216, 227, 272, 280, 
  293, 296, 297, 305, 323, 399, 403, 405, 407, 419, 444, 470, 476, 496, 516, 
  528, 563, 569, 577, 618, 638, 643, 662, 665, 753, 757, 765, 774, 775, 783, 
  790, 795, 821, 867, 889, 898, 905, 940, 945
];

const remaining = unmatched.filter(p => !updatedIds.includes(p.id));

console.log(`There are ${remaining.length} remaining players.`);
console.log('Remaining players:');
remaining.forEach(p => console.log(`${p.id}: ${p.name} (${p.position})`));
