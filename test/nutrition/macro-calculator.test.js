// EatGym-Backend/test/nutrition/macro-calculator.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  roundTo,
  calculateKcalFromMacros,
  calculateMacrosFromIngredients,
  calculateMacroDeviation,
  isVegetarianIngredient
} from '../../src/nutrition/macro-calculator.js';

test('Case 1: roundTo correctly rounds decimals and handles floating-point quirks', () => {
  assert.equal(roundTo(104.04, 1), 104.0);
  assert.equal(roundTo(104.06, 1), 104.1);
  assert.equal(roundTo(0.1 + 0.2, 1), 0.3);
  assert.equal(roundTo(null, 1), 0);
  assert.equal(roundTo(NaN, 1), 0);
});

test('Case 2: calculateKcalFromMacros computes 4P + 4C + 9F accurately', () => {
  // 10g protein (40) + 20g carbs (80) + 5g fat (45) = 165 kcal
  const kcal1 = calculateKcalFromMacros(10, 20, 5);
  assert.equal(kcal1, 165.0);

  // 14g protein (56) + 12g carbs (48) + 0g fat (0) = 104 kcal
  const kcal2 = calculateKcalFromMacros(14, 12, 0);
  assert.equal(kcal2, 104.0);

  // Non-zero decimals
  const kcal3 = calculateKcalFromMacros(16.6, 6.8, 0.3);
  // 4 * 16.6 = 66.4, 4 * 6.8 = 27.2, 9 * 0.3 = 2.7 -> 96.3
  assert.equal(kcal3, 96.3);
});

test('Case 3: calculateMacrosFromIngredients aggregates multiple ingredients correctly', () => {
  const ingredients = [
    { amount: 150, protein_g: 10.7, carbs_g: 0.0, fat_g: 0.1 }, // Huyết heo luộc
    { amount: 20, protein_g: 1.8, carbs_g: 25.3, fat_g: 0.5 },  // Sả
    { amount: 10, protein_g: 1.8, carbs_g: 17.8, fat_g: 0.8 }   // Gừng
  ];

  const result = calculateMacrosFromIngredients(ingredients);
  // P = 1.5 * 10.7 + 0.2 * 1.8 + 0.1 * 1.8 = 16.05 + 0.36 + 0.18 = 16.59 -> 16.6g
  // C = 1.5 * 0 + 0.2 * 25.3 + 0.1 * 17.8 = 0 + 5.06 + 1.78 = 6.84 -> 6.8g
  // F = 1.5 * 0.1 + 0.2 * 0.5 + 0.1 * 0.8 = 0.15 + 0.10 + 0.08 = 0.33 -> 0.3g
  // Kcal = 4 * 16.6 + 4 * 6.8 + 9 * 0.3 = 96.3 kcal
  assert.equal(result.protein, 16.6);
  assert.equal(result.carbs, 6.8);
  assert.equal(result.fat, 0.3);
  assert.equal(result.kcal, 96.3);
});

test('Case 4: calculateMacrosFromIngredients handles edge cases (amount=0, negative, empty)', () => {
  // Empty array
  const emptyRes = calculateMacrosFromIngredients([]);
  assert.deepEqual(emptyRes, { protein: 0, carbs: 0, fat: 0, kcal: 0 });

  // Items with amount = 0 or negative
  const zeroRes = calculateMacrosFromIngredients([
    { amount: 0, protein_g: 25, carbs_g: 10, fat_g: 5 },
    { amount: -50, protein_g: 20, carbs_g: 15, fat_g: 2 }
  ]);
  assert.deepEqual(zeroRes, { protein: 0, carbs: 0, fat: 0, kcal: 0 });

  // Missing properties default safely
  const partialRes = calculateMacrosFromIngredients([
    { amount: 100 }
  ]);
  assert.deepEqual(partialRes, { protein: 0, carbs: 0, fat: 0, kcal: 0 });
});

test('Case 5: calculateMacroDeviation detects discrepancies > 30%', () => {
  // Case from database: kcal = 57, but 4P+4C+9F = 104 -> diff = 47, pct = 82.5% > 30%
  const dev1 = calculateMacroDeviation(57, 14, 12, 0);
  assert.equal(dev1.expectedKcal, 104);
  assert.equal(dev1.diff, 47);
  assert.equal(dev1.pctDiff, 82.5);
  assert.equal(dev1.isOver30Pct, true);

  // Normal recipe within margin
  const dev2 = calculateMacroDeviation(165, 10, 20, 5);
  assert.equal(dev2.expectedKcal, 165);
  assert.equal(dev2.diff, 0);
  assert.equal(dev2.pctDiff, 0);
  assert.equal(dev2.isOver30Pct, false);

  // Edge case: kcal = 0
  const devZero = calculateMacroDeviation(0, 10, 0, 0);
  assert.equal(devZero.isOver30Pct, true);
});

test('Case 6: isVegetarianIngredient validates vegetarian whitelist and rejects meat keywords', () => {
  // Whitelist items
  assert.equal(isVegetarianIngredient('Nấm đùi gà'), true);
  assert.equal(isVegetarianIngredient('Nấm rơm'), true);
  assert.equal(isVegetarianIngredient('Gạo huyết rồng'), true);
  assert.equal(isVegetarianIngredient('Đậu đen xanh lòng'), true);

  // Meat and seafood rejection
  assert.equal(isVegetarianIngredient('Thịt bò nạc'), false);
  assert.equal(isVegetarianIngredient('Sườn non heo'), false);
  assert.equal(isVegetarianIngredient('Cá lóc'), false);
  assert.equal(isVegetarianIngredient('Tôm sú bóc vỏ'), false);
  assert.equal(isVegetarianIngredient('Huyết heo luộc'), false);
  assert.equal(isVegetarianIngredient('Trứng gà tươi'), false);
});
