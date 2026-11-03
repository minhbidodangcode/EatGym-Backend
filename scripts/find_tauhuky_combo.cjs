const fs = require('fs');
const path = require('path');
const allIngs = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_ingredients.json'), 'utf8'));

// Filter candidate ingredients: vegetarian or soy/dairy/plant
// Let's check all vegetarian ingredients
const candidates = allIngs.filter(x => {
  const n = x.name.toLowerCase();
  // We want vegetarian ingredients
  const meat = ['bò', 'heo', 'gà', 'vịt', 'cá', 'tôm', 'mực', 'cua', 'lươn', 'ếch', 'da', 'giò', 'huyết', 'chả lụa', 'dăm bông', 'tai', 'xúc xích', 'mề', 'hải sâm'];
  return !meat.some(m => n.includes(m));
}).map(x => ({
  name: x.name,
  p: Number(x.protein_g),
  c: Number(x.carbs_g),
  f: Number(x.fat_g),
  kcal: Number(x.kcal_per_100g)
}));

console.log(`Found ${candidates.length} vegetarian candidates`);
console.log('Top protein candidates:');
console.log(candidates.sort((a,b) => b.p - a.p).slice(0, 15));
