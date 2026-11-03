const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkIngs() {
  const res = await pool.query('SELECT count(*) FROM ingredients');
  console.log('Total ingredients in ingredients table:', res.rows[0].count);

  const sample = await pool.query(`
    SELECT name, category, kcal_per_100g, protein_g, carbs_g, fat_g, default_unit
    FROM ingredients
    ORDER BY name
    LIMIT 30
  `);
  console.table(sample.rows);
  await pool.end();
}

checkIngs().catch(console.error);
