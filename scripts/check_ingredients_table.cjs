const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkIngredients() {
  const names = [
    'Huyết heo luộc',
    'Huyết heo sống',
    'Lòng trắng trứng gà',
    'Hải sâm',
    'Lòng trắng trứngvịt',
    'Lòng trắng trứng vịt',
    'Gân chân bò',
    'Huyết bò',
    'Tôm sú bóc vỏ',
    'Gừng tươi',
    'Sả tươi'
  ];

  for (const n of names) {
    const res = await pool.query('SELECT id, name, kcal_per_100g, protein_g, carbs_g, fat_g FROM ingredients WHERE name ILIKE $1', [`%${n}%`]);
    console.log(`Query "${n}": ${res.rows.length} rows`);
    res.rows.forEach(r => console.log(`  - [${r.id}] ${r.name}: kcal=${r.kcal_per_100g}, P=${r.protein_g}, C=${r.carbs_g}, F=${r.fat_g}`));
  }

  await pool.end();
}

checkIngredients().catch(console.error);
