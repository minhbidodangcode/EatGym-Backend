const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function cleanTitle(title) {
  // Remove emoji and leading/trailing whitespace
  return title
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
    .trim();
}

async function run() {
  const v1 = await pool.query(`
    SELECT r.id, r.title, r.description, r.kcal, r.protein_g, r.carbs_g, r.fat_g, r.cooking_time_min, r.instructions
    FROM recipes r
    LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    WHERE ri.id IS NULL
    ORDER BY r.title
  `);
  console.log(`Found ${v1.rows.length} recipes without recipe_ingredients`);

  const list = v1.rows.map(r => ({
    id: r.id,
    rawTitle: r.title,
    cleanTitle: cleanTitle(r.title),
    kcal: Number(r.kcal),
    protein: Number(r.protein_g),
    carbs: Number(r.carbs_g),
    fat: Number(r.fat_g),
    instructions: r.instructions
  }));

  console.log('Sample clean titles:');
  list.slice(0, 15).forEach(x => console.log(`  "${x.rawTitle}" -> "${x.cleanTitle}"`));

  // Let's check files for recipes and their ingredients!
  // First, check if recipe_ingredients table in init.sql or backup has any references to these titles or ids!
  
  // Write the list of clean titles to a JSON for further analysis
  fs.writeFileSync(path.join(__dirname, 'missing_107_recipes.json'), JSON.stringify(list, null, 2), 'utf8');
  console.log('Saved missing_107_recipes.json');

  await pool.end();
}

run().catch(console.error);
