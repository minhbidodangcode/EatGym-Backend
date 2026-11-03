const fs = require('fs');
const path = require('path');
const missing = JSON.parse(fs.readFileSync(path.join(__dirname, 'missing_107_recipes.json'), 'utf8'));

console.log('Checking macro self-consistency of 107 missing recipes:');
let inconsistentCount = 0;
missing.forEach(m => {
  const calcKcal = 4 * m.protein + 4 * m.carbs + 9 * m.fat;
  const diff = Math.abs(m.kcal - calcKcal);
  const pct = (diff / m.kcal) * 100;
  if (pct > 15) {
    inconsistentCount++;
    console.log(`[${pct.toFixed(1)}%] "${m.cleanTitle}": kcal=${m.kcal}, 4P+4C+9F=${calcKcal.toFixed(1)} (P=${m.protein}, C=${m.carbs}, F=${m.fat})`);
  }
});
console.log(`Total with >15% macro inconsistency: ${inconsistentCount} / ${missing.length}`);
