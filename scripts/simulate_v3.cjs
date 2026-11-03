const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ALIASES = {
  'bông cải xanh (súp lơ)': 'bông cải xanh (broccoli)',
  'rau xà lách': 'xà lách romaine',
  'sả tươi': 'sả cây đập dập'
};

async function simulateV3() {
  const v3 = await pool.query(`
    SELECT r.id, r.title, r.kcal, r.protein_g, r.carbs_g, r.fat_g
    FROM recipes r
    WHERE ABS(r.kcal - (4 * r.protein_g + 4 * r.carbs_g + 9 * r.fat_g)) > 0.3 * r.kcal
    ORDER BY r.title
  `);

  const allIng = await pool.query('SELECT id, name, kcal_per_100g, protein_g, carbs_g, fat_g FROM ingredients');
  const ingMap = new Map();
  allIng.rows.forEach(r => {
    ingMap.set(r.name.trim().toLowerCase(), r);
    ingMap.set(r.id, r);
  });

  console.log(`Simulating V3 for ${v3.rows.length} recipes:`);
  let method1Count = 0;
  let method2Count = 0;

  for (const r of v3.rows) {
    const ri = await pool.query('SELECT * FROM recipe_ingredients WHERE recipe_id = $1', [r.id]);
    
    let canCalcFromIngs = ri.rows.length > 0;
    let totalP = 0, totalC = 0, totalF = 0;

    for (const item of ri.rows) {
      let ing = item.ingredient_id ? ingMap.get(item.ingredient_id) : null;
      if (!ing) {
        const norm = item.ingredient_name.trim().toLowerCase();
        const mappedName = ALIASES[norm] || norm;
        ing = ingMap.get(mappedName);
      }

      if (ing && ing.protein_g !== null && ing.carbs_g !== null && ing.fat_g !== null) {
        const amt = Number(item.amount);
        totalP += (amt / 100) * Number(ing.protein_g);
        totalC += (amt / 100) * Number(ing.carbs_g);
        totalF += (amt / 100) * Number(ing.fat_g);
      } else {
        canCalcFromIngs = false;
        break;
      }
    }

    if (canCalcFromIngs) {
      method1Count++;
      const p = Math.round(totalP * 10) / 10;
      const c = Math.round(totalC * 10) / 10;
      const f = Math.round(totalF * 10) / 10;
      const kcal = Math.round((4 * p + 4 * c + 9 * f) * 10) / 10;
      console.log(`[Method 1 - From Ings] "${r.title}": Old(kcal=${r.kcal}, P=${r.protein_g}, C=${r.carbs_g}, F=${r.fat_g}) -> New(kcal=${kcal}, P=${p}, C=${c}, F=${f})`);
    } else {
      method2Count++;
      const p = Number(r.protein_g);
      const c = Number(r.carbs_g);
      const f = Number(r.fat_g);
      const kcal = Math.round((4 * p + 4 * c + 9 * f) * 10) / 10;
      console.log(`[Method 2 - Recalc Kcal] "${r.title}": Old(kcal=${r.kcal}, P=${p}, C=${c}, F=${f}) -> New(kcal=${kcal}, P=${p}, C=${c}, F=${f})`);
    }
  }

  console.log(`\nSummary: Method 1 = ${method1Count}, Method 2 = ${method2Count}`);
  await pool.end();
}

simulateV3().catch(console.error);
