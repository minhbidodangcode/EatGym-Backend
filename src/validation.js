import { ApiError } from './errors.js';
import { ACTIVITY_MULTIPLIERS, FITNESS_GOALS } from './nutrition/calculator.js';

function fail(field, message) {
  throw new ApiError(422, message, 'VALIDATION_ERROR', { field });
}

function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(422, 'Request body must be a JSON object.', 'VALIDATION_ERROR');
  }
  return value;
}

export function validateRegistration(body) {
  const input = object(body);
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
  const password = input.password;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    fail('email', 'email must be a valid email address.');
  }
  if (fullName.length < 2 || fullName.length > 120) {
    fail('fullName', 'fullName must contain between 2 and 120 characters.');
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    fail('password', 'password must contain between 8 and 128 characters.');
  }

  return { email, fullName, password };
}

export function validateLogin(body) {
  const input = object(body);
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!email || typeof input.password !== 'string') {
    throw new ApiError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
  }
  return { email, password: input.password };
}

function requiredNumber(value, field, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    fail(field, `${field} must be a number between ${min} and ${max}.`);
  }
  return value;
}

function validateNutritionFields(input) {
  if (input.sex !== 'male' && input.sex !== 'female') {
    fail('sex', 'sex must be either "male" or "female".');
  }
  if (!Object.hasOwn(ACTIVITY_MULTIPLIERS, input.activityLevel)) {
    fail('activityLevel', `activityLevel must be one of: ${Object.keys(ACTIVITY_MULTIPLIERS).join(', ')}.`);
  }
  const goal = input.fitnessGoal ?? 'maintenance';
  if (!FITNESS_GOALS.includes(goal)) {
    fail('fitnessGoal', `fitnessGoal must be one of: ${FITNESS_GOALS.join(', ')}.`);
  }

  return {
    sex: input.sex,
    heightCm: requiredNumber(input.heightCm, 'heightCm', 50, 300),
    weightKg: requiredNumber(input.weightKg, 'weightKg', 10, 500),
    activityLevel: input.activityLevel,
    fitnessGoal: goal
  };
}

export function validateProfile(body) {
  const input = object(body);
  if (typeof input.dateOfBirth !== 'string') {
    fail('dateOfBirth', 'dateOfBirth must use YYYY-MM-DD format.');
  }
  const stringList = (value, field) => {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || value.length > 50 || value.some((item) => typeof item !== 'string' || !item.trim() || item.length > 80)) {
      fail(field, `${field} must be an array of up to 50 non-empty strings (80 characters max).`);
    }
    return [...new Set(value.map((item) => item.trim()))];
  };
  const optionalNumber = (value, field, min, max) => {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    if (!Number.isFinite(num) || num < min || num > max) {
      fail(field, `${field} must be a number between ${min} and ${max}.`);
    }
    return num;
  };
  const optionalString = (value, field, maxLen) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') fail(field, `${field} must be a string.`);
    const trimmed = value.trim();
    if (trimmed.length > maxLen) fail(field, `${field} cannot exceed ${maxLen} characters.`);
    return trimmed.length > 0 ? trimmed : null;
  };
  const booleanFlag = (value, fallback = false) => {
    if (value === undefined || value === null) return fallback;
    return Boolean(value);
  };

  const targetMacros = input.targetMacros ?? {};
  if (!targetMacros || typeof targetMacros !== 'object' || Array.isArray(targetMacros)) fail('targetMacros', 'targetMacros must be an object.');
  for (const key of ['calories', 'protein', 'carbs', 'fat']) {
    if (targetMacros[key] !== undefined && (typeof targetMacros[key] !== 'number' || !Number.isFinite(targetMacros[key]) || targetMacros[key] < 0 || targetMacros[key] > 10000)) {
      fail(`targetMacros.${key}`, `${key} must be a number from 0 to 10000.`);
    }
  }

  return {
    ...validateNutritionFields(input),
    dateOfBirth: input.dateOfBirth,
    targetWeightKg: optionalNumber(input.targetWeightKg, 'targetWeightKg', 10, 500),
    allergies: stringList(input.allergies, 'allergies'),
    dietaryPreferences: stringList(input.dietaryPreferences, 'dietaryPreferences'),
    medicalHistory: stringList(input.medicalHistory, 'medicalHistory'),
    favoriteFoods: stringList(input.favoriteFoods, 'favoriteFoods'),
    isVegan: booleanFlag(input.isVegan, false),
    dietLifestyle: stringList(input.dietLifestyle, 'dietLifestyle'),
    cookingFrequency: optionalString(input.cookingFrequency, 'cookingFrequency', 50) || 'sometimes',
    groceryFrequency: optionalString(input.groceryFrequency, 'groceryFrequency', 50) || 'weekly',
    mealPrepEnabled: booleanFlag(input.mealPrepEnabled, true),
    creatorName: optionalString(input.creatorName, 'creatorName', 120),
    creatorHandle: optionalString(input.creatorHandle, 'creatorHandle', 60),
    creatorBio: optionalString(input.creatorBio, 'creatorBio', 500),
    cookingSpecialties: stringList(input.cookingSpecialties, 'cookingSpecialties'),
    kitchenSyncEnabled: booleanFlag(input.kitchenSyncEnabled, true),
    avatarUrl: optionalString(input.avatarUrl, 'avatarUrl', 500),
    onboardingCompleted: booleanFlag(input.onboardingCompleted, true),
    targetMacros
  };
}

export function validateCalculation(body) {
  const input = object(body);
  const nutritionFields = validateNutritionFields(input);
  if (typeof input.age !== 'number' || !Number.isInteger(input.age) || input.age < 13 || input.age > 120) {
    fail('age', 'age must be a whole number between 13 and 120.');
  }
  return { ...nutritionFields, age: input.age };
}
