import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../errors.js';

const router = Router();

router.get('/favorites/recipes', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.title, r.icon, r.description, r.kcal, r.protein_g, r.carbs_g, r.fat_g, r.tags, f.created_at
       FROM user_favorite_recipes f JOIN recipes r ON r.id = f.recipe_id
       WHERE f.user_id = $1 ORDER BY f.created_at DESC`, [req.auth.userId]
    );
    res.json({ recipes: result.rows.map((row) => ({ id: row.id, title: row.title, icon: row.icon, description: row.description, kcal: Number(row.kcal), protein: Number(row.protein_g), carbs: Number(row.carbs_g), fat: Number(row.fat_g), tags: row.tags, savedAt: row.created_at })) });
  } catch (error) { next(error); }
});

router.put('/favorites/recipes/:recipeId', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `INSERT INTO user_favorite_recipes (user_id, recipe_id)
       SELECT $1, id FROM recipes WHERE id = $2
       ON CONFLICT DO NOTHING RETURNING recipe_id`, [req.auth.userId, req.params.recipeId]
    );
    if (!result.rowCount) {
      const exists = await pool.query('SELECT 1 FROM recipes WHERE id = $1', [req.params.recipeId]);
      if (!exists.rowCount) throw new ApiError(404, 'Recipe not found.', 'RECIPE_NOT_FOUND');
    }
    res.status(201).json({ saved: true, recipeId: req.params.recipeId });
  } catch (error) { next(error); }
});

router.delete('/favorites/recipes/:recipeId', requireAuth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM user_favorite_recipes WHERE user_id = $1 AND recipe_id = $2', [req.auth.userId, req.params.recipeId]);
    res.json({ saved: false, recipeId: req.params.recipeId });
  } catch (error) { next(error); }
});

router.get('/favorites/ingredients', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT i.id, i.name, i.category, i.kcal_per_100g, i.protein_g, i.carbs_g, i.fat_g, f.created_at
       FROM user_favorite_ingredients f JOIN ingredients i ON i.id = f.ingredient_id
       WHERE f.user_id = $1 ORDER BY f.created_at DESC`, [req.auth.userId]
    );
    res.json({ ingredients: result.rows.map((row) => ({ id: row.id, name: row.name, category: row.category, kcalPer100g: Number(row.kcal_per_100g), protein: Number(row.protein_g), carbs: Number(row.carbs_g), fat: Number(row.fat_g), savedAt: row.created_at })) });
  } catch (error) { next(error); }
});

router.put('/favorites/ingredients/:ingredientId', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `INSERT INTO user_favorite_ingredients (user_id, ingredient_id)
       SELECT $1, id FROM ingredients WHERE id = $2
       ON CONFLICT DO NOTHING RETURNING ingredient_id`, [req.auth.userId, req.params.ingredientId]
    );
    if (!result.rowCount) {
      const exists = await pool.query('SELECT 1 FROM ingredients WHERE id = $1', [req.params.ingredientId]);
      if (!exists.rowCount) throw new ApiError(404, 'Ingredient not found.', 'INGREDIENT_NOT_FOUND');
    }
    res.status(201).json({ saved: true, ingredientId: req.params.ingredientId });
  } catch (error) { next(error); }
});

router.delete('/favorites/ingredients/:ingredientId', requireAuth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM user_favorite_ingredients WHERE user_id = $1 AND ingredient_id = $2', [req.auth.userId, req.params.ingredientId]);
    res.json({ saved: false, ingredientId: req.params.ingredientId });
  } catch (error) { next(error); }
});

// -------------------------------------------------------------
// GET /api/ingredients - Lấy toàn bộ danh sách nguyên liệu
// -------------------------------------------------------------
router.get('/ingredients', async (req, res, next) => {
  try {
    const { category, q } = req.query;
    let query = `
      SELECT id, name, category, kcal_per_100g, protein_g, carbs_g, fat_g, icon, default_unit
      FROM ingredients
      WHERE 1=1
    `;
    const params = [];

    if (category && typeof category === 'string' && category.trim()) {
      params.push(category.trim());
      query += ` AND category = $${params.length}`;
    }

    if (q && typeof q === 'string' && q.trim()) {
      params.push(`%${q.trim()}%`);
      query += ` AND name ILIKE $${params.length}`;
    }

    query += ' ORDER BY category, name ASC';

    const result = await pool.query(query, params);
    res.json({
      ingredients: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        kcalPer100g: Number(row.kcal_per_100g),
        protein: Number(row.protein_g),
        carbs: Number(row.carbs_g),
        fat: Number(row.fat_g),
        icon: row.icon || '🥗',
        unit: row.default_unit || 'g'
      }))
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/recipes - Tìm kiếm và lọc công thức món ăn
// -------------------------------------------------------------
router.get('/recipes', async (req, res, next) => {
  try {
    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const tag = typeof req.query.tag === 'string' ? req.query.tag.trim() : '';

    let query = `
      SELECT r.id, r.title, r.icon, r.description, r.kcal, r.protein_g, r.carbs_g, r.fat_g,
             r.cooking_time_min, r.servings, r.difficulty, r.tags, r.instructions,
             COALESCE(
               json_agg(
                 json_build_object(
                   'name', ri.ingredient_name,
                   'amount', ri.amount,
                   'unit', ri.unit,
                   'notes', ri.notes
                 )
               ) FILTER (WHERE ri.id IS NOT NULL), '[]'
             ) AS ingredients
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (r.title ILIKE $${params.length} OR ri.ingredient_name ILIKE $${params.length})`;
    }

    if (tag && tag !== 'Tất cả') {
      params.push(tag);
      query += ` AND $${params.length} = ANY(r.tags)`;
    }

    query += `
      GROUP BY r.id
      ORDER BY r.title ASC
    `;

    const result = await pool.query(query, params);
    res.json({
      recipes: result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        icon: row.icon || '🍲',
        description: row.description,
        kcal: Number(row.kcal),
        protein: Number(row.protein_g),
        carbs: Number(row.carbs_g),
        fat: Number(row.fat_g),
        time: row.cooking_time_min,
        servings: row.servings,
        difficulty: row.difficulty,
        tags: row.tags || [],
        instructions: row.instructions,
        ingredients: row.ingredients
      }))
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/recipes/suggest - Đề xuất món theo nguyên liệu sẵn có
// -------------------------------------------------------------
router.post('/recipes/suggest', requireAuth, async (req, res, next) => {
  try {
    const { ingredients = [], maxTime } = req.body;
    const profileResult = await pool.query(
      'SELECT allergies, dietary_preferences FROM user_profiles WHERE user_id = $1', [req.auth.userId]
    );
    const suppliedAllergies = req.body?.allergies ?? [];
    const suppliedPreferences = req.body?.dietaryPreferences ?? [];
    if (!Array.isArray(suppliedAllergies) || suppliedAllergies.length > 30 || suppliedAllergies.some((value) => typeof value !== 'string' || !value.trim())) {
      throw new ApiError(422, 'allergies must be an array of non-empty strings.', 'VALIDATION_ERROR', { field: 'allergies' });
    }
    if (!Array.isArray(suppliedPreferences) || suppliedPreferences.length > 30 || suppliedPreferences.some((value) => typeof value !== 'string' || !value.trim())) {
      throw new ApiError(422, 'dietaryPreferences must be an array of non-empty strings.', 'VALIDATION_ERROR', { field: 'dietaryPreferences' });
    }
    const allergies = [...new Set([...(profileResult.rows[0]?.allergies || []), ...suppliedAllergies])];
    const dietaryPreferences = [...new Set([...(profileResult.rows[0]?.dietary_preferences || []), ...suppliedPreferences])];
    if (!Array.isArray(ingredients) || ingredients.some((value) => typeof value !== 'string' || !value.trim())) {
      throw new ApiError(422, 'ingredients must be an array of non-empty strings.', 'VALIDATION_ERROR', { field: 'ingredients' });
    }
    const allergyPatterns = allergies.map((value) => `%${value.trim()}%`);
    const maxCookingTime = maxTime !== undefined ? Number(maxTime) : (req.query.maxTime ? Number(req.query.maxTime) : null);

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      // Nếu không truyền nguyên liệu, trả về top món tăng cơ (ưu tiên <= maxCookingTime nếu có)
      let defaultSql = `
        SELECT id, title, icon, description, kcal, protein_g, carbs_g, fat_g, cooking_time_min, tags, instructions
        FROM recipes
        WHERE 1=1
      `;
      const defaultParams = [];
      let safetyFilter = '';
      if (allergyPatterns.length) {
        defaultParams.push(allergyPatterns);
        safetyFilter = ` AND NOT EXISTS (SELECT 1 FROM recipe_ingredients ai WHERE ai.recipe_id = recipes.id AND ai.ingredient_name ILIKE ANY($${defaultParams.length}::text[]))`;
      }
      if (dietaryPreferences.length) {
        defaultParams.push(dietaryPreferences.map((value) => value.trim()));
        safetyFilter += ` AND tags && $${defaultParams.length}::text[]`;
      }
      defaultSql += safetyFilter;
      if (maxCookingTime && Number.isFinite(maxCookingTime)) {
        defaultParams.push(maxCookingTime);
        defaultSql += ` AND cooking_time_min <= $${defaultParams.length}`;
      }
      defaultSql += ` ORDER BY protein_g DESC LIMIT 6`;

      const defaultRes = await pool.query(defaultSql, defaultParams);
      return res.json({
        recipes: defaultRes.rows.map((r) => ({
          id: r.id,
          title: r.title,
          icon: r.icon || '🍲',
          description: r.description,
          kcal: Number(r.kcal),
          protein: Number(r.protein_g),
          carbs: Number(r.carbs_g),
          fat: Number(r.fat_g),
          time: r.cooking_time_min,
          tags: r.tags || [],
          instructions: r.instructions,
          matchingCount: 0
        }))
      });
    }

    const patterns = ingredients.map((name) => `%${name.trim()}%`);
    const params = [patterns];
    let preferenceFilter = '';
    if (allergyPatterns.length) {
      params.push(allergyPatterns);
      preferenceFilter += ` AND NOT EXISTS (SELECT 1 FROM recipe_ingredients ai WHERE ai.recipe_id = r.id AND ai.ingredient_name ILIKE ANY($${params.length}::text[]))`;
    }
    if (dietaryPreferences.length) {
      params.push(dietaryPreferences.map((value) => value.trim()));
      preferenceFilter += ` AND r.tags && $${params.length}::text[]`;
    }
    let timeCondition = '';
    if (maxCookingTime && Number.isFinite(maxCookingTime)) {
      params.push(maxCookingTime);
      timeCondition = ` AND r.cooking_time_min <= $${params.length}`;
    }

    const result = await pool.query(
      `
      SELECT r.id, r.title, r.icon, r.description, r.kcal, r.protein_g, r.carbs_g, r.fat_g,
             r.cooking_time_min, r.tags, r.instructions,
             COUNT(ri.id) AS matching_count,
             ARRAY_AGG(ri.ingredient_name) AS matched_ingredients
      FROM recipes r
      JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      WHERE (ri.ingredient_name ILIKE ANY($1::text[]) OR r.title ILIKE ANY($1::text[]))
            ${preferenceFilter}
            ${timeCondition}
      GROUP BY r.id
      ORDER BY matching_count DESC, r.cooking_time_min ASC, r.kcal ASC
      LIMIT 12
      `,
      params
    );

    if (result.rows.length === 0) {
      return res.json({ recipes: [] });
    }

    res.json({
      recipes: result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        icon: row.icon || '🍲',
        description: row.description,
        kcal: Number(row.kcal),
        protein: Number(row.protein_g),
        carbs: Number(row.carbs_g),
        fat: Number(row.fat_g),
        time: row.cooking_time_min,
        tags: row.tags || [],
        instructions: row.instructions,
        matchingCount: Number(row.matching_count),
        matchedIngredients: row.matched_ingredients
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;
