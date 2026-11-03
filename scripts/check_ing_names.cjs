const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkNames() {
  const terms = ['bông cải', 'súp lơ', 'tỏi', 'xà lách', 'cà chua', 'ô liu', 'dầu'];
  for (const t of terms) {
    const res = await pool.query(`SELECT id, name, kcal_per_100g, protein_g, carbs_g, fat_g FROM ingredients WHERE name ILIKE $1`, [`%${t}%`]);
    console.log(`\nMatches for "${t}":`);
    res.rows.forEach(r => console.log(`  - [${r.id}] "${r.name}": kcal=${r.kcal_per_100g}, P=${r.protein_g}, C=${r.carbs_g}, F=${r.fat_g}`));
  }
  await pool.end();
}

checkNames().catch(console.error);
