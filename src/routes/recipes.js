import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { ApiError } from '../errors.js';

function hasDiacritics(str) {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(str);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const router = Router();

// -------------------------------------------------------------
// BẢNG ẢNH CHUẨN 100% CHO TẤT CẢ MÓN ĂN ĐÃ NẤU CHÍN TRONG DATABASE
// -------------------------------------------------------------
const STANDARD_RECIPE_IMAGES = {
  // 1. Overnight oats yến mạch ngâm sữa chua hoa quả
  overnight_oats: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=800',
  // 2. Bữa phụ phục hồi sữa hạt & đĩa hạt dinh dưỡng
  snack_plate: 'https://images.unsplash.com/photo-1508736793122-f516e3ba5569?w=800',
  nut_milk_snack: 'https://images.unsplash.com/photo-1508736793122-f516e3ba5569?w=800',
  nuts_superfood: 'https://images.unsplash.com/photo-1508736793122-f516e3ba5569?w=800',
  // 3. Bánh mì đen kẹp trứng ốp & bơ
  egg_toast: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800',
  black_bread_egg: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800',
  // 4. Bánh mì sandwich cá ngừ
  tuna_sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800',
  // 5. Wrap ức gà ngũ cốc Tortilla
  chicken_wrap: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800',
  // 6. Bún nưa / Mì gạo lứt Eat Clean
  noodle_bowl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
  shirataki_bowl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
  // 7. Cháo yến mạch ức gà nấm
  porridge: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=800',
  oatmeal_porridge: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=800',
  // 8. Đậu hũ áp chảo vàng giòn sốt tương gừng
  tofu_meal: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=800',
  tofu_dish: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=800',
  tofu_rice_bowl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=800',
  // 9. Đậu nành Edamame hấp đĩa
  edamame_plate: 'https://images.unsplash.com/photo-1551462147-37885acc36f1?w=800',
  edamame_beans: 'https://images.unsplash.com/photo-1551462147-37885acc36f1?w=800',
  // 10. Bắp ngọt xào rau củ sốt tiêu đen Eat Clean
  corn_stir_fry: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800',
  sweet_corn: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800',
  // 11. Bắp ngọt hấp kèm ức gà poke bowl
  chicken_corn_meal: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
  // 12. Bò bít tết thăn nạc măng tây
  beef_steak: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
  // 13. Bò xào ớt chuông cơm gạo lứt
  beef_rice: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800',
  beef_stir_fry: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800',
  // 14. Cá hồi áp chảo sốt chanh leo
  salmon_fillet: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
  // 15. Cá ngừ áp chảo măng tây
  tuna_steak: 'https://images.unsplash.com/photo-1501595091296-3aa970afb3ff?w=800',
  tuna_egg_salad: 'https://images.unsplash.com/photo-1501595091296-3aa970afb3ff?w=800',
  // 16. Tôm sú áp chảo bơ tỏi
  garlic_shrimp: 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800',
  // 17. Ức gà áp chảo sốt bơ tỏi / tiêu đen
  chicken_breast: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800',
  // 18. Salad ức gà áp chảo sốt mè
  chicken_salad: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800',
  // 19. Đùi gà nướng thảo mộc
  roast_chicken: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800',
  roast_chicken_thigh: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800',
  // 20. Thịt lợn nạc rim mật ong cơm gạo lứt
  pork_rice: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=800',
  pork_brown_rice: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=800',
  // 21. Trứng cuộn phô mai rau củ
  egg_roll: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=800',
  // 22. Soup nóng / súp gà nấm
  soup: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
  chicken_soup: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
  // 23. Canh rong biển bò băm đậu hũ
  seaweed_soup: 'https://images.unsplash.com/photo-1607528971899-2e89e6c0ec69?w=800',
  // 24. Sữa chua Hy Lạp việt quất Granola
  yogurt_bowl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
  greek_yogurt_bowl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
  // 25. Sinh tố Protein chuối yến mạch
  smoothie: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800',
  protein_smoothie: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800',
  // 26. Salad rau củ ngũ sắc Eat Clean
  salad_bowl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  garden_salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  chickpea_salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  // 27. Ức gà xào súp lơ nấm
  chicken_stir_fry: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
};

function resolveRecipeImage(title, description = '') {
  const lower = (title + ' ' + description).toLowerCase();

  // 1. Overnight oats & Sinh tố / Sữa chua / Granola
  if (lower.includes('ngâm qua đêm') || lower.includes('overnight')) return STANDARD_RECIPE_IMAGES.overnight_oats;
  if (lower.includes('sinh tố') || lower.includes('smoothie') || lower.includes('whey')) return STANDARD_RECIPE_IMAGES.smoothie;
  if (lower.includes('sữa chua') || lower.includes('yogurt') || lower.includes('granola') || lower.includes('parfait')) return STANDARD_RECIPE_IMAGES.yogurt_bowl;
  if (lower.includes('sữa hạt') || lower.includes('bữa phụ')) return STANDARD_RECIPE_IMAGES.snack_plate;

  // 2. Wrap & Bánh mì / Sandwich / Toast
  if (lower.includes('wrap') || lower.includes('bánh cuộn') || lower.includes('tortilla')) return STANDARD_RECIPE_IMAGES.chicken_wrap;
  if (lower.includes('bánh mì') || lower.includes('sandwich') || lower.includes('toast')) {
    if (lower.includes('cá ngừ') || lower.includes('tuna')) return STANDARD_RECIPE_IMAGES.tuna_sandwich;
    return STANDARD_RECIPE_IMAGES.egg_toast;
  }

  // 3. Bún / Mì / Phở / Shirataki / Miến / Nui / Bánh canh
  if (lower.includes('bún') || lower.includes('shirataki') || lower.includes('mì') || lower.includes('phở') || lower.includes('miến') || lower.includes('nui') || lower.includes('pasta') || lower.includes('bánh canh')) {
    return STANDARD_RECIPE_IMAGES.noodle_bowl;
  }

  // 4. Cháo / Soup / Canh
  if (lower.includes('cháo')) return STANDARD_RECIPE_IMAGES.porridge;
  if (lower.includes('canh rong biển') || lower.includes('rong biển')) return STANDARD_RECIPE_IMAGES.seaweed_soup;
  if (lower.includes('soup') || lower.includes('súp') || (lower.includes('canh') && !lower.includes('bánh'))) return STANDARD_RECIPE_IMAGES.soup;

  // 5. Hải sản (Tôm, Cá hồi, Cá ngừ, Cua, Mực)
  if (lower.includes('tôm') || lower.includes('shrimp') || lower.includes('cua') || lower.includes('mực') || lower.includes('hải sản')) return STANDARD_RECIPE_IMAGES.garlic_shrimp;
  if (lower.includes('cá hồi') || lower.includes('salmon')) return STANDARD_RECIPE_IMAGES.salmon_fillet;
  if (lower.includes('cá ngừ') || lower.includes('tuna')) return STANDARD_RECIPE_IMAGES.tuna_steak;

  // 6. Trứng
  if (lower.includes('trứng cuộn') || lower.includes('omlet') || lower.includes('omelette') || lower.includes('trứng ốp') || lower.includes('trứng')) return STANDARD_RECIPE_IMAGES.egg_roll;

  // 7. Thịt bò
  if (lower.includes('bít tết') || lower.includes('steak') || lower.includes('thăn bò')) return STANDARD_RECIPE_IMAGES.beef_steak;
  if (lower.includes('bò xào') || lower.includes('bò băm') || lower.includes('bò') || lower.includes('thịt bò')) return STANDARD_RECIPE_IMAGES.beef_rice;

  // 8. Thịt lợn
  if (lower.includes('thịt lợn') || lower.includes('nạc lợn') || lower.includes('lợn rim') || lower.includes('thịt lợn') || lower.includes('thăn lợn') || lower.includes('lợn kho') || lower.includes('bao tử')) return STANDARD_RECIPE_IMAGES.pork_rice;

  // 9. Đậu hũ / Món chay
  if (lower.includes('đậu hũ') || lower.includes('đậu phụ') || lower.includes('tofu') || lower.includes('chao') || lower.includes('món chay')) return STANDARD_RECIPE_IMAGES.tofu_meal;

  // 10. Thịt gà
  if (lower.includes('đùi gà') || lower.includes('má đùi') || lower.includes('cánh gà') || lower.includes('gà nướng')) return STANDARD_RECIPE_IMAGES.roast_chicken;
  if (lower.includes('ức gà') || lower.includes('gà')) {
    if (lower.includes('salad') || lower.includes('xà lách')) return STANDARD_RECIPE_IMAGES.chicken_salad;
    if (lower.includes('xào') || lower.includes('tiêu đen') || lower.includes('nấm')) return STANDARD_RECIPE_IMAGES.chicken_stir_fry;
    if (lower.includes('bắp') || lower.includes('ngô') || lower.includes('hấp')) return STANDARD_RECIPE_IMAGES.chicken_corn_meal;
    return STANDARD_RECIPE_IMAGES.chicken_breast;
  }

  // 11. Salad tươi trộn
  if (lower.includes('salad') || lower.includes('trộn sốt') || lower.includes('giấm táo') || lower.includes('dầu ô liu')) return STANDARD_RECIPE_IMAGES.salad_bowl;

  // 12. Bắp ngọt (Ngô) & Rau củ xào / hấp chín
  if (lower.includes('bắp ngọt') || lower.includes('ngô')) {
    if (lower.includes('xào') || lower.includes('áp chảo') || lower.includes('tiêu đen')) return STANDARD_RECIPE_IMAGES.corn_stir_fry;
    return STANDARD_RECIPE_IMAGES.chicken_corn_meal;
  }

  // 13. Đậu nành Edamame & Các loại hạt dinh dưỡng
  if (lower.includes('edamame') || lower.includes('đậu nành') || lower.includes('đậu hà lan')) return STANDARD_RECIPE_IMAGES.edamame_plate;
  if (lower.includes('hạt') || lower.includes('quinoa') || lower.includes('hạnh nhân') || lower.includes('óc chó') || lower.includes('điều') || lower.includes('chia')) return STANDARD_RECIPE_IMAGES.snack_plate;

  return STANDARD_RECIPE_IMAGES.chicken_breast;
}

router.get('/favorites/recipes', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.title, r.icon, r.description, r.kcal, r.protein_g, r.carbs_g, r.fat_g, r.tags, r.image_url, f.created_at
       FROM user_favorite_recipes f JOIN recipes r ON r.id = f.recipe_id
       WHERE f.user_id = $1 ORDER BY f.created_at DESC`, [req.auth.userId]
    );
    res.json({ recipes: result.rows.map((row) => ({ id: row.id, title: row.title, icon: row.icon, image: row.image_url || resolveRecipeImage(row.title, row.description), image_url: row.image_url || resolveRecipeImage(row.title, row.description), description: row.description, kcal: Number(row.kcal), protein: Number(row.protein_g), carbs: Number(row.carbs_g), fat: Number(row.fat_g), tags: row.tags, savedAt: row.created_at })) });
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
      const tokens = q.trim().split(/\s+/).filter(Boolean);
      for (const tok of tokens) {
        const safeTok = escapeRegex(tok);
        if (hasDiacritics(tok)) {
          params.push(`(^|[^a-zA-Z0-9])${safeTok}`);
          query += ` AND name ~* $${params.length}`;
        } else {
          params.push(`(^|[^a-zA-Z0-9])${safeTok}`);
          query += ` AND unaccent(name) ~* unaccent($${params.length})`;
        }
      }
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
             r.image_url, r.cooking_time_min, r.servings, r.difficulty, r.tags, r.instructions,
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

    if (search && typeof search === 'string' && search.trim()) {
      const tokens = search.trim().split(/\s+/).filter(Boolean);
      for (const tok of tokens) {
        const safeTok = escapeRegex(tok);
        if (hasDiacritics(tok)) {
          params.push(`(^|[^a-zA-Z0-9])${safeTok}`);
          query += ` AND (r.title ~* $${params.length} OR ri.ingredient_name ~* $${params.length})`;
        } else {
          params.push(`(^|[^a-zA-Z0-9])${safeTok}`);
          query += ` AND (unaccent(r.title) ~* unaccent($${params.length}) OR unaccent(ri.ingredient_name) ~* unaccent($${params.length}))`;
        }
      }
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
        image: row.image_url || resolveRecipeImage(row.title, row.description),
        image_url: row.image_url || resolveRecipeImage(row.title, row.description),
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
// POST /api/recipes/suggest - Đề xuất món tlợn nguyên liệu sẵn có
// -------------------------------------------------------------
router.post('/recipes/suggest', optionalAuth, async (req, res, next) => {
  try {
    const { ingredients = [], maxTime } = req.body;
    let profileResult = { rows: [] };
    if (req.auth?.userId) {
      profileResult = await pool.query(
        'SELECT allergies, dietary_preferences FROM user_profiles WHERE user_id = $1', [req.auth.userId]
      );
    }
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
             r.image_url, r.cooking_time_min, r.tags, r.instructions,
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
        image: row.image_url || resolveRecipeImage(row.title, row.description),
        image_url: row.image_url || resolveRecipeImage(row.title, row.description),
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
