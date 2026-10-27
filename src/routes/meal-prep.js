import { Router } from 'express';
import { pool } from '../db/pool.js';
import { ApiError } from '../errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { convertIngredientWeight } from '../nutrition/meal-prep.js';

const router = Router();
router.use(requireAuth);

function invalid(field, message) {
  throw new ApiError(422, message, 'VALIDATION_ERROR', { field });
}

function object(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(422, 'Request body must be a JSON object.', 'VALIDATION_ERROR');
  }
  return body;
}

function text(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    invalid(field, `${field} must contain from 1 to ${maxLength} characters.`);
  }
  return value.trim();
}

function optionalText(value, field, maxLength) {
  if (value === undefined || value === null) return null;
  return text(value, field, maxLength);
}

function factorValue(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 5) {
    invalid('rawToCookedFactor', 'rawToCookedFactor must be greater than 0 and no more than 5.');
  }
  return value;
}

function servingsValue(value) {
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    invalid('servings', 'servings must be a whole number between 1 and 100.');
  }
  return value;
}

router.get('/yield-factors', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const result = await pool.query(
      `SELECT id, ingredient_name, cooking_method, raw_to_cooked_factor, source, updated_at
       FROM ingredient_yield_factors
       WHERE is_active = TRUE
         AND ($1 = '' OR ingredient_name ILIKE '%' || $1 || '%' OR cooking_method ILIKE '%' || $1 || '%')
       ORDER BY ingredient_name, cooking_method`,
      [search]
    );
    res.json({ yieldFactors: result.rows.map(serializeFactor) });
  } catch (error) {
    next(error);
  }
});

router.post('/yield-factors', requireRole('admin'), async (req, res, next) => {
  try {
    const input = object(req.body);
    const result = await pool.query(
      `INSERT INTO ingredient_yield_factors (
        ingredient_name, cooking_method, raw_to_cooked_factor, source, created_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, ingredient_name, cooking_method, raw_to_cooked_factor, source, updated_at`,
      [
        text(input.ingredientName, 'ingredientName', 160),
        text(input.cookingMethod, 'cookingMethod', 80),
        factorValue(input.rawToCookedFactor),
        optionalText(input.source, 'source', 240),
        req.auth.userId
      ]
    );
    res.status(201).json({ yieldFactor: serializeFactor(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.post('/convert', async (req, res, next) => {
  try {
    const input = object(req.body);
    if (typeof input.yieldFactorId !== 'string') invalid('yieldFactorId', 'yieldFactorId is required.');
    const factorResult = await pool.query(
      `SELECT id, ingredient_name, cooking_method, raw_to_cooked_factor, source, updated_at
       FROM ingredient_yield_factors WHERE id = $1 AND is_active = TRUE`,
      [input.yieldFactorId]
    );
    const factor = factorResult.rows[0];
    if (!factor) throw new ApiError(404, 'Yield factor not found.', 'YIELD_FACTOR_NOT_FOUND');
    const conversion = convertIngredientWeight({
      inputWeightG: input.inputWeightG,
      inputState: input.inputState,
      rawToCookedFactor: Number(factor.raw_to_cooked_factor),
      servings: input.servings ?? 1
    });
    res.json({ yieldFactor: serializeFactor(factor), conversion });
  } catch (error) {
    next(error);
  }
});

router.post('/batches', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const input = object(req.body);
    const name = text(input.name, 'name', 160);
    const servings = servingsValue(input.servings);
    const notes = optionalText(input.notes, 'notes', 500);
    if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 100) {
      invalid('items', 'items must contain between 1 and 100 ingredients.');
    }
    const itemInputs = input.items.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) invalid(`items[${index}]`, 'Each item must be an object.');
      if (typeof item.yieldFactorId !== 'string') invalid(`items[${index}].yieldFactorId`, 'yieldFactorId is required.');
      return {
        yieldFactorId: item.yieldFactorId,
        inputWeightG: item.inputWeightG,
        inputState: item.inputState
      };
    });
    const uniqueFactorIds = [...new Set(itemInputs.map((item) => item.yieldFactorId))];

    await client.query('BEGIN');
    const factorsResult = await client.query(
      `SELECT id, ingredient_name, cooking_method, raw_to_cooked_factor, source, updated_at
       FROM ingredient_yield_factors WHERE id = ANY($1::uuid[]) AND is_active = TRUE`,
      [uniqueFactorIds]
    );
    const factors = new Map(factorsResult.rows.map((factor) => [factor.id, factor]));
    if (factors.size !== uniqueFactorIds.length) {
      throw new ApiError(422, 'One or more yield factors do not exist or are inactive.', 'INVALID_YIELD_FACTOR');
    }

    const batchResult = await client.query(
      `INSERT INTO meal_prep_batches (user_id, name, servings, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, servings, notes, created_at, updated_at`,
      [req.auth.userId, name, servings, notes]
    );
    const batch = batchResult.rows[0];
    const items = [];
    for (const itemInput of itemInputs) {
      const factor = factors.get(itemInput.yieldFactorId);
      const conversion = convertIngredientWeight({
        inputWeightG: itemInput.inputWeightG,
        inputState: itemInput.inputState,
        rawToCookedFactor: Number(factor.raw_to_cooked_factor),
        servings
      });
      const itemResult = await client.query(
        `INSERT INTO meal_prep_batch_items (
          batch_id, yield_factor_id, input_state, input_weight_g, raw_weight_g, cooked_weight_g
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, input_state, input_weight_g, raw_weight_g, cooked_weight_g`,
        [batch.id, factor.id, itemInput.inputState, itemInput.inputWeightG, conversion.rawWeightG, conversion.cookedWeightG]
      );
      items.push({ ...serializeItem(itemResult.rows[0], servings), yieldFactor: serializeFactor(factor) });
    }
    await client.query('COMMIT');
    res.status(201).json({ batch: serializeBatch(batch, items) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.get('/batches', async (req, res, next) => {
  try {
    const batchesResult = await pool.query(
      `SELECT b.id, b.name, b.servings, b.notes, b.created_at, b.updated_at,
              COALESCE(COUNT(i.id), 0)::int AS item_count
       FROM meal_prep_batches b
       LEFT JOIN meal_prep_batch_items i ON i.batch_id = b.id
       WHERE b.user_id = $1
       GROUP BY b.id
       ORDER BY b.created_at DESC`,
      [req.auth.userId]
    );

    res.json({
      batches: batchesResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        servings: Number(row.servings),
        notes: row.notes,
        itemCount: Number(row.item_count),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get('/batches/:batchId', async (req, res, next) => {
  try {
    const batchResult = await pool.query(
      `SELECT id, name, servings, notes, created_at, updated_at
       FROM meal_prep_batches WHERE id = $1 AND user_id = $2`,
      [req.params.batchId, req.auth.userId]
    );
    const batch = batchResult.rows[0];
    if (!batch) throw new ApiError(404, 'Meal-prep batch not found.', 'BATCH_NOT_FOUND');
    const itemsResult = await pool.query(
      `SELECT i.id, i.input_state, i.input_weight_g, i.raw_weight_g, i.cooked_weight_g,
              f.id AS factor_id, f.ingredient_name, f.cooking_method, f.raw_to_cooked_factor, f.source, f.updated_at AS factor_updated_at
       FROM meal_prep_batch_items i
       JOIN ingredient_yield_factors f ON f.id = i.yield_factor_id
       WHERE i.batch_id = $1 ORDER BY i.created_at`,
      [batch.id]
    );
    const items = itemsResult.rows.map((row) => ({
      ...serializeItem(row, batch.servings),
      yieldFactor: {
        id: row.factor_id,
        ingredientName: row.ingredient_name,
        cookingMethod: row.cooking_method,
        rawToCookedFactor: Number(row.raw_to_cooked_factor),
        source: row.source,
        updatedAt: row.factor_updated_at
      }
    }));
    res.json({ batch: serializeBatch(batch, items) });
  } catch (error) {
    next(error);
  }
});

function serializeFactor(row) {
  return {
    id: row.id,
    ingredientName: row.ingredient_name,
    cookingMethod: row.cooking_method,
    rawToCookedFactor: Number(row.raw_to_cooked_factor),
    source: row.source,
    updatedAt: row.updated_at
  };
}

function serializeItem(row, servings) {
  return {
    id: row.id,
    inputState: row.input_state,
    inputWeightG: Number(row.input_weight_g),
    rawWeightG: Number(row.raw_weight_g),
    cookedWeightG: Number(row.cooked_weight_g),
    rawWeightPerServingG: Math.round((Number(row.raw_weight_g) / servings) * 100) / 100,
    cookedWeightPerServingG: Math.round((Number(row.cooked_weight_g) / servings) * 100) / 100
  };
}

function serializeBatch(row, items) {
  return {
    id: row.id,
    name: row.name,
    servings: row.servings,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items
  };
}

export default router;
