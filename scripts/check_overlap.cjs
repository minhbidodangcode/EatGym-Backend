const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkOverlap() {
  const v1 = await pool.query(`
    SELECT r.id, r.title FROM recipes r
    LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    WHERE ri.id IS NULL
  `);
  const v1Ids = new Set(v1.rows.map(r => r.id));

  const v2 = await pool.query(`SELECT id, title FROM recipes WHERE fat_g <= 0`);
  const v2Ids = new Set(v2.rows.map(r => r.id));

  const v3 = await pool.query(`
    SELECT id, title FROM recipes
    WHERE ABS(kcal - (4 * protein_g + 4 * carbs_g + 9 * fat_g)) > 0.3 * kcal
  `);
  const v3Ids = new Set(v3.rows.map(r => r.id));

  console.log('Total V1 (no ingredients):', v1.rows.length);
  console.log('Total V2 (fat_g <= 0):', v2.rows.length);
  console.log('Total V3 (diff > 30%):', v3.rows.length);

  // Overlap V1 & V2
  const v1v2 = [...v1Ids].filter(id => v2Ids.has(id));
  console.log('Overlap V1 & V2:', v1v2.length);

  // Overlap V1 & V3
  const v1v3 = [...v1Ids].filter(id => v3Ids.has(id));
  console.log('Overlap V1 & V3:', v1v3.length);
  if (v1v3.length > 0) {
    v1v3.forEach(id => {
      const r = v1.rows.find(x => x.id === id);
      console.log(`  - [${id}] "${r.title}"`);
    });
  }

  // Overlap V2 & V3
  const v2v3 = [...v2Ids].filter(id => v3Ids.has(id));
  console.log('Overlap V2 & V3:', v2v3.length);
  if (v2v3.length > 0) {
    v2v3.forEach(id => {
      const r = v2.rows.find(x => x.id === id);
      console.log(`  - [${id}] "${r.title}"`);
    });
  }

  await pool.end();
}

checkOverlap().catch(console.error);
