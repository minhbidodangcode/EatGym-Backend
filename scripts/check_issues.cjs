const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  console.log('=== CHECKING DATABASE STATE ===');
  
  // 1. Total recipes
  const total = await pool.query('SELECT count(*) FROM recipes');
  console.log('Total recipes:', total.rows[0].count);

  // 2. V1: Recipes with NO recipe_ingredients
  const v1 = await pool.query(`
    SELECT r.id, r.title, r.kcal, r.protein_g, r.carbs_g, r.fat_g, r.cooking_time_min
    FROM recipes r
    LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    WHERE ri.id IS NULL
    ORDER BY r.title
  `);
  console.log('V1 (No recipe_ingredients):', v1.rows.length);
  if (v1.rows.length > 0) {
    console.log('Sample 10 recipes with no ingredients:');
    v1.rows.slice(0, 10).forEach(r => console.log(`  - [${r.id}] "${r.title}" (kcal: ${r.kcal}, P: ${r.protein_g}, C: ${r.carbs_g}, F: ${r.fat_g})`));
  }

  // 3. V2: Recipes with fat_g <= 0
  const v2 = await pool.query(`
    SELECT r.id, r.title, r.kcal, r.protein_g, r.carbs_g, r.fat_g
    FROM recipes r
    WHERE r.fat_g <= 0
    ORDER BY r.title
  `);
  console.log('V2 (fat_g <= 0):', v2.rows.length);
  v2.rows.forEach(r => console.log(`  - [${r.id}] "${r.title}" (kcal: ${r.kcal}, P: ${r.protein_g}, C: ${r.carbs_g}, F: ${r.fat_g})`));

  // 4. V3: Recipes deviating macro > 30%
  // |kcal - (4P+4C+9F)| > 0.3*kcal
  const v3 = await pool.query(`
    SELECT r.id, r.title, r.kcal, r.protein_g, r.carbs_g, r.fat_g,
           ROUND(4 * r.protein_g + 4 * r.carbs_g + 9 * r.fat_g, 1) as macro_kcal,
           ABS(r.kcal - (4 * r.protein_g + 4 * r.carbs_g + 9 * r.fat_g)) as diff,
           ROUND(ABS(r.kcal - (4 * r.protein_g + 4 * r.carbs_g + 9 * r.fat_g)) / NULLIF(r.kcal, 0) * 100, 1) as pct_diff
    FROM recipes r
    WHERE ABS(r.kcal - (4 * r.protein_g + 4 * r.carbs_g + 9 * r.fat_g)) > 0.3 * r.kcal
    ORDER BY pct_diff DESC
  `);
  console.log('V3 (diff > 30%):', v3.rows.length);
  if (v3.rows.length > 0) {
    console.log('Sample 10 recipes deviating > 30%:');
    v3.rows.slice(0, 10).forEach(r => console.log(`  - "${r.title}": kcal=${r.kcal}, 4P+4C+9F=${r.macro_kcal}, diff=${r.diff} (${r.pct_diff}%)`));
  }

  // 5. Current recipe_tags distribution
  const tags = await pool.query(`
    SELECT tag_slug, count(*) 
    FROM recipe_tags 
    GROUP BY 1 
    ORDER BY 2 DESC
  `);
  console.log('Current tags in recipe_tags:');
  console.table(tags.rows);

  await pool.end();
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
