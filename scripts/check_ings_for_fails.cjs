const fs = require('fs');
const path = require('path');
const ings = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_ingredients.json'), 'utf8'));

const filtered = ings.filter(x => {
  const n = x.name.toLowerCase();
  return n.includes('đậu') || n.includes('hủ') || n.includes('bột') || n.includes('tôm') || n.includes('sữa');
}).map(x => ({
  name: x.name,
  p: x.protein_g,
  c: x.carbs_g,
  f: x.fat_g,
  kcal: x.kcal_per_100g
}));

console.log(JSON.stringify(filtered, null, 2));
