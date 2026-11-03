const fs = require('fs');
const path = require('path');
const missing = JSON.parse(fs.readFileSync(path.join(__dirname, 'missing_107_recipes.json'), 'utf8'));

console.log('--- Analyzing 107 Recipes by Keywords ---');
const categories = {
  xoi: [],
  canh: [],
  chao: [],
  com: [],
  banh_canh_hu_tiu_mi_pho: [],
  goi: [],
  thit_ga_heo_bo: [],
  ca_hai_san: [],
  dau_chay: [],
  other: []
};

missing.forEach(m => {
  const t = m.cleanTitle.toLowerCase();
  if (t.includes('xôi')) categories.xoi.push(m);
  else if (t.includes('canh')) categories.canh.push(m);
  else if (t.includes('cháo')) categories.chao.push(m);
  else if (t.includes('cơm')) categories.com.push(m);
  else if (t.includes('bánh canh') || t.includes('hủ tíu') || t.includes('mì') || t.includes('phở') || t.includes('nui') || t.includes('miến') || t.includes('bánh hỏi')) categories.banh_canh_hu_tiu_mi_pho.push(m);
  else if (t.includes('gỏi')) categories.goi.push(m);
  else if (t.includes('bò') || t.includes('heo') || t.includes('gà') || t.includes('sườn') || t.includes('tai heo') || t.includes('da heo') || t.includes('giò')) categories.thit_ga_heo_bo.push(m);
  else if (t.includes('cá') || t.includes('tôm') || t.includes('mực') || t.includes('tép') || t.includes('cua') || t.includes('mắm')) categories.ca_hai_san.push(m);
  else if (t.includes('đậu') || t.includes('chao') || t.includes('nấm') || t.includes('chay')) categories.dau_chay.push(m);
  else categories.other.push(m);
});

for (const [k, v] of Object.entries(categories)) {
  console.log(`Category ${k}: ${v.length} recipes`);
  if (k === 'other') {
    v.forEach(x => console.log(`  - ${x.cleanTitle}`));
  }
}
