const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkV3Ingredients() {
  const v3 = await pool.query(`
    SELECT r.id, r.title, r.kcal, r.protein_g, r.carbs_g, r.fat_g
    FROM recipes r
    WHERE ABS(r.kcal - (4 * r.protein_g + 4 * r.carbs_g + 9 * r.fat_g)) > 0.3 * r.kcal
  `);

  const ids = v3.rows.map(r => r.id);
  const ri = await pool.query(`
    SELECT DISTINCT ri.ingredient_name, ri.unit
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = ANY($1)
    ORDER BY ri.ingredient_name
  `, [ids]);

  console.log(`Distinct ingredient names in V3 recipes (${ri.rows.length}):`);
  
  // Check against ingredients table
  const allIng = await pool.query('SELECT id, name FROM ingredients');
  const ingSet = new Set(allIng.rows.map(x => x.name.trim().toLowerCase()));

  const missing = [];
  ri.rows.forEach(r => {
    const found = ingSet.has(r.ingredient_name.trim().toLowerCase());
    if (!found) {
      missing.push(r.ingredient_name);
    }
  });

  console.log(`Matched directly: ${ri.rows.length - missing.length} / ${ri.rows.length}`);
  console.log(`Unmatched in ingredients table (${missing.length}):`, missing);

  await pool.end();
}

checkV3Ingredients().catch(console.error);
