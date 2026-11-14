import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDailyCarbCyclingMacros,
  calculateWeeklyCarbCyclingPlan,
  CARB_CYCLING_TYPES,
  DEFAULT_WEEKLY_PRESETS
} from '../../src/nutrition/carb-cycling.js';

test('Carb Cycling: Heavy day increases carbs and calories (High Carb)', () => {
  const result = calculateDailyCarbCyclingMacros({
    baselineKcal: 2000,
    workoutType: 'heavy',
    weightKg: 70
  });

  assert.equal(result.workoutType, 'heavy');
  assert.equal(result.carbLevel, 'high');
  // Baseline 2000 * 1.10 = 2200 kcal
  assert.equal(result.kcal, 2200);
  // 50% Carbs = 1100 kcal / 4 = 275g
  assert.equal(result.carbsG, 275);
  // 25% Protein = 550 kcal / 4 = 138g
  assert.equal(result.proteinG, 138);
  // 25% Fat = 550 kcal / 9 = 61g
  assert.equal(result.fatG, 61);
  assert.match(result.carbBadge, /High Carb/i);
});

test('Carb Cycling: Light day maintains moderate carbs and baseline calories (Moderate Carb)', () => {
  const result = calculateDailyCarbCyclingMacros({
    baselineKcal: 2000,
    workoutType: 'light',
    weightKg: 70
  });

  assert.equal(result.workoutType, 'light');
  assert.equal(result.carbLevel, 'moderate');
  // Baseline 2000 * 1.00 = 2000 kcal
  assert.equal(result.kcal, 2000);
  // 35% Carbs = 700 kcal / 4 = 175g
  assert.equal(result.carbsG, 175);
  // 30% Protein = 600 kcal / 4 = 150g
  assert.equal(result.proteinG, 150);
  assert.match(result.carbBadge, /Moderate Carb/i);
});

test('Carb Cycling: Rest day lowers carbs and calories to optimize fat loss (Low Carb)', () => {
  const result = calculateDailyCarbCyclingMacros({
    baselineKcal: 2000,
    workoutType: 'rest',
    weightKg: 70
  });

  assert.equal(result.workoutType, 'rest');
  assert.equal(result.carbLevel, 'low');
  // Baseline 2000 * 0.88 = 1760 kcal
  assert.equal(result.kcal, 1760);
  // 20% Carbs = 352 kcal / 4 = 88g (Low carb)
  assert.equal(result.carbsG, 88);
  // Protein maintained high (35% = 616 kcal / 4 = 154g)
  assert.equal(result.proteinG, 154);
  assert.match(result.carbBadge, /Low Carb/i);
});

test('Carb Cycling: Calculates full 7-day weekly plan with presets', () => {
  const plan = calculateWeeklyCarbCyclingPlan({
    baselineKcal: 2200,
    weightKg: 70
  });

  assert.equal(plan.days.length, 7);
  assert.equal(plan.summary.heavyDaysCount, 2);
  assert.equal(plan.summary.lightDaysCount, 2);
  assert.equal(plan.summary.restDaysCount, 3);
  assert.ok(plan.summary.avgDailyKcal > 0);
  assert.ok(plan.summary.avgDailyCarbs > 0);

  // Check presets
  assert.equal(DEFAULT_WEEKLY_PRESETS.length, 3);
});
