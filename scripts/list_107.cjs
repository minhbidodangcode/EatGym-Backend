const fs = require('fs');
const path = require('path');
const missing = JSON.parse(fs.readFileSync(path.join(__dirname, 'missing_107_recipes.json'), 'utf8'));

console.log(`Total 107 missing recipes:`);
missing.forEach((m, idx) => {
  console.log(`${(idx + 1).toString().padStart(3, ' ')}. [${m.id}] ${m.cleanTitle} | kcal: ${m.kcal}, P: ${m.protein}, C: ${m.carbs}, F: ${m.fat}`);
});
