const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function dumpIngs() {
  const res = await pool.query('SELECT id, name, category, kcal_per_100g, protein_g, carbs_g, fat_g, default_unit FROM ingredients ORDER BY name');
  fs.writeFileSync(path.join(__dirname, 'all_ingredients.json'), JSON.stringify(res.rows, null, 2), 'utf8');
  console.log(`Dumped ${res.rows.length} ingredients to all_ingredients.json`);
  await pool.end();
}

dumpIngs().catch(console.error);
