import { Router } from 'express';
import { pool } from '../db/pool.js';
import { ApiError } from '../errors.js';
import { requireAuth } from '../middleware/auth.js';
import { allocateCompensation } from '../nutrition/compensation.js';

const router = Router();
router.use(requireAuth);

const MEAL_SLOTS = new Set(['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout']);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isoDate(value) {
  if (!(value instanceof Date)) return String(value).slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function validation(field, message) {
  throw new ApiError(422, message, 'VALIDATION_ERROR', { field });
}

function bodyObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(422, 'Request body must be a JSON object.', 'VALIDATION_ERROR');
  }
  return body;
}

function date(value, field) {
  if (typeof value !== 'string' || !datePattern.test(value)) {
    validation(field, `${field} must use valid YYYY-MM-DD format.`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) validation(field, `${field} must use valid YYYY-MM-DD format.`);
  return value;
}

function nonnegative(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100_000) {
    validation(field, `${field} must be a number from 0 to 100000.`);
  }
  return value;
}

router.put('/meal-targets/:targetDate/:mealSlot', async (req, res, next) => {
  try {
    const targetDate = date(req.params.targetDate, 'targetDate');
    const mealSlot = req.params.mealSlot;
    if (!MEAL_SLOTS.has(mealSlot)) validation('mealSlot', 'Unsupported mealSlot.');
    const plannedKcal = nonnegative(bodyObject(req.body).plannedKcal, 'plannedKcal');

    const result = await pool.query(
      `INSERT INTO meal_targets (user_id, target_date, meal_slot, planned_kcal)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, target_date, meal_slot) DO UPDATE SET planned_kcal = EXCLUDED.planned_kcal, updated_at = NOW()
       RETURNING id, target_date, meal_slot, planned_kcal, adjustment_kcal, effective_kcal, updated_at`,
      [req.auth.userId, targetDate, mealSlot, plannedKcal]
    );
    res.status(201).json({ mealTarget: serializeTarget(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.get('/meal-targets', async (req, res, next) => {
  try {
    const from = req.query.from ? date(req.query.from, 'from') : new Date().toISOString().slice(0, 10);
    const to = req.query.to ? date(req.query.to, 'to') : from;
    if (to < from) validation('to', 'to must be on or after from.');
    const result = await pool.query(
      `SELECT id, target_date, meal_slot, planned_kcal, adjustment_kcal, effective_kcal, updated_at
       FROM meal_targets
       WHERE user_id = $1 AND target_date BETWEEN $2 AND $3
       ORDER BY target_date, meal_slot`,
      [req.auth.userId, from, to]
    );
    res.json({ mealTargets: result.rows.map(serializeTarget) });
  } catch (error) {
    next(error);
  }
});

router.post('/deviations', async (req, res, next) => {
  try {
    const input = bodyObject(req.body);
    const occurredOn = date(input.occurredOn, 'occurredOn');
    const targetKcal = nonnegative(input.targetKcal, 'targetKcal');
    const actualKcal = nonnegative(input.actualKcal, 'actualKcal');
    if (targetKcal === actualKcal) validation('actualKcal', 'actualKcal must differ from targetKcal to create a deviation.');
    const note = input.note === undefined ? null : input.note;
    if (note !== null && (typeof note !== 'string' || note.length > 500)) validation('note', 'note must contain at most 500 characters.');

    const result = await pool.query(
      `INSERT INTO calorie_deviations (user_id, occurred_on, target_kcal, actual_kcal, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, occurred_on, target_kcal, actual_kcal, delta_kcal, note, created_at`,
      [req.auth.userId, occurredOn, targetKcal, actualKcal, note]
    );
    res.status(201).json({ deviation: serializeDeviation(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.post('/compensations', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const input = bodyObject(req.body);
    if (typeof input.deviationId !== 'string') validation('deviationId', 'deviationId is required.');
    if (!Number.isInteger(input.horizonDays) || input.horizonDays < 1 || input.horizonDays > 2) {
      validation('horizonDays', 'horizonDays must be 1 or 2.');
    }
    const minKcalPerMeal = input.minKcalPerMeal ?? 0;
    nonnegative(minKcalPerMeal, 'minKcalPerMeal');

    await client.query('BEGIN');
    const deviationResult = await client.query(
      `SELECT id, occurred_on, delta_kcal
       FROM calorie_deviations
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [input.deviationId, req.auth.userId]
    );
    const deviation = deviationResult.rows[0];
    if (!deviation) throw new ApiError(404, 'Deviation not found.', 'DEVIATION_NOT_FOUND');
    if (Number(deviation.delta_kcal) <= 0) {
      throw new ApiError(422, 'Only an energy excess can be automatically reduced from future meal targets.', 'UNSUPPORTED_DEVIATION');
    }

    const existing = await client.query('SELECT id FROM calorie_compensations WHERE deviation_id = $1', [deviation.id]);
    if (existing.rowCount > 0) throw new ApiError(409, 'This deviation has already been compensated.', 'COMPENSATION_EXISTS');

    const targetsResult = await client.query(
      `SELECT id, target_date, meal_slot, planned_kcal, adjustment_kcal, effective_kcal
       FROM meal_targets
       WHERE user_id = $1
         AND target_date > $2
         AND target_date <= ($2::date + $3::integer)
       ORDER BY target_date, meal_slot
       FOR UPDATE`,
      [req.auth.userId, deviation.occurred_on, input.horizonDays]
    );
    if (targetsResult.rowCount === 0) throw new ApiError(422, 'No future meal targets exist in the selected horizon.', 'NO_FUTURE_TARGETS');

    const calculation = allocateCompensation(Number(deviation.delta_kcal), targetsResult.rows.map((row) => ({
      ...row,
      plannedKcal: Number(row.planned_kcal),
      capacity: Math.max(0, Number(row.effective_kcal) - minKcalPerMeal)
    })));
    if (calculation.allocatedKcal === 0) {
      throw new ApiError(422, 'Future meal targets cannot absorb additional compensation at the specified minimum.', 'NO_COMPENSATION_CAPACITY');
    }

    const status = calculation.unallocatedKcal === 0 ? 'complete' : 'partial';
    const compensationResult = await client.query(
      `INSERT INTO calorie_compensations (
        user_id, deviation_id, horizon_days, requested_kcal, allocated_kcal, unallocated_kcal, min_kcal_per_meal, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, horizon_days, requested_kcal, allocated_kcal, unallocated_kcal, min_kcal_per_meal, status, created_at`,
      [req.auth.userId, deviation.id, input.horizonDays, calculation.requestedKcal, calculation.allocatedKcal, calculation.unallocatedKcal, minKcalPerMeal, status]
    );
    const compensation = compensationResult.rows[0];

    const allocations = [];
    for (const allocation of calculation.allocations) {
      const updatedTarget = await client.query(
        `UPDATE meal_targets
         SET adjustment_kcal = adjustment_kcal - $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, target_date, meal_slot, planned_kcal, adjustment_kcal, effective_kcal, updated_at`,
        [allocation.compensationKcal, allocation.id]
      );
      await client.query(
        `INSERT INTO calorie_compensation_allocations (compensation_id, meal_target_id, compensation_kcal)
         VALUES ($1, $2, $3)`,
        [compensation.id, allocation.id, allocation.compensationKcal]
      );
      allocations.push({ compensationKcal: allocation.compensationKcal, mealTarget: serializeTarget(updatedTarget.rows[0]) });
    }
    await client.query('COMMIT');
    res.status(201).json({ compensation: serializeCompensation(compensation, allocations) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

function serializeTarget(row) {
  return {
    id: row.id,
    targetDate: isoDate(row.target_date),
    mealSlot: row.meal_slot,
    plannedKcal: Number(row.planned_kcal),
    adjustmentKcal: Number(row.adjustment_kcal),
    effectiveKcal: Number(row.effective_kcal),
    updatedAt: row.updated_at
  };
}

function serializeDeviation(row) {
  return {
    id: row.id,
    occurredOn: isoDate(row.occurred_on),
    targetKcal: Number(row.target_kcal),
    actualKcal: Number(row.actual_kcal),
    deltaKcal: Number(row.delta_kcal),
    note: row.note,
    createdAt: row.created_at
  };
}

function serializeCompensation(row, allocations) {
  return {
    id: row.id,
    horizonDays: row.horizon_days,
    requestedKcal: Number(row.requested_kcal),
    allocatedKcal: Number(row.allocated_kcal),
    unallocatedKcal: Number(row.unallocated_kcal),
    minKcalPerMeal: Number(row.min_kcal_per_meal),
    status: row.status,
    createdAt: row.created_at,
    allocations
  };
}

export default router;
