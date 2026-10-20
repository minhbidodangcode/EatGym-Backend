import { Router } from 'express';
import { pool } from '../db/pool.js';
import { ApiError } from '../errors.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const MEALS = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

function isoDate(value) {
  if (!(value instanceof Date)) return String(value).slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function date(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ApiError(422, `${field} must use YYYY-MM-DD format.`, 'VALIDATION_ERROR', { field });
  const [y, m, d] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== m - 1 || parsed.getUTCDate() !== d) throw new ApiError(422, `${field} must be a valid calendar date.`, 'VALIDATION_ERROR', { field });
  return value;
}

function numeric(value, field, fallback, min = 0, max = 100000) {
  const number = value === undefined ? fallback : value;
  if (typeof number !== 'number' || !Number.isFinite(number) || number < min || number > max) throw new ApiError(422, `${field} must be a number from ${min} to ${max}.`, 'VALIDATION_ERROR', { field });
  return number;
}

router.get('/nutrition-logs', async (req, res, next) => {
  try {
    const logDate = req.query.date ? date(req.query.date, 'date') : new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      `SELECT id, log_date, meal_type, food_name, serving_size, serving_unit, calories, protein, carbs, fat, created_at
       FROM nutrition_logs WHERE user_id = $1 AND log_date = $2 ORDER BY created_at`, [req.auth.userId, logDate]
    );
    const meals = Object.fromEntries([...MEALS].map((meal) => [meal, { items: [], totalCalories: 0 }]));
    const totals = { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
    for (const row of result.rows) {
      const item = { id: row.id, foodName: row.food_name, servingSize: Number(row.serving_size), servingUnit: row.serving_unit,
        calories: Number(row.calories), protein: Number(row.protein), carbs: Number(row.carbs), fat: Number(row.fat), createdAt: row.created_at };
      meals[row.meal_type].items.push(item);
      meals[row.meal_type].totalCalories += item.calories;
      totals.totalCalories += item.calories; totals.totalProtein += item.protein; totals.totalCarbs += item.carbs; totals.totalFat += item.fat;
    }
    for (const meal of Object.values(meals)) meal.totalCalories = Math.round(meal.totalCalories);
    res.json({ date: logDate, meals, summary: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Math.round(value)])) });
  } catch (error) { next(error); }
});

router.get('/nutrition-logs/summary', async (req, res, next) => {
  try {
    const from = req.query.from ? date(req.query.from, 'from') : null;
    const to = req.query.to ? date(req.query.to, 'to') : null;
    if (from && to && to < from) throw new ApiError(422, 'to must be on or after from.', 'VALIDATION_ERROR', { field: 'to' });
    const result = await pool.query(
      `SELECT log_date AS date, SUM(calories) AS total_calories, SUM(protein) AS total_protein,
              SUM(carbs) AS total_carbs, SUM(fat) AS total_fat FROM nutrition_logs
       WHERE user_id = $1 AND ($2::date IS NULL OR log_date >= $2) AND ($3::date IS NULL OR log_date <= $3)
       GROUP BY log_date ORDER BY log_date`, [req.auth.userId, from, to]
    );
    res.json({ summary: result.rows.map((row) => ({ date: isoDate(row.date), totalCalories: Math.round(Number(row.total_calories)), totalProtein: Math.round(Number(row.total_protein)), totalCarbs: Math.round(Number(row.total_carbs)), totalFat: Math.round(Number(row.total_fat)) })) });
  } catch (error) { next(error); }
});

router.post('/nutrition-logs', async (req, res, next) => {
  try {
    const input = req.body;
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(422, 'Request body must be a JSON object.', 'VALIDATION_ERROR');
    const foodName = typeof input.foodName === 'string' ? input.foodName.trim() : '';
    if (!foodName || foodName.length > 200) throw new ApiError(422, 'foodName is required and must be at most 200 characters.', 'VALIDATION_ERROR', { field: 'foodName' });
    const mealType = input.mealType ?? 'breakfast';
    if (!MEALS.has(mealType)) throw new ApiError(422, 'mealType must be breakfast, lunch, dinner, or snack.', 'VALIDATION_ERROR', { field: 'mealType' });
    const logDate = input.logDate ? date(input.logDate, 'logDate') : new Date().toISOString().slice(0, 10);
    const servingUnit = input.servingUnit ?? 'portion';
    if (typeof servingUnit !== 'string' || !servingUnit.trim() || servingUnit.length > 32) throw new ApiError(422, 'servingUnit must be a non-empty string up to 32 characters.', 'VALIDATION_ERROR', { field: 'servingUnit' });
    const values = [req.auth.userId, logDate, mealType, foodName, numeric(input.servingSize, 'servingSize', 1, Number.MIN_VALUE), servingUnit.trim(), numeric(input.calories, 'calories', 0), numeric(input.protein, 'protein', 0), numeric(input.carbs, 'carbs', 0), numeric(input.fat, 'fat', 0)];
    const result = await pool.query(
      `INSERT INTO nutrition_logs (user_id, log_date, meal_type, food_name, serving_size, serving_unit, calories, protein, carbs, fat)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, values
    );
    const row = result.rows[0];
    res.status(201).json({ log: { ...row, log_date: isoDate(row.log_date) } });
  } catch (error) { next(error); }
});

router.delete('/nutrition-logs/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM nutrition_logs WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.auth.userId]);
    if (!result.rowCount) throw new ApiError(404, 'Nutrition log not found.', 'NUTRITION_LOG_NOT_FOUND');
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) { next(error); }
});

export default router;
