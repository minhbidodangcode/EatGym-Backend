const fs = require('fs');
const path = require('path');

const backupPath = path.join(__dirname, '..', '..', 'backup_eatgym_before_migration.sql');
const lines = fs.readFileSync(backupPath, 'utf8').split('\n');

let recipesCount = 0;
let inRecipes = false;
let riCount = 0;
let inRi = false;

for (const line of lines) {
  if (line.startsWith('COPY public.recipes (')) inRecipes = true;
  else if (inRecipes && line.startsWith('\\.')) inRecipes = false;
  else if (inRecipes) recipesCount++;

  if (line.startsWith('COPY public.recipe_ingredients (')) inRi = true;
  else if (inRi && line.startsWith('\\.')) inRi = false;
  else if (inRi) riCount++;
}

console.log(`backup_eatgym_before_migration.sql: recipes = ${recipesCount}, recipe_ingredients = ${riCount}`);
