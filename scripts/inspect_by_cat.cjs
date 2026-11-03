const fs = require('fs');
const path = require('path');
const ings = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_ingredients.json'), 'utf8'));

const byCat = {};
for (const ing of ings) {
  if (!byCat[ing.category]) byCat[ing.category] = [];
  byCat[ing.category].push(ing.name);
}

for (const [cat, list] of Object.entries(byCat)) {
  console.log(`\n=== Category: ${cat} (${list.length}) ===`);
  console.log(list.slice(0, 15).join(', '));
}
