const fs = require('fs');
const path = require('path');
const { getIngredientsForDish } = require('./dish_ingredient_map.cjs');

const missing = JSON.parse(fs.readFileSync(path.join(__dirname, 'missing_107_recipes.json'), 'utf8'));

console.log(`Checking ingredient mappings for all ${missing.length} dishes...`);
let errCount = 0;
missing.forEach((m, idx) => {
  try {
    const ings = getIngredientsForDish(m);
    if (ings.length < 3) {
      console.error(`Dish ${idx+1} [${m.cleanTitle}] has only ${ings.length} ingredients!`);
      errCount++;
    }
  } catch (e) {
    console.error(`Dish ${idx+1} [${m.cleanTitle}] error: ${e.message}`);
    errCount++;
  }
});

console.log(`Finished checking: ${errCount} errors.`);
