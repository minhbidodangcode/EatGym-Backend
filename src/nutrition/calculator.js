import { ApiError } from '../errors.js';

export const ACTIVITY_MULTIPLIERS = Object.freeze({
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
});

export const FITNESS_GOALS = Object.freeze([
  'bulking',
  'cutting',
  'maintenance',
  'iifym',
  'carb_cycling'
]);

function invalid(field, message) {
  throw new ApiError(422, message, 'VALIDATION_ERROR', { field });
}

function numeric(value, field, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    invalid(field, `${field} must be a number between ${min} and ${max}.`);
  }
  return value;
}

function rounded(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Mifflin-St Jeor (kcal/day):
 * male   = 10W + 6.25H - 5A + 5
 * female = 10W + 6.25H - 5A - 161
 * W is kg, H is cm, and A is completed years.
 */
export function calculateBmr({ sex, weightKg, heightCm, age }) {
  if (sex !== 'male' && sex !== 'female') {
    invalid('sex', 'sex must be either "male" or "female".');
  }

  const validatedWeight = numeric(weightKg, 'weightKg', 10, 500);
  const validatedHeight = numeric(heightCm, 'heightCm', 50, 300);
  const validatedAge = numeric(age, 'age', 13, 120);
  if (!Number.isInteger(validatedAge)) {
    invalid('age', 'age must be a whole number of completed years.');
  }

  const sexAdjustment = sex === 'male' ? 5 : -161;
  return rounded((10 * validatedWeight) + (6.25 * validatedHeight) - (5 * validatedAge) + sexAdjustment);
}

export function calculateTdee(bmr, activityLevel) {
  const validatedBmr = numeric(bmr, 'bmr', 1, 10_000);
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  if (!multiplier) {
    invalid('activityLevel', `activityLevel must be one of: ${Object.keys(ACTIVITY_MULTIPLIERS).join(', ')}.`);
  }
  return rounded(validatedBmr * multiplier);
}

export function calculateAge(dateOfBirth, asOf = new Date()) {
  if (dateOfBirth instanceof Date) {
    const year = dateOfBirth.getUTCFullYear();
    const month = String(dateOfBirth.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateOfBirth.getUTCDate()).padStart(2, '0');
    dateOfBirth = `${year}-${month}-${day}`;
  } else if (typeof dateOfBirth === 'string' && dateOfBirth.includes('T')) {
    dateOfBirth = dateOfBirth.slice(0, 10);
  }

  if (typeof dateOfBirth !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    invalid('dateOfBirth', 'dateOfBirth must use YYYY-MM-DD format.');
  }

  const [year, month, day] = dateOfBirth.split('-').map(Number);
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (
    birth.getUTCFullYear() !== year ||
    birth.getUTCMonth() !== month - 1 ||
    birth.getUTCDate() !== day
  ) {
    invalid('dateOfBirth', 'dateOfBirth is not a valid calendar date.');
  }

  const reference = new Date(asOf);
  if (Number.isNaN(reference.getTime())) {
    throw new Error('asOf must be a valid date.');
  }

  const referenceYear = reference.getUTCFullYear();
  const hasHadBirthday =
    reference.getUTCMonth() > month - 1 ||
    (reference.getUTCMonth() === month - 1 && reference.getUTCDate() >= day);
  const age = referenceYear - year - (hasHadBirthday ? 0 : 1);

  if (age < 13 || age > 120) {
    invalid('dateOfBirth', 'The resulting age must be between 13 and 120 years.');
  }
  return age;
}

export function calculateNutritionBaseline({ sex, weightKg, heightCm, age, activityLevel }) {
  const bmr = calculateBmr({ sex, weightKg, heightCm, age });
  return {
    bmrKcal: bmr,
    tdeeKcal: calculateTdee(bmr, activityLevel),
    activityMultiplier: ACTIVITY_MULTIPLIERS[activityLevel]
  };
}
