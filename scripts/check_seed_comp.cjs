const fs = require('fs');
const path = require('path');

const seedContent = fs.readFileSync(path.join(__dirname, '..', 'seed_comprehensive_data.cjs'), 'utf8');
const missing = JSON.parse(fs.readFileSync(path.join(__dirname, 'missing_107_recipes.json'), 'utf8'));

let matches = 0;
for (const m of missing) {
  if (seedContent.includes(m.cleanTitle)) {
    matches++;
    console.log(`Found "${m.cleanTitle}" in seed_comprehensive_data.cjs`);
  }
}
console.log(`Matches in seed_comprehensive_data.cjs: ${matches} / ${missing.length}`);
