const fs = require('fs');
const path = require('path');

const missing = JSON.parse(fs.readFileSync(path.join(__dirname, 'missing_107_recipes.json'), 'utf8'));

function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

console.log(`Checking sources for ${missing.length} missing recipes...`);

// 1. dishes_data.json
let dishesDataMap = new Map();
try {
  const dishesData = JSON.parse(fs.readFileSync('c:/Users/Ning/Downloads/monan/dishes_data.json', 'utf8'));
  for (const item of dishesData) {
    const n = normalize(item.name || item.title || '');
    if (n) dishesDataMap.set(n, item);
  }
  console.log(`Loaded ${dishesDataMap.size} dishes from dishes_data.json`);
} catch (e) {
  console.log('Error reading dishes_data.json:', e.message);
}

let matchedDishesData = [];
for (const m of missing) {
  const normTitle = normalize(m.cleanTitle);
  const found = dishesDataMap.get(normTitle);
  if (found) {
    matchedDishesData.push({ recipe: m, source: found });
  }
}
console.log(`Matched with dishes_data.json: ${matchedDishesData.length} / ${missing.length}`);
if (matchedDishesData.length > 0) {
  console.log('Sample matched dishes_data.json:');
  matchedDishesData.slice(0, 5).forEach(x => {
    console.log(`- ${x.recipe.cleanTitle}`);
    console.log(`  raw ingredients:`, (x.source.ingredients || '').substring(0, 100));
  });
}

// 2. Check DANH_SACH_MON_AN_DATABASE.txt/md
const dsPath = path.join(__dirname, '..', '..', 'DANH_SACH_MON_AN_DATABASE.txt');
if (fs.existsSync(dsPath)) {
  const dsLines = fs.readFileSync(dsPath, 'utf8').split('\n');
  console.log(`DANH_SACH_MON_AN_DATABASE.txt lines: ${dsLines.length}`);
  // Check if it has ingredient details or just titles
  const sample = dsLines.slice(0, 10);
  console.log('Sample lines from DANH_SACH_MON_AN_DATABASE.txt:', sample);
}

// 3. Check DANH_SACH_MON_AN.txt
const dsPath2 = path.join(__dirname, '..', '..', 'DANH_SACH_MON_AN.txt');
if (fs.existsSync(dsPath2)) {
  const dsLines2 = fs.readFileSync(dsPath2, 'utf8').split('\n');
  console.log(`DANH_SACH_MON_AN.txt lines: ${dsLines2.length}`);
}

// 4. Check backup_eatgym_before_migration.sql and init.sql
// Let's see if recipe_ingredients COPY / INSERT in backup or init has any recipe_ids matching our 107 missing recipe IDs!
// Let's check missing IDs:
const missingIds = new Set(missing.map(m => m.id));

function searchSqlForIds(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  console.log(`Scanning ${filePath}...`);
  const content = fs.readFileSync(filePath, 'utf8');
  let matchCount = 0;
  for (const id of missingIds) {
    if (content.includes(id)) {
      matchCount++;
    }
  }
  console.log(`Found ${matchCount} missing IDs in ${path.basename(filePath)}`);
}

searchSqlForIds(path.join(__dirname, '..', 'init.sql'));
searchSqlForIds(path.join(__dirname, '..', '..', 'backup_eatgym_before_migration.sql'));
searchSqlForIds(path.join(__dirname, '..', '..', 'scratch_sync_recipes.sql'));

