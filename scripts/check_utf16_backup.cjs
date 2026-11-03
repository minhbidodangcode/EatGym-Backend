const fs = require('fs');
const path = require('path');

const backupPath = path.join(__dirname, '..', '..', 'backup_eatgym_before_migration.sql');
const content = fs.readFileSync(backupPath, 'utf16le');
console.log('Read backup as utf16le, length:', content.length);

const missing = JSON.parse(fs.readFileSync(path.join(__dirname, 'missing_107_recipes.json'), 'utf8'));
const missingIds = new Set(missing.map(m => m.id));

let foundIds = 0;
for (const id of missingIds) {
  if (content.includes(id)) {
    foundIds++;
  }
}
console.log(`Missing IDs found in backup (utf16le): ${foundIds}`);

// Check if recipe_ingredients section has any of them or if any title appears in recipe_ingredients
const lines = content.split('\n');
let inRi = false;
let riCount = 0;
let riMatch = 0;
for (const line of lines) {
  if (line.includes('COPY public.recipe_ingredients (')) inRi = true;
  else if (inRi && line.startsWith('\\.')) inRi = false;
  else if (inRi) {
    riCount++;
    for (const id of missingIds) {
      if (line.includes(id)) {
        riMatch++;
      }
    }
  }
}
console.log(`Total recipe_ingredients in backup: ${riCount}, matches with missing: ${riMatch}`);
