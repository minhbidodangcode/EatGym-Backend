import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProfile } from '../src/validation.js';

const validProfile = {
  sex: 'female', dateOfBirth: '1992-03-14', heightCm: 165, weightKg: 62,
  activityLevel: 'moderate', fitnessGoal: 'maintenance'
};

test('profile validation accepts and normalizes dietary preferences and macro targets', () => {
  const result = validateProfile({
    ...validProfile, allergies: ['  peanut ', 'peanut'], dietaryPreferences: ['vegetarian'],
    targetMacros: { calories: 1900, protein: 120, carbs: 200, fat: 60 }
  });
  assert.deepEqual(result.allergies, ['peanut']);
  assert.deepEqual(result.dietaryPreferences, ['vegetarian']);
  assert.deepEqual(result.targetMacros, { calories: 1900, protein: 120, carbs: 200, fat: 60 });
});

test('profile validation accepts 4-step onboarding attributes', () => {
  const result = validateProfile({
    ...validProfile,
    targetWeightKg: 65,
    medicalHistory: ['Gout', 'Tiểu đường'],
    favoriteFoods: ['Ức gà', 'Cá hồi'],
    isVegan: true,
    dietLifestyle: ['Eat Clean'],
    cookingFrequency: 'daily',
    groceryFrequency: 'weekly',
    onlineShoppingWhenNeeded: true,
    linkedShoppingApps: ['WinMart', 'ShopeeFood'],
    mealPrepEnabled: true,
    creatorName: 'Chef Minh Gymer',
    creatorHandle: '@minhgymer',
    creatorBio: 'Ăn sạch - Tập chuẩn - Tối ưu macro',
    cookingSpecialties: ['EatClean', 'HighProtein'],
    kitchenSyncEnabled: true,
    isFoodBlogPrivate: true,
    onboardingCompleted: true
  });
  assert.equal(result.targetWeightKg, 65);
  assert.deepEqual(result.medicalHistory, ['Gout', 'Tiểu đường']);
  assert.deepEqual(result.favoriteFoods, ['Ức gà', 'Cá hồi']);
  assert.equal(result.isVegan, true);
  assert.equal(result.onlineShoppingWhenNeeded, true);
  assert.deepEqual(result.linkedShoppingApps, ['WinMart', 'ShopeeFood']);
  assert.equal(result.isFoodBlogPrivate, true);
  assert.equal(result.creatorHandle, '@minhgymer');
  assert.equal(result.onboardingCompleted, true);
});

test('profile validation rejects malformed preference lists and macro targets', () => {
  assert.throws(() => validateProfile({ ...validProfile, allergies: 'peanut' }), { code: 'VALIDATION_ERROR' });
  assert.throws(() => validateProfile({ ...validProfile, targetMacros: { protein: -1 } }), { code: 'VALIDATION_ERROR' });
});
