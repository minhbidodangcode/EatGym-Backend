const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Helper to normalize strings for ingredient matching
function norm(str) {
  return str.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ' ').replace(/\s+/g, ' ').trim();
}

async function prepareIngredientLookup() {
  const res = await pool.query('SELECT id, name, category, kcal_per_100g, protein_g, carbs_g, fat_g, default_unit FROM ingredients');
  const map = new Map();
  for (const r of res.rows) {
    const item = {
      id: r.id,
      name: r.name,
      category: r.category,
      kcal: Number(r.kcal_per_100g),
      p: Number(r.protein_g),
      c: Number(r.carbs_g),
      f: Number(r.fat_g),
      unit: r.default_unit || 'g'
    };
    map.set(norm(r.name), item);
  }

  function getIng(searchName) {
    const n = norm(searchName);
    if (map.has(n)) return map.get(n);
    // Partial match
    for (const [k, v] of map.entries()) {
      if (k.includes(n) || n.includes(k)) return v;
    }
    return null;
  }

  return { map, getIng };
}

// Optimization solver: given ingredients and target macro, find amounts in reasonable bounds
function solveAmounts(ingredients, target) {
  // target: { kcal, p, c, f }
  // We want to minimize error while keeping amounts reasonable
  // ingredients: array of { id, name, p, c, f, kcal, unit, minAmount, maxAmount }

  const n = ingredients.length;
  let bestAmounts = ingredients.map(ing => ing.minAmount || 20);
  let bestError = Infinity;

  // Coordinate descent / random restart optimization
  const evaluate = (amounts) => {
    let totP = 0, totC = 0, totF = 0, totK = 0;
    for (let i = 0; i < n; i++) {
      const a = amounts[i];
      totP += (a / 100) * ingredients[i].p;
      totC += (a / 100) * ingredients[i].c;
      totF += (a / 100) * ingredients[i].f;
      totK += (a / 100) * ingredients[i].kcal;
    }

    // Weight errors
    const wP = 3.0, wC = 2.0, wF = 3.0, wK = 1.0;
    const errP = Math.abs(totP - target.p) / Math.max(target.p, 5);
    const errC = Math.abs(totC - target.c) / Math.max(target.c, 5);
    const errF = Math.abs(totF - target.f) / Math.max(target.f, 5);
    const errK = Math.abs(totK - target.kcal) / Math.max(target.kcal, 50);

    const totalLoss = wP * errP * errP + wC * errC * errC + wF * errF * errF + wK * errK * errK;
    return {
      loss: totalLoss,
      p: Math.round(totP * 10) / 10,
      c: Math.round(totC * 10) / 10,
      f: Math.round(totF * 10) / 10,
      kcal: Math.round(totK * 10) / 10,
      errP, errC, errF, errK
    };
  };

  // Try multiple initializations
  for (let trial = 0; trial < 40; trial++) {
    let current = ingredients.map(ing => {
      const min = ing.minAmount || 10;
      const max = ing.maxAmount || 200;
      return min + Math.random() * (max - min);
    });

    let currentEval = evaluate(current);

    // Iterative local search
    let step = 15;
    for (let iter = 0; iter < 100; iter++) {
      let improved = false;
      for (let i = 0; i < n; i++) {
        const min = ingredients[i].minAmount || 5;
        const max = ingredients[i].maxAmount || 300;

        for (const dir of [-1, 1]) {
          const next = [...current];
          next[i] = Math.min(max, Math.max(min, next[i] + dir * step));
          const ev = evaluate(next);
          if (ev.loss < currentEval.loss) {
            current = next;
            currentEval = ev;
            improved = true;
          }
        }
      }
      step = step > 0.5 ? step * 0.9 : 0.5;
      if (!improved && step <= 0.5) break;
    }

    if (currentEval.loss < bestError) {
      bestError = currentEval.loss;
      bestAmounts = current.map(x => Math.round(x));
    }
  }

  const finalEval = evaluate(bestAmounts);
  return {
    amounts: bestAmounts,
    macros: { p: finalEval.p, c: finalEval.c, f: finalEval.f, kcal: finalEval.kcal },
    errors: {
      pPct: Math.round(finalEval.errP * 1000) / 10,
      cPct: Math.round(finalEval.errC * 1000) / 10,
      fPct: Math.round(finalEval.errF * 1000) / 10,
      kPct: Math.round(finalEval.errK * 1000) / 10
    }
  };
}

module.exports = { prepareIngredientLookup, solveAmounts };
