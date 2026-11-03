const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkV2Details() {
  const v2 = await pool.query('SELECT id, title, kcal, protein_g, carbs_g, fat_g FROM recipes WHERE fat_g <= 0');
  for (const r of v2.rows) {
    const macroKcal = 4 * r.protein_g + 4 * r.carbs_g + 9 * r.fat_g;
    const diff = Math.abs(r.kcal - macroKcal);
    const pct = (diff / r.kcal) * 100;
    console.log(`[${r.id}] "${r.title}": kcal=${r.kcal}, 4P+4C+9F=${macroKcal}, diff=${diff.toFixed(1)} (${pct.toFixed(1)}%)`);
  }
  await pool.end();
}

checkV2Details().catch(console.error);
