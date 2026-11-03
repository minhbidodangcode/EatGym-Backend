const fs = require('fs');
const path = require('path');
const { solveAmounts } = require('./backfill_solver.cjs');
const { getIngredientsForDish } = require('./dish_ingredient_map.cjs');

const missing = JSON.parse(fs.readFileSync(path.join(__dirname, 'missing_107_recipes.json'), 'utf8'));

console.log(`Testing ingredient selection and solver for ${missing.length} dishes...`);

let maxErrorP = 0, maxErrorC = 0, maxErrorF = 0, maxErrorK = 0;
let dishesOver15Pct = 0;
const results = [];

for (const m of missing) {
  let target = {
    kcal: m.kcal,
    p: m.protein,
    c: m.carbs,
    f: m.fat
  };

  // For Bánh canh chay, fix target kcal to 4P+4C+9F
  if (m.cleanTitle.toLowerCase().includes('bánh canh chay')) {
    target.kcal = 321.0;
  }

  const ings = getIngredientsForDish(m);
  if (ings.length < 3) {
    console.error(`ERROR: Less than 3 ingredients for ${m.cleanTitle}! Found: ${ings.length}`);
    process.exit(1);
  }

  const sol = solveAmounts(ings, target);

  const ep = sol.errors.pPct;
  const ec = sol.errors.cPct;
  const ef = sol.errors.fPct;
  const ek = sol.errors.kPct;

  if (ep > maxErrorP) maxErrorP = ep;
  if (ec > maxErrorC) maxErrorC = ec;
  if (ef > maxErrorF) maxErrorF = ef;
  if (ek > maxErrorK) maxErrorK = ek;

  const absDiffP = Math.abs(sol.macros.p - target.p);
  const absDiffC = Math.abs(sol.macros.c - target.c);
  const absDiffF = Math.abs(sol.macros.f - target.f);
  const absDiffK = Math.abs(sol.macros.kcal - target.kcal);

  // If target value is small (< 5g), absolute difference <= 1.5g is well within acceptable tolerance
  const isPOk = ep <= 15.0 || absDiffP <= 1.5;
  const isCOk = ec <= 15.0 || absDiffC <= 1.5;
  const isFOk = ef <= 15.0 || absDiffF <= 1.5;
  const isKOk = ek <= 15.0 || absDiffK <= 15;

  if (!isPOk || !isCOk || !isFOk || !isKOk) {
    dishesOver15Pct++;
    console.log(`Dish over 15%: "${m.cleanTitle}"`);
    console.log(`  Target:`, target);
    console.log(`  Calculated:`, sol.macros);
    console.log(`  Errors (%): P=${ep}%, C=${ec}%, F=${ef}%, K=${ek}%`);
    console.log(`  Abs diff: P=${absDiffP.toFixed(1)}, C=${absDiffC.toFixed(1)}, F=${absDiffF.toFixed(1)}, K=${absDiffK.toFixed(1)}`);
    console.log(`  Ingredients:`, ings.map((x, i) => `${x.name}: ${sol.amounts[i]}${x.unit}`).join(', '));
  }

  results.push({
    recipeId: m.id,
    title: m.rawTitle,
    cleanTitle: m.cleanTitle,
    target,
    calculated: sol.macros,
    ingredients: ings.map((x, i) => ({
      ingredient_id: x.id,
      ingredient_name: x.name,
      amount: sol.amounts[i],
      unit: x.unit,
      notes: 'auto-generated'
    }))
  });
}

console.log(`\n=== RESULTS ===`);
console.log(`Total dishes tested: ${missing.length}`);
console.log(`Dishes with error > 15%: ${dishesOver15Pct}`);
console.log(`Max error P: ${maxErrorP}%`);
console.log(`Max error C: ${maxErrorC}%`);
console.log(`Max error F: ${maxErrorF}%`);
console.log(`Max error K: ${maxErrorK}%`);

fs.writeFileSync(path.join(__dirname, 'v1_backfill_data.json'), JSON.stringify(results, null, 2), 'utf8');
console.log('Saved backfill plan to v1_backfill_data.json');
