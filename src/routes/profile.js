import { Router } from 'express';
import { pool } from '../db/pool.js';
import { ApiError } from '../errors.js';
import { requireAuth } from '../middleware/auth.js';
import { calculateAge, calculateNutritionBaseline } from '../nutrition/calculator.js';
import { validateProfile } from '../validation.js';

const router = Router();
router.use(requireAuth);

function isoDate(value) {
  if (!(value instanceof Date)) return String(value).slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function serializeProfile(row) {
  const dateOfBirth = isoDate(row.date_of_birth);
  return {
    sex: row.sex,
    dateOfBirth,
    age: calculateAge(dateOfBirth),
    heightCm: Number(row.height_cm),
    weightKg: Number(row.weight_kg),
    targetWeightKg: row.target_weight_kg ? Number(row.target_weight_kg) : null,
    activityLevel: row.activity_level,
    fitnessGoal: row.fitness_goal,
    allergies: row.allergies || [],
    dietaryPreferences: row.dietary_preferences || [],
    medicalHistory: row.medical_history || [],
    favoriteFoods: row.favorite_foods || [],
    isVegan: Boolean(row.is_vegan),
    dietLifestyle: row.diet_lifestyle || [],
    cookingFrequency: row.cooking_frequency || 'sometimes',
    groceryFrequency: row.grocery_frequency || 'weekly',
    onlineShoppingWhenNeeded: row.online_shopping_when_needed !== false,
    linkedShoppingApps: row.linked_shopping_apps || [],
    mealPrepEnabled: row.meal_prep_enabled !== false,
    creatorName: row.creator_name || null,
    creatorHandle: row.creator_handle || null,
    creatorBio: row.creator_bio || null,
    cookingSpecialties: row.cooking_specialties || [],
    kitchenSyncEnabled: row.kitchen_sync_enabled !== false,
    avatarUrl: row.avatar_url || null,
    isFoodBlogPrivate: Boolean(row.is_foodblog_private),
    onboardingCompleted: Boolean(row.onboarding_completed),
    targetMacros: row.target_macros || {},
    bmrKcal: Number(row.bmr_kcal),
    tdeeKcal: Number(row.tdee_kcal),
    calculationVersion: row.calculation_version,
    updatedAt: row.updated_at
  };
}

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM user_profiles WHERE user_id = $1`,
      [req.auth.userId]
    );
    if (!result.rows[0]) {
      throw new ApiError(404, 'A physical profile has not been created yet.', 'PROFILE_NOT_FOUND');
    }
    res.json({ profile: serializeProfile(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

async function handleSaveProfile(req, res, next) {
  let client;
  try {
    const profile = validateProfile(req.body);
    const age = calculateAge(profile.dateOfBirth);
    const baseline = calculateNutritionBaseline({ ...profile, age });
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO user_profiles (
        user_id, sex, date_of_birth, height_cm, weight_kg, activity_level, fitness_goal,
        allergies, dietary_preferences, target_macros, bmr_kcal, tdee_kcal,
        target_weight_kg, medical_history, favorite_foods, is_vegan, diet_lifestyle,
        cooking_frequency, grocery_frequency, online_shopping_when_needed, linked_shopping_apps, meal_prep_enabled,
        creator_name, creator_handle, creator_bio, cooking_specialties,
        kitchen_sync_enabled, avatar_url, is_foodblog_private, onboarding_completed
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22,
        $23, $24, $25, $26,
        $27, $28, $29, $30
      )
      ON CONFLICT (user_id) DO UPDATE SET
        sex = EXCLUDED.sex,
        date_of_birth = EXCLUDED.date_of_birth,
        height_cm = EXCLUDED.height_cm,
        weight_kg = EXCLUDED.weight_kg,
        activity_level = EXCLUDED.activity_level,
        fitness_goal = EXCLUDED.fitness_goal,
        allergies = EXCLUDED.allergies,
        dietary_preferences = EXCLUDED.dietary_preferences,
        target_macros = EXCLUDED.target_macros,
        bmr_kcal = EXCLUDED.bmr_kcal,
        tdee_kcal = EXCLUDED.tdee_kcal,
        target_weight_kg = EXCLUDED.target_weight_kg,
        medical_history = EXCLUDED.medical_history,
        favorite_foods = EXCLUDED.favorite_foods,
        is_vegan = EXCLUDED.is_vegan,
        diet_lifestyle = EXCLUDED.diet_lifestyle,
        cooking_frequency = EXCLUDED.cooking_frequency,
        grocery_frequency = EXCLUDED.grocery_frequency,
        online_shopping_when_needed = EXCLUDED.online_shopping_when_needed,
        linked_shopping_apps = EXCLUDED.linked_shopping_apps,
        meal_prep_enabled = EXCLUDED.meal_prep_enabled,
        creator_name = EXCLUDED.creator_name,
        creator_handle = EXCLUDED.creator_handle,
        creator_bio = EXCLUDED.creator_bio,
        cooking_specialties = EXCLUDED.cooking_specialties,
        kitchen_sync_enabled = EXCLUDED.kitchen_sync_enabled,
        avatar_url = EXCLUDED.avatar_url,
        is_foodblog_private = EXCLUDED.is_foodblog_private,
        onboarding_completed = EXCLUDED.onboarding_completed,
        calculation_version = 'mifflin-st-jeor-v1'
      RETURNING *`,
      [
        req.auth.userId,
        profile.sex,
        profile.dateOfBirth,
        profile.heightCm,
        profile.weightKg,
        profile.activityLevel,
        profile.fitnessGoal,
        profile.allergies,
        profile.dietaryPreferences,
        JSON.stringify(profile.targetMacros),
        baseline.bmrKcal,
        baseline.tdeeKcal,
        profile.targetWeightKg,
        profile.medicalHistory,
        profile.favoriteFoods,
        profile.isVegan,
        profile.dietLifestyle,
        profile.cookingFrequency,
        profile.groceryFrequency,
        profile.onlineShoppingWhenNeeded,
        profile.linkedShoppingApps,
        profile.mealPrepEnabled,
        profile.creatorName,
        profile.creatorHandle,
        profile.creatorBio,
        profile.cookingSpecialties,
        profile.kitchenSyncEnabled,
        profile.avatarUrl,
        profile.isFoodBlogPrivate,
        profile.onboardingCompleted
      ]
    );
    await client.query(
      `INSERT INTO body_stats_history (user_id, measured_on, weight_kg, height_cm)
       VALUES ($1, CURRENT_DATE, $2, $3)`,
      [req.auth.userId, profile.weightKg, profile.heightCm]
    );
    await client.query('COMMIT');
    res.json({
      profile: serializeProfile(result.rows[0]),
      calculation: baseline
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client?.release();
  }
}

router.put('/', handleSaveProfile);
router.post('/onboarding', handleSaveProfile);

router.get('/stats', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, measured_on, weight_kg, height_cm, body_fat_percent, created_at
       FROM body_stats_history WHERE user_id = $1 ORDER BY measured_on DESC, created_at DESC LIMIT 365`,
      [req.auth.userId]
    );
    res.json({ history: result.rows.map((row) => ({
      id: row.id, measuredOn: isoDate(row.measured_on), weightKg: Number(row.weight_kg),
      heightCm: row.height_cm === null ? null : Number(row.height_cm),
      bodyFatPercent: row.body_fat_percent === null ? null : Number(row.body_fat_percent), createdAt: row.created_at
    })) });
  } catch (error) { next(error); }
});

router.post('/stats', async (req, res, next) => {
  try {
    const { measuredOn, weightKg, heightCm = null, bodyFatPercent = null } = req.body || {};
    const parts = typeof measuredOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(measuredOn) ? measuredOn.split('-').map(Number) : [];
    const parsedDate = parts.length === 3 ? new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])) : null;
    const validDate = parsedDate && parsedDate.getUTCFullYear() === parts[0] && parsedDate.getUTCMonth() === parts[1] - 1 && parsedDate.getUTCDate() === parts[2];
    if (!validDate || typeof weightKg !== 'number' || !Number.isFinite(weightKg) || weightKg < 10 || weightKg > 500 ||
        (heightCm !== null && (typeof heightCm !== 'number' || !Number.isFinite(heightCm) || heightCm < 50 || heightCm > 300)) ||
        (bodyFatPercent !== null && (typeof bodyFatPercent !== 'number' || !Number.isFinite(bodyFatPercent) || bodyFatPercent < 0 || bodyFatPercent > 100))) {
      throw new ApiError(422, 'Provide a valid measuredOn date, weightKg, and optional heightCm/bodyFatPercent.', 'VALIDATION_ERROR');
    }
    const result = await pool.query(
      `INSERT INTO body_stats_history (user_id, measured_on, weight_kg, height_cm, body_fat_percent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, measured_on, weight_kg, height_cm, body_fat_percent, created_at`,
      [req.auth.userId, measuredOn, weightKg, heightCm, bodyFatPercent]
    );
    const row = result.rows[0];
    res.status(201).json({ stat: { id: row.id, measuredOn: isoDate(row.measured_on), weightKg: Number(row.weight_kg), heightCm: row.height_cm === null ? null : Number(row.height_cm), bodyFatPercent: row.body_fat_percent === null ? null : Number(row.body_fat_percent), createdAt: row.created_at } });
  } catch (error) { next(error); }
});

export default router;
