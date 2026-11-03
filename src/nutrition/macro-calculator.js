// EatGym-Backend/src/nutrition/macro-calculator.js
// Pure calculation utilities for recipe macros and ingredient nutrition.

/**
 * Rounds a number to the specified number of decimal places.
 * Handles floating-point quirks cleanly (e.g., 0.1 + 0.2).
 */
export function roundTo(value, decimals = 1) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates total kcal from macronutrients using Atwater factors:
 * kcal = 4 * protein + 4 * carbs + 9 * fat
 */
export function calculateKcalFromMacros(protein, carbs, fat, decimals = 1) {
  const p = Math.max(0, Number(protein) || 0);
  const c = Math.max(0, Number(carbs) || 0);
  const f = Math.max(0, Number(fat) || 0);
  return roundTo(4 * p + 4 * c + 9 * f, decimals);
}

/**
 * Calculates aggregated nutrition from a list of recipe ingredients.
 * Each item must provide:
 * - amount (in grams / ml)
 * - protein_g (per 100g)
 * - carbs_g (per 100g)
 * - fat_g (per 100g)
 * - optional kcal_per_100g (defaults to Atwater 4P+4C+9F)
 */
export function calculateMacrosFromIngredients(items = [], decimals = 1) {
  if (!Array.isArray(items) || items.length === 0) {
    return { protein: 0, carbs: 0, fat: 0, kcal: 0 };
  }

  let totalP = 0;
  let totalC = 0;
  let totalF = 0;

  for (const item of items) {
    const amount = Math.max(0, Number(item.amount) || 0);
    if (amount === 0) continue;

    const pPer100 = Number(item.protein_g) || 0;
    const cPer100 = Number(item.carbs_g) || 0;
    const fPer100 = Number(item.fat_g) || 0;

    totalP += (amount / 100) * pPer100;
    totalC += (amount / 100) * cPer100;
    totalF += (amount / 100) * fPer100;
  }

  const roundedP = roundTo(totalP, decimals);
  const roundedC = roundTo(totalC, decimals);
  const roundedF = roundTo(totalF, decimals);
  const roundedKcal = calculateKcalFromMacros(roundedP, roundedC, roundedF, decimals);

  return {
    protein: roundedP,
    carbs: roundedC,
    fat: roundedF,
    kcal: roundedKcal
  };
}

/**
 * Calculates macro discrepancy percentage against Atwater expected kcal:
 * |kcal - (4P + 4C + 9F)| / kcal
 */
export function calculateMacroDeviation(kcal, protein, carbs, fat) {
  const k = Math.max(0, Number(kcal) || 0);
  const expectedKcal = calculateKcalFromMacros(protein, carbs, fat, 1);
  const diff = roundTo(Math.abs(k - expectedKcal), 1);
  const pctDiff = k > 0 ? roundTo((diff / k) * 100, 1) : (expectedKcal > 0 ? 100 : 0);
  const isOver30Pct = pctDiff > 30.0;

  return {
    expectedKcal,
    diff,
    pctDiff,
    isOver30Pct
  };
}

/**
 * Verifies if an ingredient list is strictly vegetarian.
 * Disallows all animal keywords with whitelists (e.g. nấm đùi gà).
 */
export function isVegetarianIngredient(ingredientName = '') {
  const name = String(ingredientName).toLowerCase().trim();
  if (!name) return true;

  // Whitelist items
  if (name.includes('nấm đùi gà') || name.includes('nấm')) return true;
  if (name.includes('huyết rồng')) return true;
  if (name.includes('xanh lòng')) return true;

  const animalKeywords = [
    'thịt', 'bò', 'heo', 'lợn', 'gà', 'vịt', 'ngỗng', 'chim', 'cút',
    'sườn', 'giò heo', 'tai heo', 'da heo', 'chả lụa', 'giăm bông',
    'xúc xích', 'bacon', 'pate', 'bì heo', 'cá ', ' cá', 'cá',
    'tôm', 'tép', 'mực', 'bạch tuộc', 'cua', 'ghẹ', 'ốc', 'sò', 'hến',
    'ngao', 'nghêu', 'hải sâm', 'ba khía', 'lươn', 'ếch', 'huyết', 'lòng',
    'trứng gà', 'trứng vịt', 'trứng cút', 'trứng'
  ];

  for (const kw of animalKeywords) {
    if (name.includes(kw)) {
      return false;
    }
  }

  return true;
}
