// macro-solver2.cjs — Tìm lượng nguyên liệu (gram) khớp macro mục tiêu.
// Coordinate descent trên không gian >=0, nhấn mạnh kcal.
'use strict';

function macroPerGram(ing) {
  return {
    kcal: Number(ing.kcal_per_100g) / 100,
    p: Number(ing.protein_g) / 100,
    c: Number(ing.carbs_g) / 100,
    f: Number(ing.fat_g) / 100,
  };
}

function totals(grams, macros) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (let i = 0; i < grams.length; i++) {
    t.kcal += macros[i].kcal * grams[i];
    t.p += macros[i].p * grams[i];
    t.c += macros[i].c * grams[i];
    t.f += macros[i].f * grams[i];
  }
  return t;
}

function errorOf(t, target) {
  return (Math.abs(t.kcal - target.kcal) / Math.max(target.kcal, 1)) * 2
    + Math.abs(t.p - target.p) / Math.max(target.p, 0.5)
    + Math.abs(t.c - target.c) / Math.max(target.c, 0.5)
    + Math.abs(t.f - target.f) / Math.max(target.f, 0.5);
}

/**
 * @param {Array}  ings   ingredient rows (kcal_per_100g, protein_g, carbs_g, fat_g)
 * @param {Object} target { kcal, p, c, f }
 * @param {Object} opt    { gramsCap, minGram, caps: number[] per-index max }
 */
function solveAmounts(ings, target, opt = {}) {
  const cap = opt.gramsCap ?? 500;
  const minGram = opt.minGram ?? 0;
  const caps = opt.caps;
  const capOf = i => (caps && caps[i] != null ? Math.min(caps[i], cap) : cap);
  const macros = ings.map(macroPerGram);
  const n = ings.length;
  if (n === 0) return null;

  const avgDensity = macros.reduce((s, m) => s + m.kcal, 0) / n || 1;
  let grams = new Array(n).fill(
    Math.min(cap, Math.max(1, target.kcal / avgDensity / n))
  );

  const byDesc = key => macros.map((m, i) => [m[key], i]).sort((a, b) => b[0] - a[0])[0][1];
  const proteinIdx = byDesc('p');
  const carbIdx = byDesc('c');
  const fatIdx = byDesc('f');

  let best = errorOf(totals(grams, macros), target);
  const steps = [200, 120, 80, 50, 30, 20, 12, 8, 5, 3, 2, 1];

  for (let iter = 0; iter < 400; iter++) {
    let improved = false;
    const t = totals(grams, macros);
    const priority = new Set([
      target.p - t.p > 0.3 ? proteinIdx : -1,
      target.c - t.c > 0.3 ? carbIdx : -1,
      target.f - t.f > 0.3 ? fatIdx : -1,
    ].filter(x => x >= 0));
    const order = [...priority, ...Array.from({ length: n }, (_, i) => i)];

    for (const k of order) {
      for (const d of steps) {
        for (const dir of [1, -1]) {
          const cand = grams.slice();
          cand[k] = grams[k] + dir * d;
          if (cand[k] < minGram || cand[k] > capOf(k)) continue;
          const e = errorOf(totals(cand, macros), target);
          if (e < best - 1e-9) { best = e; grams = cand; improved = true; }
        }
      }
    }
    if (!improved) break;
  }

  const t = totals(grams, macros);
  return {
    grams,
    totals: t,
    err: best,
    kcalDev: Math.abs(t.kcal - target.kcal) / Math.max(target.kcal, 1),
  };
}

module.exports = { macroPerGram, totals, errorOf, solveAmounts };
