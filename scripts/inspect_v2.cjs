const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspectV2() {
  const res = await pool.query(`
    SELECT r.id, r.title, r.kcal, r.protein_g, r.carbs_g, r.fat_g
    FROM recipes r
    WHERE r.fat_g <= 0
    ORDER BY r.title
  `);
  console.log(`Found ${res.rows.length} recipes in V2:`);
  for (const r of res.rows) {
    console.log(`\nRecipe: [${r.id}] "${r.title}"`);
    console.log(`  Current: kcal=${r.kcal}, P=${r.protein_g}, C=${r.carbs_g}, F=${r.fat_g}`);
    
    // Check recipe_ingredients
    const ri = await pool.query(`
      SELECT ri.id, ri.ingredient_name, ri.amount, ri.unit, ri.ingredient_id,
             i.name as ing_name, i.kcal_per_100g, i.protein_g as ing_p, i.carbs_g as ing_c, i.fat_g as ing_f
      FROM recipe_ingredients ri
      LEFT JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE ri.recipe_id = $1
    `, [r.id]);
    console.log(`  Recipe ingredients (${ri.rows.length}):`);
    ri.rows.forEach(item => {
      console.log(`    - "${item.ingredient_name}": ${item.amount}${item.unit} (ing_f/100g: ${item.ing_f}, ing_p/100g: ${item.ing_p}, ing_c/100g: ${item.ing_c})`);
    });
  }
  await pool.end();
}

inspectV2().catch(console.error);
