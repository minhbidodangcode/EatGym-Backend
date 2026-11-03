const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspectV3() {
  const v3 = await pool.query(`
    SELECT r.id, r.title, r.kcal, r.protein_g, r.carbs_g, r.fat_g,
           ROUND(4 * r.protein_g + 4 * r.carbs_g + 9 * r.fat_g, 1) as macro_kcal,
           ABS(r.kcal - (4 * r.protein_g + 4 * r.carbs_g + 9 * r.fat_g)) as diff,
           ROUND(ABS(r.kcal - (4 * r.protein_g + 4 * r.carbs_g + 9 * r.fat_g)) / NULLIF(r.kcal, 0) * 100, 1) as pct_diff
    FROM recipes r
    WHERE ABS(r.kcal - (4 * r.protein_g + 4 * r.carbs_g + 9 * r.fat_g)) > 0.3 * r.kcal
    ORDER BY pct_diff DESC
  `);
  console.log(`Found ${v3.rows.length} recipes in V3:`);

  // Fetch all ingredients for lookup
  const ingRes = await pool.query('SELECT id, name, kcal_per_100g, protein_g, carbs_g, fat_g FROM ingredients');
  const ingMap = new Map();
  ingRes.rows.forEach(r => {
    ingMap.set(r.id, r);
    ingMap.set(r.name.trim().toLowerCase(), r);
  });

  let withIngredientsCount = 0;
  let allIngsHaveNutritionCount = 0;

  for (const r of v3.rows) {
    const ri = await pool.query(`
      SELECT ri.id, ri.ingredient_name, ri.amount, ri.unit, ri.ingredient_id
      FROM recipe_ingredients ri
      WHERE ri.recipe_id = $1
    `, [r.id]);

    let totalP = 0;
    let totalC = 0;
    let totalF = 0;
    let hasAllNutrition = ri.rows.length > 0;

    for (const item of ri.rows) {
      let ing = item.ingredient_id ? ingMap.get(item.ingredient_id) : null;
      if (!ing) ing = ingMap.get(item.ingredient_name.trim().toLowerCase());
      
      // Try alias matching if not found
      if (!ing && item.ingredient_name.includes('Sả')) ing = ingMap.get('sả băm') || ingMap.get('sả cây đập dập');
      if (!ing && item.ingredient_name.includes('Gừng')) ing = ingMap.get('gừng tươi');

      if (ing && ing.protein_g !== null && ing.carbs_g !== null && ing.fat_g !== null) {
        // Assume amount in g (if unit is g or ml)
        const amt = Number(item.amount);
        totalP += (amt / 100) * Number(ing.protein_g);
        totalC += (amt / 100) * Number(ing.carbs_g);
        totalF += (amt / 100) * Number(ing.fat_g);
      } else {
        hasAllNutrition = false;
      }
    }

    if (ri.rows.length > 0) withIngredientsCount++;
    if (hasAllNutrition) allIngsHaveNutritionCount++;

    console.log(`\n[${r.id}] "${r.title}"`);
    console.log(`  Current: kcal=${r.kcal}, P=${r.protein_g}, C=${r.carbs_g}, F=${r.fat_g} | 4P+4C+9F=${r.macro_kcal} (diff: ${r.pct_diff}%)`);
    console.log(`  Ingredients count: ${ri.rows.length}, All matched: ${hasAllNutrition}`);
    if (hasAllNutrition) {
      const calcKcal = 4 * totalP + 4 * totalC + 9 * totalF;
      console.log(`  Calculated from ingredients: kcal=${calcKcal.toFixed(1)}, P=${totalP.toFixed(1)}, C=${totalC.toFixed(1)}, F=${totalF.toFixed(1)}`);
    } else {
      console.log(`  Items:`, ri.rows.map(x => `${x.ingredient_name} (${x.amount}${x.unit})`).join(', '));
    }
  }

  console.log(`\nSummary: Total V3 = ${v3.rows.length}, With ingredients = ${withIngredientsCount}, All ingredients matched with nutrition = ${allIngsHaveNutritionCount}`);
  await pool.end();
}

inspectV3().catch(console.error);
