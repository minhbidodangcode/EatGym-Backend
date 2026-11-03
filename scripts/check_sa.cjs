const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSa() {
  const res = await pool.query("SELECT id, name, kcal_per_100g, protein_g, carbs_g, fat_g FROM ingredients WHERE name ILIKE '%sả%'");
  console.table(res.rows);
  await pool.end();
}

checkSa().catch(console.error);
