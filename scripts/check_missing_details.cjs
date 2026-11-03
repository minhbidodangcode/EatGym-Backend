const fs = require('fs');
const path = require('path');

const missing = JSON.parse(fs.readFileSync(path.join(__dirname, 'missing_107_recipes.json'), 'utf8'));

console.log('Sample 10 recipes details (instructions & description):');
missing.slice(0, 10).forEach(m => {
  console.log(`\nTitle: ${m.rawTitle}`);
  console.log(`Macro: kcal=${m.kcal}, P=${m.protein}, C=${m.carbs}, F=${m.fat}`);
  console.log(`Instructions: ${m.instructions}`);
});
