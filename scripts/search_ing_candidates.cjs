const fs = require('fs');
const path = require('path');
const allIngs = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_ingredients.json'), 'utf8'));

const targets = ['gà', 'heo', 'lợn', 'mướp', 'khổ qua', 'cá', 'chuối', 'đu đủ', 'bột', 'dừa', 'đậu'];

for (const t of targets) {
  const matches = allIngs.filter(x => x.name.toLowerCase().includes(t));
  console.log(`\nMatches for "${t}" (${matches.length}):`);
  matches.forEach(m => console.log(`  - "${m.name}"`));
}
