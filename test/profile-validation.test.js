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

test('profile validation rejects malformed preference lists and macro targets', () => {
  assert.throws(() => validateProfile({ ...validProfile, allergies: 'peanut' }), { code: 'VALIDATION_ERROR' });
  assert.throws(() => validateProfile({ ...validProfile, targetMacros: { protein: -1 } }), { code: 'VALIDATION_ERROR' });
});
