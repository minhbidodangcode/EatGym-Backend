const fs = require('fs');
const path = require('path');

const missing = JSON.parse(fs.readFileSync(path.join(__dirname, 'missing_107_recipes.json'), 'utf8'));

// Check 5 sample titles
const sampleTitles = [
  'Canh bí rợ',
  'Canh bắp cải',
  'Cháo lòng',
  'Gà xào sả ớt',
  'Cơm chiên dương châu',
  'Sườn ram',
  'Phở gà'
];

function searchInFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`\nSearching in ${path.basename(filePath)}:`);
  for (const t of sampleTitles) {
    let count = 0;
    let idx = 0;
    while ((idx = content.indexOf(t, idx)) !== -1) {
      count++;
      idx += t.length;
    }
    if (count > 0) {
      console.log(`  "${t}": found ${count} times`);
    }
  }
}

const filesToSearch = [
  path.join(__dirname, '..', 'init.sql'),
  path.join(__dirname, '..', '..', 'backup_eatgym_before_migration.sql'),
  path.join(__dirname, '..', '..', 'DANH_SACH_MON_AN_DATABASE.txt'),
  path.join(__dirname, '..', '..', 'DANH_SACH_MON_AN_DATABASE.md'),
  path.join(__dirname, '..', '..', 'scratch_sync_recipes.sql'),
  path.join(__dirname, '..', 'seed_fao_and_csv.cjs'),
  path.join(__dirname, '..', 'seed_comprehensive_data.cjs'),
  path.join(__dirname, '..', 'enrich_all_ingredients.cjs'),
  path.join(__dirname, '..', 'enrich_ingredients.cjs'),
  path.join(__dirname, '..', 'enrich_recipes_and_tags.cjs'),
  path.join(__dirname, '..', 'auto_link_recipes.cjs')
];

for (const f of filesToSearch) {
  searchInFile(f);
}
