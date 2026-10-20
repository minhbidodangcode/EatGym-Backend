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
    activityLevel: row.activity_level,
    fitnessGoal: row.fitness_goal,
    allergies: row.allergies || [],
    dietaryPreferences: row.dietary_preferences || [],
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
      `SELECT sex, date_of_birth, height_cm, weight_kg, activity_level, fitness_goal,
              allergies, dietary_preferences, target_macros,
              bmr_kcal, tdee_kcal, calculation_version, updated_at
       FROM user_profiles WHERE user_id = $1`,
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

router.put('/', async (req, res, next) => {
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
        allergies, dietary_preferences, target_macros, bmr_kcal, tdee_kcal
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        calculation_version = 'mifflin-st-jeor-v1'
      RETURNING sex, date_of_birth, height_cm, weight_kg, activity_level, fitness_goal,
                allergies, dietary_preferences, target_macros,
                bmr_kcal, tdee_kcal, calculation_version, updated_at`,
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
        baseline.tdeeKcal
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
});

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
