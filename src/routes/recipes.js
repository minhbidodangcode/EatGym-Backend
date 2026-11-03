import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { ApiError } from '../errors.js';
import {
  normalizeTagSlug,
  buildRecipeFilterQuery,
  TAG_METADATA,
  MEAL_TYPE_METADATA,
} from '../nutrition/recipe-filter.js';

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
// GET /api/recipes/filters - Metadata bộ lọc công thức động từ DB thật
// -------------------------------------------------------------
router.get('/recipes/filters', async (req, res, next) => {
  try {
    // 1. Tags với số lượng công thức thực tế
    const tagCountRes = await pool.query(`
      SELECT rt.tag_slug, COUNT(*)::int AS count
      FROM recipe_tags rt
      JOIN recipes r ON rt.recipe_id = r.id
      GROUP BY rt.tag_slug
      ORDER BY count DESC
    `);
    const tags = tagCountRes.rows.map((row) => ({
      slug: row.tag_slug,
      label: TAG_METADATA[row.tag_slug]?.label || row.tag_slug,
      icon: TAG_METADATA[row.tag_slug]?.icon || '🏷️',
      count: row.count,
    }));

    // 2. Meal types với số lượng công thức thực tế
    const mealCountRes = await pool.query(`
      SELECT meal_type, COUNT(*)::int AS count
      FROM recipes
      GROUP BY meal_type
      ORDER BY count DESC
    `);
    const mealTypes = mealCountRes.rows.map((row) => ({
      value: row.meal_type,
      label: MEAL_TYPE_METADATA[row.meal_type]?.label || row.meal_type,
      count: row.count,
    }));

    // 3. Difficulties với số lượng công thức thực tế
    const diffCountRes = await pool.query(`
      SELECT difficulty, COUNT(*)::int AS count
      FROM recipes
      WHERE difficulty IS NOT NULL
      GROUP BY difficulty
      ORDER BY count DESC
    `);
    const difficulties = diffCountRes.rows.map((row) => ({
      value: row.difficulty,
      label: row.difficulty,
      count: row.count,
    }));

    // 4. Min/Max ranges cho thanh trượt / bộ lọc
    const rangeRes = await pool.query(`
      SELECT
        COALESCE(MIN(kcal), 0)::float AS min_kcal,
        COALESCE(MAX(kcal), 0)::float AS max_kcal,
        COALESCE(MIN(protein_g), 0)::float AS min_p,
        COALESCE(MAX(protein_g), 0)::float AS max_p,
        COALESCE(MIN(cooking_time_min), 0)::int AS min_t,
        COALESCE(MAX(cooking_time_min), 0)::int AS max_t
      FROM recipes
    `);
    const r = rangeRes.rows[0];

    res.json({
      tags,
      mealTypes,
      difficulties,
      ranges: {
        kcal: { min: r.min_kcal, max: r.max_kcal },
        protein: { min: r.min_p, max: r.max_p },
        time: { min: r.min_t, max: r.max_t },
      },
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /api/recipes - Tìm kiếm và lọc công thức món ăn Server-Side
// -------------------------------------------------------------
router.get('/recipes', async (req, res, next) => {
  try {
    const { whereClause, params, sortClause, limit, offset } = buildRecipeFilterQuery(req.query);

    // 1. Tổng số dòng khớp trước limit
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM recipes r
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = countResult.rows[0]?.total || 0;

    // 2. Lấy dữ liệu công thức kèm nguyên liệu và tag slugs đã chuẩn hoá
    const selectParams = [...params, limit, offset];
    const limitIdx = '$' + (selectParams.length - 1);
    const offsetIdx = '$' + selectParams.length;

    const dataQuery = `
      SELECT r.id, r.title, r.icon, r.description, r.kcal, r.protein_g, r.carbs_g, r.fat_g,
             r.image_url, r.cooking_time_min, r.servings, r.difficulty, r.tags, r.instructions,
             r.is_vegetarian, r.meal_type,
             COALESCE(
               (
                 SELECT json_agg(
                   json_build_object(
                     'name', ri.ingredient_name,
                     'amount', ri.amount,
                     'unit', ri.unit,
                     'notes', ri.notes
                   )
                 )
                 FROM recipe_ingredients ri
                 WHERE ri.recipe_id = r.id
               ), '[]'::json
             ) AS ingredients,
             COALESCE(
               (
                 SELECT array_agg(rt.tag_slug)
                 FROM recipe_tags rt
                 WHERE rt.recipe_id = r.id
               ), ARRAY[]::varchar[]
             ) AS tag_slugs
      FROM recipes r
      ${whereClause}
      ORDER BY ${sortClause}
      LIMIT ${limitIdx} OFFSET ${offsetIdx}
    `;

    const result = await pool.query(dataQuery, selectParams);

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
        tagSlugs: row.tag_slugs || [],
        tag_slugs: row.tag_slugs || [],
        instructions: row.instructions,
        ingredients: row.ingredients,
        isVegetarian: row.is_vegetarian ?? false,
        is_vegetarian: row.is_vegetarian ?? false,
        mealType: row.meal_type ?? 'main',
        meal_type: row.meal_type ?? 'main',
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// POST /api/recipes/suggest - Đề xuất món từ nguyên liệu sẵn có
// -------------------------------------------------------------
function extractIngredientKeywords(rawName) {
  if (!rawName || typeof rawName !== 'string') return [];
  const cleaned = rawName
    .replace(/\.+$/, '')
    .replace(/[()]/g, ' ')
    .trim();

  const keywords = new Set();
  const lower = cleaned.toLowerCase();

  // Root mapping
  if (lower.includes('bông cải') || lower.includes('broccoli') || lower.includes('súp lơ')) {
    keywords.add('bông cải');
    keywords.add('broccoli');
    keywords.add('súp lơ');
  }
  if (lower.includes('gà')) {
    keywords.add('thịt gà');
    keywords.add('ức gà');
    keywords.add('gà');
  }
  if (lower.includes('tỏi')) {
    keywords.add('tỏi');
    keywords.add('tỏi băm');
  }
  if (lower.includes('bò')) {
    keywords.add('thịt bò');
    keywords.add('bò');
  }
  if (lower.includes('lợn') || lower.includes('heo')) {
    keywords.add('thịt lợn');
    keywords.add('thịt heo');
  }
  if (lower.includes('tôm')) {
    keywords.add('tôm');
  }
  if (lower.includes('trứng')) {
    keywords.add('trứng');
  }
  if (lower.includes('cá hồi')) {
    keywords.add('cá hồi');
  } else if (lower.includes('cá')) {
    keywords.add('cá');
  }

  // Strip adjectives
  const stripped = lower
    .replace(/\b(tươi|nạc|phi lê|đóng hộp|hộp|xay|khô|ta|thả vườn|băm|cắt khúc|hấp|sốt|luộc)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped.length >= 2) {
    keywords.add(stripped);
  }
  keywords.add(lower);

  return Array.from(keywords).filter((k) => k.length >= 2);
}

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
          matchingCount: 0,
          isSaved: false
        }))
      });
    }

    const keywordGroups = ingredients
      .map(extractIngredientKeywords)
      .filter((group) => group.length > 0);

    const rawSavedIds = Array.isArray(req.body?.savedRecipeIds) ? req.body.savedRecipeIds : [];
    const savedRecipeIds = rawSavedIds.map(String);
    const userId = req.auth?.userId || null;

    const params = [];
    const matchCaseExprs = [];

    keywordGroups.forEach((group) => {
      const patterns = group.map((kw) => `%${kw}%`);
      params.push(patterns);
      const paramIdx = `$${params.length}`;
      matchCaseExprs.push(
        `(CASE WHEN EXISTS (
          SELECT 1 FROM recipe_ingredients ri
          WHERE ri.recipe_id = r.id AND (ri.ingredient_name ILIKE ANY(${paramIdx}::text[]) OR r.title ILIKE ANY(${paramIdx}::text[]))
        ) THEN 1 ELSE 0 END)`
      );
    });

    const matchingCountExpr = matchCaseExprs.length > 0 ? `(${matchCaseExprs.join(' + ')})` : '0';

    params.push(savedRecipeIds);
    const savedIdsIdx = `$${params.length}`;

    let savedExpr = `(r.id::text = ANY(${savedIdsIdx}::text[]))`;
    if (userId) {
      params.push(userId);
      const userIdx = `$${params.length}`;
      savedExpr = `((r.id::text = ANY(${savedIdsIdx}::text[])) OR EXISTS (SELECT 1 FROM user_favorite_recipes uf WHERE uf.user_id = ${userIdx} AND uf.recipe_id = r.id))`;
    }

    let filterConditions = '';
    if (allergyPatterns.length) {
      params.push(allergyPatterns);
      filterConditions += ` AND NOT EXISTS (SELECT 1 FROM recipe_ingredients ai WHERE ai.recipe_id = r.id AND ai.ingredient_name ILIKE ANY($${params.length}::text[]))`;
    }
    if (dietaryPreferences.length) {
      params.push(dietaryPreferences.map((v) => v.trim()));
      filterConditions += ` AND r.tags && $${params.length}::text[]`;
    }
    if (maxCookingTime && Number.isFinite(maxCookingTime)) {
      params.push(maxCookingTime);
      filterConditions += ` AND r.cooking_time_min <= $${params.length}`;
    }

    const query = `
      WITH recipe_matches AS (
        SELECT r.id, r.title, r.icon, r.description, r.kcal, r.protein_g, r.carbs_g, r.fat_g,
               r.image_url, r.cooking_time_min, r.tags, r.instructions,
               ${matchingCountExpr} AS matching_count,
               ${savedExpr} AS is_saved
        FROM recipes r
        WHERE 1=1 ${filterConditions}
      )
      SELECT *
      FROM recipe_matches
      WHERE matching_count > 0
      ORDER BY matching_count DESC, is_saved DESC, cooking_time_min ASC, kcal ASC
      LIMIT 50
    `;

    const result = await pool.query(query, params);

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
        isSaved: Boolean(row.is_saved)
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;
