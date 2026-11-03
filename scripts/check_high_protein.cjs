const fs = require('fs');
const path = require('path');
const ings = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_ingredients.json'), 'utf8'));

const filtered = ings.filter(x => Number(x.protein_g) >= 20).map(x => ({
  name: x.name,
  p: Number(x.protein_g),
  c: Number(x.carbs_g),
  f: Number(x.fat_g),
  kcal: Number(x.kcal_per_100g)
}));

console.log(JSON.stringify(filtered, null, 2));
