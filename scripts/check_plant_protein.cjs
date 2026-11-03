const fs = require('fs');
const path = require('path');
const allIngs = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_ingredients.json'), 'utf8'));
const ingMap = new Map(allIngs.map(x => [x.name.toLowerCase().trim(), x]));

function get(name) {
  const norm = name.toLowerCase().trim();
  let v = ingMap.get(norm);
  if (!v) {
    for (const [k, item] of ingMap.entries()) {
      if (k === norm || k.includes(norm) || norm.includes(k)) {
        v = item;
        break;
      }
    }
  }
  if (!v) throw new Error(`Not found: ${name}`);
  return {
    id: v.id,
    name: v.name,
    p: Number(v.protein_g),
    c: Number(v.carbs_g),
    f: Number(v.fat_g),
    kcal: Number(v.kcal_per_100g),
    unit: v.default_unit || 'g'
  };
}

// Check protein-rich plant ingredients
console.log('High-protein plant items:');
allIngs.filter(x => (x.category === 'protein' || x.category === 'carb') && Number(x.protein_g) >= 15).forEach(x => {
  console.log(`- ${x.name}: P=${x.protein_g}, C=${x.carbs_g}, F=${x.fat_g}, Kcal=${x.kcal_per_100g}`);
});
