const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function findNames() {
  const terms = ['chao', 'đậu hũ', 'đậu phụ', 'vịt', 'bì', 'bột mì', 'bơ'];
  for (const t of terms) {
    const res = await pool.query(`SELECT id, name FROM ingredients WHERE name ILIKE $1`, [`%${t}%`]);
    console.log(`Query "${t}":`, res.rows.map(r => r.name));
  }
  await pool.end();
}

findNames().catch(console.error);
